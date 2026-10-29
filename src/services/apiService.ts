import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''
const API_ADDRESS = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface MoveRequest {
  fen: string
  pgn: string[]
  engine: string
  model?: string
  temperature: number
}

export interface MoveResponse {
  move: string
  thoughts?: string
  raw_response?: string
  evaluation?: number
}

export interface EvaluationRequest {
  fen: string
  depth?: number
}

export interface EvaluationResponse {
  evaluation: number
  mate?: number | null
  best_move?: string
  analysis?: any
}

export interface MoveRatingRequest {
  game_id: string
  engine: string
  fen: string
  move: string
  move_number?: string
  commentary?: string
  quality: number
  responsiveness: number
  correctness: number
  relevance: number
  salience: number
  review?: string
}

export interface EngineInfo {
  name: string
  models: string[]
  description: string
  status: 'available' | 'unavailable'
  reason: string | null
}

interface EngineCatalogResponse {
  engines: EngineInfo[]
}

class ApiService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60_000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  async getMove(request: MoveRequest): Promise<MoveResponse> {
    const response = await this.client.post<MoveResponse>('/api/move', request)
    return response.data
  }

  async evaluatePosition(request: EvaluationRequest): Promise<EvaluationResponse> {
    const response = await this.client.post<EvaluationResponse>('/api/eval', request)
    return response.data
  }

  async rateMove(request: MoveRatingRequest): Promise<{ status: 'saved' }> {
    const response = await this.client.post<{ status: 'saved' }>('/api/rate_move', request)
    return response.data
  }

  async getEngines(): Promise<EngineInfo[]> {
    const response = await this.client.get<EngineCatalogResponse>('/api/engines')
    return response.data.engines
  }

  async healthCheck(): Promise<any> {
    const response = await this.client.get('/api/health')
    return response.data
  }
}

export function describeApiError(error: unknown): string {
  const apiError = error as {
    code?: string
    message?: string
    response?: {
      status?: number
      data?: {
        detail?: unknown
      }
    }
  }
  const detail = apiError.response?.data?.detail

  if (detail && typeof detail === 'object') {
    const detailObject = detail as {
      error?: unknown
      move_error?: { error_message?: unknown }
    }
    if (typeof detailObject.error === 'string') return detailObject.error
    if (typeof detailObject.move_error?.error_message === 'string') {
      return detailObject.move_error.error_message
    }
  }

  if (typeof detail === 'string') return detail

  if (
    apiError.code === 'ERR_NETWORK' ||
    !apiError.response ||
    [502, 503, 504].includes(apiError.response.status ?? 0)
  ) {
    return `Can't reach the ChessGPT API at ${API_ADDRESS}.`
  }

  return apiError.message || 'The ChessGPT API request failed.'
}

export const apiService = new ApiService()
