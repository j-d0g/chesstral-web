export interface MoveResponse {
  prompt: {
    completion: {
      move: string; // Specify the type if possible
      thoughts: string;
    };
    context: []; // Example: Adjust according to the actual data type
  };
}