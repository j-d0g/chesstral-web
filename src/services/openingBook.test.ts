import { describe, expect, it } from 'vitest'
import { OpeningBookService, parseOpeningTsv } from './openingBook'

const fixture = [
  'eco\tname\tpgn',
  'B00\tKing Pawn Opening\t1. e4',
  'C20\tOpen Game\t1. e4 e5',
  'C44\tKing Knight Opening\t1. e4 e5 2. Nf3',
].join('\n')

describe('opening book', () => {
  it('parses opening TSV rows without network access', () => {
    expect(parseOpeningTsv(fixture)).toHaveLength(3)
  })

  it('returns the deepest matching opening from the supplied starting FEN', () => {
    const book = new OpeningBookService()
    book.addTsv(fixture)

    expect(book.currentOpening(['e4', 'e5'], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')?.eco)
      .toBe('C20')
    expect(book.currentOpening(['e4', 'e5', 'Nf3'], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')?.eco)
      .toBe('C44')
  })
})
