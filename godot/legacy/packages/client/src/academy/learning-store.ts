import { improveRune, equipRune, claimCommission, expeditionReward } from './expedition-core'
import type { RuneId } from './expedition-data'
import { upgradeBond } from './growth-core'
import { STORY_ENCOUNTERS, storyEncounterCleared } from './story-encounters'
import { useSyncExternalStore } from 'react'
import { emptyProfile, parseBackup, profileStats, recordResult, type LearningProfile, type LearningRecord } from './learning-core'
import { SPIRITS } from './words'
import type { AvatarId } from './character-data'
import { STORY_CHAPTERS, chapterUnlocked, emptyStory } from './story-data'
import { allStudyWords, emptyNotebook, validateNotebook } from './notebook-data'
import { trialEvaluation, validDraft, validateTrials, type TrialAttempt, type TrialDraft } from './trial-core'
import { TRIALS, type TrialId } from './trial-data'
import { validDailyGoal, validLearningGoals } from './learning-goals'
const KEY = 'starlanguage_learning_v1'
let current: LearningProfile | undefined
const listeners = new Set<() => void>()
function getProfile(): LearningProfile {
  if (current) return current
  try { const saved = localStorage.getItem(KEY); current = saved ? parseBackup(saved) : emptyProfile() } catch { current = emptyProfile() }
  return current!
}
function save(value: LearningProfile) {
  // Write before publishing state: a failed disk write must not look like saved progress.
  localStorage.setItem(KEY, JSON.stringify(value)); current = value; listeners.forEach(fn => fn())
}
export function addLearningRecord(record: LearningRecord) { const before = getProfile(); const next = recordResult(before, record); save(next); return { firstClear: next === before ? 0 : expeditionReward(before, record) } }
export function saveTrialDraft(trial: TrialId, draft: TrialDraft) {
  if (!TRIALS.some(t => t.id === trial) || !validDraft(draft)) throw new Error('练习草稿无效。')
  const profile = getProfile(); save({ ...profile, trialDrafts: { ...profile.trialDrafts, [trial]: draft } })
}
export function addTrialAttempt(attempt: TrialAttempt) {
  if (!validateTrials([attempt])) throw new Error('无法保存这个试炼记录。')
  const profile = getProfile()
  if (profile.trials?.some(a => a.id === attempt.id)) return
  const evaluated = trialEvaluation(attempt.trial, attempt.answers, attempt.checks, attempt.reflection)
  const record: LearningRecord = { id: `trial:${attempt.id}`, kind: attempt.trial === 'writing' ? 'writing' : attempt.trial === 'speaking' ? 'speaking' : 'exam', title: `${TRIALS.find(t => t.id === attempt.trial)!.name} · 雅思${TRIALS.find(t => t.id === attempt.trial)!.subject}${evaluated.completed ? ' · 印记修复' : ' · 复盘记录'}`, date: attempt.date, duration: attempt.duration, correct: evaluated.correct, total: evaluated.total, xp: evaluated.total ? evaluated.correct ? evaluated.correct * 3 + 5 : 0 : evaluated.completed ? 20 : 0 }
  const { [attempt.trial]: _draft, ...remainingDrafts } = profile.trialDrafts ?? {}
  save({ ...recordResult(profile, record), trials: [attempt, ...(profile.trials ?? [])].slice(0, 500), trialDrafts: remainingDrafts })
}
export function toggleNotebookWord(id: string) {
  const profile = getProfile(), book = profile.notebook ?? emptyNotebook()
  if (!allStudyWords(profile).some(w => w.id === id)) throw new Error('无法收藏这个单词。')
  save({ ...profile, notebook: { ...book, saved: book.saved.includes(id) ? book.saved.filter(w => w !== id) : [...book.saved, id] } })
}
export function collectNotebookWords(ids: string[]) {
  const profile = getProfile(), book = profile.notebook ?? emptyNotebook(), known = new Set(allStudyWords(profile).map(w => w.id))
  if (!ids.every(id => known.has(id))) throw new Error('词包中有无法收藏的单词。')
  save({ ...profile, notebook: { ...book, saved: [...new Set([...book.saved, ...ids])] } })
}
export function saveWordNote(id: string, note: string) {
  const profile = getProfile(), book = profile.notebook ?? emptyNotebook()
  if (!allStudyWords(profile).some(w => w.id === id) || note.length > 2000) throw new Error('笔记最多 2000 字。')
  save({ ...profile, notebook: { ...book, notes: { ...book.notes, [id]: note } } })
}
export function addCustomWord(word: string, meaning: string, example: string, translation: string) {
  const profile = getProfile(), book = profile.notebook ?? emptyNotebook()
  const existing = allStudyWords(profile).find(w => w.word.toLowerCase() === word.trim().toLowerCase())
  if (existing) { if (!book.saved.includes(existing.id)) toggleNotebookWord(existing.id); return existing.id }
  const id = `custom:${crypto.randomUUID()}`
  const next = { ...book, saved: [...book.saved, id], custom: [...book.custom, { id, word: word.trim().toLowerCase(), meaning: meaning.trim(), example: example.trim(), translation: translation.trim(), pack: 'custom' }] }
  if (!validateNotebook(next)) throw new Error('请输入有效英文单词和中文释义；例句可选，最多添加 300 个词。')
  save({ ...profile, notebook: next }); return id
}
export function setCompanion(companion: string) {
  const profile = getProfile(); const spirit = SPIRITS.find(s => s.id === companion)
  if (!spirit || profileStats(profile).battles < spirit.threshold) throw new Error('请先完成对应战斗，解锁这位星灵。')
  save({ ...profile, companion })
}
export function strengthenCompanion(kind: 'hero' | 'spirit', id: string) { save(upgradeBond(getProfile(), kind, id)) }
export function setDailyGoal(goal: number) { if (!validDailyGoal(goal)) throw new Error('每日词数请输入 1–1000 的整数。'); save({ ...getProfile(), goal }) }
export function setLearningGoals(goal: number, band: number, note: string) {
  if (!validDailyGoal(goal)) throw new Error('每日词数请输入 1–1000 的整数。')
  const learningGoals = { band, note: note.trim() }
  if (!validLearningGoals(learningGoals)) throw new Error('雅思目标请输入 1–9 分，按 0.5 分递增；目标说明最多 160 字。')
  save({ ...getProfile(), goal, learningGoals })
}
export function setAvatar(avatar: AvatarId) { save({ ...getProfile(), avatar }) }
export function moveStory(id: string, position: number, choice?: string) {
  const profile = getProfile(); const index = STORY_CHAPTERS.findIndex(c => c.id === id); const chapter = STORY_CHAPTERS[index]
  if (!chapter || !chapterUnlocked(profile, index) || !Number.isInteger(position) || position < 0 || position >= chapter.lines.length || (choice !== undefined && !chapter.choices.some(c => c.id === choice))) throw new Error('无法保存这段剧情。')
  const encounter = STORY_ENCOUNTERS[id]
  if (encounter && position > encounter.at && !storyEncounterCleared(profile, id)) throw new Error('请先完成本章遭遇。')
  const story = profile.story ?? emptyStory()
  save({ ...profile, story: { ...story, positions: { ...story.positions, [id]: position }, choices: choice ? { ...story.choices, [id]: choice } : story.choices } })
}
export function skipOpeningDialogue() {
  moveStory('arrival', STORY_ENCOUNTERS.arrival.at, getProfile().story?.choices.arrival ?? 'memory')
}
export function completeStory(id: string) {
  const profile = getProfile(); const index = STORY_CHAPTERS.findIndex(c => c.id === id); const chapter = STORY_CHAPTERS[index]; const story = profile.story ?? emptyStory()
  if (!chapter || !chapterUnlocked(profile, index) || story.positions[id] !== chapter.lines.length - 1 || !story.choices[id]) throw new Error('请先读完本章并作出选择。')
  if (story.completed.includes(id)) return
  if (!storyEncounterCleared(profile, id)) throw new Error('请先完成本章遭遇。')
  save({ ...profile, story: { ...story, completed: [...story.completed, id] } })
}
export function restoreLearning(text: string) { save(parseBackup(text)) }
export function useLearning() { return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn) } }, getProfile, getProfile) }
window.addEventListener('storage', e => { if (e.key === KEY) { current = undefined; listeners.forEach(fn => fn()) } })

export function engraveRune(id: RuneId) { save(improveRune(getProfile(), id)) }
export function wearRune(id?: RuneId) { save(equipRune(getProfile(), id)) }
export function receiveCommission(id: string) { save(claimCommission(getProfile(), id)) }
