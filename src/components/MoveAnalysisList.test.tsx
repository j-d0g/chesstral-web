import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MoveAnalysis } from '../utils/analysis'
import MoveAnalysisList from './MoveAnalysisList'

describe('move analysis labels', () => {
  it('renders the actual move number and side from a custom starting position', () => {
    const analysis: MoveAnalysis = {
      moveNumber: 17,
      isWhiteMove: false,
      move: 'Kg8',
      fen: '6k1/8/8/8/8/8/P7/7K w - - 1 18',
      evaluation: 0,
      classification: 'best',
      evaluationLoss: 0,
      winChanceLoss: 0,
      accuracy: 100,
    }
    const markup = renderToStaticMarkup(
      <MoveAnalysisList analyses={[analysis]} currentMoveIndex={0} onSelectMove={() => {}} />,
    )
    expect(markup).toContain('>17...</span>')
    expect(markup).not.toContain('>1.</span>')
  })
})
