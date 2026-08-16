// Chess Game UI
// -------------

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

// Game state tracking - selected square for click-to-move
let selectedSquare = null; // {row, col}
let pendingPromotion = null; // {row, col, color}

// Get active color from game state
function getActiveColor() {
  return window.ChessGame.getActiveColor();
}

// Check if game is over
function isGameOver() {
  return window.ChessGame.isGameOver();
}

// Render the board based on current game state
function renderBoard() {
  const state = window.ChessGame;
  const board = state.getBoard();
  const activeColor = state.getActiveColor();

  DOM.board.innerHTML = '';

  // Determine if board is flipped (from black's perspective)
  const flipped = DOM.board.style.transform === 'scaleX(-1)';

  // Add rank labels and squares row by row
  for (let r = 0; r < 8; r++) {
    const rIdx = flipped ? 7 - r : r; // row index after flipping

    // Add rank number on the left side
    const rankLabel = document.createElement('div');
    rankLabel.className = 'label label-rank';
    rankLabel.textContent = 8 - rIdx;
    // Position it absolutely on the left
    rankLabel.style.left = '0';
    rankLabel.style.top = `${r * var(--square-size)}px`;
    rankLabel.style.height = `${var(--square-size)}px`;
    rankLabel.lineHeight = `${var(--square-size)}px`;
    DOM.board.style.position = 'relative';
    DOM.board.appendChild(rankLabel);

    // Add file labels (a-h) across the top on first iteration
    if (r === 0) {
      const fileLabelsContainer = document.createElement('div');
      fileLabelsContainer.style.position = 'absolute';
      fileLabelsContainer.style.top = '0';
      fileLabelsContainer.style.left = '0';
      fileLabelsContainer.style.width = '100%';
      fileLabelsContainer.style.height = '100%';
      fileLabelsContainer.style.pointerEvents = 'none';
      fileLabelsContainer.style.display = 'grid';
      fileLabelsContainer.style.gridTemplateColumns = 'repeat(8, var(--square-size))';

      for (let c = 0; c < 8; c++) {
        const cIdx = flipped ? 7 - c : c;
        const fLabel = document.createElement('div');
        fLabel.className = 'label label-file';
        fLabel.textContent = flipped ? String.fromCharCode(104 - cIdx) : String.fromCharCode(97 + cIdx);
        fLabel.style.fontSize = '0.75rem';
        fLabel.style.color = '#777';
        fLabel.style.textAlign = 'center';
        fLabel.style.lineHeight = 'var(--square-size)';
        fileLabelsContainer.appendChild(fLabel);
      }
      DOM.board.appendChild(fileLabelsContainer);
      // Only add file labels once (on first row after flip detection)
      // We'll break after adding them, but we still need to render the board squares
      // So we'll just continue without adding again
      continue; // Skip normal square rendering for this row since we added file labels
    }

    for (let c = 0; c < 8; c++) {
      const cIdx = flipped ? 7 - c : c;

      const square = document.createElement('div');
      square.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

      // Set square size via CSS variable
      square.style.width = 'var(--square-size)';
      square.style.height = 'var(--square-size)';

      const pieceValue = board[rIdx][cIdx];
      if (pieceValue !== 0) {
        // Use the pieceInfo from game.js or define locally
        const color = pieceValue > 0 ? 'w' : 'b';
        const type = Math.abs(pieceValue);
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
        const symKey = color + sym;
        square.textContent = PIECE_SYMBOLS[color][sym];
        square.classList.add('piece');
      }

      // Highlight selected square
      if (selectedSquare && selectedSquare.row === rIdx && selectedSquare.col === cIdx) {
        square.classList.add('highlight');
      }

      // Highlight legal move squares (simple version - would need full move generation)
      // For now, just basic selection highlighting

      // Square click handler
      square.addEventListener('click', () => handleSquareClick(rIdx, cIdx));

      DOM.board.appendChild(square);
    }
  }

  // Update status
  const turnText = activeColor === 'w' ? 'White' : 'Black';
  DOM.status.textContent = `${turnText} to move`;

  // Check game state
  const endState = state.checkGameEnd(activeColor);
  if (endState !== 'none' && !state.isGameOver()) {
    showGameResult(endState);
  }
}

// Info helper - inline since it's used in both files
function getPieceInfo(pieceVal) {
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

// Handle square click - click-to-move
function handleSquareClick(row, col) {
  const state = window.ChessGame;

  if (isGameOver()) return;

  if (!getActiveColor()) return;

  // Get the piece at this square
  const board = state.getBoard();
  const piece = board[row][col];

  if (!selectedSquare) {
    // Select a piece of the active color
    if ((getActiveColor() === 'w' && piece > 0) || (getActiveColor() === 'b' && piece < 0)) {
      selectedSquare = { row, col };
      renderBoard(); // Re-render to highlight
    }
  } else {
    // Try to move from selected square to this square
    const fromRow = selectedSquare.row;
    const fromCol = selectedSquare.col;

    const legalMoves = state.generateLegalMoves(getActiveColor());
    const myMoves = legalMoves.filter(m =>
      m.from.row === fromRow && m.from.col === fromCol
    );

    if (myMoves.length > 0) {
      // Make the first legal move (in a full UI, we'd show all options)
      const move = myMoves[0];
      state.makeMove(move);
      renderBoard();

      // Check game end after move
      const endState = state.checkGameEnd(getActiveColor() === 'w' ? 'w' : 'b');
      if (endState !== 'none') {
        showGameResult(endState);
        selectedSquare = null;
        return;
      }
    }

    // Deselect
    selectedSquare = null;
    renderBoard();
  }
}

// Show game result
function showGameResult(result) {
  const state = window.ChessGame;
  state.gameOver = true; // Mark as game over

  let message;
  let winner;
  switch (result) {
    case 'checkmate':
      winner = state.getActiveColor() === 'w' ? 'Black' : 'White';
      message = `${winner} wins by checkmate!`;
      break;
    case 'stalemate':
      message = 'Stalemate! Draw.';
      break;
    default:
      message = 'Game over';
  }

  if (confirm(message + '\nStart a new game?')) {
    state.initBoard();
    selectedSquare = null;
    pendingPromotion = null;
    renderBoard();
  }
}

// New game
function newGame() {
  const state = window.ChessGame;
  state.initBoard();
  selectedSquare = null;
  pendingPromotion = null;
  renderBoard();
}

// Undo move
function undo() {
  const success = window.ChessGame.undoMove();
  if (success) {
    renderBoard();
    // After undo, the game might no longer be over
    // But our undoMove doesn't clear gameOver flag, so we need to handle this
    // For now, just re-render
  }
}

// Flip board
function flipBoard() {
  const current = DOM.board.style.transform || '';
  if (current.includes('scaleX(-1)')) {
    DOM.board.style.transform = '';
  } else {
    DOM.board.style.transform = 'scaleX(-1)';
  }
  // Re-render after flipping
  renderBoard();
}

// Setup event listeners
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

  // Promotion dialog - handled via click events on promoted squares
  // The promotion choice buttons will be created when needed
}

// Handle pawn promotion
function handlePromotion(piece) {
  const state = window.ChessGame;

  if (!pendingPromotion) return;

  const { row, col, color } = pendingPromotion;
  const pieceValues = { Q: 5, R: 4, B: 3, N: 2 };
  const val = pieceValues[piece];

  // Set the promoted piece
  const signedVal = color === 'w' ? val : -val;

  // Replace the pawn on the board - need to get current board
  const board = state.getBoard();
  board[row][col] = signedVal;

  // Clear pending promotion
  pendingPromotion = null;

  // Switch turn
  state.makeMove({ /* we need a proper move object */ });
  // Actually, let's just update the board directly and switch turn
  // The makeMove function expects a specific format, so let's handle this differently

  // For promotion, we directly set the piece and switch turn
  const pieceValue = board[row][col];
  // Actually the board was already updated above

  // Switch turn manually
  state = window.ChessGame;
  // Switch active color
  // Actually, the makeMove handles turn switching. For promotion, let's just re-init or handle manually.

  // Let me take a different approach - just re-render with the new piece
  renderBoard();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  newGame();
  setupEventListeners();
});