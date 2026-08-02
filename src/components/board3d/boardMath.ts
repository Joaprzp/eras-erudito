import { Vector3 } from 'three'

export type BoardCategory = 'sequence' | 'association' | 'common' | 'approximation'

export type BoardSpace = {
  category: BoardCategory
  isShop: boolean
  maxBet: number
}

export type BoardTeam = {
  id: string
  coins: number
  color: string
  joinIndex: number
  money: number
  name: string
  position: number
}

export const TOTAL_SPACES = 54
export const TILE_WIDTH = 1.06
export const TILE_DEPTH = 0.78
export const TILE_GAP = 0.14

export const CATEGORY_COLORS: Record<BoardCategory, string> = {
  sequence: '#e07a5f',
  association: '#f2cc8f',
  common: '#81b29a',
  approximation: '#3d405b',
}

/**
 * Calculates (x, z) coordinates along the 54-tile S-curve layout.
 */
export function getTilePosition(index: number): Vector3 {
  const row = Math.floor(index / 9)
  const col = index % 9
  const isReverse = row % 2 === 1
  const actualCol = isReverse ? 8 - col : col

  const x = (actualCol - 4) * (TILE_WIDTH + TILE_GAP)
  const z = (row - 2.5) * (TILE_DEPTH + TILE_GAP)

  return new Vector3(x, 0, z)
}
