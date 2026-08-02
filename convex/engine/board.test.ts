import { describe, expect, test } from 'bun:test'
import { calculateMovement, getTileConfig } from './board'

describe('Board Module', () => {
  test('calculateMovement handles normal advancement without crossing start', () => {
    const result = calculateMovement(10, 7)
    expect(result.position).toBe(17)
    expect(result.crossedStart).toBe(false)
    expect(result.landedOnStart).toBe(false)
  })

  test('calculateMovement detects crossing start when exceeding position 53', () => {
    const result = calculateMovement(50, 6)
    expect(result.position).toBe(2)
    expect(result.crossedStart).toBe(true)
    expect(result.landedOnStart).toBe(false)
  })

  test('calculateMovement detects landing exactly on start (position 0)', () => {
    const result = calculateMovement(48, 6)
    expect(result.position).toBe(0)
    expect(result.crossedStart).toBe(true)
    expect(result.landedOnStart).toBe(true)
  })

  test('getTileConfig returns start configuration when landedOnStart is true', () => {
    const mockBoard = [
      { category: 'sequence' as const, maxBet: 200, isShop: false },
    ]
    const config = getTileConfig(0, mockBoard, true)
    expect(config.category).toBe('sequence')
    expect(config.maxBet).toBe(500)
    expect(config.isStart).toBe(true)
    expect(config.isShop).toBe(false)
  })

  test('getTileConfig returns tile configuration for valid board index', () => {
    const mockBoard = [
      { category: 'association' as const, maxBet: 300, isShop: true },
      { category: 'common' as const, maxBet: 400, isShop: false },
    ]
    const config = getTileConfig(1, mockBoard, false)
    expect(config.category).toBe('association')
    expect(config.maxBet).toBe(300)
    expect(config.isStart).toBe(false)
    expect(config.isShop).toBe(true)
  })
})
