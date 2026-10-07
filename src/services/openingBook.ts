import { Chess } from 'chess.js'

export interface OpeningInfo {
  eco: string
  name: string
  pgn: string
  epd: string
}

function fenToEpd(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ')
}

function parsePgnMoves(pgn: string): string[] {
  return pgn
    .replace(/\d+\.(?:\.\.)?/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/[!?+#]+$/g, ''))
    .filter((token) => token && !['1-0', '0-1', '1/2-1/2', '*'].includes(token))
}

export function parseOpeningTsv(text: string): OpeningInfo[] {
  const openings: OpeningInfo[] = []

  for (const line of text.split(/\r?\n/).slice(1)) {
    const [eco, name, pgn] = line.split('\t')
    if (!eco || !name || !pgn) continue

    try {
      const chess = new Chess()
      for (const move of parsePgnMoves(pgn)) chess.move(move)
      openings.push({ eco, name, pgn, epd: fenToEpd(chess.fen()) })
    } catch {
      continue
    }
  }

  return openings
}

export class OpeningBookService {
  private openings = new Map<string, OpeningInfo>()
  private loaded = false

  async loadOpenings(): Promise<void> {
    if (this.loaded) return

    try {
      for (const file of ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv']) {
        const response = await fetch(`/data/${file}`)
        if (!response.ok) throw new Error(`Failed to load opening book file ${file}`)
        this.addTsv(await response.text())
      }
      this.loaded = true
    } catch (error) {
      console.error('Failed to load opening book:', error)
    }
  }

  addTsv(text: string): void {
    for (const opening of parseOpeningTsv(text)) {
      this.openings.set(opening.epd, opening)
    }
  }

  lookupOpening(fen: string): OpeningInfo | null {
    return this.openings.get(fenToEpd(fen)) ?? null
  }

  currentOpening(history: string[], startFen: string): OpeningInfo | null {
    const chess = new Chess(startFen)
    let deepest = this.lookupOpening(chess.fen())

    for (const move of history) {
      try {
        chess.move(move)
      } catch {
        break
      }
      deepest = this.lookupOpening(chess.fen()) ?? deepest
    }

    return deepest
  }

  isPositionInBook(fen: string): boolean {
    return this.lookupOpening(fen) !== null
  }

  getOpeningStats(): { total: number; loaded: boolean } {
    return { total: this.openings.size, loaded: this.loaded }
  }
}

export const openingBook = new OpeningBookService()
