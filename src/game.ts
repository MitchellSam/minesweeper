// Thin stateful controller over the pure engine — DOM-free so it stays testable.
import { type Board, type GameStatus, chord, createBoard, minesLeft, reveal, toggleFlag } from './engine'

export interface GameConfig {
  width: number
  height: number
  mines: number
}

export type Difficulty = 'beginner' | 'intermediate' | 'expert'

export const PRESETS: Record<Difficulty, GameConfig> = {
  beginner: { width: 9, height: 9, mines: 10 },
  intermediate: { width: 16, height: 16, mines: 40 },
  expert: { width: 30, height: 16, mines: 99 },
}

export const BEGINNER = PRESETS.beginner

export class Game {
  board: Board
  config: GameConfig
  private startedAt: number | null = null
  private endedAt: number | null = null
  private readonly now: () => number

  constructor(config: GameConfig = BEGINNER, seed: number = Date.now(), now: () => number = Date.now) {
    this.config = config
    this.now = now
    this.board = createBoard(config.width, config.height, config.mines, seed)
  }

  private track(before: GameStatus): void {
    if (before === 'ready' && this.board.status === 'playing') this.startedAt = this.now()
    if (this.board.status === 'won' || this.board.status === 'lost') {
      if (this.startedAt === null) this.startedAt = this.now() // instant win on first reveal
      this.endedAt ??= this.now()
    }
  }

  reveal(x: number, y: number): void {
    const before = this.board.status
    this.board = reveal(this.board, x, y)
    this.track(before)
  }

  flag(x: number, y: number): void {
    this.board = toggleFlag(this.board, x, y)
  }

  chord(x: number, y: number): void {
    const before = this.board.status
    this.board = chord(this.board, x, y)
    this.track(before)
  }

  newGame(seed: number = Date.now()): void {
    this.board = createBoard(this.config.width, this.config.height, this.config.mines, seed)
    this.startedAt = null
    this.endedAt = null
  }

  setDifficulty(difficulty: Difficulty, seed: number = Date.now()): void {
    this.config = PRESETS[difficulty]
    this.newGame(seed)
  }

  /** Milliseconds since the first reveal; frozen at win/loss; 0 before the game starts. */
  get elapsedMs(): number {
    if (this.startedAt === null) return 0
    return (this.endedAt ?? this.now()) - this.startedAt
  }

  get status(): GameStatus {
    return this.board.status
  }

  get minesLeft(): number {
    return minesLeft(this.board)
  }
}
