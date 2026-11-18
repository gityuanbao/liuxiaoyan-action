import { describe, it, expect } from 'vitest'
import { emptyProfile, parseBackup, recordResult, type LearningRecord } from './learning-core'
import { chapterUnlocked, emptyStory, validateStory, resumeStoryIndex } from './story-data'
const record = (kind: LearningRecord['kind'], outcome: 'victory' | 'defeat' = 'victory'): LearningRecord => ({ id: kind, kind, outcome, title: '试炼', correct: 1, total: 1, xp: 10, duration: 4, date: '2026-10-11T01:00:00Z' })
describe('adventure story and upgraded backups', () => {
  it('continues from vocabulary into the first listening chapter and retains the old reading route', () => {
    const p = { ...emptyProfile(), story: { ...emptyStory(), completed: ['arrival', 'forest'] }, records: [record('vocabulary')] }
    expect(resumeStoryIndex(p)).toBe(2)
    p.records = [record('reading')]
    expect(resumeStoryIndex(p)).toBe(2)
  })
  it('requires the previous chapter plus a matching saved victory, not a defeat', () => {
    let profile = emptyProfile()
    expect(chapterUnlocked(profile, 0)).toBe(true)
    profile = recordResult(profile, record('vocabulary', 'defeat'))
    profile.story = { ...emptyStory(), completed: ['arrival'] }
    expect(chapterUnlocked(profile, 1)).toBe(false)
    profile.records = [record('vocabulary')]
    expect(chapterUnlocked(profile, 1)).toBe(true)
    profile.story.completed = []
    expect(chapterUnlocked(profile, 1)).toBe(false)
  })
  it('accepts an old saved reading at any score, then requires listening and sentence victories', () => {
    const p = { ...emptyProfile(), story: { ...emptyStory(), completed: ['arrival', 'forest'] }, records: [{ ...record('reading'), correct: 0 }] }
    expect(chapterUnlocked(p, 2)).toBe(true)
    p.story.completed.push('archive'); expect(chapterUnlocked(p, 3)).toBe(false)
    p.records.push(record('listening')); expect(chapterUnlocked(p, 3)).toBe(true)
    p.story.completed.push('tide'); expect(chapterUnlocked(p, 4)).toBe(false)
    p.records.push(record('sentence')); expect(chapterUnlocked(p, 4)).toBe(true)
  })
  it('preserves old progress and all new avatar, sentence, listening and story fields', () => {
    const old = recordResult(emptyProfile(), record('vocabulary'))
    expect(parseBackup(JSON.stringify(old))).toEqual(old)
    const updated = { ...old, avatar: 'bard', goal: 27, records: [...old.records, record('sentence'), record('listening')], story: { ...emptyStory(), positions: { arrival: 3 }, choices: { arrival: 'courage' } } }
    expect(parseBackup(JSON.stringify(updated))).toEqual(updated)
  })
  it('rejects corrupt story positions and choices without accepting broken profiles', () => {
    expect(validateStory({ ...emptyStory(), positions: { arrival: 100 } })).toBe(false)
    expect(validateStory({ ...emptyStory(), choices: { arrival: 'bad' } })).toBe(false)
    expect(() => parseBackup(JSON.stringify({ ...emptyProfile(), story: { ...emptyStory(), positions: { unknown: 1 } } }))).toThrow()
  })
})
