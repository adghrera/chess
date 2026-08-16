# HTML Chess Game — Development Checklist

A step-by-step checklist for building a fully playable, HTML/CSS/JavaScript chess game.

---

## 1. Project Setup

- [ ] Create project folder structure
  - [ ] `index.html` — main page
  - [ ] `css/style.css` — board, pieces, and UI styling
  - [ ] `js/game.js` — core game logic (board state, move validation)
  - [ ] `js/ui.js` — DOM rendering and user interaction
  - [ ] `assets/` — piece images/icons (or use Unicode chess symbols ♔♕♖♗♘♙ ♚♛♜♝♞♟)
- [ ] Link CSS and JS files in `index.html`
- [ ] Decide on piece representation (Unicode symbols vs. image sprites)
- [ ] (Optional) Set up a local dev server (e.g., `python -m http.server` or VS Code Live Server)

## 2. Board & Piece Rendering

- [ ] Define the 8×8 board data structure (2D array, 0–7 rows/columns)
- [ ] Initialize the board with the standard starting position (ranks 1–2 and 7–8)
- [ ] Render the 8×8 grid in HTML (CSS Grid is recommended)
- [ ] Alternate light/dark square colors
- [ ] Add rank labels (1–8) and file labels (a–h) around the grid
- [ ] Render all 32 pieces on their starting squares
- [ ] Make the board responsive (scales to viewport, stays square)
- [ ] (Optional) Support board flipping (white/black perspective)

## 3. Basic Interaction

- [ ] Handle square clicks (click-to-select, click-to-move)
- [ ] Highlight the currently selected piece/square
- [ ] Highlight legal destination squares for the selected piece
- [ ] Move a piece on valid target click and update the board state
- [ ] Capture opponent pieces on valid capture moves
- [ ] Switch the active turn (white ↔ black) after each move
- [ ] Show whose turn it is (status indicator)
- [ ] (Optional) Support drag-and-drop as an alternative to click-to-move
- [ ] (Optional) Add move animations (piece sliding, capture effects)

## 4. Move Validation (Core Rules)

- [ ] Pawn: one square forward; two squares forward from starting rank; diagonal capture
- [ ] Knight: L-shaped moves; can jump over pieces
- [ ] Bishop: diagonal movement any distance; blocked by pieces
- [ ] Rook: horizontal/vertical movement any distance; blocked by pieces
- [ ] Queen: combined rook + bishop movement
- [ ] King: one square in any direction
- [ ] A piece may not move onto a square occupied by a same-color piece
- [ ] A piece may not move such that its own king is left in check
- [ ] Build a "generate legal moves" function per piece type
- [ ] Build an "is in check" function (any enemy piece attacks the king)

## 5. Special Rules

- [ ] **Pawn promotion** — offer piece choice (Q/R/B/N) when a pawn reaches the last rank
- [ ] **Castling** — king and rook unmoved, no pieces between, king not in check, king does not pass through or land on an attacked square
  - [ ] Track "has moved" flags for kings and rooks
  - [ ] Support both kingside (O-O) and queenside (O-O-O)
- [ ] **En passant** — capture a pawn that just advanced two squares, only on the immediately following turn
  - [ ] Track the last move to detect en passant eligibility
- [ ] **50-move rule** (optional) — draw after 50 moves without a capture or pawn move
- [ ] **Threefold repetition** (optional) — draw if the same position occurs three times
- [ ] **Insufficient material** (optional) — draw with K vs K, K+B/N vs K, K+B vs K same-colored bishops

## 6. Game End Detection

- [ ] Detect **check** and announce it in the UI
- [ ] Detect **checkmate** (in check + no legal moves) and end the game
- [ ] Detect **stalemate** (not in check + no legal moves) and declare a draw
- [ ] Declare winner and show a game-over message
- [ ] (Optional) Track captured pieces and display them per player

## 7. Game Features & UI/UX

- [ ] "New Game" button to reset the board
- [ ] "Undo" button to take back the last move (or last move pair)
- [ ] Move history panel (algebraic notation, e.g., `e4`, `Nf3`, `O-O`, `exd5`)
  - [ ] Implement basic algebraic notation including disambiguation, `+`/`#` suffixes
- [ ] Turn indicator (highlight or label)
- [ ] Check/checkmate/stalemate banners
- [ ] (Optional) Timer per player for timed games
- [ ] (Optional) Sound effects for moves, captures, check, and game over
- [ ] (Optional) Resign button
- [ ] (Optional) Simple AI opponent (minimax with alpha-beta pruning, depth 2–3)
  - [ ] Add difficulty levels (depth or move randomness)

## 8. Testing

- [ ] Test every piece's movement from all board positions
- [ ] Test edge cases:
  - [ ] Pinned pieces (cannot move into check)
  - [ ] Castling blocked by pieces / through check / out of check
  - [ ] En passant available and unavailable windows
  - [ ] Promotion on each file
  - [ ] Checks, checkmates (e.g., scholar's mate, back-rank mate), stalemates
- [ ] Test turn alternation and illegal move rejection
- [ ] Test undo across special moves (castling, en passant, promotion)
- [ ] Cross-browser testing (Chrome, Firefox, Edge, Safari)
- [ ] Responsive testing on mobile/tablet screen sizes

## 9. Polish & Deployment

- [ ] Review and clean up code (remove console logs, organize functions)
- [ ] Add a brief README with how to run the game
- [ ] Performance check (board re-renders should be fast/smooth)
- [ ] Accessibility: keyboard navigation (optional), sufficient color contrast
- [ ] Deploy (e.g., GitHub Pages, Netlify, Vercel)
- [ ] Final playthrough of a complete game from start to checkmate

---

## Suggested Build Order

1. **MVP**: board rendering + click-to-move + basic piece movement (no check rules)
2. **Rules engine**: full legal move validation + check/checkmate/stalemate
3. **Special moves**: promotion, castling, en passant
4. **UX**: move history, undo, new game, status banners
5. **Extras**: AI opponent, timers, sounds, animations
6. **Ship**: testing pass + deployment
