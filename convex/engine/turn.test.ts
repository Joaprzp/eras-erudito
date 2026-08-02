import { describe, expect, test } from 'bun:test'
import { checkVictoryCondition, resolveTurnProgression } from './turn'

describe('Turn Module', () => {
  test('resolveTurnProgression keeps challenger when challenger wins and consecutiveWins < 3', () => {
    const result = resolveTurnProgression({
      consecutiveWins: 1,
      challengerWon: true,
      currentTurnIndex: 0,
      totalTeams: 3,
    })

    expect(result.nextTurnIndex).toBe(0)
    expect(result.nextConsecutiveWins).toBe(2)
    expect(result.turnRotated).toBe(false)
  })

  test('resolveTurnProgression rotates turn when challenger reaches 3 consecutive wins', () => {
    const result = resolveTurnProgression({
      consecutiveWins: 2,
      challengerWon: true,
      currentTurnIndex: 0,
      totalTeams: 3,
    })

    expect(result.nextTurnIndex).toBe(1)
    expect(result.nextConsecutiveWins).toBe(0)
    expect(result.turnRotated).toBe(true)
  })

  test('resolveTurnProgression rotates turn when challenger loses', () => {
    const result = resolveTurnProgression({
      consecutiveWins: 1,
      challengerWon: false,
      currentTurnIndex: 1,
      totalTeams: 3,
    })

    expect(result.nextTurnIndex).toBe(2)
    expect(result.nextConsecutiveWins).toBe(0)
    expect(result.turnRotated).toBe(true)
  })

  test('checkVictoryCondition detects team with 4 coins as winner', () => {
    const teams = [
      { id: 'teamA', coins: 4, isEliminated: false },
      { id: 'teamB', coins: 2, isEliminated: false },
    ]
    const result = checkVictoryCondition(teams)

    expect(result.isGameOver).toBe(true)
    expect(result.winnerId).toBe('teamA')
  })

  test('checkVictoryCondition detects sole active team remaining as winner', () => {
    const teams = [
      { id: 'teamA', coins: 1, isEliminated: true },
      { id: 'teamB', coins: 2, isEliminated: false },
      { id: 'teamC', coins: 0, isEliminated: true },
    ]
    const result = checkVictoryCondition(teams)

    expect(result.isGameOver).toBe(true)
    expect(result.winnerId).toBe('teamB')
  })

  test('checkVictoryCondition returns game in progress when no victory condition met', () => {
    const teams = [
      { id: 'teamA', coins: 1, isEliminated: false },
      { id: 'teamB', coins: 2, isEliminated: false },
    ]
    const result = checkVictoryCondition(teams)

    expect(result.isGameOver).toBe(false)
    expect(result.winnerId).toBeUndefined()
  })
})
