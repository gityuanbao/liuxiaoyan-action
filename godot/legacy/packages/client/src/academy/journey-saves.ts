import { emptyProfile, parseBackup, type LearningProfile } from './learning-core'
import { restoreLearning } from './learning-store'
import { STORY_ENCOUNTERS } from './story-encounters'

export const SAVE_BOOK_KEY = 'starlanguage_savebook_v1'
const ACTIVE_KEY = 'starlanguage_learning_v1'
const RETURN_KEY = 'starlanguage_return_v1'
export const JOURNEY_PAGES = ['expedition', 'camp', 'academy', 'story', 'appearance', 'spirits', 'exam', 'notebook', 'study', 'world', 'atlas', 'audio-library'] as const
export type JourneyPage = typeof JOURNEY_PAGES[number]
export interface JourneySave { date: string; page: JourneyPage; profile: LearningProfile }
export interface SaveBook { version: 1; slots: (JourneySave | null)[]; departure: JourneySave | null }
export function hasJourney() { return localStorage.getItem(ACTIVE_KEY) !== null }
export function verifyActiveJourney() { const raw = localStorage.getItem(ACTIVE_KEY); if (raw !== null) parseBackup(raw) }
export function rememberJourneyPage(page: string) { if (JOURNEY_PAGES.includes(page as JourneyPage)) { try { localStorage.setItem(RETURN_KEY, page) } catch { /* Profile writes report their own storage errors. */ } } }
export function journeyPage(): JourneyPage { const page = localStorage.getItem(RETURN_KEY); return JOURNEY_PAGES.includes(page as JourneyPage) ? page as JourneyPage : 'story' }
export function readSaveBook(): SaveBook {
  const raw = localStorage.getItem(SAVE_BOOK_KEY)
  if (!raw) return { version: 1, slots: [null, null, null], departure: null }
  const value = JSON.parse(raw)
  if (value?.version !== 1 || !Array.isArray(value.slots) || value.slots.length !== 3) throw new Error('存档目录损坏，请先在冒险手记导出当前档案。')
  const validate = (entry: any): JourneySave | null => {
    if (entry === null) return null
    if (!entry || typeof entry.date !== 'string' || !Number.isFinite(Date.parse(entry.date)) || !JOURNEY_PAGES.includes(entry.page)) throw new Error('旅途存档信息无效。')
    return { date: entry.date, page: entry.page, profile: parseBackup(JSON.stringify(entry.profile)) }
  }
  return { version: 1, slots: value.slots.map(validate), departure: validate(value.departure) }
}
function snapshot(profile: LearningProfile): JourneySave { return { date: new Date().toISOString(), page: journeyPage(), profile: parseBackup(JSON.stringify(profile)) } }
function write(book: SaveBook) { localStorage.setItem(SAVE_BOOK_KEY, JSON.stringify(book)) }
export function saveJourneySlot(index: number, profile: LearningProfile) {
  if (!Number.isInteger(index) || index < 0 || index > 2) throw new Error('请选择一个有效存档位。')
  verifyActiveJourney()
  const book = readSaveBook(); book.slots[index] = snapshot(profile); write(book)
}
function replaceJourney(next: JourneySave, current: LearningProfile) {
  const valid = parseBackup(JSON.stringify(next.profile)), book = readSaveBook()
  // Preserve the departing profile BEFORE the active write. If either write fails,
  // old active progress and the selected manual snapshot remain recoverable.
  if (hasJourney()) { verifyActiveJourney(); book.departure = snapshot(current) }
  write(book)
  restoreLearning(JSON.stringify(valid)); rememberJourneyPage(next.page)
  return next.page
}
export function loadJourneySlot(index: number | 'departure', current: LearningProfile) {
  const book = readSaveBook(), entry = index === 'departure' ? book.departure : Number.isInteger(index) && index >= 0 && index < 3 ? book.slots[index] : null
  if (!entry) throw new Error('这个存档位还没有旅途。')
  return replaceJourney(entry, current)
}
export function beginJourney(current: LearningProfile, skipOpening = false) {
  const profile: LearningProfile = { ...emptyProfile(), goal: current.goal, ...(current.learningGoals ? { learningGoals: { ...current.learningGoals } } : {}) }
  if (skipOpening) profile.story = { completed: [], positions: { arrival: STORY_ENCOUNTERS.arrival.at }, choices: { arrival: 'memory' } }
  return replaceJourney({ date: new Date().toISOString(), page: 'story', profile }, current)
}
