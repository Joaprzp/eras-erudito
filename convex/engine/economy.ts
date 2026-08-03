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
export function resolveInsolvency(
  currentBalance: number,
  currentCoins: number,
  requiredAmount: number = 100
): InsolvencyResult {
  let balance = currentBalance
  let coins = currentCoins
  let soldCoin = false

  while (balance < requiredAmount && coins > 0) {
    balance += 1000
    coins -= 1
    soldCoin = true
  }

  if (balance >= requiredAmount) {
    return {
      canPay: true,
      newBalance: balance,
      newCoins: coins,
      soldCoin,
      isEliminated: false,
    }
  }

  return {
    canPay: false,
    newBalance: balance,
    newCoins: coins,
    soldCoin,
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
