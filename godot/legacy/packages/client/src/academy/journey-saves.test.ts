import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginJourney, hasJourney, journeyPage, loadJourneySlot, readSaveBook, rememberJourneyPage, SAVE_BOOK_KEY, saveJourneySlot, verifyActiveJourney } from './journey-saves'
import { emptyProfile, type LearningProfile } from './learning-core'
import { restoreLearning } from './learning-store'
const KEY = 'starlanguage_learning_v1'
const old = (): LearningProfile => ({ ...emptyProfile(), xp: 712, avatar: 'knight', goal: 27, notebook: { saved: [], custom: [], notes: {} } })
const active = () => JSON.parse(localStorage.getItem(KEY)!) as LearningProfile
beforeEach(() => { localStorage.clear(); restoreLearning(JSON.stringify(old())) })
afterEach(() => vi.restoreAllMocks())
describe('single player saves preserve real progress', () => {
  it('continues legacy progress without migration and ignores combat as a return point', () => {
    expect(hasJourney()).toBe(true); verifyActiveJourney(); expect(active().xp).toBe(712)
    rememberJourneyPage('story'); rememberJourneyPage('vocabulary'); rememberJourneyPage('title'); expect(journeyPage()).toBe('story')
  })
  it('keeps three independent manual snapshots and roundtrips the entire profile', () => {
    for (let i = 0; i < 3; i++) saveJourneySlot(i, { ...old(), xp: 100 + i })
    expect(readSaveBook().slots.map(s => s?.profile.xp)).toEqual([100, 101, 102])
    expect(loadJourneySlot(1, active())).toBe('story'); expect(active().xp).toBe(101)
    expect(readSaveBook().departure?.profile).toEqual(old()); expect(readSaveBook().slots[0]?.profile.xp).toBe(100)
  })
  it('new journey preserves current departure and goal without copying rewards', () => {
    saveJourneySlot(0, old()); expect(beginJourney(old())).toBe('story')
    expect(active()).toEqual({ ...emptyProfile(), goal: 27 })
    expect(readSaveBook().departure?.profile.xp).toBe(712); expect(readSaveBook().slots[0]?.profile.xp).toBe(712)
    loadJourneySlot('departure', active()); expect(active().xp).toBe(712); expect(readSaveBook().departure?.profile.xp).toBe(0)
  })
  it('refuses corrupt or invalid entries without changing active progress', () => {
    for (const i of [-1, 3, 1.5]) expect(() => saveJourneySlot(i, old())).toThrow()
    expect(() => loadJourneySlot(0, old())).toThrow()
    localStorage.setItem(SAVE_BOOK_KEY, '{invalid'); expect(() => beginJourney(old())).toThrow(); expect(active().xp).toBe(712)
    localStorage.removeItem(SAVE_BOOK_KEY); saveJourneySlot(0, old()); const bad = readSaveBook(); bad.slots[0]!.profile.xp = -1; localStorage.setItem(SAVE_BOOK_KEY, JSON.stringify(bad)); expect(() => loadJourneySlot(0, old())).toThrow(); expect(active().xp).toBe(712)
  })
  it('can start directly at the first real encounter while keeping custom goals and the departing save', () => {
    const previous = { ...old(), learningGoals: { band: 7.5, note: '每天积累词汇' } }
    restoreLearning(JSON.stringify(previous)); beginJourney(previous, true)
    expect(active()).toMatchObject({ xp: 0, records: [], goal: 27, learningGoals: previous.learningGoals, story: { completed: [], positions: { arrival: 4 }, choices: { arrival: 'memory' } } })
    expect(readSaveBook().departure?.profile).toEqual(previous)
  })
  it('blocks a replacement when the protective snapshot cannot be saved', () => {
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    try { expect(() => beginJourney(old())).toThrow(); expect(active().xp).toBe(712) } finally { write.mockRestore() }
  })
  it('retains both current and selected slot if active profile write fails', () => {
    saveJourneySlot(0, { ...old(), xp: 200 }); const original = localStorage.setItem.bind(localStorage)
    const write = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => { if (key === KEY) throw new Error('quota'); original(key, value) })
    try { expect(() => loadJourneySlot(0, old())).toThrow(); expect(active().xp).toBe(712); expect(readSaveBook().slots[0]?.profile.xp).toBe(200); expect(readSaveBook().departure?.profile.xp).toBe(712) } finally { write.mockRestore() }
  })
  it('protects a corrupt active file from a new journey silently replacing it', () => {
    localStorage.setItem(KEY, 'damaged'); expect(() => beginJourney(emptyProfile())).toThrow(); expect(localStorage.getItem(KEY)).toBe('damaged')
  })
})
