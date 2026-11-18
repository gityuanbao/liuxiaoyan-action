import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { VocabularyBattle } from './VocabularyBattle'
import { addLearningRecord } from './learning-store'
import { CHARACTER_SKILLS } from './combat-skills'
import { useGameStore } from '../store'
vi.mock('./DuelArena', () => ({ DuelArena: ({ state, monster }: any) => <><div data-testid="hp">{state.botHp}</div><div data-testid="monster">{monster}</div></> }))
vi.mock('./learning-store', async () => { const { emptyProfile } = await import('./learning-core'); return { useLearning: () => emptyProfile(), addLearningRecord: vi.fn() } })
beforeEach(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined) })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks() })
function setup() { const view = render(<VocabularyBattle initialPack="environment" lesson="listening"/>); fireEvent.click(screen.getByRole('button', { name: /开始决斗/ })); return { ...view, audio: view.container.querySelector('audio')! } }
it('prepares a card without losing the answer, pauses card actions, and only spends it on a correct spelling', async () => {
  vi.useFakeTimers()
  const view = render(<VocabularyBattle initialPack="beginner"/>)
  fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
  for (let i = 0; i < 2; i++) {
    fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: view.container.querySelector('.typed-word')!.textContent } })
    fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
    await act(async () => { await vi.advanceTimersByTimeAsync(450) })
  }
  const before = Number(screen.getByTestId('hp').textContent)
  fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: 'draft' } })
  fireEvent.click(screen.getByRole('button', { name: '破雾追击' }))
  expect(screen.getByLabelText('输入英文单词')).toHaveValue('draft')
  expect(screen.getByRole('button', { name: '破雾追击', pressed: true })).toBeEnabled()
  expect(Number(screen.getByTestId('hp').textContent)).toBe(before)
  fireEvent.click(screen.getByRole('button', { name: '暂停', exact: true }))
  expect(screen.getByRole('button', { name: '星纹守护' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '继续决斗' }))
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  expect(screen.getByRole('button', { name: '破雾追击', pressed: true })).toBeEnabled()
  expect(Number(screen.getByTestId('hp').textContent)).toBe(before)
  fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: view.container.querySelector('.typed-word')!.textContent } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  expect(Number(screen.getByTestId('hp').textContent)).toBeLessThan(before)
  expect(screen.getByRole('button', { name: '破雾追击', pressed: false })).toBeDisabled() // casting lock
  expect(addLearningRecord).not.toHaveBeenCalled()
})
it('reads the accepted sentence after advancing and does not speak a wrong answer', async () => {
  vi.useFakeTimers(); useGameStore.setState({ soundEnabled: true, pronunciationEnabled: true, soundVolume: 75 })
  const view = render(<VocabularyBattle initialPack="beginner" lesson="sentence"/>)
  fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
  const expected = view.container.querySelector('.typed-word')!.textContent!
  fireEvent.change(screen.getByLabelText('输入英文句子'), { target: { value: 'wrong sentence' } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('输入英文句子'), { target: { value: expected } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  const feedback = screen.getByLabelText('拼写完成后的英文朗读') as HTMLAudioElement
  expect(feedback.getAttribute('src')).toMatch(/\/audio\/pronunciation-v1\/sentence-/)
  await act(async () => { await vi.advanceTimersByTimeAsync(450) })
  expect(view.container.querySelector('.pronunciation-copy')).toHaveTextContent(expected)
  expect(view.container.querySelector('.typed-word')!.textContent).not.toBe(expected)
  expect(addLearningRecord).not.toHaveBeenCalled()
})
it('never unlocks a new listening question when answer-feedback audio ends', async () => {
  vi.useFakeTimers(); useGameStore.setState({ soundEnabled: true, pronunciationEnabled: true, soundVolume: 75 })
  const { container, audio } = setup()
  const feedback = screen.getByLabelText('拼写完成后的英文朗读')
  fireEvent.ended(audio)
  fireEvent.click(screen.getByRole('button', { name: '查看拼写' }))
  fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: container.querySelector('.typed-word')!.textContent } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  await act(async () => { await vi.advanceTimersByTimeAsync(450) })
  expect(screen.getByLabelText('输入英文单词')).toBeDisabled()
  fireEvent.ended(feedback)
  expect(screen.getByLabelText('输入英文单词')).toBeDisabled()
  expect(addLearningRecord).not.toHaveBeenCalled()
})
it('celebrates a corrected answer beside the input without granting unfinished XP or coins', () => {
  const view = render(<VocabularyBattle initialPack="environment"/>)
  fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
  const expected = view.container.querySelector('.typed-word')!.textContent!
  fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  expect(screen.getByText('再试一次，这里有个线索')).toBeVisible()
  fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: expected } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  expect(screen.getByText('纠正成功！')).toBeVisible()
  expect(view.container.querySelector('.learning-response')).toHaveTextContent('本场答对 1')
  expect(view.container.querySelector('.learning-response')).toHaveTextContent('待结算')
  expect(addLearningRecord).not.toHaveBeenCalled()
})
it('lets the player choose a monster and carries that encounter into the actual spelling battle', () => {
  render(<VocabularyBattle initialPack="environment"/>)
  expect(screen.getByTestId('monster')).toHaveTextContent('thorn')
  fireEvent.change(screen.getByLabelText('遭遇小怪'), { target: { value: 'crystal' } })
  expect(screen.getByTestId('monster')).toHaveTextContent('crystal')
  fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
  expect(screen.getByTestId('monster')).toHaveTextContent('crystal')
  fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: '释放攻击' }))
  expect(screen.getByTestId('hp')).toHaveTextContent('140')
})
describe('listening battle', () => {
  it('uses an attributed human clip and still requires listening before dealing damage', () => {
    const view = render(<VocabularyBattle initialPack="human" lesson="listening"/>);
    expect(screen.getByLabelText('冒险主题')).toHaveValue('human')
    expect(screen.getByText(/Wikimedia Commons 真人单词录音/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
    const audio = view.container.querySelector('audio')!
    expect(audio.getAttribute('src')).toMatch(/^\/audio\/human-v1\/.+\.ogg$/)
    expect(screen.getByLabelText('输入英文单词')).toBeDisabled()
    fireEvent.ended(audio)
    fireEvent.click(screen.getByRole('button', { name: '查看拼写' }))
    fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: view.container.querySelector('.typed-word')!.textContent } })
    fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
    expect(Number(screen.getByTestId('hp').textContent)).toBeLessThan(140)
    expect(Number(screen.getByTestId('hp').textContent)).toBeGreaterThan(0)
  })
  it('saves a real listening victory once, with assisted attempts and the right lesson kind', async () => {
    vi.useFakeTimers()
    const { container } = setup()
    for (let i = 0; i < 20 && !screen.queryByRole('dialog', { name: '对战结果' }); i++) {
      fireEvent.ended(container.querySelector('audio')!)
      fireEvent.click(screen.getByRole('button', { name: '查看拼写' }))
      fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: container.querySelector('.typed-word')!.textContent } })
      fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
      await act(async () => { await vi.advanceTimersByTimeAsync(450) })
    }
    expect(screen.getByRole('dialog', { name: '对战结果' })).toHaveTextContent('决斗胜利')
    fireEvent.click(screen.getByRole('button', { name: '继续旅途 · 主线剧情 →' }))
    expect(useGameStore.getState().screen).toBe('story')
    expect(addLearningRecord).toHaveBeenCalledTimes(1)
    expect(addLearningRecord).toHaveBeenCalledWith(expect.objectContaining({ kind: 'listening', outcome: 'victory', words: expect.arrayContaining([expect.objectContaining({ correct: true, hinted: true })]) }))
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(addLearningRecord).toHaveBeenCalledTimes(1)
  })
  it('hides English and requires an ended clip, even after viewing a spelling hint', () => {
    const { audio } = setup()
    const input = screen.getByLabelText('输入英文单词')
    expect(input).toBeDisabled(); expect(document.querySelector('.typed-word')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '查看拼写' }))
    const word = document.querySelector('.typed-word')!.textContent!
    expect(input).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '播放英文' }))
    expect(input).toBeDisabled()
    fireEvent.ended(audio)
    expect(input).toBeEnabled()
    fireEvent.change(input, { target: { value: word } }); fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
    expect(Number(screen.getByTestId('hp').textContent)).toBeLessThan(140)
    expect(Number(screen.getByTestId('hp').textContent)).toBeGreaterThan(0)
  })
  it('keeps attack locked when playback fails and shows a clear retry message', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('blocked'))
    setup(); fireEvent.click(screen.getByRole('button', { name: '播放英文' }))
    expect(await screen.findByText(/音频未播放成功/)).toBeInTheDocument()
    expect(screen.getByLabelText('输入英文单词')).toBeDisabled()
    expect(screen.getByTestId('hp')).toHaveTextContent('140')
  })
  it('switches to sentence audio and rejects a wrong transcript without dealing damage', () => {
    const view = render(<VocabularyBattle initialPack="environment" lesson="listening"/>);
    fireEvent.change(screen.getByLabelText('听写内容'), { target: { value: 'sentence' } }); fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
    const audio = view.container.querySelector('audio')!
    expect(audio.getAttribute('src')).toContain('/audio/sentence-')
    fireEvent.ended(audio); fireEvent.change(screen.getByLabelText('输入英文句子'), { target: { value: 'a wrong sentence' } }); fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
    expect(screen.getByTestId('hp')).toHaveTextContent('140'); expect(screen.getByText(/检查漏词、词序/)).toBeInTheDocument()
  })
})
describe('long sentence ultimate', () => {
  it('preserves a draft on cancel, rejects incomplete chants, and saves an ultimate without marking a new word learned', async () => {
    vi.useFakeTimers()
    const { container } = render(<VocabularyBattle initialPack="environment" />)
    fireEvent.click(screen.getByRole('button', { name: /开始决斗/ }))
    async function normal() {
      fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: container.querySelector('.typed-word')!.textContent } })
      fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
      await act(async () => { await vi.advanceTimersByTimeAsync(450) })
    }
    for (let i = 0; i < 4; i++) await normal()
    expect(screen.getByRole('button', { name: /咏唱大招/ })).toBeEnabled()
    fireEvent.change(screen.getByLabelText('输入英文单词'), { target: { value: 'my draft' } })
    fireEvent.click(screen.getByRole('button', { name: /咏唱大招/ }))
    fireEvent.click(screen.getByRole('button', { name: '返回普通攻击' }))
    expect(screen.getByLabelText('输入英文单词')).toHaveValue('my draft')
    fireEvent.click(screen.getByRole('button', { name: /咏唱大招/ }))
    const hp = screen.getByTestId('hp').textContent
    fireEvent.change(screen.getByLabelText('输入大招长句'), { target: { value: 'When the night grows quiet' } })
    fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
    expect(screen.getByTestId('hp')).toHaveTextContent(hp!)
    expect(screen.getByText(/能量未消耗/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('输入大招长句'), { target: { value: CHARACTER_SKILLS.mage.chant } })
    fireEvent.click(screen.getByRole('button', { name: /释放攻击/ }))
    expect(Number(screen.getByTestId('hp').textContent)).toBeLessThan(Number(hp))
    await act(async () => { await vi.advanceTimersByTimeAsync(900) })
    if (!screen.queryByRole('dialog', { name: '对战结果' })) {
      expect(screen.getByLabelText('输入英文单词')).toHaveValue('my draft')
      for (let i = 0; i < 10 && !screen.queryByRole('dialog', { name: '对战结果' }); i++) await normal()
    }
    expect(addLearningRecord).toHaveBeenCalledTimes(1)
    const record = vi.mocked(addLearningRecord).mock.calls[0][0]
    expect(record.ultimates).toBe(1)
    expect(record.words?.filter(w => w.correct)).toHaveLength(record.correct - 1)
    expect(record.total - record.correct).toBe(1)
    expect(record.xp).toBe((record.correct - 1) * 5 + 8 + 20)
  })
})
