export interface RatingJSON {
  // game info
  engineName: string;
  fen: string;
  move: string;
  moveSequence: string;
  commentary: string;
  // ratings
  quality: number;
  correctness: number;
  relevance: number;
  salience: number;
  review: string;
}