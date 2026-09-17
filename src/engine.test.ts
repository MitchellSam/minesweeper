import { describe, expect, it } from 'vitest'
import {
  type Board,
  cellAt,
  chord,
  createBoard,
  createBoardWithMines,
  minesLeft,
  neighbors,
  reveal,
  toggleFlag,
} from './engine'

function mineCoords(board: Board): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let y = 0; y < board.height; y++) {
    for (let x = 0; x < board.width; x++) {
      if (cellAt(board, x, y).mine) out.push([x, y])
    }
  }
  return out
}

describe('createBoard', () => {
  it('creates an all-hidden, mine-free board in ready state', () => {
    const b = createBoard(9, 9, 10, 1)
    expect(b.cells).toHaveLength(81)
    expect(b.status).toBe('ready')
    expect(b.cells.every((c) => c.state === 'hidden' && !c.mine)).toBe(true)
  })

  it('rejects invalid dimensions and mine counts', () => {
    expect(() => createBoard(0, 5, 1, 1)).toThrow()
    expect(() => createBoard(5, 5, 0, 1)).toThrow()
    expect(() => createBoard(5, 5, 25, 1)).toThrow()
  })
})

describe('mine placement', () => {
  it('places exactly mineCount mines on first reveal', () => {
    const b = reveal(createBoard(9, 9, 10, 42), 4, 4)
    expect(mineCoords(b)).toHaveLength(10)
    expect(b.status).toBe('playing')
  })

  it('is deterministic for a given seed and differs across seeds', () => {
    const a = reveal(createBoard(16, 16, 40, 7), 8, 8)
    const b = reveal(createBoard(16, 16, 40, 7), 8, 8)
    const c = reveal(createBoard(16, 16, 40, 8), 8, 8)
    expect(mineCoords(a)).toEqual(mineCoords(b))
    expect(mineCoords(a)).not.toEqual(mineCoords(c))
  })

  it('never mines the first-revealed cell or its neighbors when space allows', () => {
    for (let seed = 0; seed < 50; seed++) {
      const b = reveal(createBoard(9, 9, 10, seed), 4, 4)
      expect(cellAt(b, 4, 4).mine).toBe(false)
      for (const [nx, ny] of neighbors(b, 4, 4)) {
        expect(cellAt(b, nx, ny).mine).toBe(false)
      }
      expect(b.status).toBe('playing')
    }
  })

  it('falls back to protecting only the clicked cell on dense boards', () => {
    // 3x3 with 8 mines: only the clicked cell can be spared.
    for (let seed = 0; seed < 20; seed++) {
      const b = reveal(createBoard(3, 3, 8, seed), 1, 1)
      expect(cellAt(b, 1, 1).mine).toBe(false)
      expect(mineCoords(b)).toHaveLength(8)
      expect(b.status).toBe('won') // the only safe cell is revealed
    }
  })

  it('computes adjacent counts correctly', () => {
    const b = createBoardWithMines(3, 3, [
      [0, 0],
      [2, 2],
    ])
    expect(cellAt(b, 1, 1).adjacent).toBe(2)
    expect(cellAt(b, 1, 0).adjacent).toBe(1)
    expect(cellAt(b, 2, 0).adjacent).toBe(0)
    expect(cellAt(b, 1, 2).adjacent).toBe(1)
  })
})

describe('reveal', () => {
  // Layout: single mine at (0,0) on 4x4 — everything far from it is 0-adjacent.
  const oneMine = () => createBoardWithMines(4, 4, [[0, 0]])

  it('flood-fills zero regions up to the numbered frontier', () => {
    const b = reveal(oneMine(), 3, 3)
    // All non-mine cells connect through zeros, so this reveal wins the game.
    expect(b.status).toBe('won')
    expect(cellAt(b, 1, 1).state).toBe('revealed') // the "1" frontier is revealed
    expect(cellAt(b, 0, 0).state).toBe('flagged') // win auto-flags mines
  })

  it('reveals only the clicked cell when it has adjacent mines', () => {
    const b = createBoardWithMines(4, 4, [
      [0, 0],
      [3, 3],
    ])
    const after = reveal(b, 1, 1)
    expect(cellAt(after, 1, 1).state).toBe('revealed')
    expect(cellAt(after, 2, 2).state).toBe('hidden')
    expect(after.status).toBe('playing')
  })

  it('loses when revealing a mine and shows all mines', () => {
    const b = createBoardWithMines(4, 4, [
      [0, 0],
      [3, 3],
    ])
    const after = reveal(b, 0, 0)
    expect(after.status).toBe('lost')
    expect(cellAt(after, 0, 0).state).toBe('revealed')
    expect(cellAt(after, 3, 3).state).toBe('revealed')
  })

  it('does not reveal flagged cells, and flood-fill flows around them', () => {
    const flagged = toggleFlag(oneMine(), 2, 2)
    const after = reveal(flagged, 3, 3)
    expect(cellAt(after, 2, 2).state).toBe('flagged')
    expect(after.status).toBe('playing') // flagged safe cell blocks the win
    expect(cellAt(after, 1, 3).state).toBe('revealed') // flood went around it
  })

  it('is a no-op on revealed cells and finished games', () => {
    const won = reveal(oneMine(), 3, 3)
    expect(reveal(won, 1, 1)).toBe(won)
    const playing = reveal(createBoardWithMines(4, 4, [[0, 0], [3, 3]]), 1, 1)
    expect(reveal(playing, 1, 1)).toBe(playing)
  })

  it('does not mutate the input board', () => {
    const before = oneMine()
    const snapshot = JSON.stringify(before)
    reveal(before, 3, 3)
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

describe('toggleFlag', () => {
  it('flags and unflags hidden cells and updates minesLeft', () => {
    const b = createBoardWithMines(4, 4, [[0, 0]])
    expect(minesLeft(b)).toBe(1)
    const flagged = toggleFlag(b, 0, 0)
    expect(cellAt(flagged, 0, 0).state).toBe('flagged')
    expect(minesLeft(flagged)).toBe(0)
    const unflagged = toggleFlag(flagged, 0, 0)
    expect(cellAt(unflagged, 0, 0).state).toBe('hidden')
  })

  it('cannot flag revealed cells or act on finished games', () => {
    const b = reveal(createBoardWithMines(4, 4, [[0, 0], [3, 3]]), 1, 1)
    expect(toggleFlag(b, 1, 1)).toBe(b)
    const lost = reveal(b, 0, 0)
    expect(toggleFlag(lost, 2, 2)).toBe(lost)
  })
})

describe('chord', () => {
  it('reveals remaining neighbors when flags satisfy the number', () => {
    const b = createBoardWithMines(3, 3, [[0, 0]])
    const opened = reveal(b, 1, 1) // "1" cell
    const flagged = toggleFlag(opened, 0, 0)
    const after = chord(flagged, 1, 1)
    expect(after.status).toBe('won')
  })

  it('loses when a flag is wrong', () => {
    const b = createBoardWithMines(3, 3, [[0, 0]])
    const opened = reveal(b, 1, 1)
    const misflagged = toggleFlag(opened, 1, 0) // wrong cell flagged
    const after = chord(misflagged, 1, 1)
    expect(after.status).toBe('lost')
  })

  it('is a no-op without matching flags, on zero cells, and on hidden cells', () => {
    const b = createBoardWithMines(3, 3, [[0, 0]])
    const opened = reveal(b, 1, 1)
    expect(chord(opened, 1, 1)).toBe(opened) // 1 adjacent, 0 flags
    expect(chord(opened, 2, 2)).toBe(opened) // hidden cell
    const wide = reveal(createBoardWithMines(4, 4, [[0, 0], [3, 0]]), 0, 3)
    expect(chord(wide, 0, 2)).toBe(wide) // zero-adjacent cell
  })
})

describe('win', () => {
  it('wins when every safe cell is revealed one by one', () => {
    let b = createBoardWithMines(2, 2, [[0, 0]])
    b = reveal(b, 1, 0)
    b = reveal(b, 0, 1)
    expect(b.status).toBe('playing')
    b = reveal(b, 1, 1)
    expect(b.status).toBe('won')
  })
})
