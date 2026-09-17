// Pure Minesweeper engine: no DOM, no side effects. All mutating operations
// return a new Board; callers never share cell objects across versions.

export type CellState = 'hidden' | 'revealed' | 'flagged'
export type GameStatus = 'ready' | 'playing' | 'won' | 'lost'

export interface Cell {
  mine: boolean
  adjacent: number
  state: CellState
}

export interface Board {
  width: number
  height: number
  mineCount: number
  status: GameStatus
  cells: Cell[] // row-major, index = y * width + x
  seed: number
}

// Deterministic PRNG so mine layouts are reproducible from a seed.
function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function index(board: Board, x: number, y: number): number {
  return y * board.width + x
}

export function cellAt(board: Board, x: number, y: number): Cell {
  return board.cells[index(board, x, y)]
}

function inBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && x < board.width && y >= 0 && y < board.height
}

export function neighbors(board: Board, x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (inBounds(board, nx, ny)) out.push([nx, ny])
    }
  }
  return out
}

export function createBoard(width: number, height: number, mineCount: number, seed: number): Board {
  if (width < 1 || height < 1) throw new Error('board must be at least 1x1')
  if (mineCount < 1 || mineCount >= width * height) {
    throw new Error('mineCount must be between 1 and cells-1')
  }
  return {
    width,
    height,
    mineCount,
    status: 'ready',
    seed,
    cells: Array.from({ length: width * height }, () => ({
      mine: false,
      adjacent: 0,
      state: 'hidden' as CellState,
    })),
  }
}

/** Build a board with explicit mine positions (already "placed"). For tests and previews. */
export function createBoardWithMines(width: number, height: number, mines: Array<[number, number]>): Board {
  const board = createBoard(width, height, mines.length, 0)
  for (const [x, y] of mines) board.cells[index(board, x, y)].mine = true
  computeAdjacents(board)
  board.status = 'playing'
  return board
}

function cloneBoard(board: Board): Board {
  return { ...board, cells: board.cells.map((c) => ({ ...c })) }
}

function computeAdjacents(board: Board): void {
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      let n = 0
      for (const [nx, ny] of neighbors(board, x, y)) {
        if (cellAt(board, nx, ny).mine) n++
      }
      board.cells[index(board, x, y)].adjacent = n
    }
  }
}

// First-click safety: keep the clicked cell and (when the board is sparse
// enough) its whole neighborhood mine-free.
function placeMines(board: Board, safeX: number, safeY: number): void {
  const safe = new Set<number>([index(board, safeX, safeY)])
  const wide = new Set(safe)
  for (const [nx, ny] of neighbors(board, safeX, safeY)) wide.add(index(board, nx, ny))

  const total = board.width * board.height
  const zone = total - board.mineCount >= wide.size ? wide : safe
  const candidates: number[] = []
  for (let i = 0; i < total; i++) if (!zone.has(i)) candidates.push(i)

  const rng = mulberry32(board.seed)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  for (const i of candidates.slice(0, board.mineCount)) board.cells[i].mine = true
  computeAdjacents(board)
}

function revealFlood(board: Board, x: number, y: number): void {
  const stack: Array<[number, number]> = [[x, y]]
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!
    const cell = board.cells[index(board, cx, cy)]
    if (cell.state !== 'hidden') continue
    cell.state = 'revealed'
    if (cell.adjacent === 0 && !cell.mine) {
      for (const [nx, ny] of neighbors(board, cx, cy)) {
        if (cellAt(board, nx, ny).state === 'hidden') stack.push([nx, ny])
      }
    }
  }
}

function loseAt(board: Board): void {
  board.status = 'lost'
  for (const cell of board.cells) {
    if (cell.mine && cell.state !== 'flagged') cell.state = 'revealed'
  }
}

function checkWin(board: Board): void {
  const won = board.cells.every((c) => c.mine || c.state === 'revealed')
  if (won) {
    board.status = 'won'
    for (const cell of board.cells) {
      if (cell.mine) cell.state = 'flagged'
    }
  }
}

export function reveal(board: Board, x: number, y: number): Board {
  if (board.status === 'won' || board.status === 'lost') return board
  const target = cellAt(board, x, y)
  if (target.state !== 'hidden') return board

  const next = cloneBoard(board)
  if (next.status === 'ready') {
    placeMines(next, x, y)
    next.status = 'playing'
  }
  const cell = next.cells[index(next, x, y)]
  if (cell.mine) {
    cell.state = 'revealed'
    loseAt(next)
    return next
  }
  revealFlood(next, x, y)
  checkWin(next)
  return next
}

export function toggleFlag(board: Board, x: number, y: number): Board {
  if (board.status === 'won' || board.status === 'lost') return board
  const target = cellAt(board, x, y)
  if (target.state === 'revealed') return board

  const next = cloneBoard(board)
  const cell = next.cells[index(next, x, y)]
  cell.state = cell.state === 'flagged' ? 'hidden' : 'flagged'
  return next
}

/** Chord: on a revealed number whose flag count matches, reveal remaining hidden neighbors. */
export function chord(board: Board, x: number, y: number): Board {
  if (board.status !== 'playing') return board
  const cell = cellAt(board, x, y)
  if (cell.state !== 'revealed' || cell.adjacent === 0) return board

  const around = neighbors(board, x, y)
  const flags = around.filter(([nx, ny]) => cellAt(board, nx, ny).state === 'flagged').length
  if (flags !== cell.adjacent) return board

  let next = board
  for (const [nx, ny] of around) {
    if (cellAt(next, nx, ny).state === 'hidden') {
      next = reveal(next, nx, ny)
      if (next.status === 'lost') break
    }
  }
  return next
}

export function minesLeft(board: Board): number {
  const flags = board.cells.filter((c) => c.state === 'flagged').length
  return board.mineCount - flags
}
