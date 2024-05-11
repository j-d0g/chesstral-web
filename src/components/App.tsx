import React, { useState } from 'react';
import Board from './Board';

const App: React.FC = () => {

  return (
    <div>
      <h1>Chess-GPT</h1>
      <Board />
    </div>
  );
};

export default App;