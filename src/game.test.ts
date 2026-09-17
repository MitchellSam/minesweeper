import { describe, expect, it } from 'vitest'
import { cellAt } from './engine'
import { BEGINNER, Game } from './game'

describe('Game controller', () => {
  it('starts a beginner board in ready state with full mine count', () => {
    const g = new Game(BEGINNER, 1)
    expect(g.status).toBe('ready')
    expect(g.minesLeft).toBe(10)
    expect(g.board.cells).toHaveLength(81)
  })

  it('transitions to playing on first reveal and flags cells', () => {
    const g = new Game(BEGINNER, 1)
    g.reveal(4, 4)
    expect(g.status).toBe('playing')
    g.flag(0, 0)
    expect(g.minesLeft).toBe(9)
    g.flag(0, 0)
    expect(g.minesLeft).toBe(10)
  })

  it('chords through the controller', () => {
    const g = new Game({ width: 9, height: 9, mines: 10 }, 1)
    g.reveal(4, 4)
    const before = g.board
    g.chord(4, 4) // zero cell — chord is a no-op, board unchanged
    expect(g.board).toBe(before)
  })

  it('newGame resets to a fresh ready board with the same config', () => {
    const g = new Game(BEGINNER, 1)
    g.reveal(4, 4)
    g.newGame(2)
    expect(g.status).toBe('ready')
    expect(g.minesLeft).toBe(10)
    expect(g.board.cells.every((c) => c.state === 'hidden')).toBe(true)
    expect(cellAt(g.board, 4, 4).state).toBe('hidden')
  })
})
