import type { OpeningInfo } from '../services/openingBook'
import { evaluationWinChance, type Evaluation } from './evaluation'

export type MoveClassification =
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'book'

export interface MoveAnalysis {
  moveNumber: number
  move: string
  fen: string
  evaluation: number
  mate?: number | null
  bestMove?: string
  classification: MoveClassification
  evaluationLoss: number
  winChanceLoss: number
  accuracy: number
  principalVariation?: string[]
  openingInfo?: OpeningInfo
  isWhiteMove: boolean
}

export function classifyMove(winChanceLoss: number): MoveClassification {
  if (winChanceLoss <= 0.02) return 'best'
  if (winChanceLoss <= 0.05) return 'excellent'
  if (winChanceLoss <= 0.1) return 'good'
  if (winChanceLoss <= 0.2) return 'inaccuracy'
  if (winChanceLoss <= 0.3) return 'mistake'
  return 'blunder'
}

export function calculateMoveAccuracy(
  previous: Evaluation,
  current: Evaluation,
  isWhiteMove: boolean,
): { winChanceLoss: number; accuracy: number } {
  const previousChance = evaluationWinChance(previous)
  const currentChance = evaluationWinChance(current)
  const winChanceLoss = isWhiteMove
    ? Math.max(0, previousChance - currentChance)
    : Math.max(0, currentChance - previousChance)

  return {
    winChanceLoss,
    accuracy: Math.max(0, 100 - winChanceLoss * 400),
  }
}
