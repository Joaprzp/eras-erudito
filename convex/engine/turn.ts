export type TurnProgressionArgs = {
  consecutiveWins: number
  challengerWon: boolean
  currentTurnIndex: number
  totalTeams: number
}

export type TurnProgressionResult = {
  nextTurnIndex: number
  nextConsecutiveWins: number
  turnRotated: boolean
}

export type TeamStatus = {
  id: string
  coins: number
  isEliminated: boolean
}

export type VictoryCheckResult = {
  isGameOver: boolean
  winnerId?: string
}

/**
 * Resolves turn rotation rules (max 3 consecutive wins for challenger before rotation).
 */
export function resolveTurnProgression(args: TurnProgressionArgs): TurnProgressionResult {
  const { consecutiveWins, challengerWon, currentTurnIndex, totalTeams } = args

  if (challengerWon && consecutiveWins < 2) {
    return {
      nextTurnIndex: currentTurnIndex,
      nextConsecutiveWins: consecutiveWins + 1,
      turnRotated: false,
    }
  }

  const nextTurnIndex = (currentTurnIndex + 1) % totalTeams

  return {
    nextTurnIndex,
    nextConsecutiveWins: 0,
    turnRotated: true,
  }
}

/**
 * Checks game victory conditions: 4 coins collected or sole surviving active team.
 */
export function checkVictoryCondition(teams: TeamStatus[]): VictoryCheckResult {
  const winnerByCoins = teams.find((t) => !t.isEliminated && t.coins >= 4)
  if (winnerByCoins) {
    return {
      isGameOver: true,
      winnerId: winnerByCoins.id,
    }
  }

  const activeTeams = teams.filter((t) => !t.isEliminated)
  if (activeTeams.length === 1 && teams.length > 1) {
    return {
      isGameOver: true,
      winnerId: activeTeams[0].id,
    }
  }

  return {
    isGameOver: false,
  }
}
