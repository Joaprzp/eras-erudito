'use node'

import Anthropic from '@anthropic-ai/sdk'

import { internal } from './_generated/api'
import { internalAction } from './_generated/server'
import { commonRulingArgs } from './schema'

const MODEL = 'claude-sonnet-5'
const OUTCOMES = ['challenger', 'target', 'tie'] as const

const RULING_SCHEMA = {
  type: 'object',
  properties: {
    outcome: {
      type: 'string',
      enum: ['challenger', 'target', 'tie'],
      description: 'challenger si gana el Retador, target si gana el Retado, tie si hay Empate.',
    },
    rationale: {
      type: 'string',
      description: 'Una o dos oraciones en español explicando el fallo a la mesa. Sin markdown.',
    },
  },
  required: ['outcome', 'rationale'],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `Sos el juez imparcial de una partida de El Erudito, un juego de cultura general que se juega en una mesa entre amigos o familia.

Resolvés rondas de la categoría "En Común": se muestran varios elementos y cada equipo escribe con sus palabras la característica que comparten. Recibís las pistas, la respuesta oficial de la tarjeta y las respuestas de los dos equipos, en el orden en que las confirmaron.

Criterio de fallo:
1. Una respuesta es aceptable si identifica la característica compartida, aunque esté redactada distinto a la respuesta oficial. Aceptá sinónimos, paráfrasis y formulaciones más generales o más específicas que sigan siendo correctas. No exijas la redacción exacta ni penalices la ortografía.
2. Si solo una respuesta es aceptable, gana ese equipo.
3. Si ninguna respuesta es aceptable, el resultado es Empate.
4. Si las dos son aceptables, gana la que capta mejor el vínculo. Si son genuinamente equivalentes, el Empate es el fallo correcto: no las desempates por velocidad. El orden de confirmación es información de apoyo que podés mencionar, no una regla.

Sos generoso pero riguroso: la gracia del juego es que la respuesta demuestre que entendieron el vínculo, no que adivinen la formulación de la tarjeta. Ante una respuesta tan vaga que sería válida para casi cualquier grupo de elementos, no la aceptes.

Un Empate devuelve las apuestas y termina el turno del retador, así que no lo elijas para evitar decidir: usalo cuando de verdad ninguna respuesta se impone sobre la otra.

El fundamento va dirigido a la mesa, breve y sin rodeos. Nombrá a los equipos por su nombre. No felicites ni pidas disculpas.`

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
      const ruling = await askJudge(input)
      await ctx.runMutation(internal.rooms.applyCommonRuling, { ...args, ...ruling })
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
  if (outcome !== 'tie' && !input.answers.some((answer) => answer.role === outcome)) {
    throw new Error('El juez falló a favor de un equipo que no respondió.')
  }

  const rationale = typeof ruling.rationale === 'string' ? ruling.rationale.trim() : ''

  return { outcome, rationale: rationale.slice(0, 600) || 'El juez no dejó fundamento.' }
}
