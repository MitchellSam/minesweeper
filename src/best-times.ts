// Per-difficulty best times persisted in localStorage. Storage is injectable
// for tests; every touch of real localStorage is guarded — it can throw or be
// empty (private windows, cleared site data) and the game must not care.
import type { Difficulty } from './game'

export interface TimeStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const KEY = 'minesweeper.best-times.v1'

function defaultStore(): TimeStore | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function loadBestTimes(store: TimeStore | null = defaultStore()): Partial<Record<Difficulty, number>> {
  if (!store) return {}
  try {
    const raw = store.getItem(KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Partial<Record<Difficulty, number>> = {}
    for (const d of ['beginner', 'intermediate', 'expert'] as const) {
      const v = (parsed as Record<string, unknown>)[d]
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) out[d] = v
    }
    return out
  } catch {
    return {}
  }
}

/** Record a finished time; returns true when it's a new best for that difficulty. */
export function recordBestTime(
  difficulty: Difficulty,
  elapsedMs: number,
  store: TimeStore | null = defaultStore(),
): boolean {
  const times = loadBestTimes(store)
  const prev = times[difficulty]
  if (prev !== undefined && prev <= elapsedMs) return false
  times[difficulty] = elapsedMs
  try {
    store?.setItem(KEY, JSON.stringify(times))
  } catch {
    // storage unavailable — the run still counts as a best for this session
  }
  return true
}
