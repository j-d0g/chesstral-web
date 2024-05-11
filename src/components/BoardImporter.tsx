// ControlPanel.tsx
import React from 'react';
import '../styles/BoardImporter.css';

type BoardImporterProps = {
  handleFenInput: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePgnInput: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  fen: string;
  pgn: string;
};

const BoardImporter: React.FC<BoardImporterProps> = ({
  handleFenInput,
  handlePgnInput,
  fen,
  pgn,
}) => {

  return (
      <div className="board-importer">
          <input
              type="text"
              name="fen"
              placeholder="Enter FEN string"
              className="fen-input"
              onKeyDown={handleFenInput}
              defaultValue={fen}/>
          <input
              type="text"
              name="pgn"
              placeholder="Enter PGN sequence"
              className="pgn-input"
              onKeyDown={handlePgnInput}
              defaultValue={pgn}/>
      </div>
  );
};

export default BoardImporter;