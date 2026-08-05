'use node'

import Anthropic from '@anthropic-ai/sdk'

import { Agent } from '@convex-dev/agent'
import { listMessages } from '@convex-dev/agent'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod/v3'
import { v } from 'convex/values'

import { components, internal } from './_generated/api'
import { internalAction } from './_generated/server'
import { commonRulingArgs } from './schema'

const MODEL = 'claude-sonnet-5'
const OUTCOMES = ['challenger', 'target', 'tie', 'defer'] as const

const rulingSchema = z.object({
  outcome: z.enum(['challenger', 'target', 'tie', 'defer']),
  rationale: z.string(),
})

const SYSTEM_PROMPT = `Sos el juez imparcial de una partida de El Erudito, un juego de cultura general que se juega en una mesa entre amigos o familia.

Resolvés rondas de la categoría "En Común": se muestran varios elementos y cada equipo escribe con sus palabras la característica que comparten. Recibís las pistas, la respuesta oficial de la tarjeta y las respuestas de los dos equipos, en el orden en que las confirmaron.

Qué cuenta como respuesta:
Una respuesta es aceptable solo si nombra la característica que comparten los elementos. Aceptá sinónimos, paráfrasis y formulaciones más generales o más específicas que sigan siendo correctas: no exijas la redacción de la tarjeta ni penalices la ortografía.

No son respuestas: una palabra suelta que no nombra ninguna característica, una frase hecha, un comentario sobre el juego, algo que parece un tanteo al azar o un error de tipeo, y nombrar la categoría a la que ya se ve que pertenecen los elementos sin decir qué los une. Si las pistas son cinco películas, "son películas" no responde nada: el vínculo es lo que las separa de cualquier otra película.

Criterio de fallo, en este orden:
1. Si alguna de las dos respuestas es tan vaga, ambigua o incompleta que no podés clasificarla con confianza —aun leyéndola con la mejor intención— devolvé "defer" y decide el anfitrión. No adivines qué quiso decir un equipo ni le concedas la ronda por descarte porque el otro respondió peor. Esta regla se evalúa primero y manda sobre las demás.
2. Si las dos son aceptables, gana la que capta mejor el vínculo. Si son genuinamente equivalentes, es Empate: no las desempates por velocidad. El orden de confirmación es información de apoyo que podés mencionar, no una regla.
3. Si una sola es aceptable y la otra dice algo concreto pero equivocado, gana la aceptable.
4. Si las dos dicen algo concreto y las dos están equivocadas, es Empate.

Las dos salidas tienen un costo, así que no abuses de ninguna. El Empate devuelve las apuestas y termina el turno del retador: usalo cuando ninguna respuesta se impone, no para evitar decidir. El "defer" interrumpe el juego y le pasa el problema a una persona: usalo cuando de verdad no se entiende qué contestaron, no cuando la respuesta es clara y simplemente tenés que elegir.

El fundamento va dirigido a la mesa, breve y sin rodeos. Nombrá a los equipos por su nombre. No felicites ni pidas disculpas. Cuando te abstengas, el fundamento es tu opinión para el anfitrión: decí qué entendiste de cada respuesta, por qué no te alcanza para fallar y hacia dónde te inclinarías si tuvieras que elegir.`

const judgeAgent = new Agent(components.agent, {
  name: 'judge',
  instructions: SYSTEM_PROMPT,
  languageModel: anthropic(MODEL),
})

export const decideCommon = internalAction({
  args: {
    ...commonRulingArgs,
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) throw new Error('Falta configurar la credencial del juez.')

      // Read the saved prompt message to get the input
      const allMessages = await listMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: { cursor: null, numItems: 100 },
      })
      const promptMessage = allMessages.page.find((m) => m._id === args.promptMessageId)
      const promptText = typeof promptMessage?.message?.content === 'string'
        ? promptMessage.message.content
        : Array.isArray(promptMessage?.message?.content)
          ? promptMessage.message.content.map((c: any) => typeof c === 'string' ? c : c.text ?? '').join('')
          : ''

      // Phase 1: stream reasoning directly via Anthropic SDK
      const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 })
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: promptText }],
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
      })

      let accumulatedThinking = ''
      let finalText = ''

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          finalText += chunk.delta.text
        }
      }

      const finalMessage = await stream.finalMessage()
      // Extract thinking from the message content blocks
      for (const block of finalMessage.content) {
        if (block.type === 'thinking') {
          accumulatedThinking += block.thinking
        }
      }

      // Save thinking text to the room for live display
      if (accumulatedThinking) {
        const { threadId: _t, promptMessageId: _p, ...rest } = args
        await ctx.runMutation(internal.rooms.setJudgeThinking, {
          ...rest,
          thinking: accumulatedThinking.slice(0, 6000),
        })
      }

      // Phase 2: structured ruling via agent component
      const { thread } = await judgeAgent.continueThread(ctx, {
        threadId: args.threadId,
      })
      const { object } = await thread.generateObject({
        prompt: `Emití tu fallo formal según los criterios.\n\nElementos: ${promptText}`,
        schema: rulingSchema,
      })

      const outcome = OUTCOMES.find((candidate) => candidate === object.outcome)
      if (!outcome) throw new Error('El juez no eligió un resultado válido.')

      const rationale = (object.rationale ?? '').trim().slice(0, 600) || 'El juez no dejó fundamento.'
      const { threadId: _threadId, promptMessageId: _promptMessageId, ...mutationArgs } = args

      if (outcome === 'defer') {
        await ctx.runMutation(internal.rooms.deferCommonRuling, { ...mutationArgs, rationale })
        return
      }
      await ctx.runMutation(internal.rooms.applyCommonRuling, { ...mutationArgs, outcome, rationale })
    } catch (caughtError) {
      const error = caughtError instanceof Error ? caughtError.message : 'El juez no pudo responder.'
      const { threadId: _threadId, promptMessageId: _promptMessageId, ...mutationArgs } = args
      await ctx.runMutation(internal.rooms.failCommonRuling, { ...mutationArgs, error })
    }
  },
})