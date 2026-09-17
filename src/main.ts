import './style.css'
import { cellAt } from './engine'
import { Game } from './game'
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
    <span id="result" class="result" role="status"></span>
  </div>
  <div id="grid" class="grid" aria-label="minefield"></div>
`

const grid = document.querySelector<HTMLDivElement>('#grid')!
const minesEl = document.querySelector<HTMLSpanElement>('#mines')!
const newGameBtn = document.querySelector<HTMLButtonElement>('#new-game')!
const resultEl = document.querySelector<HTMLSpanElement>('#result')!

function cellLabel(x: number, y: number): string {
  const cell = cellAt(game.board, x, y)
  if (cell.state === 'flagged') return '🚩'
  if (cell.state !== 'revealed') return ''
  if (cell.mine) return '💣'
  return cell.adjacent > 0 ? String(cell.adjacent) : ''
}

function render(): void {
  const { width, height } = game.board
  grid.style.gridTemplateColumns = `repeat(${width}, var(--cell))`
  grid.replaceChildren()
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cellAt(game.board, x, y)
      const el = document.createElement('button')
      el.className = 'cell'
      if (cell.state === 'revealed') {
        el.classList.add('revealed', cell.mine ? 'mine' : `n${cell.adjacent}`)
      }
      el.dataset.x = String(x)
      el.dataset.y = String(y)
      el.textContent = cellLabel(x, y)
      grid.appendChild(el)
    }
  }
  minesEl.textContent = `🚩 ${game.minesLeft}`
  newGameBtn.textContent = FACE[game.status]
  resultEl.textContent = game.status === 'won' ? 'Cleared!' : game.status === 'lost' ? 'Boom.' : ''
}

function cellFromEvent(e: Event): [number, number] | null {
  const target = (e.target as HTMLElement).closest<HTMLElement>('.cell')
  if (!target || !target.dataset.x || !target.dataset.y) return null
  return [Number(target.dataset.x), Number(target.dataset.y)]
}

grid.addEventListener('click', (e) => {
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
  const pos = cellFromEvent(e)
  if (!pos) return
  game.flag(pos[0], pos[1])
  render()
})

newGameBtn.addEventListener('click', () => {
  game.newGame()
  render()
})

render()
