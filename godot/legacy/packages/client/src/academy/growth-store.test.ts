import { afterEach, expect, it, vi } from 'vitest'
import { emptyProfile, type LearningRecord } from './learning-core'
import { addLearningRecord, restoreLearning, strengthenCompanion } from './learning-store'
afterEach(() => vi.restoreAllMocks())
it('stores reward and result together, and failed spending leaves the wallet untouched', () => {
  restoreLearning(JSON.stringify(emptyProfile()))
  const record: LearningRecord = { id:'growth-storage', kind:'vocabulary', title:'词汇', correct:12, total:12, duration:40, xp:80, outcome:'victory', date:'2026-10-15T05:00:00Z' }
  addLearningRecord(record)
  const key = 'starlanguage_learning_v1', before = localStorage.getItem(key)!
  const write = vi.spyOn(localStorage,'setItem').mockImplementation(() => { throw new Error('磁盘满') })
  expect(() => strengthenCompanion('spirit','moon')).toThrow('磁盘满')
  expect(localStorage.getItem(key)).toBe(before)
  write.mockRestore()
  addLearningRecord(record)
  expect(localStorage.getItem(key)).toBe(before)
  strengthenCompanion('spirit','moon')
  const saved=JSON.parse(localStorage.getItem(key)!)
  expect(saved.growth.coins).toBe(5); expect(saved.growth.spirits.moon.rank).toBe(2)
  expect(saved.records).toHaveLength(1)
})
