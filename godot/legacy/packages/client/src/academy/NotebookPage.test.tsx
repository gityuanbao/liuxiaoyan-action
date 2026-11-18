import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NotebookPage } from './NotebookPage'
import { restoreLearning } from './learning-store'
import { emptyProfile } from './learning-core'
beforeEach(() => restoreLearning(JSON.stringify(emptyProfile())))
afterEach(cleanup)
it('adds a personal word, preserves a note on reopen and starts the saved-word battle', () => {
  let started = 0
  const view = render(<NotebookPage onPractice={() => started++}/>)
  fireEvent.click(screen.getByRole('button', { name: /添加生词/ }))
  fireEvent.change(screen.getByLabelText('新单词'), { target: { value: 'feasible' } }); fireEvent.change(screen.getByLabelText('中文释义'), { target: { value: '可行的' } })
  fireEvent.click(screen.getByRole('button', { name: '加入单词本' }))
  expect(screen.getByRole('heading', { name: 'feasible' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '编辑笔记' })); fireEvent.change(screen.getByLabelText('词汇笔记'), { target: { value: 'a feasible solution' } }); fireEvent.click(screen.getByRole('button', { name: '保存笔记' }))
  view.unmount(); render(<NotebookPage onPractice={() => started++}/>)
  expect(screen.getByText('a feasible solution')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /用收藏词出战/ })); expect(started).toBe(1)
  expect(JSON.parse(localStorage.getItem('starlanguage_learning_v1')!).xp).toBe(0)
})
