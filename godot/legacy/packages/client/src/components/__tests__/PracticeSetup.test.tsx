import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PracticeSetup } from '../PracticeSetup'
import { useGameStore } from '../../store'

// Mock localStorage for getPersonalBests
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('PracticeSetup', () => {
  beforeEach(() => {
    localStorageMock.clear()
    useGameStore.setState({
      screen: 'practice-setup',
      practiceConfig: null,
    })
  })

  it('shows all six practice modes', () => {
    render(<PracticeSetup />)
    expect(screen.getByTestId('mode-free')).toBeInTheDocument()
    expect(screen.getByTestId('mode-timed')).toBeInTheDocument()
    expect(screen.getByTestId('mode-accuracy')).toBeInTheDocument()
    expect(screen.getByTestId('mode-bot')).toBeInTheDocument()
    expect(screen.getByTestId('mode-sudden-death')).toBeInTheDocument()
    expect(screen.getByTestId('mode-marathon')).toBeInTheDocument()
  })

  it('shows the 打字试炼 title', () => {
    render(<PracticeSetup />)
    expect(screen.getByText('打字试炼')).toBeInTheDocument()
  })

  it('shows difficulty buttons', () => {
    render(<PracticeSetup />)
    expect(screen.getByRole('button', { name: '初阶' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '中阶' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '高阶' })).toBeInTheDocument()
  })

  it('timed mode shows duration options when selected', async () => {
    const user = userEvent.setup()
    render(<PracticeSetup />)

    // Duration options should not be visible in free mode (default)
    expect(screen.queryByTestId('duration-15')).not.toBeInTheDocument()

    // Click timed mode
    await user.click(screen.getByTestId('mode-timed'))

    // Duration options should now be visible
    expect(screen.getByTestId('duration-15')).toBeInTheDocument()
    expect(screen.getByTestId('duration-30')).toBeInTheDocument()
    expect(screen.getByTestId('duration-60')).toBeInTheDocument()
    expect(screen.getByTestId('duration-120')).toBeInTheDocument()
  })

  it('bot mode shows bot difficulty options when selected', async () => {
    const user = userEvent.setup()
    render(<PracticeSetup />)

    // Bot options should not be visible initially
    expect(screen.queryByTestId('bot-easy')).not.toBeInTheDocument()

    // Click bot mode
    await user.click(screen.getByTestId('mode-bot'))

    // Bot difficulty options should now be visible
    expect(screen.getByTestId('bot-easy')).toBeInTheDocument()
    expect(screen.getByTestId('bot-medium')).toBeInTheDocument()
    expect(screen.getByTestId('bot-hard')).toBeInTheDocument()
  })

  it('bot combat has its own timer without timed-practice duration options', async () => {
    const user = userEvent.setup()
    render(<PracticeSetup />)

    await user.click(screen.getByTestId('mode-bot'))

    for (const duration of [15, 30, 60, 120]) {
      expect(screen.queryByTestId(`duration-${duration}`)).not.toBeInTheDocument()
    }
  })

  it('shows start practice button', () => {
    render(<PracticeSetup />)
    expect(screen.getByTestId('start-practice')).toBeInTheDocument()
  })

  it('shows back to islands button', () => {
    render(<PracticeSetup />)
    expect(screen.getByRole('button', { name: '返回群岛' })).toBeInTheDocument()
  })
})
