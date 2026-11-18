import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { addLearningRecord, engraveRune, restoreLearning, receiveCommission } from './learning-store'
import { emptyProfile, parseBackup, type LearningRecord } from './learning-core'
const read = () => parseBackup(localStorage.getItem('starlanguage_learning_v1')!)
const record: LearningRecord = { id: 'expedition:first', date: '2026-10-16T12:00:00Z', kind: 'vocabulary', outcome: 'victory', correct: 6, total: 6, xp: 50, title: '第一束微光', duration: 15, expedition: { stage: 'bridge-1', hp: 140 } }
beforeEach(() => restoreLearning(JSON.stringify(emptyProfile())))
afterEach(() => vi.restoreAllMocks())
it('publishes practice, first clear and currency together, then prevents repeat settlement', () => {
  expect(addLearningRecord(record)).toEqual({ firstClear: 15 })
  const saved = read()
  expect(saved.expedition?.clears['bridge-1']).toMatchObject({ stars: 3 })
  expect(addLearningRecord(record)).toEqual({ firstClear: 0 })
  expect(read()).toEqual(saved)
  engraveRune('dawn')
  expect(read().growth).toMatchObject({ coins: 17, earned: 37, spent: 20 })
})
it('does not publish any rewards, clears or upgrades when the disk write fails', () => {
  const before = read(), write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
  expect(() => addLearningRecord(record)).toThrow('quota')
  expect(read()).toEqual(before)
  write.mockRestore()
  addLearningRecord(record)
  const after = read()
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
  expect(() => engraveRune('dawn')).toThrow('quota')
  expect(read()).toEqual(after)
  expect(() => receiveCommission('route-12')).toThrow()
})
