import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SpeakingExercise } from './TrialPage'
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL'), revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')
class FakeRecorder {
  static isTypeSupported() { return true }
  state = 'inactive'; mimeType = 'audio/webm'; ondataavailable?: (event: { data: Blob }) => void; onstop?: () => void
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['test voice'], { type: 'audio/webm' }) }); this.onstop?.() }
}
const stopTrack = vi.fn(), getUserMedia = vi.fn()
beforeEach(() => {
  vi.clearAllMocks(); getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:private-test') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.stubGlobal('MediaRecorder', FakeRecorder)
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const [target, key, descriptor] of [[navigator, 'mediaDevices', mediaDescriptor], [URL, 'createObjectURL', createDescriptor], [URL, 'revokeObjectURL', revokeDescriptor]] as const) { if (descriptor) Object.defineProperty(target, key, descriptor); else Reflect.deleteProperty(target, key) } })
function setup() { const onRecorded = vi.fn(), onRecording = vi.fn(); return { onRecorded, onRecording, ...render(<SpeakingExercise answers={Array(7).fill('')} change={() => {}} onRecorded={onRecorded} onRecording={onRecording} stop={false} frozen={false}/>) } }
it('captures local audio, exposes playback and closes the owned microphone tracks', async () => {
  vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValue(61000)
  const view = setup(); await act(async () => { fireEvent.click(screen.getByRole('button', { name: '开始录音' })) })
  expect(getUserMedia).toHaveBeenCalledWith({ audio: true }); expect(view.onRecording).toHaveBeenCalledWith(true)
  fireEvent.click(screen.getByRole('button', { name: '停止录音' }))
  expect(view.onRecorded).toHaveBeenCalledWith(expect.objectContaining({ seconds: 60, blob: expect.any(Blob) }))
  expect(view.container.querySelector('audio')?.getAttribute('src')).toBe('blob:private-test')
  expect(stopTrack).toHaveBeenCalled(); view.unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-test')
})
it('shows a Chinese recovery path after microphone refusal and does not pretend audio was recorded', async () => {
  getUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))
  const view = setup(); await act(async () => { fireEvent.click(screen.getByRole('button', { name: '开始录音' })) })
  expect(screen.getByRole('status')).toHaveTextContent('麦克风未获授权')
  expect(view.onRecorded).not.toHaveBeenCalled(); expect(view.container.querySelector('audio')).toBeNull()
})
