import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AbilityBar } from '../AbilityBar'
import { useGameStore } from '../../store'
import { AbilityId, ABILITY_CONFIGS, type PlayerState } from '@typeduel/shared'
import { ABILITY_LABELS, ABILITY_DESCRIPTIONS } from '../../labels'

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player1', displayName: 'Tester', hp: 100, cursor: 0,
    wpm: 60, accuracy: 95, energy: 0, activeEffects: [], streak: 0,
    ...overrides,
  }
}

describe('AbilityBar', () => {
  beforeEach(() => {
    useGameStore.setState({ abilityCooldowns: {} })
  })
  afterEach(() => vi.useRealTimers())

  it('shows all six automatic ability slots', () => {
    render(<AbilityBar player={makePlayer()} />)
    const bar = screen.getByTestId('ability-bar')
    expect(bar.querySelectorAll('[data-ability]')).toHaveLength(6)
    for (const ability of Object.values(AbilityId)) {
      expect(bar.querySelector('[data-ability="' + ability + '"]')).toBeInTheDocument()
    }
  })

  it('shows the energy costs', () => {
    render(<AbilityBar player={makePlayer()} />)
    for (const ability of Object.values(AbilityId)) {
      expect(screen.getByText(ABILITY_CONFIGS[ability].cost + ' 能量')).toBeInTheDocument()
    }
  })

  it('does not offer manual skill buttons or obsolete hotkeys', () => {
    render(<AbilityBar player={makePlayer({ energy: 100 })} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByText(/^\^[1-6]$/)).not.toBeInTheDocument()
  })

  it('shows Chinese ability names and explanations', () => {
    render(<AbilityBar player={makePlayer()} />)
    for (const ability of Object.values(AbilityId)) {
      expect(screen.getByText(ABILITY_LABELS[ability])).toBeInTheDocument()
      expect(screen.getByTitle(ABILITY_DESCRIPTIONS[ability])).toBeInTheDocument()
    }
  })

  it('shows an active indicator for a running effect', () => {
    render(<AbilityBar player={makePlayer({
      activeEffects: [{ abilityId: AbilityId.SURGE, source: 'player1', expiresAt: Date.now() + 5000 }],
    })} />)
    expect(screen.getByText('生效中')).toBeInTheDocument()
  })

  it('counts down a used skill cooldown and removes the timer when ready', () => {
    vi.useFakeTimers()
    useGameStore.setState({ abilityCooldowns: { [AbilityId.SURGE]: Date.now() + 2000 } })
    render(<AbilityBar player={makePlayer({ energy: 100 })} />)
    expect(screen.getByTestId('cooldown-timer')).toHaveTextContent('2秒')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByTestId('cooldown-timer')).toHaveTextContent('1秒')
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.queryByTestId('cooldown-timer')).not.toBeInTheDocument()
  })
})
