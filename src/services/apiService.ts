import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

interface MoveRequest {
  fen: string
  pgn: string[]
  engine: string
  model?: string
  temperature: number
}

interface MoveResponse {
  move: string
  thoughts?: string
  raw_response?: string
  evaluation?: number
}

interface EvaluationRequest {
  fen: string
  depth?: number
}

interface EvaluationResponse {
  evaluation: number
  best_move?: string
  analysis?: any
}

interface MoveRatingRequest {
  fen: string
  move: string
  rating: number
}

class ApiService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  async getMove(request: MoveRequest): Promise<MoveResponse> {
    const response = await this.client.post('/api/move', request)
    return response.data
  }

  async evaluatePosition(request: EvaluationRequest): Promise<EvaluationResponse> {
    const response = await this.client.post('/api/eval', request)
    return response.data
  }

  async rateMove(request: MoveRatingRequest): Promise<void> {
    await this.client.post('/api/rate_move', request)
  }

  async getEngines(): Promise<any> {
    const response = await this.client.get('/api/engines')
    return response.data
  }

  async healthCheck(): Promise<any> {
    const response = await this.client.get('/api/health')
    return response.data
  }
}

export const apiService = new ApiService() 