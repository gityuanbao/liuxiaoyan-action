import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { DuelArena } from './DuelArena'
import { createDuel, castWord, advanceDuel, castTactic } from './duel-engine'
import { useGameStore } from '../store'
beforeEach(() => { vi.useFakeTimers(); useGameStore.setState({ reducedMotion: true }) })
afterEach(() => { cleanup(); vi.useRealTimers(); useGameStore.setState({ reducedMotion: false }) })
it('shows feedback only for real hits and expires it without changing the duel', async () => {
  const original = createDuel('relaxed')
  const props = { avatar: 'mage' as const, active: true, paused: false, playerName: '旅人' }
  const view = render(<DuelArena {...props} state={original}/>)
  view.rerender(<DuelArena {...props} state={castWord(original, 'wrong', 'habitat')}/>)
  expect(view.container.querySelector('.combat-hit-layer')).toBeNull()
  expect(view.container.querySelector('.card-projectile')).not.toHaveAttribute('data-flight-event')
  const hit = castWord(original, 'habitat', 'habitat')
  view.rerender(<DuelArena {...props} state={hit}/>)
  expect(view.container.querySelector('.combat-callout')).toHaveTextContent('拼写命中')
  expect(view.container.querySelector('.damage-number.on-bot')).toHaveTextContent(`−${hit.last!.damage}`)
  expect(view.container.querySelector('.card-projectile')).toHaveAttribute('data-flight-event', String(hit.last!.id))
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(view.container.querySelector('.combat-hit-layer')).toBeNull()
  expect(view.container.querySelector('.damage-number')).toBeNull()
  expect(view.container.querySelector('.card-projectile')).not.toHaveAttribute('data-flight-event')
  expect(hit.botHp).toBeLessThan(140)
  view.rerender(<DuelArena {...props} state={advanceDuel(hit, 100)}/>)
  expect(view.container.querySelector('.combat-hit-layer')).toBeNull()
})
it('keeps the HUD out of the actor stage and displays the selected nonhuman monster', () => {
  const view = render(<DuelArena avatar="knight" active paused playerName="旅人" monster="gargoyle" state={createDuel('relaxed', 'knight')}/>)
  expect(view.container.querySelector('.encounter-hud .duel-health.left')).toBeInTheDocument()
  expect(view.container.querySelector('.monster-stage .duel-health')).toBeNull()
  expect(view.container.querySelector('.monster-stage .enemy-intent')).toBeNull()
  expect(view.container.querySelector('.monster-body-art')).toHaveAttribute('src', '/art/monster-cards-v1/monster-gargoyle.webp')
  expect(view.container.querySelector('.monster-body-art')).toHaveAttribute('alt', '符石翼兽')
  expect(view.container.querySelector('.duelist-right .battle-body-art')).toBeNull()
})
it('marks a role tactic as a support card without pretending to damage the monster', () => {
  let state = createDuel('relaxed', 'knight')
  for (let i = 0; i < 3; i++) state = castWord(state, 'tree', 'tree')
  const next = castTactic(state)
  const view = render(<DuelArena avatar="knight" active paused={false} playerName="旅人" state={next}/>)
  expect(view.container.querySelector('.card-projectile')).toHaveClass('support-card-flight')
  expect(view.container.querySelector('.damage-number.on-bot')).not.toHaveTextContent('−')
  expect(next.botHp).toBe(state.botHp)
})
it('places enemy retaliation feedback on the player side', () => {
  const hit = advanceDuel(createDuel('relaxed'), 14000)
  const view = render(<DuelArena avatar="mage" active paused={false} playerName="旅人" state={hit}/>)
  expect(view.container.querySelector('.combat-hit-layer.hit-bot')).toBeInTheDocument()
  expect(view.container.querySelector('.combat-callout')).toHaveTextContent('敌方反击')
  expect(view.container.querySelector('.damage-number.on-player')).toHaveTextContent('−9')
})
