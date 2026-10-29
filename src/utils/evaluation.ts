export interface Evaluation {
  score: number
  mate?: number | null
}

export function formatEvaluation(score: number, mate?: number | null): string {
  if (mate === 0) return 'Checkmate'
  if (mate != null) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`
  return score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)
}

export function evaluationWinChance({ score, mate }: Evaluation): number {
  if (mate != null) {
    if (mate > 0) return 1
    if (mate < 0) return 0
    return score > 0 ? 1 : 0
  }

  const centipawns = score * 100
  return 1 / (1 + Math.exp(-0.00368208 * centipawns))
}
