'use node'

import Anthropic from '@anthropic-ai/sdk'

import { internal } from './_generated/api'
import { internalAction } from './_generated/server'
import { commonRulingArgs } from './schema'

const MODEL = 'claude-sonnet-5'
const OUTCOMES = ['challenger', 'target', 'tie', 'defer'] as const

const RULING_SCHEMA = {
  type: 'object',
  properties: {
    outcome: {
      type: 'string',
      enum: ['challenger', 'target', 'tie', 'defer'],
      description: 'challenger si gana el Retador, target si gana el Retado, tie si hay Empate, defer si te abstenés y decide el anfitrión.',
    },
    rationale: {
      type: 'string',
      description: 'Dos o tres oraciones en español. Si fallás, explicá el fallo a la mesa; si te abstenés, es tu opinión para el anfitrión. Sin markdown.',
    },
  },
  required: ['outcome', 'rationale'],
  additionalProperties: false,
} as const

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

type RulingInput = {
  clues: string[]
  solution: string
  answers: Array<{ order: number; role: 'challenger' | 'target'; teamName: string; text: string }>
}

export const decideCommon = internalAction({
  args: commonRulingArgs,
  handler: async (ctx, args) => {
    try {
      const input = await ctx.runQuery(internal.rooms.commonRulingInput, args)

      if (!input) return
      const { outcome, rationale } = await askJudge(input)

      if (outcome === 'defer') {
        await ctx.runMutation(internal.rooms.deferCommonRuling, { ...args, rationale })
        return
      }
      await ctx.runMutation(internal.rooms.applyCommonRuling, { ...args, outcome, rationale })
    } catch (caughtError) {
      const error = caughtError instanceof Error ? caughtError.message : 'El juez no pudo responder.'
      await ctx.runMutation(internal.rooms.failCommonRuling, { ...args, error })
    }
  },
})

async function askJudge(input: RulingInput) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) throw new Error('Falta configurar la credencial del juez.')

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 60_000 })
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: RULING_SCHEMA },
    },
    messages: [{ role: 'user', content: buildPrompt(input) }],
  })

  if (response.stop_reason === 'refusal') throw new Error('El juez no quiso opinar sobre esta tarjeta.')
  if (response.stop_reason === 'max_tokens') throw new Error('El juez se quedó sin espacio para responder.')

  const text = response.content.find((block) => block.type === 'text')?.text

  if (!text) throw new Error('El juez respondió vacío.')
  return parseRuling(text, input)
}

function buildPrompt(input: RulingInput) {
  const answers = input.answers
    .map((answer) => [
      `- Equipo: ${answer.teamName}`,
      `  Rol: ${answer.role === 'challenger' ? 'Retador (challenger)' : 'Retado (target)'}`,
      `  Orden de confirmación: ${answer.order}`,
      `  Respuesta: ${answer.text}`,
    ].join('\n'))
    .join('\n')

  return [
    `Elementos de la tarjeta: ${input.clues.join(', ')}.`,
    `Respuesta oficial: ${input.solution}`,
    '',
    'Respuestas de los equipos:',
    answers,
    '',
    'Emití tu fallo.',
  ].join('\n')
}

function parseRuling(text: string, input: RulingInput) {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El juez respondió en un formato inesperado.')
  }

  const ruling = parsed as { outcome?: unknown; rationale?: unknown }
  const outcome = OUTCOMES.find((candidate) => candidate === ruling.outcome)

  if (!outcome) throw new Error('El juez no eligió un resultado válido.')
  if (outcome !== 'tie' && outcome !== 'defer' && !input.answers.some((answer) => answer.role === outcome)) {
    throw new Error('El juez falló a favor de un equipo que no respondió.')
  }

  const rationale = typeof ruling.rationale === 'string' ? ruling.rationale.trim() : ''

  return { outcome, rationale: rationale.slice(0, 600) || 'El juez no dejó fundamento.' }
}
