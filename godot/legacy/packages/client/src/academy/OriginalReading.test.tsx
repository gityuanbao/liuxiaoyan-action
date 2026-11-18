import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { OriginalReading } from './OriginalReading'
import { addLearningRecord } from './learning-store'
vi.mock('./learning-store', () => ({ addLearningRecord: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })
describe('public original reading practice', () => {
  it('requires all answers, grades the submitted answers and preserves one reward per submission', () => {
    render(<OriginalReading/>);
    expect(screen.getByRole('button', { name: '提交阅读答案' })).toBeDisabled()
    for (let i = 1; i <= 5; i++) fireEvent.change(screen.getByLabelText(`阅读答案 ${i}`), { target: { value: ['FALSE', 'FALSE', 'NOT GIVEN', ' NOTEBOOKS ', 'wrong'][i - 1] } })
    fireEvent.click(screen.getByRole('button', { name: '提交阅读答案' }))
    expect(screen.getByText('本次答对 4 / 5')).toBeInTheDocument()
    expect(addLearningRecord).toHaveBeenCalledTimes(1)
    expect(addLearningRecord).toHaveBeenCalledWith(expect.objectContaining({ kind: 'reading', correct: 4, total: 5, xp: 30 }))
    expect(screen.getByLabelText('阅读答案 1')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '探索下一篇' }))
    expect(screen.getByRole('heading', { name: 'A Quieter Harbour' })).toBeInTheDocument()
    expect(screen.getByLabelText('阅读答案 1')).toHaveValue('')
  })
  it('retries a failed save using the same record id', () => {
    vi.mocked(addLearningRecord).mockImplementationOnce(() => { throw new Error('storage full') })
    render(<OriginalReading/>);
    for (let i = 1; i <= 5; i++) fireEvent.change(screen.getByLabelText(`阅读答案 ${i}`), { target: { value: i <= 3 ? 'FALSE' : 'word' } })
    fireEvent.click(screen.getByRole('button', { name: '提交阅读答案' }))
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }))
    expect(vi.mocked(addLearningRecord).mock.calls[0][0].id).toBe(vi.mocked(addLearningRecord).mock.calls[1][0].id)
    expect(screen.getByRole('status')).toHaveTextContent('已保存')
  })
})
