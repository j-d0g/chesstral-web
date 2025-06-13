import { Chess } from 'chess.js'

export interface OpeningInfo {
  eco: string
  name: string
  pgn: string
  epd?: string
}

class OpeningBookService {
  private openings: Map<string, OpeningInfo> = new Map()
  private loaded = false

  async loadOpenings(): Promise<void> {
    if (this.loaded) return

    try {
      const files = ['a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv']
      
      for (const file of files) {
        const response = await fetch(`/data/${file}`)
        const text = await response.text()
        this.parseTSV(text)
      }
      
      this.loaded = true
      console.log(`Loaded ${this.openings.size} chess openings`)
    } catch (error) {
      console.error('Failed to load opening book:', error)
    }
  }

  private parseTSV(text: string): void {
    const lines = text.split('\n')
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const parts = line.split('\t')
      if (parts.length >= 3) {
        const [eco, name, pgn] = parts
        
        try {
          // Play through the moves to get the final position
          const chess = new Chess()
          const moves = this.parsePGN(pgn)
          
          for (const move of moves) {
            chess.move(move)
          }
          
          // Get EPD (FEN without move numbers)
          const fen = chess.fen()
          const epd = this.fenToEpd(fen)
          
          const opening: OpeningInfo = {
            eco,
            name,
            pgn,
            epd
          }
          
          // Store by EPD for fast lookup
          this.openings.set(epd, opening)
        } catch (error) {
          // Skip invalid PGN entries
          console.warn(`Invalid PGN for ${name}: ${pgn}`)
        }
      }
    }
  }

  private parsePGN(pgn: string): string[] {
    // Simple PGN parser - extract moves only
    const moves: string[] = []
    const tokens = pgn.split(/\s+/)
    
    for (const token of tokens) {
      // Skip move numbers (1., 2., etc.)
      if (/^\d+\./.test(token)) continue
      
      // Skip annotations and comments
      if (token.includes('(') || token.includes(')') || 
          token.includes('{') || token.includes('}') ||
          token.includes('$') || token.includes('!') || 
          token.includes('?')) continue
      
      // Skip result indicators
      if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') continue
      
      if (token.trim()) {
        moves.push(token.trim())
      }
    }
    
    return moves
  }

  private fenToEpd(fen: string): string {
    // Convert FEN to EPD by removing halfmove and fullmove counters
    const parts = fen.split(' ')
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(' ')
    }
    return fen
  }

  lookupOpening(fen: string): OpeningInfo | null {
    if (!this.loaded) return null
    
    const epd = this.fenToEpd(fen)
    return this.openings.get(epd) || null
  }

  isPositionInBook(fen: string): boolean {
    return this.lookupOpening(fen) !== null
  }

  getOpeningStats(): { total: number, loaded: boolean } {
    return {
      total: this.openings.size,
      loaded: this.loaded
    }
  }
}

// Export singleton instance
export const openingBook = new OpeningBookService() 