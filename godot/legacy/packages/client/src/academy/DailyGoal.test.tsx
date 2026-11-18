import { afterEach, beforeEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DailyGoal } from './DailyGoal'
import { emptyProfile } from './learning-core'
import { restoreLearning } from './learning-store'
beforeEach(() => restoreLearning(JSON.stringify({ ...emptyProfile(), xp: 712 })))
afterEach(cleanup)
it('lets the player save arbitrary daily words, half-band targets and a personal note together', () => {
  render(<DailyGoal detailed/>)
  fireEvent.change(screen.getByLabelText('每日目标词数'), { target: { value: '125' } })
  fireEvent.change(screen.getByLabelText('目标雅思分数'), { target: { value: '7.5' } })
  fireEvent.change(screen.getByLabelText('我的学习目标'), { target: { value: '先记住短词，再挑战听力。' } })
  fireEvent.click(screen.getByRole('button', { name: '保存目标' }))
  expect(screen.getByRole('status')).toHaveTextContent('目标已保存')
  expect(JSON.parse(localStorage.getItem('starlanguage_learning_v1')!)).toMatchObject({ xp: 712, goal: 125, learningGoals: { band: 7.5, note: '先记住短词，再挑战听力。' } })
})
