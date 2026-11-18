import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CombatReadout } from './CombatReadout'
import { advanceDuel, castWord, createDuel } from './duel-engine'
afterEach(cleanup)
it('warns shortly before a real enemy attack and shows the remaining time during pause', () => {
  const state = advanceDuel(createDuel('relaxed'), 13000)
  const view = render(<CombatReadout state={state} paused={false}/>)
  expect(screen.getByText('小怪即将反击')).toBeInTheDocument()
  expect(screen.getByRole('progressbar', { name: '敌方攻击蓄势' })).toHaveAttribute('aria-valuenow', '93')
  expect(view.container).toHaveTextContent('1.0 秒')
  view.rerender(<CombatReadout state={state} paused/>)
  expect(screen.getByText('敌方行动暂停')).toBeInTheDocument()
  expect(view.container).toHaveTextContent('1.0 秒')
})
it('lights exactly four hits for a burst and clears all runes on a miss', () => {
  let state = createDuel('relaxed')
  for (let i = 0; i < 4; i++) state = castWord(state, 'habitat', 'habitat')
  const view = render(<CombatReadout state={state} paused={false}/>)
  expect(screen.getByRole('group', { name: '连击符文 4 / 4' })).toBeInTheDocument()
  expect(state.last?.burst).toBe(true)
  view.rerender(<CombatReadout state={castWord(state, 'wrong', 'habitat')} paused={false}/>)
  expect(screen.getByRole('group', { name: '连击符文 0 / 4' })).toBeInTheDocument()
})
