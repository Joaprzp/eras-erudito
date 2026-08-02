import { describe, expect, test } from 'bun:test'
import { calculateBetBounds, resolveInsolvency, transferPot } from './economy'

describe('Economy Module', () => {
  test('calculateBetBounds limits max bet by tile cap when all teams have high balance', () => {
    const balances = [2000, 1500, 1000]
    const tileCap = 500
    const bounds = calculateBetBounds(balances, tileCap)

    expect(bounds.minBet).toBe(100)
    expect(bounds.maxBet).toBe(500)
  })

  test('calculateBetBounds limits max bet by lowest contributing team balance when below tile cap', () => {
    const balances = [2000, 300]
    const tileCap = 500
    const bounds = calculateBetBounds(balances, tileCap)

    expect(bounds.minBet).toBe(100)
    expect(bounds.maxBet).toBe(300)
  })

  test('resolveInsolvency sells a coin for $1000 if balance is under $100', () => {
    const result = resolveInsolvency(50, 2)

    expect(result.canPay).toBe(true)
    expect(result.newBalance).toBe(1050)
    expect(result.newCoins).toBe(1)
    expect(result.soldCoin).toBe(true)
    expect(result.isEliminated).toBe(false)
  })

  test('resolveInsolvency eliminates team if balance is under $100 and no coins owned', () => {
    const result = resolveInsolvency(50, 0)

    expect(result.canPay).toBe(false)
    expect(result.newBalance).toBe(50)
    expect(result.newCoins).toBe(0)
    expect(result.soldCoin).toBe(false)
    expect(result.isEliminated).toBe(true)
  })

  test('transferPot awards pot amount to winner balance', () => {
    const balances = { teamA: 1800, teamB: 1800 }
    const updated = transferPot(balances, 'teamA', 400)

    expect(updated.teamA).toBe(2200)
    expect(updated.teamB).toBe(1800)
  })
})
