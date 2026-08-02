import type { CardCategory } from '../cardDeck'

export type BoardTile = {
  category: CardCategory
  maxBet: number
  isShop: boolean
}

export type MovementResult = {
  position: number
  crossedStart: boolean
  landedOnStart: boolean
}

export type TileConfigResult = {
  category: CardCategory
  maxBet: number
  isStart: boolean
  isShop: boolean
}

/**
 * Calculates board position movement along a 54-tile continuous loop (0-53).
 */
export function calculateMovement(previousPosition: number, rollTotal: number): MovementResult {
  const rawPosition = previousPosition + rollTotal
  const position = rawPosition % 54
  const landedOnStart = position === 0
  const crossedStart = rawPosition >= 54

  return {
    position,
    crossedStart,
    landedOnStart,
  }
}

/**
 * Resolves category, betting limits, and shop rights for a target tile.
 */
export function getTileConfig(
  position: number,
  board: BoardTile[],
  landedOnStart: boolean
): TileConfigResult {
  if (landedOnStart) {
    return {
      category: 'sequence',
      maxBet: 500,
      isStart: true,
      isShop: false,
    }
  }

  const tileIndex = position - 1
  const tile = board[tileIndex]

  if (!tile) {
    throw new Error(`Casillero de destino no encontrado para posición ${position}`)
  }

  return {
    category: tile.category,
    maxBet: tile.maxBet,
    isStart: false,
    isShop: tile.isShop,
  }
}
