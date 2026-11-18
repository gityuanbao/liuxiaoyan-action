import { describe, expect, it } from 'vitest'
import { emptyProfile, recordResult, selectWords, parseBackup, profileStats, type LearningRecord } from './learning-core'
import { WORDS } from './words'

const record = (id: string, correct = true, hinted = false): LearningRecord => ({ id, kind: 'vocabulary', title: '词汇冒险', date: '2026-10-11T02:00:00Z', correct: Number(correct), total: 1, duration: 35, xp: 15, words: [{ id: WORDS[0].id, correct, hinted }] })
describe('learning progress', () => {
  it('deduplicates an already committed result without awarding more XP', () => {
    const first = recordResult(emptyProfile(), record('one'))
    expect(recordResult(first, record('one'))).toBe(first)
    expect(first.xp).toBe(15)
    expect(first.words[WORDS[0].id].attempts).toBe(1)
  })
  it('requires three unhinted recalls and resets mastery after an incorrect recall', () => {
    let profile = emptyProfile()
    for (let i = 0; i < 3; i++) profile = recordResult(profile, record(String(i)))
    expect(profileStats(profile).mastered).toBe(1)
    expect(selectWords(profile, 'review')).toHaveLength(0)
    profile = recordResult(profile, record('wrong', false))
    expect(profileStats(profile).mastered).toBe(0)
    expect(selectWords(profile, 'review')[0].id).toBe(WORDS[0].id)
  })
  it('keeps a hinted answer in review even when spelling was correct', () => {
    const profile = recordResult(emptyProfile(), record('hint', true, true))
    expect(profile.records[0].correct).toBe(1)
    expect(profile.words[WORDS[0].id].streak).toBe(0)
    expect(selectWords(profile, 'review')).toHaveLength(1)
  })
  it('selects unseen words before previously practiced words in a topic', () => {
    const profile = recordResult(emptyProfile(), record('one'))
    const selected = selectWords(profile, WORDS[0].pack)
    expect(selected).toHaveLength(8)
    expect(selected.some(w => w.id === WORDS[0].id)).toBe(false)
    expect(selected.every(w => w.pack === WORDS[0].pack)).toBe(true)
  })
  it('round-trips valid backups and rejects malformed, duplicated and impossible records', () => {
    const profile = recordResult(emptyProfile(), record('one'))
    expect(parseBackup(JSON.stringify(profile))).toEqual(profile)
    expect(() => parseBackup('{')).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...profile, records: [...profile.records, ...profile.records] }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...profile, records: [{ ...record('x'), correct: 2 }] }))).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...profile, words: { unknown: profile.words[WORDS[0].id] } }))).toThrow()
  })
  it('starts with honest zero statistics and reflects actual awarded experience', () => {
    expect(profileStats(emptyProfile())).toMatchObject({ seen: 0, mastered: 0, battles: 0, readings: 0, accuracy: 0, level: 1 })
    expect(profileStats({ ...emptyProfile(), xp: 135 })).toMatchObject({ level: 2, levelProgress: 35 })
  })
  it('preserves the chosen avatar in backups while reading older profiles', () => {
    const profile = { ...recordResult(emptyProfile(), record('one')), avatar: 'knight' as const }
    expect(parseBackup(JSON.stringify(profile))).toEqual(profile)
    expect(parseBackup(JSON.stringify(emptyProfile())).avatar).toBeUndefined()
    expect(() => parseBackup(JSON.stringify({ ...profile, avatar: 'unknown' }))).toThrow()
  })
  it('round-trips ultimate counts and rejects counts beyond successful attacks', () => {
    const profile = recordResult(emptyProfile(), { ...record('ultimate'), correct: 2, total: 3, ultimates: 1 })
    expect(parseBackup(JSON.stringify(profile))).toEqual(profile)
    for (const ultimates of [-1, .5, 3]) expect(() => parseBackup(JSON.stringify({ ...profile, records: [{ ...profile.records[0], ultimates }] }))).toThrow()
  })
})
