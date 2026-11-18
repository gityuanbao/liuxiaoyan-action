import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { emptyProfile } from './learning-core'
import { addLearningRecord, completeStory, moveStory, restoreLearning, setAvatar, setCompanion, setDailyGoal, setLearningGoals, skipOpeningDialogue } from './learning-store'
import { parseBackup } from './learning-core'
const KEY = 'starlanguage_learning_v1'
const read = () => JSON.parse(localStorage.getItem(KEY)!)
beforeEach(() => restoreLearning(JSON.stringify({ ...emptyProfile(), xp: 123 })))
afterEach(() => vi.restoreAllMocks())
describe('saved adventure settings and dialogue', () => {
  it('equips a spirit only after its real battle requirement is reached', () => {
    expect(() => setCompanion('leaf')).toThrow()
    expect(() => setCompanion('unknown')).toThrow()
    for (let i = 0; i < 2; i++) addLearningRecord({ id: `battle-${i}`, kind: 'listening', title: '听力试炼', date: new Date().toISOString(), correct: 1, total: 1, duration: 10, xp: 5 })
    setCompanion('leaf')
    expect(read().companion).toBe('leaf')
  })
  it('saves a custom goal and new character while preserving existing XP', () => {
    setDailyGoal(27); setAvatar('ranger'); expect(read()).toMatchObject({ xp: 123, goal: 27, avatar: 'ranger' })
    for (const value of [0, 1001, 1.5, NaN]) expect(() => setDailyGoal(value)).toThrow()
    expect(read().goal).toBe(27)
  })
  it('saves all personal goals together, roundtrips them, and rejects malformed changes', () => {
    setLearningGoals(125, 6.5, '  先学会日常单词，再练校园对话。  ')
    const before = read()
    expect(before).toMatchObject({ xp: 123, goal: 125, learningGoals: { band: 6.5, note: '先学会日常单词，再练校园对话。' } })
    expect(parseBackup(JSON.stringify(before))).toEqual(before)
    for (const [count, band, note] of [[0, 7, ''], [1.5, 7, ''], [25, 7.2, ''], [25, 10, ''], [25, 7, '字'.repeat(161)]] as const) expect(() => setLearningGoals(count, band, note)).toThrow()
    expect(read()).toEqual(before)
    expect(() => parseBackup(JSON.stringify({ ...before, learningGoals: { band: '7', note: '' } }))).toThrow()
    expect(parseBackup(JSON.stringify({ ...emptyProfile(), goal: 1000 })).goal).toBe(1000)
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    try { expect(() => setLearningGoals(40, 8, '新目标')).toThrow(); expect(read()).toEqual(before) } finally { write.mockRestore() }
  })
  it('skips opening dialogue without claiming a victory or overwriting a chosen branch', () => {
    moveStory('arrival', 3, 'courage'); skipOpeningDialogue()
    expect(read()).toMatchObject({ xp: 123, records: [], story: { completed: [], positions: { arrival: 4 }, choices: { arrival: 'courage' } } })
    expect(() => moveStory('arrival', 5)).toThrow()
    expect(() => completeStory('arrival')).toThrow()
  })
  it('saves a branch and chapter completion, without duplicating rewards on reread', () => {
    expect(() => completeStory('arrival')).toThrow()
    moveStory('arrival', 3, 'courage'); expect(() => moveStory('arrival', 5)).toThrow()
    addLearningRecord({ id: 'story:arrival:victory', kind: 'vocabulary', outcome: 'victory', title: '月光桥遭遇', date: new Date().toISOString(), correct: 9, total: 9, duration: 20, xp: 65 })
    moveStory('arrival', 5); completeStory('arrival'); completeStory('arrival')
    expect(read()).toMatchObject({ xp: 188, story: { completed: ['arrival'], positions: { arrival: 5 }, choices: { arrival: 'courage' } } })
    expect(() => moveStory('forest', 1)).not.toThrow()
  })
  it('does not publish a saved setting when storage rejects the write', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('full') })
    expect(() => setDailyGoal(30)).toThrow()
    expect(read().goal).toBe(15)
  })
})
