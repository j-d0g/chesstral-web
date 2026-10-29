import { Chess } from 'chess.js'
import { describe, expect, it, vi } from 'vitest'
import { analyzeMoves, calculateMoveAccuracy, classifyMove } from './analysis'
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

  it('uses pre-move recommendations and post-move scores for each ply', async () => {
    const evaluate = vi.fn()
      .mockResolvedValueOnce({ evaluation: 0.2, best_move: 'e2e4', analysis: { pv: ['e2e4', 'e7e5'] } })
      .mockResolvedValueOnce({ evaluation: 0.1, best_move: 'e7e5', analysis: { pv: ['e7e5', 'g1f3'] } })
      .mockResolvedValueOnce({ evaluation: 0.3, best_move: 'g1f3' })
    const progress = vi.fn()

    const analyses = await analyzeMoves(
      new Chess().fen(), ['e4', 'e5'], 18, evaluate, () => null, progress, () => true,
    )

    expect(analyses?.map(({ bestMove, evaluation, principalVariation }) => ({
      bestMove, evaluation, principalVariation,
    }))).toEqual([
      { bestMove: 'e2e4', evaluation: 0.1, principalVariation: ['e2e4', 'e7e5'] },
      { bestMove: 'e7e5', evaluation: 0.3, principalVariation: ['e7e5', 'g1f3'] },
    ])
    expect(evaluate).toHaveBeenCalledTimes(3)
    expect(progress.mock.calls).toEqual([[50], [100]])
  })

  it('preserves Black-to-move fullmove numbers from a custom FEN', async () => {
    const evaluate = vi.fn().mockResolvedValue({ evaluation: 0 })
    const analyses = await analyzeMoves(
      '7k/8/8/8/8/8/P7/7K b - - 0 17', ['Kg8', 'a3'], 12,
      evaluate, () => null, () => {}, () => true,
    )
    expect(analyses?.map(({ moveNumber, isWhiteMove }) => ({ moveNumber, isWhiteMove })))
      .toEqual([{ moveNumber: 17, isWhiteMove: false }, { moveNumber: 18, isWhiteMove: true }])
  })

  it('rejects a failed evaluation rather than inventing a perfect move score', async () => {
    const evaluate = vi.fn()
      .mockResolvedValueOnce({ evaluation: 0.2 })
      .mockRejectedValueOnce(new Error('API offline'))
    const progress = vi.fn()
    await expect(analyzeMoves(
      new Chess().fen(), ['e4', 'e5'], 18, evaluate, () => null, progress, () => true,
    )).rejects.toThrow('API offline')
    expect(progress).not.toHaveBeenCalled()
    expect(evaluate).toHaveBeenCalledTimes(2)
  })

  it('stops a cancelled run without publishing progress or requesting more moves', async () => {
    let current = true
    const evaluate = vi.fn()
      .mockResolvedValueOnce({ evaluation: 0.2 })
      .mockImplementationOnce(async () => {
        current = false
        return { evaluation: 0.1 }
      })
    const progress = vi.fn()
    expect(await analyzeMoves(
      new Chess().fen(), ['e4', 'e5'], 18, evaluate, () => null, progress, () => current,
    )).toBeNull()
    expect(progress).not.toHaveBeenCalled()
    expect(evaluate).toHaveBeenCalledTimes(2)
  })
})
