import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const category = v.union(
  v.literal('sequence'),
  v.literal('association'),
  v.literal('common'),
  v.literal('approximation'),
)

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    companionToken: v.string(),
    phase: v.union(v.literal('lobby'), v.literal('active'), v.literal('finished')),
    createdAt: v.number(),
    board: v.optional(v.array(v.object({ category, isShop: v.boolean(), maxBet: v.number() }))),
    lastRoll: v.optional(v.number()),
    round: v.optional(v.object({
      category,
      challengerId: v.id('teams'),
      maxBet: v.number(),
      phase: v.union(
        v.literal('choose_category'),
        v.literal('choose_rival'),
        v.literal('choose_bet'),
        v.literal('awaiting_card'),
        v.literal('answering'),
        v.literal('ready_to_reveal'),
        v.literal('revealed'),
        v.literal('resolved'),
      ),
      targetId: v.optional(v.id('teams')),
      wager: v.optional(v.number()),
      cardId: v.optional(v.string()),
      roundId: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      result: v.optional(v.object({
        kind: v.union(v.literal('challenger'), v.literal('target'), v.literal('approximation'), v.literal('tie')),
        payout: v.number(),
        winnerTeamIds: v.array(v.id('teams')),
      })),
      isStart: v.optional(v.boolean()),
    })),
    turnTeamId: v.optional(v.id('teams')),
    usedCardIds: v.optional(v.array(v.string())),
    approximationRemainder: v.optional(v.number()),
    shopTeamId: v.optional(v.id('teams')),
    winnerTeamId: v.optional(v.id('teams')),
  }).index('by_code', ['code']),
  teams: defineTable({
    roomId: v.id('rooms'),
    token: v.string(),
    joinIndex: v.number(),
    name: v.string(),
    color: v.string(),
    isHost: v.boolean(),
    status: v.union(v.literal('connected'), v.literal('eliminated')),
    coins: v.optional(v.number()),
    money: v.optional(v.number()),
    position: v.optional(v.number()),
    turnWins: v.optional(v.number()),
    answeredCards: v.optional(v.number()),
    correctMarks: v.optional(v.number()),
    totalResponseMs: v.optional(v.number()),
  })
    .index('by_room', ['roomId'])
    .index('by_room_token', ['roomId', 'token']),
  responses: defineTable({
    roomId: v.id('rooms'),
    roundId: v.string(),
    teamId: v.id('teams'),
    payload: v.string(),
    submittedAt: v.number(),
    responseMs: v.optional(v.number()),
  })
    .index('by_round', ['roundId'])
    .index('by_round_team', ['roundId', 'teamId']),
})
