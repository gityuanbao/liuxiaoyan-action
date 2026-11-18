import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { GameState } from '@typeduel/shared'
import { GameScreen } from '../GameScreen'
import { useGameStore } from '../../store'

const send = vi.fn()
vi.mock('../../hooks/useWebSocket', () => ({ useWebSocket: () => ({ send }) }))

const gameState: GameState = {
  roomId: 'test-room', roomCode: 'TEST01', status: 'active', countdownSeconds: 0,
  text: 'academic vocabulary', timeLeft: 90, spectatorCount: 0,
  currentRound: 1, roundWins: {},
  players: {
    learner: {
      id: 'learner', displayName: '测试玩家', hp: 100, cursor: 0,
      wpm: 0, accuracy: 100, energy: 0, activeEffects: [], streak: 0,
    },
  },
}

describe('GameScreen settings keyboard boundary', () => {
  beforeEach(() => {
    send.mockClear()
    useGameStore.setState({
      gameState, playerId: 'learner', localCursor: 0, settingsOpen: false,
      showCombatLog: false, activeTaunt: null, errorIndex: null, abilityCooldowns: {},
    })
  })

  it('leaves settings keys and focus alone, then resumes combat after closing settings', () => {
    render(<><GameScreen /><input aria-label="设置输入" /></>)
    act(() => useGameStore.getState().setSettingsOpen(true))
    const field = screen.getByLabelText('设置输入')
    field.focus()
    fireEvent.click(field)
    expect(field).toHaveFocus()
    expect(fireEvent.keyDown(field, { key: 'a' })).toBe(true)
    expect(fireEvent.keyDown(field, { key: 'Backspace' })).toBe(true)
    expect(fireEvent.keyDown(field, { key: '7', ctrlKey: true })).toBe(true)
    expect(send).not.toHaveBeenCalled()
    expect(useGameStore.getState().localCursor).toBe(0)

    act(() => useGameStore.getState().setSettingsOpen(false))
    fireEvent.keyDown(window, { key: 'a' })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'KEYSTROKE', char: 'a' }))
    expect(useGameStore.getState().localCursor).toBe(1)
  })
})
