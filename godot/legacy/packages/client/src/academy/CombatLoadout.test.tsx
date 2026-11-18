import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CombatActions } from './CombatLoadout'
import { castTactic, castWord, createDuel } from './duel-engine'

afterEach(cleanup)

it('earns the role card through real spelling hits and keeps spirit support automatic', () => {
  let state = createDuel('relaxed', 'knight', 'moon', 2, 3)
  const onTactic = vi.fn(), onChant = vi.fn()
  const view = render(<CombatActions state={state} disabled={false} chanting={false} onTactic={onTactic} onChant={onChant}/>)
  expect(screen.getByRole('button', { name: '坚壁誓约 · 0/3' })).toBeDisabled()
  expect(screen.getByLabelText('月芽 · 自动支援').tagName).toBe('ARTICLE')
  expect(screen.getByRole('button', { name: '破雾追击' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '星纹守护' })).toBeDisabled()
  for (let i = 0; i < 3; i++) state = castWord(state, 'climate', 'climate')
  view.rerender(<CombatActions state={state} disabled={false} chanting={false} onTactic={onTactic} onChant={onChant}/>)
  fireEvent.click(screen.getByRole('button', { name: '坚壁誓约 · 3/3' }))
  expect(onTactic).toHaveBeenCalledOnce()
  expect(screen.getByLabelText('月芽 · 自动支援')).toHaveTextContent('再命中 3 次触发')
  view.rerender(<CombatActions state={castTactic(state)} disabled={false} chanting={false} onTactic={onTactic} onChant={onChant}/>)
  expect(screen.getByRole('button', { name: '本场战技已释放' })).toBeDisabled()
})

it('shows all five card types and lets keyboard users inspect locked cards without activating them', () => {
  const onPrepare = vi.fn(), state = createDuel('relaxed')
  const view = render(<CombatActions state={state} disabled={false} chanting={false} onPrepare={onPrepare} onChant={vi.fn()} onTactic={vi.fn()}/>)
  const surge = screen.getByRole('button', { name: '破雾追击' })
  fireEvent.focus(surge.parentElement!)
  expect(screen.getByText(/命中才消耗30能量/)).toBeVisible()
  fireEvent.click(surge)
  expect(onPrepare).not.toHaveBeenCalled()
  view.rerender(<CombatActions state={{ ...state, energy: 30 }} disabled={false} chanting={false} onPrepare={onPrepare} onChant={vi.fn()} onTactic={vi.fn()}/>)
  fireEvent.click(screen.getByRole('button', { name: '破雾追击' }))
  expect(onPrepare).toHaveBeenCalledWith('surge')
  view.rerender(<CombatActions state={{ ...state, energy: 30, preparedSpell: 'surge' }} disabled={false} chanting={false} onPrepare={onPrepare} onChant={vi.fn()}/>)
  expect(screen.getByRole('button', { name: '破雾追击', pressed: true })).toBeEnabled()
  view.rerender(<CombatActions state={{ ...state, energy: 100 }} disabled={false} chanting onPrepare={onPrepare} onChant={vi.fn()}/>)
  expect(screen.getByRole('button', { name: '星纹守护' })).toBeDisabled()
})

it('requires full energy to enter the chant and respects paused action gates', () => {
  let state = createDuel('relaxed', 'knight')
  const onChant = vi.fn()
  const view = render(<CombatActions state={state} disabled={false} chanting={false} onChant={onChant}/>)
  expect(screen.getByRole('button', { name: '积攒能量' })).toBeDisabled()
  for (let i = 0; i < 5; i++) state = castWord(state, 'climate', 'climate')
  view.rerender(<CombatActions state={state} disabled={false} chanting={false} onChant={onChant}/>)
  fireEvent.click(screen.getByRole('button', { name: '咏唱大招 · 夜幕誓盾' }))
  expect(onChant).toHaveBeenCalledOnce()
  view.rerender(<CombatActions state={state} disabled chanting onChant={onChant}/>)
  expect(screen.getByRole('button', { name: '返回普通攻击' })).toBeDisabled()
})
