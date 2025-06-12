export interface CommentaryMessage {
  engineName: string;
  moveNumber: string;
  moveSequence: string;
  commentary: string;
  fen: string;
  move: string;
  reviewed: boolean;
  rawResponse?: string;
}