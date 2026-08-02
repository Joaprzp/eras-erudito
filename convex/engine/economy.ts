export type BetBoundsResult = {
  minBet: number
  maxBet: number
}

export type InsolvencyResult = {
  canPay: boolean
  newBalance: number
  newCoins: number
  soldCoin: boolean
  isEliminated: boolean
}

/**
 * Calculates valid betting bounds ($100 minimum, capped by tile limit & minimum participant balance).
 */
export function calculateBetBounds(participantBalances: number[], tileCap: number): BetBoundsResult {
  const minBalance = Math.min(...participantBalances)
  const maxBet = Math.min(tileCap, minBalance)

  return {
    minBet: 100,
    maxBet: Math.max(100, maxBet),
  }
}

/**
 * Resolves team insolvency when balance is below minimum bet requirement ($100).
 */
export function resolveInsolvency(currentBalance: number, currentCoins: number): InsolvencyResult {
  if (currentBalance >= 100) {
    return {
      canPay: true,
      newBalance: currentBalance,
      newCoins: currentCoins,
      soldCoin: false,
      isEliminated: false,
    }
  }

  if (currentCoins > 0) {
    return {
      canPay: true,
      newBalance: currentBalance + 1000,
      newCoins: currentCoins - 1,
      soldCoin: true,
      isEliminated: false,
    }
  }

  return {
    canPay: false,
    newBalance: currentBalance,
    newCoins: 0,
    soldCoin: false,
    isEliminated: true,
  }
}

/**
 * Transfers pot earnings to winning team.
 */
export function transferPot(
  balances: Record<string, number>,
  winnerId: string,
  potAmount: number
): Record<string, number> {
  const current = balances[winnerId] ?? 0
  return {
    ...balances,
    [winnerId]: current + potAmount,
  }
}
