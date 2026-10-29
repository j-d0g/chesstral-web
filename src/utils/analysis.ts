import { Chess } from 'chess.js'
import type { EvaluationRequest, EvaluationResponse } from '../services/apiService'
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

export async function analyzeMoves(
  startFen: string,
  moves: string[],
  depth: number,
  evaluate: (request: EvaluationRequest) => Promise<EvaluationResponse>,
  lookupOpening: (fen: string) => OpeningInfo | null,
  onProgress: (progress: number) => void,
  isCurrent: () => boolean,
): Promise<MoveAnalysis[] | null> {
  const replay = new Chess(startFen)
  let previous = await evaluate({ fen: replay.fen(), depth })
  const analyses: MoveAnalysis[] = []

  for (let index = 0; index < moves.length; index += 1) {
    if (!isCurrent()) return null
    const move = moves[index]
    const isWhiteMove = replay.turn() === 'w'
    const moveNumber = Number(replay.fen().split(' ')[5])
    replay.move(move)
    const fen = replay.fen()
    const openingInfo = lookupOpening(fen)
    const current = await evaluate({ fen, depth })
    if (!isCurrent()) return null

    const accuracy = calculateMoveAccuracy(
      { score: previous.evaluation, mate: previous.mate },
      { score: current.evaluation, mate: current.mate },
      isWhiteMove,
    )
    analyses.push({
      moveNumber,
      move,
      fen,
      evaluation: current.evaluation,
      mate: current.mate,
      bestMove: previous.best_move,
      principalVariation: previous.analysis?.pv,
      classification: openingInfo ? 'book' : classifyMove(accuracy.winChanceLoss),
      evaluationLoss: Math.abs(current.evaluation - previous.evaluation),
      winChanceLoss: openingInfo ? 0 : accuracy.winChanceLoss,
      accuracy: openingInfo ? 100 : accuracy.accuracy,
      openingInfo: openingInfo ?? undefined,
      isWhiteMove,
    })
    previous = current
    onProgress(((index + 1) / moves.length) * 100)
  }

  return isCurrent() ? analyses : null
}
