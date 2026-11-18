import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Lobby } from '../Lobby'
import { useGameStore } from '../../store'

const connectMock = vi.fn()
const sendMock = vi.fn()
const disconnectMock = vi.fn()

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ connect: connectMock, send: sendMock, disconnect: disconnectMock }),
}))

describe('Lobby', () => {
  beforeEach(() => {
    connectMock.mockReset()
    sendMock.mockReset()
    disconnectMock.mockReset()
    useGameStore.setState({
      displayName: '',
      roomCode: null,
      matchHistory: [],
      crtEnabled: true,
      soundEnabled: true,
      screen: 'lobby',
      isSpectating: false,
    })
  })

  it('renders title "联机竞技场"', () => {
    render(<Lobby />)
    expect(screen.getByText('联机竞技场')).toBeInTheDocument()
  })

  it('shows 打字试炼 button', () => {
    render(<Lobby />)
    expect(screen.getByTestId('practice-btn')).toBeInTheDocument()
    expect(screen.getByTestId('practice-btn')).toHaveTextContent('打字试炼')
  })

  it('快速匹配 button is disabled without a name', () => {
    render(<Lobby />)
    expect(screen.getByRole('button', { name: '快速匹配' })).toBeDisabled()
  })

  it('创建房间 button is disabled without a name', () => {
    render(<Lobby />)
    expect(screen.getByRole('button', { name: '创建房间' })).toBeDisabled()
  })

  it('快速匹配 button is enabled with a name', () => {
    useGameStore.setState({ displayName: 'TestPlayer' })
    render(<Lobby />)
    expect(screen.getByRole('button', { name: '快速匹配' })).toBeEnabled()
  })

  it('创建房间 button is enabled with a name', () => {
    useGameStore.setState({ displayName: 'TestPlayer' })
    render(<Lobby />)
    expect(screen.getByRole('button', { name: '创建房间' })).toBeEnabled()
  })

  it('shows difficulty buttons', () => {
    render(<Lobby />)
    expect(screen.getByRole('button', { name: '初阶' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '中阶' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '高阶' })).toBeInTheDocument()
  })

  it('shows display name input', () => {
    render(<Lobby />)
    expect(screen.getByPlaceholderText('输入你的昵称…')).toBeInTheDocument()
  })

  it('shows room code input and join button', () => {
    render(<Lobby />)
    expect(screen.getByPlaceholderText('六位房间码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '加入房间' })).toBeInTheDocument()
  })

  it('shows spectate input and watch button', () => {
    render(<Lobby />)
    expect(screen.getByTestId('spectate-input')).toBeInTheDocument()
    expect(screen.getByTestId('spectate-btn')).toBeInTheDocument()
  })

  it('sends quick match immediately after connect', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ displayName: 'TestPlayer' })
    render(<Lobby />)

    await user.click(screen.getByRole('button', { name: '快速匹配' }))

    expect(connectMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith({
      type: 'JOIN_QUEUE',
      displayName: 'TestPlayer',
      difficulty: 'medium',
    })
    expect(useGameStore.getState().screen).toBe('matchmaking')
  })

  it('sends join room without relying on a timeout', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ displayName: 'TestPlayer' })
    render(<Lobby />)

    await user.type(screen.getByPlaceholderText('六位房间码'), 'abc123')
    await user.click(screen.getByRole('button', { name: '加入房间' }))

    expect(connectMock).toHaveBeenCalledTimes(1)
    expect(sendMock).toHaveBeenCalledWith({
      type: 'JOIN_ROOM',
      displayName: 'TestPlayer',
      roomCode: 'ABC123',
    })
  })
})
