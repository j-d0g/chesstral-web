import { describe, expect, it } from 'vitest'
import { calculateMoveAccuracy, classifyMove } from './analysis'
import { evaluationWinChance, formatEvaluation } from './evaluation'

describe('analysis helpers', () => {
  it('classifies move quality at each win-chance threshold', () => {
    expect(classifyMove(0.02)).toBe('best')
    expect(classifyMove(0.05)).toBe('excellent')
    expect(classifyMove(0.1)).toBe('good')
    expect(classifyMove(0.2)).toBe('inaccuracy')
    expect(classifyMove(0.3)).toBe('mistake')
    expect(classifyMove(0.31)).toBe('blunder')
  })

  it('calculates loss from the moving player perspective', () => {
    expect(calculateMoveAccuracy({ score: 0 }, { score: -1 }, true).winChanceLoss).toBeGreaterThan(0)
    expect(calculateMoveAccuracy({ score: 0 }, { score: 1 }, false).winChanceLoss).toBeGreaterThan(0)
  })

  it('treats mate as a certain win or loss and formats mate distance', () => {
    expect(evaluationWinChance({ score: 0 })).toBe(0.5)
    expect(evaluationWinChance({ score: 1_000, mate: 3 })).toBe(1)
    expect(evaluationWinChance({ score: -1_000, mate: -2 })).toBe(0)
    expect(evaluationWinChance({ score: 1_000, mate: 0 })).toBe(1)
    expect(evaluationWinChance({ score: -1_000, mate: 0 })).toBe(0)
    expect(formatEvaluation(1_000, 3)).toBe('M3')
    expect(formatEvaluation(-1_000, -2)).toBe('-M2')
    expect(formatEvaluation(1_000, 0)).toBe('Checkmate')
    expect(formatEvaluation(-1_000, 0)).toBe('Checkmate')
  })
})
