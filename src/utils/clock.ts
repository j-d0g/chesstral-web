export type ClockFormat = 'blitz' | 'rapid' | 'classical' | 'unlimited'
export type ClockSide = 'white' | 'black'
export type ClockTurn = 'w' | 'b'

export interface ClockState {
  white: number
  black: number
  runningSince: number | null
}

const formatSeconds: Record<ClockFormat, number> = {
  blitz: 180,
  rapid: 600,
  classical: 1800,
  unlimited: 0,
}

const formatIncrementMs: Record<ClockFormat, number> = {
  blitz: 2_000,
  rapid: 5_000,
  classical: 30_000,
  unlimited: 0,
}

export function initialClock(format: ClockFormat): ClockState {
  const milliseconds = formatSeconds[format] * 1_000
  return { white: milliseconds, black: milliseconds, runningSince: null }
}

export function tick(clock: ClockState, turn: ClockTurn, now: number): ClockState {
  if (clock.runningSince === null) return clock

  const side: ClockSide = turn === 'w' ? 'white' : 'black'
  const remaining = Math.max(0, clock[side] - Math.max(0, now - clock.runningSince))

  return {
    ...clock,
    [side]: remaining,
    runningSince: remaining === 0 ? null : now,
  }
}

export function applyMove(
  clock: ClockState,
  mover: ClockSide,
  now: number,
  incrementMs: number,
): ClockState {
  const ticked = tick(clock, mover === 'white' ? 'w' : 'b', now)
  if (ticked[mover] === 0) return { ...ticked, runningSince: null }

  return {
    ...ticked,
    [mover]: ticked[mover] + incrementMs,
    runningSince: now,
  }
}

export function incrementFor(format: ClockFormat): number {
  return formatIncrementMs[format]
}

export function sideToMoveAfter(startingTurn: ClockTurn, moveCount: number): ClockTurn {
  return moveCount % 2 === 0 ? startingTurn : startingTurn === 'w' ? 'b' : 'w'
}
