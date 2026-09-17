// Thin stateful controller over the pure engine — DOM-free so it stays testable.
import { type Board, type GameStatus, chord, createBoard, minesLeft, reveal, toggleFlag } from './engine'

export interface GameConfig {
  width: number
  height: number
  mines: number
}

export const BEGINNER: GameConfig = { width: 9, height: 9, mines: 10 }

export class Game {
  board: Board
  config: GameConfig

  constructor(config: GameConfig = BEGINNER, seed: number = Date.now()) {
    this.config = config
    this.board = createBoard(config.width, config.height, config.mines, seed)
  }

  reveal(x: number, y: number): void {
    this.board = reveal(this.board, x, y)
  }

  flag(x: number, y: number): void {
    this.board = toggleFlag(this.board, x, y)
  }

  chord(x: number, y: number): void {
    this.board = chord(this.board, x, y)
  }

  newGame(seed: number = Date.now()): void {
    this.board = createBoard(this.config.width, this.config.height, this.config.mines, seed)
  }

  get status(): GameStatus {
    return this.board.status
  }

  get minesLeft(): number {
    return minesLeft(this.board)
  }
}
