import { describe, expect, it } from 'vitest'
import { APP_NAME } from './meta'

describe('scaffold', () => {
  it('has an app name', () => {
    expect(APP_NAME).toBe('Minesweeper')
  })
})
