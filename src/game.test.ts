import { describe, expect, it } from 'vitest'
import { cellAt } from './engine'
import { BEGINNER, Game, PRESETS } from './game'

describe('presets', () => {
  it('defines the three classic difficulties', () => {
    expect(PRESETS.beginner).toEqual({ width: 9, height: 9, mines: 10 })
    expect(PRESETS.intermediate).toEqual({ width: 16, height: 16, mines: 40 })
    expect(PRESETS.expert).toEqual({ width: 30, height: 16, mines: 99 })
  })

  it('setDifficulty resets to a fresh board with the new config', () => {
    const g = new Game(PRESETS.beginner, 1)
    g.reveal(4, 4)
    g.setDifficulty('expert', 2)
    expect(g.status).toBe('ready')
    expect(g.board.cells).toHaveLength(30 * 16)
    expect(g.minesLeft).toBe(99)
  })
})

describe('timer', () => {
  const clock = () => {
    let t = 1000
    return { now: () => t, advance: (ms: number) => (t += ms) }
  }

  it('is 0 before the first reveal and counts while playing', () => {
    const c = clock()
    const g = new Game(PRESETS.beginner, 1, c.now)
    expect(g.elapsedMs).toBe(0)
    g.reveal(4, 4)
    c.advance(3200)
    expect(g.elapsedMs).toBe(3200)
  })

  it('freezes when the game ends', () => {
    const c = clock()
    const g = new Game(PRESETS.beginner, 1, c.now)
    g.reveal(4, 4)
    c.advance(2000)
    // find any hidden mine and step on it
    outer: for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (cellAt(g.board, x, y).mine) {
          g.reveal(x, y)
          break outer
        }
      }
    }
    expect(g.status).toBe('lost')
    c.advance(5000)
    expect(g.elapsedMs).toBe(2000)
  })

  it('resets with newGame', () => {
    const c = clock()
    const g = new Game(PRESETS.beginner, 1, c.now)
    g.reveal(4, 4)
    c.advance(1000)
    g.newGame(3)
    expect(g.elapsedMs).toBe(0)
  })
})

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
