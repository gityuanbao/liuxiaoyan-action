import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AudioLibrary } from './AudioLibrary'
beforeEach(() => { localStorage.clear(); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('stops the playing voice when changing pages so long imports cannot keep speaking in the background', () => {
  const view = render(<AudioLibrary onBattle={() => {}}/>), clip = view.container.querySelector('audio')!
  fireEvent.play(clip); vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
  fireEvent.click(screen.getByRole('button', { name: '官方样题与语料' })); expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  vi.mocked(HTMLMediaElement.prototype.pause).mockClear(); view.unmount(); expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1)
})
