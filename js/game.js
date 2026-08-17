// Chess Game Logic - Standalone module
// -------------------------------------

// Piece type constants
const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;

// Piece symbols (Unicode)
const PIECE_SYMBOLS = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
};

// Board setup: starting position
// 0 = empty, positive = white, negative = black
const PIECE_VALUES = { P: PAWN, N: KNIGHT, B: BISHOP, R: ROOK, Q: QUEEN, K: KING };

// Board representation: 8x8 array, index [row][col] where row 0 = rank 8
let board = [];

// Game state
let activeColor = 'w'; // 'w' for white, 'b' for black
let gameOver = false;
let selectedSquare = null; // {row, col} - tracked by UI but initialized here
let lastMove = null; // For en passant: {fromRow, fromCol, toRow, toCol, enPassant: boolean}
let moveHistory = []; // Array of move objects
let hasMoved = { // Castling rights tracking
  wK: false, wQ: false, bK: false, bQ: false,
  wR: { q: false, k: false }, bR: { q: false, k: false }
};

// Map piece value to color and type string
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
  return { color, type, sym };
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

  // Black back rank (row 0)
  board[0][0] = -ROOK; board[0][1] = -KNIGHT; board[0][2] = -BISHOP;
  board[0][3] = -QUEEN; board[0][4] = -KING; board[0][5] = -BISHOP;
  board[0][6] = -KNIGHT; board[0][7] = -ROOK;

  // Black pawns (row 1)
  for (let c = 0; c < 8; c++) {
    board[1][c] = -PAWN;
  }

  // Empty rows 2-5 (no pieces)
  for (let r = 2; r < 5; r++) {
    for (let c = 0; c < 8; c++) {
      board[r][c] = 0;
    }
  }

  // White pawns (row 6)
  for (let c = 0; c < 8; c++) {
    board[6][c] = PAWN;
  }

  // White back rank (row 7)
  board[7][0] = ROOK; board[7][1] = KNIGHT; board[7][2] = BISHOP;
  board[7][3] = QUEEN; board[7][4] = KING; board[7][5] = BISHOP;
  board[7][6] = KNIGHT; board[7][7] = ROOK;

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

// Get piece value at board[row][col]
function getPieceAt(row, col) {
  if (row < 0 || row >= 8 || col < 0 || col >= 8) return 0;
  return board[row][col];
}

// Get piece info object at square
function getPieceInfo(row, col) {
  const pv = getPieceAt(row, col);
  return pieceInfo(pv);
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

// Generate all legal moves for a color (pure calculation, doesn't modify board)
function generateLegalMoves(color) {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pv = board[r][c];
      if ((pv > 0 && color === 'w') || (pv < 0 && color === 'b')) {
        const pieceMoves = getPieceMoves(r, c);
        for (const m of pieceMoves) {
          // Check if moving here leaves king in check
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
  const tempBoard = board.map(r => [...r]);
  const piece = board[fromRow][fromCol];

  // Make the move
  tempBoard[toRow][toCol] = piece;
  tempBoard[fromRow][fromCol] = 0;

  // Handle promotion
  const pieceType = Math.abs(piece);
  if (pieceType === PAWN) {
    const promoRow = color === 'w' ? 0 : 7;
    if (toRow === promoRow) {
      const sign = color === 'w' ? 1 : -1;
      tempBoard[toRow][toCol] = sign * QUEEN;
    }
  }

  // Handle en passant capture on temp board
  if (lastMove && lastMove.pieceType === PAWN &&
      Math.abs(lastMove.fromRow - lastMove.toRow) === 2 &&
      Math.abs(toRow - fromRow) === 1 && toCol === lastMove.toCol &&
      board[toRow][toCol] === 0) {
    const capturedRow = (color === 'w') ? toRow + 1 : toRow - 1;
    tempBoard[capturedRow][toCol] = 0;
  }

  // Find king on temp board
  const kingVal = color === 'w' ? KING : -KING;
  let kingRow = toRow, kingCol = toCol;
  if (Math.abs(piece) !== KING) {
    kingRow = undefined;
    for (let r = 0; r < 8 && kingRow === undefined; r++) {
      for (let c = 0; c < 8; c++) {
        if (tempBoard[r][c] === kingVal) { kingRow = r; kingCol = c; }
      }
    }
  }
  if (kingRow === undefined) return false;

  return isSquareAttacked(kingRow, kingCol, color, tempBoard);
}

// Get piece moves using a provided tempBoard (for check analysis)
// NOTE: no castling here — we only need attack squares, not legal moves
function getPieceMovesTemp(row, col, tempBoard) {
  const pieceValue = tempBoard[row][col];
  if (!pieceValue) return [];

  const color = pieceValue > 0 ? 'w' : 'b';
  const type = Math.abs(pieceValue);
  const moves = [];

  switch (type) {
    case PAWN: moves.push(...getPawnMovesTemp(row, col, color, tempBoard)); break;
    case KNIGHT: moves.push(...getKnightMovesTemp(row, col, color, tempBoard)); break;
    case BISHOP: moves.push(...getBishopMovesTemp(row, col, color, tempBoard)); break;
    case ROOK: moves.push(...getRookMovesTemp(row, col, color, tempBoard)); break;
    case QUEEN:
      moves.push(...getBishopMovesTemp(row, col, color, tempBoard));
      moves.push(...getRookMovesTemp(row, col, color, tempBoard));
      break;
    case KING: moves.push(...getKingMovesTemp(row, col, color, tempBoard)); break;
  }

  return moves;
}

// Pawn moves (temp board version - used in check analysis)
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

// King moves (temp board version - no castling, just attack squares)
function getKingMovesTemp(row, col, color, boardRef) {
  const moves = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const target = boardRef[r][c];
        if (target === 0 || ((color === 'w' && target < 0) || (color === 'b' && target > 0))) {
          moves.push({ toRow: r, toCol: c, flags: { capture: target !== 0 } });
        }
      }
    }
  }
  return moves;
}



// Pawn moves (with en passant support for main game)
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
      // En passant
      if (lastMove && lastMove.pieceType === PAWN &&
          Math.abs(lastMove.fromRow - lastMove.toRow) === 2 &&
          c === lastMove.toCol && (row + dir) === lastMove.toRow &&
          boardRef[row + dir][c] === 0) {
        moves.push({ toRow: row + dir, toCol: c, flags: { enPassant: true, enPassantCol: c } });
      }
    }
  }

  // Promotion: any move reaching promo row promotes
  for (const m of moves) {
    if (m.toRow === promoRow) {
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

  // Castling (uses global hasMoved, validates with isSquareAttackedByOpponent)
  if (!hasMoved[`${color}K`]) {
    // Kingside
    if (!hasMoved[`${color}R`]?.k && boardRef[row][7] !== 0 && Math.abs(boardRef[row][7]) === ROOK) {
      if (boardRef[row][5] === 0 && boardRef[row][6] === 0) {
        if (!isSquareAttackedByOpponent(row, 4, color) &&
            !isSquareAttackedByOpponent(row, 5, color) &&
            !isSquareAttackedByOpponent(row, 6, color)) {
          moves.push({ toRow: row, toCol: 6, flags: { castling: 'k' } });
        }
      }
    }
    // Queenside
    if (!hasMoved[`${color}R`]?.q && boardRef[row][0] !== 0 && Math.abs(boardRef[row][0]) === ROOK) {
      if (boardRef[row][1] === 0 && boardRef[row][2] === 0 && boardRef[row][3] === 0) {
        if (!isSquareAttackedByOpponent(row, 4, color) &&
            !isSquareAttackedByOpponent(row, 3, color) &&
            !isSquareAttackedByOpponent(row, 2, color)) {
          moves.push({ toRow: row, toCol: 2, flags: { castling: 'q' } });
        }
      }
    }
  }

  return moves;
}

// Dispatcher: get moves for the piece at (row, col) on the main board
function getPieceMoves(row, col) {
  const pv = board[row][col];
  if (!pv) return [];
  const color = pv > 0 ? 'w' : 'b';
  const type = Math.abs(pv);
  const moves = [];

  switch (type) {
    case PAWN: moves.push(...getPawnMoves(row, col, color, board)); break;
    case KNIGHT: moves.push(...getKnightMoves(row, col, color, board)); break;
    case BISHOP: moves.push(...getBishopMoves(row, col, color, board)); break;
    case ROOK: moves.push(...getRookMoves(row, col, color, board)); break;
    case QUEEN:
      moves.push(...getBishopMoves(row, col, color, board));
      moves.push(...getRookMoves(row, col, color, board));
      break;
    case KING: moves.push(...getKingMoves(row, col, color, board)); break;
  }

  return moves;
}

// Check if a square is attacked by any opponent piece (given a board state)
// Does NOT consider castling — king can't castle while in check anyway
function isSquareAttacked(row, col, byColor, boardRef) {
  const opponentColor = byColor === 'w' ? 'b' : 'w';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = boardRef[r][c];
      if (p === 0) continue;
      if ((p > 0 && opponentColor !== 'w') || (p < 0 && opponentColor !== 'b')) continue;

      const type = Math.abs(p);
      const attacks = getAttackSquares(r, c, opponentColor, boardRef, type);
      for (const a of attacks) {
        if (a.row === row && a.col === col) return true;
      }
    }
  }
  return false;
}

// Get all squares a piece of given type can attack (ignoring legality, no castling)
function getAttackSquares(row, col, color, boardRef, type) {
  const attacks = [];

  switch (type) {
    case PAWN: {
      const dir = color === 'w' ? -1 : 1;
      for (const dc of [-1, 1]) {
        const r = row + dir;
        const c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          attacks.push({ row: r, col: c });
        }
      }
      break;
    }
    case KNIGHT: {
      const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for (const [dr, dc] of deltas) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) attacks.push({ row: r, col: c });
      }
      break;
    }
    case BISHOP:
      attacks.push(...getSlidingAttacks(row, col, boardRef, [[-1,-1],[-1,1],[1,-1],[1,1]]));
      break;
    case ROOK:
      attacks.push(...getSlidingAttacks(row, col, boardRef, [[-1,0],[1,0],[0,-1],[0,1]]));
      break;
    case QUEEN:
      attacks.push(...getSlidingAttacks(row, col, boardRef, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]));
      break;
    case KING: {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr, c = col + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) attacks.push({ row: r, col: c });
        }
      }
      break;
    }
  }
  return attacks;
}

function getSlidingAttacks(row, col, boardRef, directions) {
  const attacks = [];
  const color = boardRef[row][col] > 0 ? 'w' : 'b';
  for (const [dr, dc] of directions) {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const p = boardRef[r][c];
      attacks.push({ row: r, col: c });
      if (p !== 0) {
        if ((color === 'w' && p > 0) || (color === 'b' && p < 0)) break;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return attacks;
}

// Check if a square is attacked by opponent (convenience wrapper for global board)
function isSquareAttackedByOpponent(row, col, color) {
  return isSquareAttacked(row, col, color, board);
}

// Check if a player is in check (using current board state)
function isInCheck(color) {
  let kingRow, kingCol;
  const kingVal = color === 'w' ? KING : -KING;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === kingVal) {
        kingRow = r; kingCol = c;
      }
    }
  }
  if (kingRow === undefined) return false;
  return isSquareAttackedByOpponent(kingRow, kingCol, color);
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
  const pieceValue = activeColor === 'w' ? pieceType : -pieceType;

  // Store last move for en passant and castling
  lastMove = {
    fromRow, fromCol, toRow, toCol,
    enPassant: !!flags?.enPassant,
    enPassantCol: flags?.enPassant ? toCol : null,
    pieceType,
    castling: flags?.castling || null,
    capturedPiece: captured
  };

  // Handle castling
  if (flags?.castling) {
    if (flags.castling === 'k') {
      // Kingside: rook moves from h1/h8 to f1/f8
      // White kingside: king from e1 (0,4) to g1 (0,6), rook from h1 (0,7) to f1 (0,5)
      // Black kingside: king from e8 (7,4) to g8 (7,6), rook from h8 (7,7) to f8 (7,5)
      board[toRow][5] = board[toRow][7]; // rook to f square
      board[toRow][7] = 0; // clear h square
      // Move king from e1/e8 to g1/g8
      board[toRow][6] = pieceValue; // king to g square
      board[fromRow][fromCol] = 0; // clear e square
      hasMoved[`${activeColor}K`] = true;
      hasMoved[`${activeColor}R`].k = true;
    } else if (flags.castling === 'q') {
      // Queenside castling: king moves 2 squares toward queenside rook
      // White queenside: king from e1 (0,4) to c1 (0,2), rook from a1 (0,0) to d1 (0,3)
      // Black queenside: king from e8 (7,4) to c8 (7,2), rook from a8 (7,0) to d8 (7,3)
      // Move rook from a1/a8 to d1/d8
      board[toRow][3] = board[toRow][0]; // rook to d square
      board[toRow][0] = 0; // clear a square
      // Move king from e1/e8 to c1/c8
      board[toRow][2] = pieceValue; // king to c square
      board[fromRow][fromCol] = 0; // clear e square
      hasMoved[`${activeColor}K`] = true;
      hasMoved[`${activeColor}R`].q = true;
    }
  } else {
    // Handle en passant capture
    if (flags?.enPassant) {
      // The captured pawn is on the same file, one square behind the destination
      const capturedRow = (activeColor === 'w') ? toRow + 1 : toRow - 1;
      board[capturedRow][toCol] = 0;
    }

    // Make the move: piece moves to new square
    board[toRow][toCol] = pieceValue;
    board[fromRow][fromCol] = 0;

    // Handle promotion - default to queen
    if (flags?.promotion) {
      const promotionPiece = flags.promotionPiece || 'Q';
      const pieceMap = { Q: QUEEN, R: ROOK, B: BISHOP, N: KNIGHT };
      const promoType = pieceMap[promotionPiece] || QUEEN;
      board[toRow][toCol] = activeColor === 'w' ? promoType : -promoType;
    }
  }

  // Update castling rights
  // King has moved
  if (pieceType === KING) {
    hasMoved[`${activeColor}K`] = true;
  }
  // Rook has moved from its original position
  if (pieceType === ROOK) {
    if (fromCol === 0) hasMoved[`${activeColor}R`].q = true;
    if (fromCol === 7) hasMoved[`${activeColor}R`].k = true;
  }

  // Record the move in history
  moveHistory.push({
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    pieceValue: pieceValue,
    captured: captured,
    flags: { ...flags }
  });

  // Switch turn
  activeColor = activeColor === 'w' ? 'b' : 'w';

  // Check if game is over (only checkmate/stalemate, not just check)
  const endState = checkGameEnd(activeColor);
  if (endState === 'checkmate' || endState === 'stalemate') {
    gameOver = true;
  }

  return true;
}

// Undo last move
function undoMove() {
  if (moveHistory.length === 0) return false;

  const last = moveHistory[moveHistory.length - 1];
  const { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol }, pieceValue, flags } = last;

  // Revert to previous active color
  activeColor = activeColor === 'w' ? 'b' : 'w';

  // Restore castling rights that may have been changed
  if (Math.abs(pieceValue) === KING) {
    hasMoved[`${activeColor}K`] = false;
  }
  if (Math.abs(pieceValue) === ROOK) {
    if (fromCol === 0) hasMoved[`${activeColor}R`].q = false;
    if (fromCol === 7) hasMoved[`${activeColor}R`].k = false;
  }

  // Reverse castling
  if (flags?.castling === 'k') {
    // Move rook back to h1/h8
    board[toRow][7] = board[toRow][5];
    board[toRow][5] = 0;
    // Move king back to e1/e8
    board[fromRow][fromCol] = pieceValue;
    // Clear g1/g8
    board[toRow][6] = 0;
    hasMoved[`${activeColor}K`] = false;
    hasMoved[`${activeColor}R`].k = false;
  } else if (flags?.castling === 'q') {
    // Reverse queenside castling
    // Queen-side: king from e1 to c1, rook from a1 to d1
    // Undo: king from c1 back to e1, rook from d1 back to a1
    board[toRow][0] = board[toRow][3]; // rook back to a1
    board[toRow][3] = 0; // clear d1
    board[fromRow][fromCol] = pieceValue; // king back to e1
    // Clear c1
    board[toRow][2] = 0;
    hasMoved[`${activeColor}K`] = false;
    hasMoved[`${activeColor}R`].q = false;
  } else {
    // Regular move reversal
    // Remove piece from destination
    board[toRow][toCol] = 0;
    // Place piece back at origin
    board[fromRow][fromCol] = pieceValue;
    // Restore captured piece if any
    if (last.captured !== null && last.captured !== undefined) {
      board[toRow][toCol] = last.captured;
    }
  }

  // Remove from move history
  moveHistory.pop();

  // Check if game was previously over and now isn't
  if (gameOver) {
    const endState = checkGameEnd(activeColor === 'w' ? 'w' : 'b');
    if (endState === 'none') {
      gameOver = false;
    }
  }

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