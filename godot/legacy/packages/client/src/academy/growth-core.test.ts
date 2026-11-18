import { expect, it } from 'vitest'
import { emptyProfile, recordResult, parseBackup, type LearningRecord } from './learning-core'
import { heroBond, spiritBond, upgradeBond, practiceReward } from './growth-core'
const record = (id: string): LearningRecord => ({ id, kind: 'vocabulary', title: '森林', correct: 9, total: 10, duration: 30, xp: 65, outcome: 'victory', avatar: 'knight', companion: 'leaf', date: '2026-10-15T05:00:00Z', words: [{ id: 'habitat', correct: true, hinted: false }] })
it('settles practice currency once and credits the equipped battle snapshot', () => {
  const r = record('new'), p = recordResult({ ...emptyProfile(), avatar: 'bard', companion: 'moon' }, r)
  expect(p.growth).toMatchObject({ coins: 29, earned: 29, spent: 0 })
  expect(heroBond(p, 'knight').xp).toBe(9); expect(spiritBond(p, 'leaf').xp).toBe(9)
  expect(heroBond(p, 'bard').xp).toBe(0)
  expect(recordResult(p, r)).toBe(p)
})
it('does not back-pay historical records and keeps their receipts after trimming records', () => {
  const old = { ...emptyProfile(), xp: 65, records: [record('old')] }, p = recordResult(old, record('new'))
  expect(p.growth?.coins).toBe(29)
  const trimmed = { ...p, records: p.records.filter(r => r.id !== 'old') }
  expect(recordResult(trimmed, record('old'))).toBe(trimmed)
  expect(parseBackup(JSON.stringify(old)).growth).toBeUndefined()
})
it('requires both bonding and money, charges once per rank, and preserves learning data', () => {
  let p = emptyProfile()
  expect(() => upgradeBond(p, 'spirit', 'moon')).toThrow('熟练度')
  for (let i = 0; i < 4; i++) p = recordResult(p, { ...record(String(i)), avatar: 'mage', companion: 'moon' })
  const before = JSON.stringify(p), upgraded = upgradeBond(p, 'spirit', 'moon')
  expect(upgraded.growth?.coins).toBe(116 - 25); expect(upgraded.growth?.spent).toBe(25)
  expect(spiritBond(upgraded, 'moon')).toEqual({ rank: 2, xp: 36 })
  const awakened = upgradeBond(upgraded, 'spirit', 'moon')
  expect(spiritBond(awakened, 'moon').rank).toBe(3)
  expect(() => upgradeBond(awakened, 'spirit', 'moon')).toThrow('已达到')
  expect(awakened.records).toEqual(p.records); expect(awakened.xp).toBe(p.xp)
  expect(JSON.stringify(p)).toBe(before)
  expect(parseBackup(JSON.stringify(awakened)).growth).toEqual(awakened.growth)
  expect(() => upgradeBond({ ...p, growth: { ...p.growth!, coins: 0 } }, 'hero', 'mage')).toThrow('星砂不足')
})
it('gives no currency for empty or wrong-only work; completed writing and reading qualify', () => {
  expect(practiceReward({ ...record('empty'), correct: 0, words: [], xp: 0 }).coins).toBe(0)
  expect(practiceReward({ ...record('writing'), kind: 'writing', total: 0, correct: 0, outcome: undefined, words: [], xp: 20 }).coins).toBe(12)
  expect(practiceReward({ ...record('reading'), kind: 'exam', total: 8, correct: 6, outcome: undefined, words: [] }).coins).toBe(12)
})
it('rejects malformed or negative growth balances and invalid battle loadouts in backups', () => {
  const p = recordResult(emptyProfile(), { ...record('valid'), words: [] })
  for (const mutation of [{ coins: -1 }, { earned: 999 }, { settled: ['dup','dup'] }, { spirits: { moon: { rank: 99, xp: 1 } } }]) expect(() => parseBackup(JSON.stringify({ ...p, growth: { ...p.growth, ...mutation } }))).toThrow('养成')
  expect(() => parseBackup(JSON.stringify({ ...p, records: [{ ...p.records[0], avatar: 'unknown' }] }))).toThrow('搭配')
})
