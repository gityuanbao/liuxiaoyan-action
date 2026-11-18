import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BattleDebrief } from './BattleDebrief'
import { emptyProfile, recordResult } from './learning-core'
import { restoreLearning } from './learning-store'
import { WORDS } from './words'
afterEach(cleanup)
it('collects the real weak words, keeps the saved score unchanged, and offers review', () => {
  const attempts = [{ id: WORDS[0].id, correct: false, hinted: false }, { id: WORDS[0].id, correct: true, hinted: true }]
  const profile = recordResult(emptyProfile(), { id: 'debrief:test', title: '试炼', kind: 'vocabulary', correct: 1, total: 2, xp: 5, duration: 10, words: attempts, date: '2026-10-15T01:00:00Z' })
  restoreLearning(JSON.stringify(profile))
  const onReview = vi.fn()
  const view = render(<BattleDebrief attempts={attempts} profile={profile} saved onReview={onReview}/>)
  expect(screen.getAllByText(WORDS[0].word)).toHaveLength(1)
  expect(view.container).toHaveTextContent('本场错拼过')
  fireEvent.click(screen.getByRole('button', { name: '收藏本场待巩固词' }))
  const saved = JSON.parse(localStorage.getItem('starlanguage_learning_v1')!)
  expect(saved.notebook.saved).toEqual([WORDS[0].id])
  expect(saved.xp).toBe(5)
  expect(saved.records).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '去错词复习' }))
  expect(onReview).toHaveBeenCalledOnce()
})
it('does not offer an empty review pool or enable collecting before saving the result', () => {
  const profile = emptyProfile()
  render(<BattleDebrief attempts={[{ id: WORDS[0].id, correct: true, hinted: true }]} profile={profile} saved={false} onReview={vi.fn()}/>)
  expect(screen.getByRole('button', { name: '收藏本场待巩固词' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '暂无待巩固词' })).toBeDisabled()
})
