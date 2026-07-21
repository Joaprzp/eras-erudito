import { v } from 'convex/values'

import { internalMutation, mutation, query } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { cardDeck, type CardCategory, type QuestionCard } from './cardDeck'

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CATEGORIES = ['sequence', 'association', 'common', 'approximation'] as const
const EMPTY_LOBBY_TTL_MS = 30 * 60 * 1000
const LOBBY_TTL_MS = 12 * 60 * 60 * 1000
const GAME_TTL_MS = 24 * 60 * 60 * 1000

type CategoryStat = { attempts: number; wins: number; totalResponseMs: number }
type CategoryStats = Record<CardCategory, CategoryStat>

function emptyCategoryStats(): CategoryStats {
  return {
    sequence: { attempts: 0, wins: 0, totalResponseMs: 0 },
    association: { attempts: 0, wins: 0, totalResponseMs: 0 },
    common: { attempts: 0, wins: 0, totalResponseMs: 0 },
    approximation: { attempts: 0, wins: 0, totalResponseMs: 0 },
  }
}

function normalizedCategoryStats(stats: CategoryStats | undefined): CategoryStats {
  return stats ?? emptyCategoryStats()
}

function categoryStatsWithAttempt(stats: CategoryStats | undefined, category: CardCategory, responseMs: number): CategoryStats {
  const normalized = normalizedCategoryStats(stats)
  return {
    ...normalized,
    [category]: {
      ...normalized[category],
      attempts: normalized[category].attempts + 1,
      totalResponseMs: normalized[category].totalResponseMs + responseMs,
    },
  }
}

function categoryStatsWithResult(stats: CategoryStats | undefined, category: CardCategory, won: boolean): CategoryStats {
  const normalized = normalizedCategoryStats(stats)
  return {
    ...normalized,
    [category]: {
      ...normalized[category],
      wins: normalized[category].wins + (won ? 1 : 0),
    },
  }
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const code = await createAvailableCode(ctx)
    const companionToken = crypto.randomUUID()

    await ctx.db.insert('rooms', {
      code,
      companionToken,
      phase: 'lobby',
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    })

    return { code, companionToken }
  },
})

export const join = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code)

    if (!room || room.phase !== 'lobby') {
      throw new Error('Esta sala no está disponible.')
    }

    const teams = await ctx.db
      .query('teams')
      .withIndex('by_room', (index) => index.eq('roomId', room._id))
      .collect()

    if (teams.length >= 4) {
      throw new Error('La sala ya tiene cuatro equipos.')
    }

    if (teams.some((team) => team.color === args.color)) {
      throw new Error('Ese color ya está en uso.')
    }

    const token = crypto.randomUUID()
    const teamId = await ctx.db.insert('teams', {
      roomId: room._id,
      token,
      joinIndex: teams.length,
      name: cleanTeamName(args.name),
      color: args.color,
      isHost: teams.length === 0,
      status: 'connected',
    })
    await touchRoom(ctx, room._id)

    return { teamId, token, isHost: teams.length === 0 }
  },
})

export const companionLobby = query({
  args: { code: v.string(), companionToken: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code)

    if (!room || room.companionToken !== args.companionToken) {
      return null
    }

    const teams = await ctx.db
      .query('teams')
      .withIndex('by_room', (index) => index.eq('roomId', room._id))
      .collect()

    const roundState = await getRoundState(ctx, room, teams, true)

    return {
      board: room.board ?? [],
      code: room.code,
      lastRoll: room.lastRoll,
      phase: room.phase,
      round: room.round,
      roundState,
      shopTeamId: room.shopTeamId,
      turnTeamId: room.turnTeamId,
      winnerTeamId: room.winnerTeamId,
      teams: teams
        .sort((left, right) => left.joinIndex - right.joinIndex)
        .map(({ _id, answeredCards, categoryStats, coins, color, correctMarks, isHost, joinIndex, money, name, position, status, totalResponseMs }) => ({
          answeredCards: answeredCards ?? 0,
          categoryStats: normalizedCategoryStats(categoryStats),
          coins: coins ?? 0,
          id: _id,
          color,
          correctMarks: correctMarks ?? 0,
          isHost,
          joinIndex,
          money: money ?? 0,
          name,
          position: position ?? 0,
          status,
          totalResponseMs: totalResponseMs ?? 0,
        })),
    }
  },
})

export const teamLobby = query({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code)

    if (!room) {
      return null
    }

    const team = await getTeamByToken(ctx, room._id, args.token)

    if (!team) {
      return null
    }

    const teams = await listTeams(ctx, room._id)

    const roundState = await getRoundState(ctx, room, teams)

    return {
      code: room.code,
      lastRoll: room.lastRoll,
      phase: room.phase,
      round: room.round,
      roundState: roundState ? {
        card: roundState.card,
        hasSubmitted: roundState.submittedTeamIds.includes(team._id),
        requiredResponseCount: roundState.requiredResponseCount,
      } : null,
      self: { id: team._id, isHost: team.isHost, money: team.money ?? 0, name: team.name, position: team.position ?? 0 },
      shopEligible: room.shopTeamId === team._id,
      turnTeamId: room.turnTeamId,
      winnerTeamId: room.winnerTeamId,
      teams: teams.map(({ _id, answeredCards, coins, color, correctMarks, isHost, joinIndex, money, name, position, totalResponseMs }) => ({
        answeredCards: answeredCards ?? 0,
        coins: coins ?? 0,
        id: _id,
        color,
        correctMarks: correctMarks ?? 0,
        isHost,
        joinIndex,
        money: money ?? 0,
        name,
        position: position ?? 0,
        totalResponseMs: totalResponseMs ?? 0,
      })),
    }
  },
})

export const start = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireLobbyTeam(ctx, args)
    const teams = await listTeams(ctx, room._id)

    if (!team.isHost) {
      throw new Error('Solo el anfitrión puede iniciar la partida.')
    }

    if (teams.length < 2) {
      throw new Error('Se necesitan al menos dos equipos para comenzar.')
    }

    const board = createBoard()

    await ctx.db.patch(room._id, {
      board,
      lastRoll: undefined,
      phase: 'active',
      turnTeamId: teams[0]._id,
      usedCardIds: [],
      approximationRemainder: 0,
      shopTeamId: undefined,
      winnerTeamId: undefined,
      lastActivityAt: Date.now(),
    })

    await Promise.all(
      teams.map((participant) =>
        ctx.db.patch(participant._id, {
          coins: 0,
          money: 2000,
          position: 0,
          turnWins: 0,
          answeredCards: 0,
          correctMarks: 0,
          totalResponseMs: 0,
          categoryStats: emptyCategoryStats(),
        }),
      ),
    )
  },
})

export const roll = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireActiveTeam(ctx, args)

    if (room.turnTeamId !== team._id) {
      throw new Error('Todavía no es el turno de este equipo.')
    }

    if (room.round) {
      throw new Error('Primero resolvé la ronda que ya está en juego.')
    }

    const total = rollDie() + rollDie()
    const previousPosition = team.position ?? 0
    const rawPosition = previousPosition + total
    const position = rawPosition % 54
    const landedOnStart = position === 0
    const crossedStart = rawPosition >= 54
    const space = landedOnStart ? undefined : room.board?.[position - 1]

    if (!landedOnStart && !space) throw new Error('No encontramos el casillero de destino.')

    const gameFinished = crossedStart ? await awardStartPassage(ctx, room, team) : false
    await ctx.db.patch(team._id, { position })
    if (gameFinished) {
      await touchRoom(ctx, room._id)
      return { position, total }
    }
    await ctx.db.patch(room._id, {
      lastRoll: total,
      round: {
        category: landedOnStart ? 'sequence' : space!.category,
        challengerId: team._id,
        isStart: landedOnStart,
        maxBet: landedOnStart ? 500 : space!.maxBet,
        phase: landedOnStart ? 'choose_category' : space!.category === 'approximation' ? 'choose_bet' : 'choose_rival',
      },
      shopTeamId: space?.isShop ? team._id : undefined,
      lastActivityAt: Date.now(),
    })

    return { position, total }
  },
})

export const chooseCategory = mutation({
  args: { code: v.string(), token: v.string(), category: v.union(v.literal('sequence'), v.literal('association'), v.literal('common'), v.literal('approximation')) },
  handler: async (ctx, args) => {
    const { room } = await requireCurrentChallenger(ctx, args, 'choose_category')
    const round = room.round

    if (!round?.isStart) throw new Error('Esta categoría no se puede elegir ahora.')
    await ctx.db.patch(room._id, {
      round: { ...round, category: args.category, phase: args.category === 'approximation' ? 'choose_bet' : 'choose_rival' },
      lastActivityAt: Date.now(),
    })
  },
})

export const buyCoin = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireActiveTeam(ctx, args)

    if (room.shopTeamId !== team._id) throw new Error('Este equipo no tiene una compra disponible.')
    if ((team.money ?? 0) < 1000) throw new Error('Se necesitan $1000 para comprar una moneda.')

    const coins = (team.coins ?? 0) + 1
    await ctx.db.patch(team._id, { coins, money: (team.money ?? 0) - 1000 })
    await ctx.db.patch(room._id, { shopTeamId: undefined })
    await finishIfWinner(ctx, room._id, team._id, coins)
    await touchRoom(ctx, room._id)
  },
})

export const chooseRival = mutation({
  args: { code: v.string(), token: v.string(), targetId: v.id('teams') },
  handler: async (ctx, args) => {
    const { room, team: challenger } = await requireCurrentChallenger(ctx, args, 'choose_rival')
    const round = room.round

    if (!round) throw new Error('No hay una ronda para configurar.')
    const target = await ctx.db.get(args.targetId)

    if (!target || target.roomId !== room._id || target.status !== 'connected') {
      throw new Error('Ese equipo ya no puede ser retado.')
    }

    if (target._id === challenger._id) {
      throw new Error('Elegí a otro equipo.')
    }

    await ctx.db.patch(room._id, {
      round: { ...round, targetId: target._id, phase: 'choose_bet' },
      lastActivityAt: Date.now(),
    })
  },
})

export const chooseBet = mutation({
  args: { code: v.string(), token: v.string(), wager: v.number() },
  handler: async (ctx, args) => {
    const { room } = await requireCurrentChallenger(ctx, args, 'choose_bet')
    const round = room.round
    const targetId = round?.targetId

    if (!round || (round.category !== 'approximation' && !targetId)) {
      throw new Error('Primero elegí al equipo retado.')
    }

    const participants = await getRoundParticipants(ctx, room, round)
    const maximum = Math.min(round.maxBet, ...participants.map((participant) => participant.money ?? 0))

    if (!Number.isInteger(args.wager) || args.wager < 100 || args.wager % 100 !== 0 || args.wager > maximum) {
      throw new Error(`La apuesta debe ser un múltiplo de $100 hasta $${maximum}.`)
    }

    await ctx.db.patch(room._id, {
      round: { ...round, wager: args.wager, phase: 'awaiting_card' },
      lastActivityAt: Date.now(),
    })
  },
})

export const drawCard = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room } = await requireCurrentChallenger(ctx, args, 'awaiting_card')
    const round = room.round

    if (!round) throw new Error('No hay una ronda para preparar.')

    const categoryDeck = cardDeck[round.category]
    const usedCardIds = room.usedCardIds ?? []
    const available = categoryDeck.filter((card) => !usedCardIds.includes(card.id))
    const candidates = available.length > 0 ? available : categoryDeck
    const card = candidates[randomIndex(candidates.length)]

    await ctx.db.patch(room._id, {
      round: { ...round, cardId: card.id, phase: 'answering', roundId: crypto.randomUUID(), startedAt: Date.now() },
      usedCardIds: available.length > 0 ? [...usedCardIds, card.id] : [
        ...usedCardIds.filter((cardId) => !categoryDeck.some((deckCard) => deckCard.id === cardId)),
        card.id,
      ],
      lastActivityAt: Date.now(),
    })

    return { cardId: card.id, recycled: available.length === 0 }
  },
})

export const submitResponse = mutation({
  args: { code: v.string(), token: v.string(), payload: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireActiveTeam(ctx, args)
    const round = room.round

    if (!round?.roundId || !round.cardId || round.phase !== 'answering') {
      throw new Error('Todavía no hay una tarjeta lista para responder.')
    }
    const roundId = round.roundId

    const participants = await getRoundParticipants(ctx, room, round)

    if (!participants.some((participant) => participant._id === team._id)) {
      throw new Error('Este equipo no responde esta tarjeta.')
    }

    const existing = await ctx.db
      .query('responses')
      .withIndex('by_round_team', (index) => index.eq('roundId', roundId).eq('teamId', team._id))
      .unique()

    if (existing) {
      throw new Error('La respuesta final ya fue enviada.')
    }

    validatePayload(getCard(round.category, round.cardId), args.payload)
    const submittedAt = Date.now()
    const responseMs = Math.max(0, submittedAt - (round.startedAt ?? submittedAt))
    await ctx.db.insert('responses', { roomId: room._id, roundId, teamId: team._id, payload: args.payload, responseMs, submittedAt })
    await ctx.db.patch(team._id, {
      answeredCards: (team.answeredCards ?? 0) + 1,
      totalResponseMs: (team.totalResponseMs ?? 0) + responseMs,
      categoryStats: categoryStatsWithAttempt(team.categoryStats, round.category, responseMs),
    })

    const responses = await ctx.db
      .query('responses')
      .withIndex('by_round', (index) => index.eq('roundId', roundId))
      .collect()

    if (responses.length === participants.length) {
      await ctx.db.patch(room._id, { round: { ...round, phase: 'ready_to_reveal' } })
    }
    await touchRoom(ctx, room._id)
  },
})

export const revealResponses = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireActiveTeam(ctx, args)
    const round = room.round

    if (!team.isHost) throw new Error('Solo el anfitrión puede revelar las respuestas.')
    if (!round || round.phase !== 'ready_to_reveal') throw new Error('Aún faltan respuestas por confirmar.')

    const revealedRound = { ...round, phase: 'revealed' as const }
    await ctx.db.patch(room._id, { round: revealedRound })

    if (round.category !== 'common') {
      await settleRound(ctx, room, revealedRound, await calculateAutomaticResult(ctx, room, revealedRound))
    }
    await touchRoom(ctx, room._id)
  },
})

export const resolveCommon = mutation({
  args: {
    code: v.string(),
    token: v.string(),
    outcome: v.union(v.literal('challenger'), v.literal('target'), v.literal('tie')),
  },
  handler: async (ctx, args) => {
    const { room, team } = await requireActiveTeam(ctx, args)
    const round = room.round

    if (!team.isHost) throw new Error('Solo el anfitrión puede resolver En común.')
    if (!round || round.category !== 'common' || round.phase !== 'revealed') {
      throw new Error('Esta ronda no está lista para resolver.')
    }

    const winnerTeamIds = args.outcome === 'challenger' ? [round.challengerId] : args.outcome === 'target' && round.targetId ? [round.targetId] : []
    if (args.outcome === 'target' && winnerTeamIds.length === 0) throw new Error('No encontramos al equipo retado.')

    if (winnerTeamIds[0]) {
      const winner = await ctx.db.get(winnerTeamIds[0])
      if (winner) await ctx.db.patch(winner._id, { correctMarks: (winner.correctMarks ?? 0) + 1 })
    }
    await settleRound(ctx, room, round, { kind: args.outcome, winnerTeamIds })
    await touchRoom(ctx, room._id)
  },
})

export const advanceTurn = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireActiveTeam(ctx, args)

    if (!team.isHost) throw new Error('Solo el anfitrión puede continuar la partida.')
    if (room.round?.phase !== 'resolved') throw new Error('Primero hay que resolver esta ronda.')

    await ctx.db.patch(room._id, { lastRoll: undefined, round: undefined, shopTeamId: undefined, lastActivityAt: Date.now() })
  },
})

export const leave = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const { room, team } = await requireLobbyTeam(ctx, args)
    const teams = await listTeams(ctx, room._id)

    await ctx.db.delete(team._id)

    if (team.isHost) {
      const nextHost = teams.find((candidate) => candidate._id !== team._id)

      if (nextHost) {
        await ctx.db.patch(nextHost._id, { isHost: true })
      }
    }
    await touchRoom(ctx, room._id)
  },
})

export const remove = mutation({
  args: { code: v.string(), token: v.string(), teamId: v.id('teams') },
  handler: async (ctx, args) => {
    const { room, team: host } = await requireLobbyTeam(ctx, args)

    if (!host.isHost) {
      throw new Error('Solo el anfitrión puede quitar equipos.')
    }

    const target = await ctx.db.get(args.teamId)

    if (!target || target.roomId !== room._id) {
      throw new Error('No encontramos ese equipo en la sala.')
    }

    if (target._id === host._id) {
      throw new Error('El anfitrión no puede quitarse a sí mismo.')
    }

    await ctx.db.delete(target._id)
    await touchRoom(ctx, room._id)
  },
})

export const close = mutation({
  args: { code: v.string(), token: v.string() },
  handler: async (ctx, args) => {
    const room = await getRoomByCode(ctx, args.code)

    if (!room) {
      throw new Error('Esta sala ya no existe.')
    }

    const host = await getTeamByToken(ctx, room._id, args.token)

    if (!host?.isHost) {
      throw new Error('Solo el anfitrión puede cerrar la sala.')
    }

    await deleteRoom(ctx, room._id)
  },
})

export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const rooms = await ctx.db.query('rooms').collect()
    let deletedRooms = 0

    for (const room of rooms) {
      const teams = await listTeams(ctx, room._id)
      const expiresAt = (room.lastActivityAt ?? room.createdAt) + roomTtl(room.phase, teams.length)

      if (expiresAt > now) continue

      await deleteRoom(ctx, room._id, teams)
      deletedRooms += 1
    }

    return { deletedRooms }
  },
})

async function getRoomByCode(
  ctx: MutationCtx | QueryCtx,
  code: string,
) {
  return await ctx.db
    .query('rooms')
    .withIndex('by_code', (index) => index.eq('code', code.toUpperCase()))
    .unique()
}

async function getTeamByToken(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<'rooms'>,
  token: string,
) {
  return await ctx.db
    .query('teams')
    .withIndex('by_room_token', (index) => index.eq('roomId', roomId).eq('token', token))
    .unique()
}

async function listTeams(ctx: MutationCtx | QueryCtx, roomId: Id<'rooms'>) {
  return await ctx.db
    .query('teams')
    .withIndex('by_room', (index) => index.eq('roomId', roomId))
    .collect()
    .then((teams) => teams.sort((left, right) => left.joinIndex - right.joinIndex))
}

async function touchRoom(ctx: MutationCtx, roomId: Id<'rooms'>) {
  await ctx.db.patch(roomId, { lastActivityAt: Date.now() })
}

async function deleteRoom(
  ctx: MutationCtx,
  roomId: Id<'rooms'>,
  knownTeams?: Awaited<ReturnType<typeof listTeams>>,
) {
  const teams = knownTeams ?? await listTeams(ctx, roomId)
  const responses = await ctx.db
    .query('responses')
    .withIndex('by_room', (index) => index.eq('roomId', roomId))
    .collect()

  await Promise.all([
    ...teams.map((team) => ctx.db.delete(team._id)),
    ...responses.map((response) => ctx.db.delete(response._id)),
  ])
  await ctx.db.delete(roomId)
}

function roomTtl(phase: 'lobby' | 'active' | 'finished', teamCount: number) {
  if (phase === 'lobby') return teamCount === 0 ? EMPTY_LOBBY_TTL_MS : LOBBY_TTL_MS
  return GAME_TTL_MS
}

async function requireLobbyTeam(ctx: MutationCtx, args: { code: string; token: string }) {
  const room = await getRoomByCode(ctx, args.code)

  if (!room || room.phase !== 'lobby') {
    throw new Error('Esta sala ya no está en espera.')
  }

  const team = await getTeamByToken(ctx, room._id, args.token)

  if (!team) {
    throw new Error('Este dispositivo no tiene permiso para modificar la sala.')
  }

  return { room, team }
}

async function requireActiveTeam(ctx: MutationCtx, args: { code: string; token: string }) {
  const room = await getRoomByCode(ctx, args.code)

  if (!room || room.phase !== 'active') {
    throw new Error('Esta partida todavía no está activa.')
  }

  const team = await getTeamByToken(ctx, room._id, args.token)

  if (!team || team.status !== 'connected') {
    throw new Error('Este dispositivo no tiene permiso para jugar.')
  }

  return { room, team }
}

async function requireCurrentChallenger(
  ctx: MutationCtx,
  args: { code: string; token: string },
  expectedPhase: 'choose_category' | 'choose_rival' | 'choose_bet' | 'awaiting_card',
) {
  const { room, team } = await requireActiveTeam(ctx, args)

  if (room.turnTeamId !== team._id || room.round?.challengerId !== team._id) {
    throw new Error('Solo el retador actual puede decidir esta ronda.')
  }

  if (room.round.phase !== expectedPhase) {
    throw new Error('Esta decisión ya no está disponible.')
  }

  return { room, team }
}

async function awardStartPassage(
  ctx: MutationCtx,
  room: NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>,
  traveler: Awaited<ReturnType<typeof listTeams>>[number],
) {
  const teams = await listTeams(ctx, room._id)
  const travelerRecord = teams.find((team) => team._id === traveler._id)

  if (!travelerRecord) throw new Error('No encontramos al equipo que cruzó Inicio.')

  let collected = 0
  let survivingRivals = 0
  const patches: Array<Promise<void>> = []

  for (const rival of teams.filter((team) => team._id !== traveler._id && team.status === 'connected')) {
    let money = rival.money ?? 0
    let coins = rival.coins ?? 0

    while (money < 500 && coins > 0) {
      money += 1000
      coins -= 1
    }

    if (money >= 500) {
      survivingRivals += 1
      collected += 500
      patches.push(ctx.db.patch(rival._id, { coins, money: money - 500 }))
    } else {
      patches.push(ctx.db.patch(rival._id, { coins, money, status: 'eliminated' }))
    }
  }

  const coins = (travelerRecord.coins ?? 0) + 1
  patches.push(ctx.db.patch(traveler._id, { coins, money: (travelerRecord.money ?? 0) + collected }))
  await Promise.all(patches)

  await finishIfWinner(ctx, room._id, traveler._id, coins)
  if (survivingRivals === 0) {
    await ctx.db.patch(room._id, { phase: 'finished', winnerTeamId: traveler._id })
    return true
  }

  return coins >= 4
}

async function finishIfWinner(ctx: MutationCtx, roomId: Id<'rooms'>, teamId: Id<'teams'>, coins: number) {
  if (coins >= 4) {
    await ctx.db.patch(roomId, { phase: 'finished', winnerTeamId: teamId })
  }
}

async function getRoundState(
  ctx: MutationCtx | QueryCtx,
  room: NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>,
  teams: Awaited<ReturnType<typeof listTeams>>,
  includeRevealedResponses = false,
) {
  const round = room.round

  if (!round?.cardId || !round.roundId) return null

  const card = getCard(round.category, round.cardId)
  const participants = getRoundParticipantsFromTeams(teams, round)
  const responses = await ctx.db
    .query('responses')
    .withIndex('by_round', (index) => index.eq('roundId', round.roundId!))
    .collect()
  const isRevealed = round.phase === 'revealed' || round.phase === 'resolved'

  return {
    card: publicCard(card, isRevealed),
    requiredResponseCount: participants.length,
    responseCount: responses.length,
    submittedTeamIds: responses.map((response) => response.teamId),
    revealedResponses: includeRevealedResponses && isRevealed
      ? responses
        .sort((left, right) => left.submittedAt - right.submittedAt)
        .map((response) => ({
          answer: JSON.parse(response.payload),
          teamId: response.teamId,
          teamName: teams.find((team) => team._id === response.teamId)?.name ?? 'Equipo',
        }))
      : undefined,
  }
}

async function getRoundParticipants(
  ctx: MutationCtx,
  room: NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>,
  round: NonNullable<NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>['round']>,
) {
  return getRoundParticipantsFromTeams(await listTeams(ctx, room._id), round)
}

function getRoundParticipantsFromTeams(
  teams: Awaited<ReturnType<typeof listTeams>>,
  round: NonNullable<NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>['round']>,
) {
  const activeTeams = teams.filter((team) => team.status === 'connected')

  if (round.category === 'approximation') return activeTeams
  return activeTeams.filter((team) => team._id === round.challengerId || team._id === round.targetId)
}

function getCard(category: CardCategory, cardId: string) {
  const card = cardDeck[category].find((candidate) => candidate.id === cardId)

  if (!card) throw new Error('No encontramos la tarjeta sorteada.')
  return card
}

function publicCard(card: QuestionCard, includeSolution: boolean) {
  if (card.category === 'sequence') {
    return { category: card.category, id: card.id, instruction: card.instruction, items: card.items, ...(includeSolution ? { solution: card.correctOrder } : {}) }
  }

  if (card.category === 'association') {
    return { category: card.category, id: card.id, instruction: card.instruction, leftItems: card.leftItems, rightItems: card.rightItems, ...(includeSolution ? { solution: card.pairs } : {}) }
  }

  if (card.category === 'common') {
    return { category: card.category, clues: card.clues, id: card.id, ...(includeSolution ? { solution: card.solution } : {}) }
  }

  return { category: card.category, id: card.id, prompt: card.prompt, unit: card.solution.unit, ...(includeSolution ? { solution: card.solution } : {}) }
}

function validatePayload(card: QuestionCard, payload: string) {
  let answer: unknown

  try {
    answer = JSON.parse(payload)
  } catch {
    throw new Error('La respuesta no tiene un formato válido.')
  }

  if (card.category === 'sequence') {
    if (!Array.isArray(answer) || answer.length !== card.items.length || new Set(answer).size !== card.items.length || !answer.every((item) => typeof item === 'string' && card.items.includes(item))) {
      throw new Error('Ordená los cinco elementos antes de confirmar.')
    }
    return
  }

  if (card.category === 'association') {
    if (!Array.isArray(answer) || answer.length !== card.leftItems.length || !answer.every((pair) => isPair(pair, card))) {
      throw new Error('Completá las cinco asociaciones antes de confirmar.')
    }
    const pairs = answer as Array<{ left: string; right: string }>
    if (new Set(pairs.map((pair) => pair.left)).size !== card.leftItems.length || new Set(pairs.map((pair) => pair.right)).size !== card.rightItems.length) {
      throw new Error('Cada elemento debe tener una sola pareja.')
    }
    return
  }

  if (card.category === 'common') {
    if (typeof answer !== 'string' || answer.trim().length < 2 || answer.trim().length > 300) {
      throw new Error('Escribí una respuesta breve antes de confirmar.')
    }
    return
  }

  if (typeof answer !== 'number' || !Number.isFinite(answer)) {
    throw new Error('Ingresá un número válido antes de confirmar.')
  }
}

function isPair(value: unknown, card: Extract<QuestionCard, { category: 'association' }>): value is { left: string; right: string } {
  if (!value || typeof value !== 'object' || !('left' in value) || !('right' in value)) return false
  const pair = value as { left?: unknown; right?: unknown }
  return typeof pair.left === 'string' && typeof pair.right === 'string' && card.leftItems.includes(pair.left) && card.rightItems.includes(pair.right)
}

type RoundRecord = NonNullable<NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>['round']>
type ComputedResult = { kind: 'challenger' | 'target' | 'approximation' | 'tie'; winnerTeamIds: Id<'teams'>[] }

async function calculateAutomaticResult(ctx: MutationCtx, room: NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>, round: RoundRecord): Promise<ComputedResult> {
  if (!round.roundId || !round.cardId) throw new Error('La tarjeta no está lista para corregir.')
  const card = getCard(round.category, round.cardId)
  const responses = await ctx.db
    .query('responses')
    .withIndex('by_round', (index) => index.eq('roundId', round.roundId!))
    .collect()

  if (card.category === 'approximation') {
    const distances = responses.map((response) => ({ response, distance: Math.abs(Number(JSON.parse(response.payload)) - card.solution.value) }))
    const nearest = Math.min(...distances.map((entry) => entry.distance))
    const winnerTeamIds = distances.filter((entry) => entry.distance === nearest).map((entry) => entry.response.teamId)
    await Promise.all(winnerTeamIds.map(async (teamId) => {
      const team = await ctx.db.get(teamId)
      if (team) await ctx.db.patch(teamId, { correctMarks: (team.correctMarks ?? 0) + 1 })
    }))
    return { kind: 'approximation', winnerTeamIds }
  }

  const scored = responses.map((response) => {
    const answer = JSON.parse(response.payload) as unknown
    let score = 0

    if (card.category === 'sequence') {
      score = (answer as string[]).filter((item, index) => item === card.correctOrder[index]).length
    } else if (card.category === 'association') {
      score = (answer as Array<{ left: string; right: string }>).filter((pair) => card.pairs.some((correct) => correct.left === pair.left && correct.right === pair.right)).length
    }
    return { response, score }
  }).sort((left, right) => right.score - left.score || left.response.submittedAt - right.response.submittedAt)
  const winner = scored[0]?.response.teamId

  await Promise.all(scored.map(async ({ response, score }) => {
    const team = await ctx.db.get(response.teamId)
    if (team) await ctx.db.patch(response.teamId, { correctMarks: (team.correctMarks ?? 0) + score })
  }))

  if (!winner) throw new Error('No encontramos respuestas para corregir.')
  return { kind: winner === round.challengerId ? 'challenger' : 'target', winnerTeamIds: [winner] }
}

async function settleRound(
  ctx: MutationCtx,
  room: NonNullable<Awaited<ReturnType<typeof getRoomByCode>>>,
  round: RoundRecord,
  result: ComputedResult,
) {
  const teams = await listTeams(ctx, room._id)
  const participants = getRoundParticipantsFromTeams(teams, round)
  const challenger = teams.find((team) => team._id === round.challengerId)

  if (!challenger || !round.wager) throw new Error('La ronda no tiene una apuesta válida.')
  const wager = round.wager

  const shouldCollect = result.kind !== 'tie'
  const basePot = shouldCollect ? wager * participants.length : 0
  const pot = basePot + (round.category === 'approximation' ? room.approximationRemainder ?? 0 : 0)
  const share = result.winnerTeamIds.length ? Math.floor(pot / result.winnerTeamIds.length) : 0
  const remainder = result.winnerTeamIds.length ? pot - share * result.winnerTeamIds.length : room.approximationRemainder ?? 0

  await Promise.all(participants.map((participant) => ctx.db.patch(participant._id, {
    ...(shouldCollect ? { money: (participant.money ?? 0) - wager + (result.winnerTeamIds.includes(participant._id) ? share : 0) } : {}),
    categoryStats: categoryStatsWithResult(participant.categoryStats, round.category, result.winnerTeamIds.includes(participant._id)),
  })))

  const challengerWon = result.winnerTeamIds.length === 1 && result.winnerTeamIds[0] === challenger._id
  const nextStreak = challengerWon ? (challenger.turnWins ?? 0) + 1 : 0
  const continueWithChallenger = challengerWon && nextStreak < 3
  const activeTeams = teams.filter((team) => team.status === 'connected')
  const nextTeam = continueWithChallenger ? challenger : nextActiveTeam(activeTeams, challenger._id)

  await ctx.db.patch(challenger._id, { turnWins: continueWithChallenger ? nextStreak : 0 })
  await ctx.db.patch(room._id, {
    approximationRemainder: round.category === 'approximation' ? remainder : room.approximationRemainder,
    round: { ...round, phase: 'resolved', result: { ...result, payout: share } },
    turnTeamId: nextTeam._id,
  })
}

function nextActiveTeam(teams: Awaited<ReturnType<typeof listTeams>>, currentTeamId: Id<'teams'>) {
  const currentIndex = teams.findIndex((team) => team._id === currentTeamId)
  return teams[(currentIndex + 1) % teams.length]
}

function createBoard() {
  const categories = CATEGORIES.flatMap((item) => Array.from({ length: 13 }, () => item))
  categories.push(CATEGORIES[randomIndex(CATEGORIES.length)])
  const maxBets = [
    ...Array.from({ length: 11 }, () => 100),
    ...Array.from({ length: 11 }, () => 200),
    ...Array.from({ length: 11 }, () => 300),
    ...Array.from({ length: 10 }, () => 400),
    ...Array.from({ length: 10 }, () => 500),
  ]
  const shops = new Set(shuffle(Array.from({ length: 53 }, (_, index) => index)).slice(0, 7))
  const shuffledCategories = shuffle(categories)
  const shuffledBets = shuffle(maxBets)

  return shuffledCategories.map((category, index) => ({
    category,
    isShop: shops.has(index),
    maxBet: shuffledBets[index],
  }))
}

function shuffle<T>(items: T[]) {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1)
    ;[result[index], result[target]] = [result[target], result[index]]
  }

  return result
}

function rollDie() {
  return randomIndex(6) + 1
}

function randomIndex(length: number) {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % length
}

async function createAvailableCode(
  ctx: MutationCtx,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = Array.from({ length: 6 }, () => {
      const bytes = new Uint32Array(1)
      crypto.getRandomValues(bytes)
      return ROOM_CODE_ALPHABET[bytes[0] % ROOM_CODE_ALPHABET.length]
    }).join('')
    const existing = await ctx.db
      .query('rooms')
      .withIndex('by_code', (index) => index.eq('code', code))
      .unique()

    if (!existing) {
      return code
    }
  }

  throw new Error('No se pudo crear un código de sala. Intentá de nuevo.')
}

function cleanTeamName(name: string) {
  const cleanName = name.trim().replaceAll(/\s+/g, ' ')

  if (cleanName.length < 2 || cleanName.length > 24) {
    throw new Error('El nombre del equipo debe tener entre 2 y 24 caracteres.')
  }

  return cleanName
}
