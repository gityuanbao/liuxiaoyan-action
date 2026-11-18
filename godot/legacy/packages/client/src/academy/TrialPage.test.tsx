import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TrialPage } from './TrialPage'
import { restoreLearning } from './learning-store'
import { emptyProfile } from './learning-core'
import { LISTENING_QUESTIONS, READING_QUESTIONS } from './trial-data'
beforeEach(() => { restoreLearning(JSON.stringify(emptyProfile())); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })
function answers(values: string[]) { values.forEach((value, i) => fireEvent.change(screen.getByLabelText(`试炼答案 ${i + 1}`), { target: { value } })) }
it('locks answers before starting, grades a real reading submission, and stores it only once', async () => {
  render(<TrialPage/>); fireEvent.click(screen.getByRole('button', { name: /洞察之印/ }))
  expect(screen.getByLabelText('试炼答案 1')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '开启试炼' }))
  const values = READING_QUESTIONS.map(q => q.answers[0]); values[6] = 'wrong'; values[7] = 'wrong'; answers(values)
  fireEvent.click(screen.getByRole('button', { name: /提交试炼/ }))
  expect(await screen.findByText('答对 6 / 8')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('starlanguage_learning_v1')!).trials).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: /带着印记返回/ }))
  expect(screen.getByText('已修复 1 / 4 枚印记')).toBeInTheDocument()
})
it('requires ended listening clips and permits only one successful play per clip in challenge mode', async () => {
  const view = render(<TrialPage/>); fireEvent.click(screen.getByRole('button', { name: '限时挑战' })); fireEvent.click(screen.getByRole('button', { name: /回声之印/ })); fireEvent.click(screen.getByRole('button', { name: '开启试炼' }))
  answers(LISTENING_QUESTIONS.map(q => q.answers[0]))
  expect(screen.getByRole('button', { name: /提交试炼/ })).toBeDisabled()
  await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: '播放片段' })[0]) })
  expect(screen.getByRole('button', { name: '继续 / 重听' })).toBeDisabled()
  fireEvent.ended(view.container.querySelectorAll('audio')[0])
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '播放片段' })) })
  fireEvent.ended(view.container.querySelectorAll('audio')[1])
  expect(screen.getByRole('button', { name: /提交试炼/ })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: /提交试炼/ })); expect(await screen.findByText('答对 8 / 8')).toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('starlanguage_learning_v1')!).trials[0].replays).toBe(2)
})
it('saves and restores both writing drafts without granting experience', () => {
  const view = render(<TrialPage/>); fireEvent.click(screen.getByRole('button', { name: /构筑之印/ })); fireEvent.click(screen.getByRole('button', { name: '开启试炼' }))
  fireEvent.change(screen.getByLabelText('Task 1 写作'), { target: { value: 'My opening draft.' } }); fireEvent.change(screen.getByLabelText('Task 2 写作'), { target: { value: 'My second draft.' } }); fireEvent.click(screen.getByRole('button', { name: '保存草稿' }))
  view.unmount(); render(<TrialPage/>); fireEvent.click(screen.getByRole('button', { name: /构筑之印/ })); fireEvent.click(screen.getByRole('button', { name: '载入草稿' }))
  expect(screen.getByLabelText('Task 1 写作')).toHaveValue('My opening draft.'); expect(screen.getByLabelText('Task 2 写作')).toHaveValue('My second draft.')
  expect(JSON.parse(localStorage.getItem('starlanguage_learning_v1')!).xp).toBe(0)
})
it('automatically saves one incomplete result at the challenge deadline', async () => {
  vi.useFakeTimers(); const start = Date.now(); render(<TrialPage/>); fireEvent.click(screen.getByRole('button', { name: '限时挑战' })); fireEvent.click(screen.getByRole('button', { name: /洞察之印/ })); fireEvent.click(screen.getByRole('button', { name: '开启试炼' }))
  await act(async () => { vi.setSystemTime(start + 1200000); await vi.advanceTimersByTimeAsync(250) })
  expect(screen.getByText('答对 0 / 8')).toBeInTheDocument()
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  const saved = JSON.parse(localStorage.getItem('starlanguage_learning_v1')!); expect(saved.trials).toHaveLength(1); expect(saved.xp).toBe(0)
})
