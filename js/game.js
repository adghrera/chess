// Chess Game Logic
// ----------------

// Piece type constants
const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;

// Piece symbols (Unicode)
const PIECE_SYMBOLS = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
};

// Piece type names for lookup
const PIECE_NAMES = { 1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K' };

// Board setup: starting position
// 0 = empty, positive = white, negative = black
const PIECE_VALUES = { P: PAWN, N: KNIGHT, B: BISHOP, R: ROOK, Q: QUEEN, K: KING };

// Board representation: 8x8 array, index [row][col] where row 0 = rank 8
let board = [];

// Game state
let activeColor = 'w'; // 'w' for white, 'b' for black
let gameOver = false;
let selectedSquare = null; // {row, col}
let lastMove = null; // For en passant: {fromRow, fromCol, toRow, toCol, capturedPawnCol}
let moveHistory = []; // Array of {from, to, pieceValue, captured, promotion, flags}
let hasMoved = { // Castling rights tracking
  wK: false, wQ: false, bK: false, bQ: false,
  wR: { q: false, k: false }, bR: { q: false, k: false }
};

// Map piece value to color and type
function pieceInfo(pieceVal) {
  if (pieceVal === 0) return null;
  const color = pieceVal > 0 ? 'w' : 'b';
  const type = Math.abs(pieceVal);
  let sym;
  switch (type) {
    case PAWN: sym = 'P'; break;
    case KNIGHT: sym = 'N'; break;
    case BISHOP: sym = 'B'; break;
    case ROOK: sym = 'R'; break;
    case QUEEN: sym = 'Q'; break;
    case KING: sym = 'K'; break;
    default: sym = 'P';
  }
  return { color, type, sym, val: pieceVal };
}

// Initialize the board with starting position
function initBoard() {
  // Clear board
  for (let r = 0; r < 8; r++) {
    board[r] = [];
    for (let c = 0; c < 8; c++) {
      board[r][c] = 0;
    }
  }

  // White back rank (row 0)
  board[0][0] = ROOK; board[0][1] = KNIGHT; board[0][2] = BISHOP;
  board[0][3] = QUEEN; board[0][4] = KING; board[0][5] = BISHOP;
  board[0][6] = KNIGHT; board[0][7] = ROOK;

  // White pawns (row 1)
  for (let c = 0; c < 8; c++) {
    board[1][c] = PAWN;
  }

  // Empty rows 2-5
  for (let r = 2; r < 5; r++) {
    for (let c = 0; c < 8; c++) {
      board[r][c] = 0;
    }
  }

  // Black pawns (row 6)
  for (let c = 0; c < 8; c++) {
    board[6][c] = -PAWN;
  }

  // Black back rank (row 7)
  board[7][0] = -ROOK; board[7][1] = -KNIGHT; board[7][2] = -BISHOP;
  board[7][3] = -QUEEN; board[7][4] = -KING; board[7][5] = -BISHOP;
  board[7][6] = -KNIGHT; board[7][7] = -ROOK;

  // Reset game state
  activeColor = 'w';
  gameOver = false;
  selectedSquare = null;
  lastMove = null;
  moveHistory = [];
  // Reset castling rights
  hasMoved = {
    wK: false, wQ: false, bK: false, bQ: false,
    wR: { q: false, k: false }, bR: { q: false, k: false }
  };
}

// Get piece info at square
function getPieceAt(row, col) {
  if (row < 0 || row >= 8 || col < 0 || col >= 8) return 0;
  return board[row][col];
}

// Check if square has a piece of given color
function hasPieceColor(row, col, color) {
  const p = getPieceAt(row, col);
  return p !== 0 && ((p > 0 && color === 'w') || (p < 0 && color === 'b'));
}

// Check if square has opponent's piece
function hasOpponentPiece(row, col, color) {
  const p = getPieceAt(row, col);
  return p !== 0 && ((p > 0 && color === 'b') || (p < 0 && color === 'w'));
}

// Generate all legal moves for a color (without making the move)
function generateLegalMoves(color) {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pv = board[r][c];
      if ((pv > 0 && color === 'w') || (pv < 0 && color === 'b')) {
        const pieceMoves = getPieceMoves(r, c);
        for (const m of pieceMoves) {
          if (!leavesKingInCheck(r, c, m.toRow, m.toCol, color)) {
            moves.push({
              from: { row: r, col: c },
              to: { row: m.toRow, col: m.toCol },
              pieceType: Math.abs(pv),
              captured: board[m.toRow][m.toCol],
              flags: { ...m.flags }
            });
          }
        }
      }
    }
  }

  return moves;
}

// Check if moving from (fromRow,fromCol) to (toRow,toCol) leaves king in check
function leavesKingInCheck(fromRow, fromCol, toRow, toCol, color) {
  // Build temporary board
  const tempBoard = board.map(r => [...r]);

  // Move piece on temp board
  tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
  tempBoard[fromRow][fromCol] = 0;

  // En passant: if the move is an en passant, the captured pawn is removed
  if (lastMove && lastMove.enPassant &&
      Math.abs(toRow - fromRow) === 1 && toCol === lastMove.enPassantCol) {
    // The captured pawn was on the same file, one row behind the destination
    const capturedRow = (color === 'w') ? toRow + 1 : toRow - 1;
    tempBoard[capturedRow][toCol] = 0;
  }

  // Find our king
  let kingRow, kingCol;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = tempBoard[r][c];
      if ((p > 0 && color === 'w') || (p < 0 && color === 'b')) {
        if (Math.abs(p) === KING) {
          kingRow = r; kingCol = c;
        }
      }
    }
  }

  if (kingRow === undefined) return false;

  // Check if any opponent piece attacks the king square
  const opponentColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pv = tempBoard[r][c];
      if ((pv < 0 && color === 'w') || (pv > 0 && color === 'b')) { // opponent
        const opponentMoves = getPieceMovesTemp(r, c, tempBoard);
        for (const m of opponentMoves) {
          if (m.toRow === kingRow && m.toCol === kingCol) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

// Get piece moves using a provided tempBoard (for leavesKingInCheck)
function getPieceMovesTemp(row, col, tempBoard) {
  const pieceValue = tempBoard[row][col];
  if (!pieceValue) return [];

  const color = pieceValue > 0 ? 'w' : 'b';
  const type = Math.abs(pieceValue);

  const moves = [];

  switch (type) {
    case PAWN:
      moves.push(...getPawnMovesTemp(row, col, color, tempBoard));
      break;
    case KNIGHT:
      moves.push(...getKnightMovesTemp(row, col, color, tempBoard));
      break;
    case BISHOP:
      moves.push(...getBishopMovesTemp(row, col, color, tempBoard));
      break;
    case ROOK:
      moves.push(...getRookMovesTemp(row, col, color, tempBoard));
      break;
    case QUEEN:
      moves.push(...getBishopMovesTemp(row, col, color, tempBoard));
      moves.push(...getRookMovesTemp(row, col, color, tempBoard));
      break;
    case KING:
      moves.push(...getKingMovesTemp(row, col, color, tempBoard));
      break;
  }

  return moves;
}

// Pawn moves (temp board version - no en passant tracking needed beyond what's passed)
function getPawnMovesTemp(row, col, color, boardRef) {
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const promoRow = color === 'w' ? 0 : 7;
  const moves = [];

  // One square forward
  const frontRow = row + dir;
  if (frontRow >= 0 && frontRow < 8 && boardRef[frontRow][col] === 0) {
    moves.push({ toRow: frontRow, toCol: col, flags: {} });

    // Two squares forward from starting rank
    if (row === startRow) {
      const secondRow = row + 2 * dir;
      if (boardRef[secondRow][col] === 0) {
        moves.push({ toRow: secondRow, toCol: col, flags: {} });
      }
    }
  }

  // Diagonal captures
  const captureCols = [col - 1, col + 1];
  for (const c of captureCols) {
    if (c >= 0 && c < 8) {
      const target = boardRef[row + dir][c];
      if (target !== 0 && ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: row + dir, toCol: c, flags: { capture: true } });
      }
      // En passant - handled separately in leavesKingInCheck
    }
  }

  // Promotion flag
  for (const m of moves) {
    if (m.toRow === promoRow) {
      m.flags = m.flags || {};
      m.promotion = true;
    }
  }

  return moves;
}

// Knight moves
function getKnightMovesTemp(row, col, color, boardRef) {
  const moves = [];
  const knightMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  for (const [dr, dc] of knightMoves) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = boardRef[r][c];
      if (target === 0 || ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: r, toCol: c, flags: { capture: target !== 0 } });
      }
    }
  }

  return moves;
}

// Bishop moves (diagonal)
function getBishopMovesTemp(row, col, color, boardRef) {
  const moves = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

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
      r += dr;
      c += dc;
    }
  }

  return moves;
}

// Rook moves (straight)
function getRookMovesTemp(row, col, color, boardRef) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

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
      r += dr;
      c += dc;
    }
  }

  return moves;
}

// King moves
function getKingMovesTemp(row, col, color, boardRef) {
  const moves = [];
  const kingMoves = [
    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
  ];

  for (const [dr, dc] of kingMoves) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = boardRef[r][c];
      if (target === 0 || ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: r, toCol: c, flags: { capture: target !== 0 } });
      }
    }
  }

  // Castling
  if (!hasMoved[`${color}K`]) {
    // Kingside: rook at column 7
    const rookCol = 7;
    if (!hasMoved[`${color}R`]?.k && boardRef[row][rookCol] !== 0 && Math.abs(boardRef[row][rookCol]) === ROOK) {
      if (boardRef[row][5] === 0 && boardRef[row][6] === 0) {
        if (!leavesKingInCheckTemp(row, col, row, 6, color)) {
          moves.push({ toRow: row, toCol: 6, flags: { castling: 'k' } });
        }
      }
    }
    // Queenside: rook at column 0
    if (!hasMoved[`${color}R`]?.q && boardRef[row][0] !== 0 && Math.abs(boardRef[row][0]) === ROOK) {
      if (boardRef[row][1] === 0 && boardRef[row][2] === 0 && boardRef[row][3] === 0) {
        if (!leavesKingInCheckTemp(row, col, row, 2, color)) {
          moves.push({ toRow: row, toCol: 2, flags: { castling: 'q' } });
        }
      }
    }
  }

  return moves;
}

// Helper: leavesKingInCheck using temp board (internal)
function leavesKingInCheckTemp(fromRow, fromCol, toRow, toCol, color) {
  const tempBoard = board.map(r => [...r]);
  tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
  tempBoard[fromRow][fromCol] = 0;

  // En passant capture
  if (lastMove && lastMove.enPassant &&
      Math.abs(toRow - fromRow) === 1 && toCol === lastMove.enPassantCol) {
    const capturedRow = (color === 'w') ? toRow + 1 : toRow - 1;
    tempBoard[capturedRow][toCol] = 0;
  }

  let kingRow, kingCol;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = tempBoard[r][c];
      if ((p > 0 && color === 'w') || (p < 0 && color === 'b')) {
        if (Math.abs(p) === KING) {
          kingRow = r; kingCol = c;
        }
      }
    }
  }

  if (kingRow === undefined) return false;

  const opponentColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pv = tempBoard[r][c];
      if ((pv < 0 && color === 'w') || (pv > 0 && color === 'b')) {
        const om = getPieceMovesTemp(r, c, tempBoard);
        for (const m of om) {
          if (m.toRow === kingRow && m.toCol === kingCol) return true;
        }
      }
    }
  }
  return false;
}

// Pawn moves (main version with en passant support)
function getPawnMoves(row, col, color, boardRef) {
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const promoRow = color === 'w' ? 0 : 7;
  const moves = [];

  // One square forward
  const frontRow = row + dir;
  if (frontRow >= 0 && frontRow < 8 && boardRef[frontRow][col] === 0) {
    moves.push({ toRow: frontRow, toCol: col, flags: {} });

    // Two squares forward from starting rank
    if (row === startRow) {
      const secondRow = row + 2 * dir;
      if (boardRef[secondRow][col] === 0) {
        moves.push({ toRow: secondRow, toCol: col, flags: {} });
      }
    }
  }

  // Diagonal captures
  const captureCols = [col - 1, col + 1];
  for (const c of captureCols) {
    if (c >= 0 && c < 8) {
      const target = boardRef[row + dir][c];
      if (target !== 0 && ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: row + dir, toCol: c, flags: { capture: true } });
      }
      // En passant: if last move was a pawn advancing two squares
      if (lastMove && lastMove.pieceType === 'P' && Math.abs(lastMove.fromRow - lastMove.toRow) === 2) {
        const enPassantRow = row + dir;
        if (c === lastMove.toCol && enPassantRow === lastMove.toRow) {
          moves.push({ toRow: enPassantRow, toCol: c, flags: { enPassant: true, enPassantCol: c } });
        }
      }
    }
  }

  // Promotion
  for (const m of [...moves]) {
    if (m.toRow === promoRow && (m.flags.capture || m.flags.enPassant || boardRef[m.toRow][m.toCol] === 0)) {
      m.flags = m.flags || {};
      m.promotion = true;
    }
  }

  return moves;
}

// Knight moves
function getKnightMoves(row, col, color, boardRef) {
  const moves = [];
  const knightMoves = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];

  for (const [dr, dc] of knightMoves) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = boardRef[r][c];
      if (target === 0 || ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: r, toCol: c, flags: { capture: target !== 0 } });
      }
    }
  }

  return moves;
}

// Bishop moves (diagonal)
function getBishopMoves(row, col, color, boardRef) {
  const moves = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

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
      r += dr;
      c += dc;
    }
  }

  return moves;
}

// Rook moves (straight)
function getRookMoves(row, col, color, boardRef) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

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
      r += dr;
      c += dc;
    }
  }

  return moves;
}

// King moves
function getKingMoves(row, col, color, boardRef) {
  const moves = [];
  const kingMoves = [
    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
  ];

  for (const [dr, dc] of kingMoves) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const target = boardRef[r][c];
      if (target === 0 || ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
        moves.push({ toRow: r, toCol: c, flags: { capture: target !== 0 } });
      }
    }
  }

  // Castling
  if (!hasMoved[`${color}K`]) {
    // Kingside: rook at column 7
    if (!hasMoved[`${color}R`]?.k && boardRef[row][7] !== 0 && Math.abs(boardRef[row][7]) === ROOK) {
      if (boardRef[row][5] === 0 && boardRef[row][6] === 0) {
        if (!leavesKingInCheck(row, col, row, 6, color)) {
          moves.push({ toRow: row, toCol: 6, flags: { castling: 'k' } });
        }
      }
    }
    // Queenside: rook at column 0
    if (!hasMoved[`${color}R`]?.q && boardRef[row][0] !== 0 && Math.abs(boardRef[row][0]) === ROOK) {
      if (boardRef[row][1] === 0 && boardRef[row][2] === 0 && boardRef[row][3] === 0) {
        if (!leavesKingInCheck(row, col, row, 2, color)) {
          moves.push({ toRow: row, toCol: 2, flags: { castling: 'q' } });
        }
      }
    }
  }

  return moves;
}

// Check if a player is in check (using current board state)
function isInCheck(color) {
  let kingRow, kingCol;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if ((p > 0 && color === 'w') || (p < 0 && color === 'b')) {
        if (Math.abs(p) === KING) {
          kingRow = r; kingCol = c;
        }
      }
    }
  }

  if (kingRow === undefined) return false;

  const opponentColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pv = board[r][c];
      if ((pv < 0 && color === 'w') || (pv > 0 && color === 'b')) {
        const om = getPieceMoves(r, c);
        for (const m of om) {
          if (m.toRow === kingRow && m.toCol === kingCol) return true;
        }
      }
    }
  }

  return false;
}

// Check for checkmate, stalemate, or ongoing
function checkGameEnd(color) {
  const legalMoves = generateLegalMoves(color);

  if (isInCheck(color)) {
    if (legalMoves.length === 0) {
      return 'checkmate';
    }
    return 'check';
  } else {
    if (legalMoves.length === 0) {
      return 'stalemate';
    }
    return 'none';
  }
}

// Make a move on the board
function makeMove(move) {
  const { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, pieceType, captured, flags } = move;

  // Store last move for en passant (save enough info)
  lastMove = {
    fromRow, fromCol, toRow, toCol,
    pieceType,
    enPassant: !!flags?.enPassant
  };

  // Save the captured piece value for history
  const capturedValue = board[toRow][toCol];

  // Handle castling
  if (flags?.castling) {
    if (flags.castling === 'k') {
      // Kingside: rook moves from h1/h8 to f1/f8
      board[toRow][toCol + 1] = 0; // clear destination+1
      board[toRow][toCol - 1] = board[toRow][7 + (color === 'w' ? 0 : 7)]; // move rook
      board[toRow][7 + (color === 'w' ? 0 : 7)] = 0; // clear original rook position
      hasMoved[`${activeColor}K`] = true;
      hasMoved[`${activeColor}R`].k = true;
    } else if (flags.castling === 'q') {
      // Queenside: rook moves from a1/a8 to d1/d8
      board[toRow][toCol - 1] = 0; // clear destination-1
      board[toRow][toCol + 1] = board[toRow][0 + (color === 'w' ? 0 : 7)]; // move rook
      board[toRow][0 + (color === 'w' ? 0 : 7)] = 0; // clear original rook position
      hasMoved[`${activeColor}K`] = true;
      hasMoved[`${activeColor}R`].q = true;
    }
  }

  // Handle en passant capture
  if (flags?.enPassant) {
    // Remove the captured pawn that just moved two squares
    const capturedRow = (activeColor === 'w') ? toRow + 1 : toRow - 1;
    board[capturedRow][toCol] = 0;
  }

  // Make the move: piece moves to new square
  board[toRow][toCol] = activeColor === 'w' ? pieceType : -pieceType;
  board[fromRow][fromCol] = 0;

  // Handle promotion
  if (flags?.promotion) {
    // Default to queen
    board[toRow][toCol] = activeColor === 'w' ? QUEEN : -QUEEN;
  }

  // Update castling rights
  if (pieceType === KING) {
    hasMoved[`${activeColor}K`] = true;
  }
  if (pieceType === ROOK) {
    if (fromCol === 0) hasMoved[`${activeColor}R`].q = true;
    if (fromCol === 7) hasMoved[`${activeColor}R`].k = true;
  }

  // Record the move in history
  moveHistory.push({
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    pieceValue: activeColor === 'w' ? pieceType : -pieceType,
    captured: capturedValue,
    flags: { ...flags }
  });

  // Switch turn
  activeColor = activeColor === 'w' ? 'b' : 'w';

  return true;
}

// Undo last move
function undoMove() {
  if (moveHistory.length === 0) return false;

  const last = moveHistory[moveHistory.length - 1];
  const { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, pieceValue, flags } = last;

  // Reverse castling
  if (flags?.castling === 'k') {
    // Reverse kingside castling: rook goes back, king goes back
    const r = activeColor === 'w' ? 'w' : 'b';
    board[fromRow][fromCol] = KING * (activeColor === 'w' ? 1 : -1);
    board[toRow][toCol - 1] = 0; // clear where king went
    board[toRow][toCol + 1] = ROOK * (activeColor === 'w' ? 1 : -1); // move rook back
    board[toRow][7 + (activeColor === 'w' ? 0 : 7)] = 0; // clear rook original
    hasMoved[`${activeColor}K`] = false;
    hasMoved[`${activeColor}R`].k = false;
  } else if (flags?.castling === 'q') {
    // Reverse queenside castling
    const r = activeColor === 'w' ? 'w' : 'b';
    board[fromRow][fromCol] = KING * (activeColor === 'w' ? 1 : -1);
    board[toRow][toCol + 1] = 0; // clear where king went
    board[toRow][toCol - 1] = ROOK * (activeColor === 'w' ? 1 : -1); // move rook back
    board[toRow][0 + (activeColor === 'w' ? 0 : 7)] = 0; // clear rook original
    hasMoved[`${activeColor}K`] = false;
    hasMoved[`${activeColor}R`].q = false;
  } else {
    // Regular move reversal
    // Remove piece from destination
    board[toRow][toCol] = 0;
    // Place piece back at origin
    board[fromRow][fromCol] = pieceValue;
    // Restore captured piece
    if (last.captured !== undefined && last.captured !== null) {
      board[toRow][toCol] = last.captured;
    }
    // Reset castling rights that may have been changed
    if (Math.abs(pieceValue) === KING) {
      hasMoved[`${activeColor}K`] = false;
    }
    if (Math.abs(pieceValue) === ROOK) {
      if (fromCol === 0) hasMoved[`${activeColor}R`].q = false;
      if (fromCol === 7) hasMoved[`${activeColor}R`].k = false;
    }
  }

  // Remove from move history
  moveHistory.pop();

  // Switch turn back
  activeColor = activeColor === 'w' ? 'b' : 'w';

  return true;
}

// Expose public API
window.ChessGame = {
  initBoard,
  getBoard: () => board.map(r => [...r]),
  getActiveColor: () => activeColor,
  isGameOver: () => gameOver,
  generateLegalMoves,
  isInCheck,
  checkGameEnd,
  makeMove,
  undoMove,
  getMoveHistory: () => [...moveHistory]
};