// Chess Game UI - DOM rendering and user interaction
// -------------------------------------------------

// References to DOM elements
const DOM = {
  board: document.getElementById('board'),
  status: document.getElementById('status'),
  history: document.getElementById('history'),
  capturedWhite: document.querySelector('.captured-pieces[data-side="w"]'),
  capturedBlack: document.querySelector('.captured-pieces[data-side="b"]'),
  promoDialog: document.getElementById('promo-dialog'),
  promoChoices: document.getElementById('promo-choices'),
  newGameBtn: document.getElementById('btn-new-game'),
  undoBtn: document.getElementById('btn-undo'),
  resignBtn: document.getElementById('btn-resign'),
  flipBtn: document.getElementById('btn-flip'),
  aiSelect: document.getElementById('ai-select'),
  timerSelect: document.getElementById('timer-select')
};

// UI state - only what's needed for rendering
let selectedSquare = null; // {row, col} - selected piece location

// Piece symbols (Unicode)
const PIECE_SYMBOLS = {
  w: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  b: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' }
};

// Get active color from game state
function getActiveColor() {
  return window.ChessGame.getActiveColor();
}

// Check if game is over
function isGameOver() {
  return window.ChessGame.isGameOver();
}

// Get the current board state
function getBoard() {
  return window.ChessGame.getBoard();
}

// Render the chess board based on current game state
function renderBoard() {
  const state = window.ChessGame;
  const board = state.getBoard();
  const activeColor = state.getActiveColor();

  DOM.board.innerHTML = '';

  // Determine if board is flipped (from black's perspective)
  const flipped = DOM.board.style.transform === 'scaleX(-1)';

  // Add rank labels (1-8) down the left side and file labels (a-h) across the top
  for (let r = 0; r < 8; r++) {
    const rIdx = flipped ? 7 - r : r; // row index after potential flip

    // Add file label (a-h) on the top row only
    if (r === 0) {
      const fileLabelsRow = document.createElement('div');
      fileLabelsRow.style.position = 'absolute';
      fileLabelsRow.style.top = '0';
      fileLabelsRow.style.left = '0';
      fileLabelsRow.style.width = 'calc(8 * var(--square-size))';
      fileLabelsRow.style.height = 'var(--square-size)';
      fileLabelsRow.style.display = 'grid';
      fileLabelsRow.style.gridTemplateColumns = 'repeat(8, var(--square-size))';
      fileLabelsRow.style.pointerEvents = 'none';
      fileLabelsRow.style.zIndex = '10';

      for (let c = 0; c < 8; c++) {
        const cIdx = flipped ? 7 - c : c;
        const fLabel = document.createElement('div');
        fLabel.className = 'label label-file';
        // 'a' is charCode 97, so 'a' + column index
        fLabel.textContent = String.fromCharCode(97 + cIdx);
        fLabel.style.fontSize = '0.75rem';
        fLabel.style.color = '#777';
        fLabel.style.textAlign = 'center';
        fLabel.style.lineHeight = 'var(--square-size)';
        fileLabelsRow.appendChild(fLabel);
      }
      DOM.board.appendChild(fileLabelsRow);
    }

    // Add rank label (1-8) on the left side of each row
    const rankLabel = document.createElement('div');
    rankLabel.className = 'label label-rank';
    rankLabel.textContent = 8 - rIdx;
    rankLabel.style.position = 'absolute';
    rankLabel.style.left = '0';
    rankLabel.style.top = `${r * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--square-size'))}px`;
    rankLabel.style.width = 'var(--square-size)';
    rankLabel.style.height = 'var(--square-size)';
    rankLabel.style.display = 'flex';
    rankLabel.style.alignItems = 'center';
    rankLabel.style.justifyContent = 'center';
    rankLabel.style.fontSize = '1rem';
    rankLabel.style.color = '#777';
    rankLabel.style.textAlign = 'center';
    rankLabel.style.zIndex = '10';
    DOM.board.style.position = 'relative';
    DOM.board.appendChild(rankLabel);

    for (let c = 0; c < 8; c++) {
      const cIdx = flipped ? 7 - c : c;

      const square = document.createElement('div');
      square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      square.style.width = 'var(--square-size)';
      square.style.height = 'var(--square-size)';
      square.style.position = 'relative';
      square.style.zIndex = '1';

      // Place piece on square if there is one
      const pieceValue = board[rIdx][cIdx];
      if (pieceValue !== 0) {
        const info = pieceInfo(pieceValue);
        if (info) {
          const symKey = info.color + info.sym;
          square.textContent = PIECE_SYMBOLS[info.color][info.sym];
          square.classList.add('piece');
        }
      }

      // Highlight selected square
      if (selectedSquare && selectedSquare.row === rIdx && selectedSquare.col === cIdx) {
        square.classList.add('highlight');
      }

      // Square click handler
      square.addEventListener('click', () => handleSquareClick(rIdx, cIdx));

      DOM.board.appendChild(square);
    }
  }

  // Update status bar
  const turnText = activeColor === 'w' ? 'White' : 'Black';
  DOM.status.textContent = `${turnText} to move`;
}

// Piece info helper - keeps UI self-contained
function pieceInfo(pieceVal) {
  if (pieceVal === 0) return null;
  const color = pieceVal > 0 ? 'w' : 'b';
  const type = Math.abs(pieceVal);
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
  return { color, type, sym };
}

// Handle square click - click-to-move interaction
function handleSquareClick(row, col) {
  const state = window.ChessGame;

  if (isGameOver()) return;

  // Get the piece at clicked square
  const board = state.getBoard();
  const piece = board[row][col];

  if (!selectedSquare) {
    // No piece selected yet - select this piece if it's the active player's
    if ((getActiveColor() === 'w' && piece > 0) || (getActiveColor() === 'b' && piece < 0)) {
      selectedSquare = { row, col };
      renderBoard(); // Re-render to show selection highlight
    }
  } else {
    // A piece is selected - try to move it to the clicked square
    const fromRow = selectedSquare.row;
    const fromCol = selectedSquare.col;

    // Generate legal moves for the active color and find moves from selected square
    const legalMoves = state.generateLegalMoves(getActiveColor());
    const myMoves = legalMoves.filter(m =>
      m.from.row === fromRow && m.from.col === fromCol && m.to.row === row && m.to.col === col
    );

    if (myMoves.length > 0) {
      const move = myMoves[0];
      
      // Check if promotion is needed
      if (move.flags?.promotion) {
        showPromotionDialog(move, (promotionPiece) => {
          move.flags.promotionPiece = promotionPiece;
          state.makeMove(move);
          selectedSquare = null;
          renderBoard();
        });
        return;
      }
      
      state.makeMove(move);
      selectedSquare = null;
      renderBoard();
      return;
    }

    // No legal moves from this square - deselect or select new piece
    if ((getActiveColor() === 'w' && piece > 0) || (getActiveColor() === 'b' && piece < 0)) {
      selectedSquare = { row, col };
    } else {
      selectedSquare = null;
    }
    renderBoard();
  }
}

// Show promotion dialog
function showPromotionDialog(move, callback) {
  const color = getActiveColor();
  const pieces = ['Q', 'R', 'B', 'N'];
  
  DOM.promoChoices.innerHTML = '';
  DOM.promoDialog.classList.remove('hidden');
  
  pieces.forEach(piece => {
    const btn = document.createElement('button');
    btn.textContent = PIECE_SYMBOLS[color][piece];
    btn.onclick = () => {
      DOM.promoDialog.classList.add('hidden');
      callback(piece);
    };
    DOM.promoChoices.appendChild(btn);
  });
}

// Show game result (checkmate or stalemate)
// Called by renderBoard when gameOver flag is set
function showGameResult(result) {
  const state = window.ChessGame;
  // gameOver is already true at this point

  let message;
  switch (result) {
    case 'checkmate':
      const winner = getActiveColor() === 'w' ? 'Black' : 'White';
      message = `${winner} wins by checkmate!`;
      break;
    case 'stalemate':
      message = 'Stalemate! Draw.';
      break;
    default:
      message = 'Game over';
  }

  // Ask if user wants to play again
  if (confirm(message + '\nStart a new game?')) {
    state.initBoard();
    selectedSquare = null;
    renderBoard();
  }
}

// Hide promotion dialog
function hidePromotionDialog() {
  DOM.promoDialog.classList.add('hidden');
}

// New game - reset everything
function newGame() {
  const state = window.ChessGame;
  state.initBoard();
  selectedSquare = null;
  renderBoard();
}

// Undo the last move
function undo() {
  const success = window.ChessGame.undoMove();
  if (success) {
    renderBoard();
    // After undo, the gameOver flag may need to be reset
    // If the game was previously over and undo removes the last move,
    // the game should no longer be over. The render will handle this.
  }
}

// Flip the board (change perspective)
function flipBoard() {
  const current = DOM.board.style.transform || '';
  if (current.includes('scaleX(-1)')) {
    DOM.board.style.transform = '';
  } else {
    DOM.board.style.transform = 'scaleX(-1)';
  }
  // Re-render with new perspective
  renderBoard();
}

// Setup event listeners for UI controls
function setupEventListeners() {
  DOM.newGameBtn.addEventListener('click', newGame);
  DOM.undoBtn.addEventListener('click', undo);
  DOM.resignBtn.addEventListener('click', () => {
    if (confirm('Resign? ' + (getActiveColor() === 'w' ? 'Black' : 'White') + ' wins.')) {
      alert((getActiveColor() === 'w' ? 'Black' : 'White') + ' wins by resignation!');
      newGame();
    }
  });
  DOM.flipBtn.addEventListener('click', flipBoard);
  
  // Close promotion dialog when clicking outside
  DOM.promoDialog.addEventListener('click', (e) => {
    if (e.target === DOM.promoDialog) {
      hidePromotionDialog();
    }
  });
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
  newGame();
  setupEventListeners();
});

// Expose functions for external use
window.ChessUI = {
  renderBoard,
  hidePromotionDialog
};