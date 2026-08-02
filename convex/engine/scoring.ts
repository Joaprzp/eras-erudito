export type SequenceResult = {
  correctCount: number
}

export type AssociationResult = {
  correctCount: number
}

export type ApproximationResult = {
  winners: string[]
  isTie: boolean
  minDifference: number
}

/**
 * Evaluates Sequence category: counts exact position matches.
 */
export function evaluateSequence(submitted: number[], correct: number[]): SequenceResult {
  let count = 0
  const length = Math.min(submitted.length, correct.length)

  for (let i = 0; i < length; i++) {
    if (submitted[i] === correct[i]) {
      count++
    }
  }

  return { correctCount: count }
}

/**
 * Evaluates Association category: counts correct key-value pair associations.
 */
export function evaluateAssociation(
  submitted: Record<string, string>,
  correct: Record<string, string>
): AssociationResult {
  let count = 0

  for (const key of Object.keys(correct)) {
    if (submitted[key] === correct[key]) {
      count++
    }
  }

  return { correctCount: count }
}

/**
 * Evaluates Approximation category: finds closest guess to target value.
 */
export function evaluateApproximation(
  answers: Record<string, number>,
  target: number
): ApproximationResult {
  const entries = Object.entries(answers)

  if (entries.length === 0) {
    return { winners: [], isTie: false, minDifference: Infinity }
  }

  let minDiff = Infinity
  const differences: Record<string, number> = {}

  for (const [teamId, guess] of entries) {
    const diff = Math.abs(guess - target)
    differences[teamId] = diff
    if (diff < minDiff) {
      minDiff = diff
    }
  }

  const winners = entries
    .filter(([teamId]) => differences[teamId] === minDiff)
    .map(([teamId]) => teamId)

  return {
    winners,
    isTie: winners.length > 1,
    minDifference: minDiff,
  }
}
