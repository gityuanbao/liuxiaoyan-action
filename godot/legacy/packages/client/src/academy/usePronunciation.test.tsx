import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useGameStore } from '../store'
import { WORDS } from './words'
import { ACADEMIC_WORDS } from './notebook-data'
import { CHARACTER_SKILLS } from './combat-skills'
import { usePronunciation, PronunciationFeedback, pronunciationSource } from './usePronunciation'
let voice: ReturnType<typeof usePronunciation>
function Harness({ paused = false }: { paused?: boolean }) {
  voice = usePronunciation(paused)
  return <><audio ref={voice.player} aria-label="audio"/><PronunciationFeedback voice={voice} paused={paused}/></>
}
beforeEach(() => { useGameStore.setState({ soundEnabled: true, pronunciationEnabled: true, soundVolume: 75 }); vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); useGameStore.setState({ soundEnabled: true, pronunciationEnabled: true, soundVolume: 75 }) })
it('has local recordings for every built-in word, example and chant; prefers attributed human words', () => {
  for (const w of [...WORDS, ...ACADEMIC_WORDS]) { expect(pronunciationSource(w.word, 'word').file).toMatch(/^\/audio\//); expect(pronunciationSource(w.example, 'sentence').file).toMatch(/^\/audio\//) }
  for (const skill of Object.values(CHARACTER_SKILLS)) expect(pronunciationSource(skill.chant, 'chant').file).toMatch(/chant-.+\.wav$/)
  expect(pronunciationSource('Climate', 'word')).toMatchObject({ file: '/audio/human-v1/climate.ogg' })
  expect(pronunciationSource('A new custom sentence.', 'sentence')).toMatchObject({ file: '', label: '系统英语朗读' })
})
it('replaces previous audio, keeps completed text for replay and ignores stale failures', async () => {
  let rejectOld!: (reason: Error) => void
  vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject }))
  render(<Harness/>); const audio = screen.getByLabelText('audio') as HTMLAudioElement
  act(() => voice.play('sun', 'word', true))
  expect(audio.getAttribute('src')).toContain('word-sun.wav')
  act(() => voice.play('The sun is warm.', 'sentence', true))
  fireEvent.playing(audio)
  await act(async () => { rejectOld(new Error('old source was interrupted')); await Promise.resolve() })
  expect(voice.phase).toBe('playing'); expect(voice.last?.text).toBe('The sun is warm.')
  fireEvent.ended(audio); expect(voice.phase).toBe('finished')
  fireEvent.click(screen.getByRole('button', { name: '重听上次正确答案' }))
  expect(audio.getAttribute('src')).toContain('sentence-sun.wav')
})
it('stops on pause or mute, never replays an old answer on resume; auto-off keeps manual replay', () => {
  const view = render(<Harness/>); const audio = screen.getByLabelText('audio')
  act(() => voice.play('sun', 'word', true)); fireEvent.playing(audio)
  view.rerender(<Harness paused/>); expect(voice.phase).toBe('stopped')
  fireEvent.ended(audio); expect(voice.phase).toBe('stopped')
  const count = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length
  view.rerender(<Harness/>); expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(count)
  act(() => useGameStore.setState({ pronunciationEnabled: false }))
  act(() => voice.play('moon', 'word', true)); expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(count)
  fireEvent.click(screen.getByRole('button', { name: '重听上次正确答案' })); expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(count + 1)
  act(() => useGameStore.setState({ soundEnabled: false })); expect(voice.phase).toBe('stopped')
  expect(screen.getByRole('button', { name: '重听上次正确答案' })).toBeDisabled()
})
it('exposes a retry after media rejection and cancels the owned speech on unmount', async () => {
  vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('blocked'))
  const view = render(<Harness/>)
  await act(async () => { voice.play('sun', 'word', true); await Promise.resolve() })
  expect(screen.getByText(/未能播放/)).toBeVisible()
  const cancel = vi.fn(), speak = vi.fn()
  vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; constructor(text: string) { this.text = text } })
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel, speak, getVoices: () => [] } })
  act(() => voice.play('A new custom sentence.', 'sentence', true)); expect(speak).toHaveBeenCalledTimes(1)
  view.unmount(); expect(cancel).toHaveBeenCalledTimes(1)
  vi.unstubAllGlobals()
})
