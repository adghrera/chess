// Chess AI - Minimax with alpha-beta pruning
// ------------------------------------------

// Piece-square tables: bonus for good positioning
// Positive values encourage pieces toward center/active squares
const PST = {
  P: [ // Pawn: advance, control center
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  N: [ // Knight: center control
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50]
  ],
  B: [ // Bishop: center, long diagonals
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20]
  ],
  R: [ // Rook: open files, 7th rank
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0]
  ],
  Q: [ // Queen: central, flexible
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20]
  ],
  K: [ // King: safety early, center late (simplified)
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20]
  ]
};

// Piece material values
const PIECE_VALUE = { 1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 20000 };

// AI difficulty settings
const DIFFICULTY = {
  easy: { depth: 1, randomFactor: 0.3 },
  medium: { depth: 2, randomFactor: 0.1 },
  hard: { depth: 3, randomFactor: 0.0 }
};

// Evaluate the board from white's perspective (positive = white advantage)
function evaluateBoard(boardRef) {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = boardRef[r][c];
      if (p === 0) continue;

      const color = p > 0 ? 'w' : 'b';
      const type = Math.abs(p);
      let sym;
      switch (type) {
        case 1: sym = 'P'; break;
        case 2: sym = 'N'; break;
        case 3: sym = 'B'; break;
        case 4: sym = 'R'; break;
        case 5: sym = 'Q'; break;
        case 6: sym = 'K'; break;
        default: sym = 'P';
      }

      const material = PIECE_VALUE[type];
      const pstRow = color === 'w' ? r : 7 - r;
      const pstBonus = PST[sym][pstRow][c];

      if (color === 'w') {
        score += material + pstBonus;
      } else {
        score -= material + pstBonus;
      }
    }
  }

  return score;
}

// Deep clone board for simulation
function cloneBoard(boardRef) {
  return boardRef.map(row => [...row]);
}

// Simulate a move on a cloned board (for AI search)
function simulateMove(boardRef, move) {
  const newBoard = cloneBoard(boardRef);
  const { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, pieceType, flags } = move;

  const activeColor = window.ChessGame.getActiveColor();
  const pieceValue = activeColor === 'w' ? pieceType : -pieceType;

  // Handle castling
  if (flags?.castling === 'k') {
    newBoard[toRow][5] = newBoard[toRow][7];
    newBoard[toRow][7] = 0;
    newBoard[toRow][6] = pieceValue;
    newBoard[fromRow][fromCol] = 0;
  } else if (flags?.castling === 'q') {
    newBoard[toRow][3] = newBoard[toRow][0];
    newBoard[toRow][0] = 0;
    newBoard[toRow][2] = pieceValue;
    newBoard[fromRow][fromCol] = 0;
  } else {
    // En passant capture
    if (flags?.enPassant) {
      const capturedRow = (activeColor === 'w') ? toRow + 1 : toRow - 1;
      newBoard[capturedRow][toCol] = 0;
    }

    // Regular move
    newBoard[toRow][toCol] = pieceValue;
    newBoard[fromRow][fromCol] = 0;

    // Promotion (default to queen for AI)
    if (flags?.promotion) {
      newBoard[toRow][toCol] = activeColor === 'w' ? 5 : -5;
    }
  }

  return newBoard;
}

// Generate legal moves using a board reference (for AI search)
function generateMovesForBoard(boardRef, color) {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pv = boardRef[r][c];
      if ((pv > 0 && color === 'w') || (pv < 0 && color === 'b')) {
        const pieceMoves = getPieceMovesForBoard(r, c, boardRef);
        for (const m of pieceMoves) {
          if (!leavesKingInCheckForBoard(r, c, m.toRow, m.toCol, color, boardRef)) {
            moves.push({
              from: { row: r, col: c },
              to: { row: m.toRow, col: m.toCol },
              pieceType: Math.abs(pv),
              captured: boardRef[m.toRow][m.toCol],
              flags: { ...m.flags }
            });
          }
        }
      }
    }
  }

  return moves;
}

// Check if a move leaves king in check (board-ref version)
function leavesKingInCheckForBoard(fromRow, fromCol, toRow, toCol, color, boardRef) {
  const tempBoard = cloneBoard(boardRef);
  const pv = boardRef[fromRow][fromCol];
  const pieceType = Math.abs(pv);

  tempBoard[toRow][toCol] = pv;
  tempBoard[fromRow][fromCol] = 0;

  // Handle promotion for check analysis
  if (pieceType === 1) {
    const promoRow = color === 'w' ? 0 : 7;
    if (toRow === promoRow) {
      const sign = color === 'w' ? 1 : -1;
      tempBoard[toRow][toCol] = sign * 5; // promote to queen
    }
  }

  // Find king
  let kingRow, kingCol;
  const kingVal = color === 'w' ? 6 : -6;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (tempBoard[r][c] === kingVal) {
        kingRow = r;
        kingCol = c;
      }
    }
  }

  if (kingRow === undefined) return false;

  const opponentColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = tempBoard[r][c];
      if ((p < 0 && color === 'w') || (p > 0 && color === 'b')) {
        const moves = getPieceMovesForBoard(r, c, tempBoard);
        for (const m of moves) {
          if (m.toRow === kingRow && m.toCol === kingCol) return true;
        }
      }
    }
  }

  return false;
}

// Get piece moves for a given board reference (simplified for AI)
function getPieceMovesForBoard(row, col, boardRef) {
  const pv = boardRef[row][col];
  if (!pv) return [];
  const color = pv > 0 ? 'w' : 'b';
  const type = Math.abs(pv);
  const moves = [];

  switch (type) {
    case 1: // Pawn
      moves.push(...getPawnMovesForBoard(row, col, color, boardRef));
      break;
    case 2: // Knight
      moves.push(...getSlidingMovesForBoard(row, col, color, boardRef, [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]], false));
      break;
    case 3: // Bishop
      moves.push(...getSlidingMovesForBoard(row, col, color, boardRef, [[-1,-1],[-1,1],[1,-1],[1,1]], true));
      break;
    case 4: // Rook
      moves.push(...getSlidingMovesForBoard(row, col, color, boardRef, [[-1,0],[1,0],[0,-1],[0,1]], true));
      break;
    case 5: // Queen
      moves.push(...getSlidingMovesForBoard(row, col, color, boardRef, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], true));
      break;
    case 6: // King
      moves.push(...getSlidingMovesForBoard(row, col, color, boardRef, [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], false));
      break;
  }

  return moves;
}

// Pawn moves for AI board
function getPawnMovesForBoard(row, col, color, boardRef) {
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const promoRow = color === 'w' ? 0 : 7;
  const moves = [];

  const frontRow = row + dir;
  if (frontRow >= 0 && frontRow < 8 && boardRef[frontRow][col] === 0) {
    moves.push({ toRow: frontRow, toCol: col, flags: frontRow === promoRow ? { promotion: true } : {} });

    if (row === startRow) {
      const secondRow = row + 2 * dir;
      if (boardRef[secondRow][col] === 0) {
        moves.push({ toRow: secondRow, toCol: col, flags: {} });
      }
    }
  }

  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (c >= 0 && c < 8) {
      const target = boardRef[row + dir]?.[c];
      if (target !== undefined && target !== 0 && ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: row + dir, toCol: c, flags: { capture: true, promotion: row + dir === promoRow } });
      }
    }
  }

  return moves;
}

// Sliding and single-step moves helper
function getSlidingMovesForBoard(row, col, color, boardRef, directions, sliding) {
  const moves = [];

  for (const [dr, dc] of directions) {
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = boardRef[r][c];
      if (target === 0) {
        moves.push({ toRow: r, toCol: c, flags: {} });
      } else if ((color === 'w' && target < 0) || (color === 'b' && target > 0)) {
        moves.push({ toRow: r, toCol: c, flags: { capture: true } });
        break;
      } else {
        break;
      }

      if (!sliding) break;
      r += dr;
      c += dc;
    }
  }

  return moves;
}

// Minimax with alpha-beta pruning
function minimax(boardRef, depth, alpha, beta, isMaximizing) {
  const color = isMaximizing ? 'w' : 'b';
  const moves = generateMovesForBoard(boardRef, color);

  // Terminal conditions
  if (depth === 0 || moves.length === 0) {
    return evaluateBoard(boardRef);
  }

  // Move ordering: captures first (better pruning)
  moves.sort((a, b) => {
    const aCap = a.captured ? Math.abs(a.captured) : 0;
    const bCap = b.captured ? Math.abs(b.captured) : 0;
    return bCap - aCap;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(boardRef, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = simulateMove(boardRef, move);
      const evalScore = minimax(newBoard, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Get the best move for the given color
function getBestMove(color, difficulty) {
  const settings = DIFFICULTY[difficulty];
  if (!settings) return null;

  const boardRef = window.ChessGame.getBoard();
  const moves = generateMovesForBoard(boardRef, color);

  if (moves.length === 0) return null;

  // Apply randomness for lower difficulties
  if (Math.random() < settings.randomFactor) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = null;
  let bestScore = color === 'w' ? -Infinity : Infinity;

  // Move ordering: captures first
  moves.sort((a, b) => {
    const aCap = a.captured ? Math.abs(a.captured) : 0;
    const bCap = b.captured ? Math.abs(b.captured) : 0;
    return bCap - aCap;
  });

  for (const move of moves) {
    const newBoard = simulateMove(boardRef, move);
    const score = minimax(newBoard, settings.depth - 1, -Infinity, Infinity, color === 'b');

    if (color === 'w') {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove || moves[0];
}

// Expose AI functions
window.ChessAI = {
  getBestMove
};
