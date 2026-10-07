import { describe, expect, it } from 'vitest'
import { applyMove, initialClock, sideToMoveAfter, tick } from './clock'

describe('clock helpers', () => {
  it('subtracts elapsed time only from the side to move', () => {
    const clock = { white: 10_000, black: 8_000, runningSince: 1_000 }
    expect(tick(clock, 'w', 1_500)).toEqual({
      white: 9_500,
      black: 8_000,
      runningSince: 1_500,
    })
  })

  it('applies increment after subtracting the mover elapsed time', () => {
    const clock = { white: 10_000, black: 8_000, runningSince: 1_000 }
    expect(applyMove(clock, 'white', 1_500, 2_000)).toEqual({
      white: 11_500,
      black: 8_000,
      runningSince: 1_500,
    })
  })

  it('flags at zero and initializes the selected time format', () => {
    expect(tick({ white: 200, black: 500, runningSince: 1_000 }, 'w', 1_200)).toEqual({
      white: 0,
      black: 500,
      runningSince: null,
    })
    expect(initialClock('rapid')).toEqual({
      white: 600_000,
      black: 600_000,
      runningSince: null,
    })
  })

  it('tracks the live turn independently of a browsed move', () => {
    expect(sideToMoveAfter('w', 2)).toBe('w')
    expect(sideToMoveAfter('b', 3)).toBe('w')
  })
})
