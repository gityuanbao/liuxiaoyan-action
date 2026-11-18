import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { BattleArt } from './BattleArt'
import { useGameStore } from '../store'
beforeEach(() => { vi.useFakeTimers(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); useGameStore.setState({ reducedMotion: false }) })
afterEach(() => { cleanup(); vi.useRealTimers(); useGameStore.setState({ reducedMotion: false }) })
function loaded(view: ReturnType<typeof render>) { view.container.querySelectorAll('.hero-cast-art').forEach(image => fireEvent.load(image)) }
it('keeps the original high-detail portrait, preloads native HD poses, and automatically completes the initial cast', () => {
  const view = render(<BattleArt avatar="mage" side="left" event={1} casting/>)
  expect(view.container.querySelector('.hero-idle-art')).toHaveAttribute('src', '/art/optimized-v1/mage-897b04833d5b.webp')
  expect(view.container.querySelector('.hero-cast-art')).toHaveAttribute('src', '/art/character-hd-v1/mage/cast-1.webp')
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', 'idle')
  loaded(view)
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', '1')
  act(() => { vi.advanceTimersByTime(300) })
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', '3')
  act(() => { vi.advanceTimersByTime(650) })
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', 'idle')
})
it('stops during pause or tab hiding, never replays the old event on resume, but accepts a new cast', () => {
  const props = { avatar: 'knight' as const, side: 'left' as const, event: 1, casting: true }
  const view = render(<BattleArt {...props}/>); loaded(view)
  view.rerender(<BattleArt {...props} paused/>)
  expect(view.container.querySelector('.hero-body')).toHaveClass('hero-still')
  view.rerender(<BattleArt {...props}/>)
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', 'idle')
  view.rerender(<BattleArt {...props} event={2}/>)
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', '1')
  act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', 'idle')
  act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')) })
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', 'idle')
})
it('reduced motion keeps a sharp still portrait during attacks and victory', () => {
  useGameStore.setState({ reducedMotion: true })
  const view = render(<BattleArt avatar="ranger" side="left" event={5} casting victory/>); loaded(view)
  act(() => { vi.advanceTimersByTime(500) })
  expect(view.container.querySelector('.hero-body')).toHaveClass('hero-still')
  expect(view.container.querySelector('.hero-body')).toHaveAttribute('data-pose', 'idle')
})
