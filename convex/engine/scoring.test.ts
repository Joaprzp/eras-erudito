import { describe, expect, test } from 'bun:test'
import { evaluateApproximation, evaluateAssociation, evaluateSequence } from './scoring'

describe('Scoring Module', () => {
  test('evaluateSequence counts exact position matches', () => {
    const submitted = [0, 1, 3, 2, 4]
    const correct = [0, 1, 2, 3, 4]
    const result = evaluateSequence(submitted, correct)

    expect(result.correctCount).toBe(3) // 0, 1, 4 match
  })

  test('evaluateAssociation counts correct key-value pairs', () => {
    const submitted = { a: '1', b: '2', c: '4', d: '3', e: '5' }
    const correct = { a: '1', b: '2', c: '3', d: '4', e: '5' }
    const result = evaluateAssociation(submitted, correct)

    expect(result.correctCount).toBe(3) // a, b, e match
  })

  test('evaluateApproximation identifies single winner closest to target', () => {
    const answers = { teamA: 1950, teamB: 1980, teamC: 2010 }
    const target = 1975
    const result = evaluateApproximation(answers, target)

    expect(result.winners).toEqual(['teamB']) // |1980 - 1975| = 5
    expect(result.isTie).toBe(false)
  })

  test('evaluateApproximation identifies multiple winners on tie distance', () => {
    const answers = { teamA: 1970, teamB: 1980 }
    const target = 1975
    const result = evaluateApproximation(answers, target)

    expect(result.winners.sort()).toEqual(['teamA', 'teamB']) // both distance = 5
    expect(result.isTie).toBe(true)
  })
})
