import './style.css'
import { loadBestTimes, recordBestTime } from './best-times'
import { cellAt } from './engine'
import { type Difficulty, Game, PRESETS } from './game'
import { APP_NAME } from './meta'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('missing #app root')

const game = new Game()

const FACE: Record<string, string> = {
  ready: '🙂',
  playing: '🙂',
  won: '😎',
  lost: '😵',
}

app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <div class="hud">
    <span id="mines" class="counter" aria-label="mines left"></span>
    <button id="new-game" aria-label="new game"></button>
    <span id="timer" class="counter" aria-label="elapsed seconds">000</span>
  </div>
  <div class="hud sub">
    <select id="difficulty" aria-label="difficulty">
      ${Object.keys(PRESETS)
        .map((d) => `<option value="${d}">${d}</option>`)
        .join('')}
    </select>
    <span id="best" class="counter" aria-label="best time"></span>
    <span id="result" class="result" role="status"></span>
  </div>
  <div class="grid-wrap"><div id="grid" class="grid" aria-label="minefield"></div></div>
`

const grid = document.querySelector<HTMLDivElement>('#grid')!
const minesEl = document.querySelector<HTMLSpanElement>('#mines')!
const timerEl = document.querySelector<HTMLSpanElement>('#timer')!
const newGameBtn = document.querySelector<HTMLButtonElement>('#new-game')!
const resultEl = document.querySelector<HTMLSpanElement>('#result')!
const difficultyEl = document.querySelector<HTMLSelectElement>('#difficulty')!
const bestEl = document.querySelector<HTMLSpanElement>('#best')!

let bestRecorded = false
let gotNewBest = false

function currentDifficulty(): Difficulty {
  return difficultyEl.value as Difficulty
}

function formatSeconds(ms: number): string {
  return String(Math.min(999, Math.floor(ms / 1000))).padStart(3, '0')
}

function cellLabel(x: number, y: number): string {
  const cell = cellAt(game.board, x, y)
  if (cell.state === 'flagged') return '🚩'
  if (cell.state !== 'revealed') return ''
  if (cell.mine) return '💣'
  return cell.adjacent > 0 ? String(cell.adjacent) : ''
}

function renderTimer(): void {
  const seconds = Math.min(999, Math.floor(game.elapsedMs / 1000))
  timerEl.textContent = String(seconds).padStart(3, '0')
}

function render(): void {
  if (game.status === 'won' && !bestRecorded) {
    bestRecorded = true
    gotNewBest = recordBestTime(currentDifficulty(), game.elapsedMs)
  }

  const { width, height } = game.board
  const lost = game.status === 'lost'
  let mineIndex = 0
  grid.style.setProperty('--cols', String(width))
  grid.style.gridTemplateColumns = `repeat(${width}, var(--cell))`
  grid.replaceChildren()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cellAt(game.board, x, y)
      const el = document.createElement('button')
      el.className = 'cell'
      if (cell.state === 'revealed') {
        el.classList.add('revealed', cell.mine ? 'mine' : `n${cell.adjacent}`)
        if (lost && cell.mine) {
          el.classList.add('boom')
          el.style.animationDelay = `${mineIndex++ * 70}ms`
        }
      }
      el.dataset.x = String(x)
      el.dataset.y = String(y)
      el.textContent = cellLabel(x, y)
      grid.appendChild(el)
    }
  }
  minesEl.textContent = `🚩 ${game.minesLeft}`
  newGameBtn.textContent = FACE[game.status]
  resultEl.textContent =
    game.status === 'won' ? (gotNewBest ? 'New best!' : 'Cleared!') : game.status === 'lost' ? 'Boom.' : ''
  const best = loadBestTimes()[currentDifficulty()]
  bestEl.textContent = best === undefined ? 'best —' : `best ${formatSeconds(best)}`
  renderTimer()
}

function cellFromEvent(e: Event): [number, number] | null {
  const target = (e.target as HTMLElement).closest<HTMLElement>('.cell')
  if (!target || !target.dataset.x || !target.dataset.y) return null
  return [Number(target.dataset.x), Number(target.dataset.y)]
}

// Long-press = flag on touch devices. After one fires, the browser may follow
// with contextmenu (Android), click, or nothing (iOS) — so those handlers only
// read the flag, and it is reset at the start of the next interaction.
let pressTimer: ReturnType<typeof setTimeout> | null = null
let longPressFired = false
let pressStart: { x: number; y: number } | null = null

function cancelPress(): void {
  if (pressTimer !== null) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
  pressStart = null
}

grid.addEventListener('pointerdown', (e) => {
  longPressFired = false
  cancelPress()
  if (e.pointerType !== 'touch') return
  const pos = cellFromEvent(e)
  if (!pos) return
  pressStart = { x: e.clientX, y: e.clientY }
  pressTimer = setTimeout(() => {
    longPressFired = true
    pressTimer = null
    game.flag(pos[0], pos[1])
    render()
  }, 450)
})

grid.addEventListener('pointermove', (e) => {
  if (pressStart === null) return
  if (Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 8) cancelPress()
})

for (const evt of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
  grid.addEventListener(evt, cancelPress)
}

grid.addEventListener('click', (e) => {
  if (longPressFired) return
  const pos = cellFromEvent(e)
  if (!pos) return
  const [x, y] = pos
  if (cellAt(game.board, x, y).state === 'revealed') {
    game.chord(x, y)
  } else {
    game.reveal(x, y)
  }
  render()
})

grid.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (longPressFired) return // Android fires contextmenu after a long-press; don't double-toggle
  const pos = cellFromEvent(e)
  if (!pos) return
  game.flag(pos[0], pos[1])
  render()
})

function startNewGame(): void {
  game.newGame()
  bestRecorded = false
  gotNewBest = false
  render()
}

newGameBtn.addEventListener('click', startNewGame)

difficultyEl.addEventListener('change', () => {
  game.setDifficulty(currentDifficulty())
  bestRecorded = false
  gotNewBest = false
  render()
})

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) startNewGame()
})

setInterval(() => {
  if (game.status === 'playing') renderTimer()
}, 250)

render()
