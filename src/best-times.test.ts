import { describe, expect, it } from 'vitest'
import { type TimeStore, loadBestTimes, recordBestTime } from './best-times'

function memStore(initial: Record<string, string> = {}): TimeStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('best times', () => {
  it('is empty with no stored data or a null store', () => {
    expect(loadBestTimes(memStore())).toEqual({})
    expect(loadBestTimes(null)).toEqual({})
  })

  it('records a first time and improves on it', () => {
    const s = memStore()
    expect(recordBestTime('beginner', 30_000, s)).toBe(true)
    expect(recordBestTime('beginner', 45_000, s)).toBe(false)
    expect(recordBestTime('beginner', 20_000, s)).toBe(true)
    expect(loadBestTimes(s)).toEqual({ beginner: 20_000 })
  })

  it('keeps difficulties independent', () => {
    const s = memStore()
    recordBestTime('beginner', 30_000, s)
    recordBestTime('expert', 200_000, s)
    expect(loadBestTimes(s)).toEqual({ beginner: 30_000, expert: 200_000 })
  })

  it('survives corrupted or hostile stored data', () => {
    expect(loadBestTimes(memStore({ 'minesweeper.best-times.v1': 'not json' }))).toEqual({})
    expect(loadBestTimes(memStore({ 'minesweeper.best-times.v1': '[1,2]' }))).toEqual({})
    expect(
      loadBestTimes(memStore({ 'minesweeper.best-times.v1': '{"beginner":"fast","expert":-5,"bogus":1}' })),
    ).toEqual({})
  })

  it('does not throw when the store throws on write', () => {
    const s: TimeStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(recordBestTime('beginner', 1000, s)).toBe(true)
  })
})
