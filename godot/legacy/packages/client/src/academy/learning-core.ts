import { settleExpedition, validExpedition, type ExpeditionProgress } from './expedition-core'
import { EXPEDITION } from './expedition-data'
import { awardPractice, validGrowth, type Growth, SPIRIT_IDS } from './growth-core'
import type { SpiritId } from './combat-skills'
import { ARCHIVED_WORD_IDS, WORDS } from './words'
import { ALL_OPERATOR_IDS, type AvatarId } from './character-data'
import { validateStory, type StoryProgress } from './story-data'
import { allStudyWords, validateNotebook, type Notebook } from './notebook-data'
import { validateTrials, validateDrafts, type TrialAttempt, type TrialDraft } from './trial-core'
import type { TrialId } from './trial-data'
import { validDailyGoal, validLearningGoals, type LearningGoals } from './learning-goals'
export interface WordProgress { attempts: number; correct: number; streak: number; lastSeen: string; due: number }
export interface LearningRecord { expedition?: { stage: string; hp: number }; avatar?: AvatarId; companion?: SpiritId; id: string; kind: 'vocabulary' | 'reading' | 'typing' | 'sentence' | 'listening' | 'exam' | 'writing' | 'speaking'; title: string; date: string; correct: number; total: number; duration: number; xp: number; outcome?: 'victory' | 'defeat'; ultimates?: number; words?: { id: string; correct: boolean; hinted: boolean }[] }
export interface LearningProfile { expedition?: ExpeditionProgress; learningGoals?: LearningGoals; growth?: Growth; version: 1; xp: number; records: LearningRecord[]; words: Record<string, WordProgress>; companion: string; goal: number; avatar?: AvatarId; story?: StoryProgress; notebook?: Notebook; trials?: TrialAttempt[]; trialDrafts?: Partial<Record<TrialId, TrialDraft>> }
export const emptyProfile = (): LearningProfile => ({ version: 1, xp: 0, records: [], words: {}, companion: 'moon', goal: 15 })
export function recordResult(profile: LearningProfile, record: LearningRecord): LearningProfile {
  if (profile.records.some(item => item.id === record.id) || profile.growth?.settled.includes(record.id)) return profile
  const words = { ...profile.words }
  for (const answer of record.words ?? []) {
    if (!allStudyWords(profile).some(word => word.id === answer.id)) continue
    const previous = words[answer.id] ?? { attempts: 0, correct: 0, streak: 0, lastSeen: '', due: 0 }
    const remembered = answer.correct && !answer.hinted
    const streak = remembered ? previous.streak + 1 : 0
    words[answer.id] = { attempts: previous.attempts + 1, correct: previous.correct + Number(remembered), streak, lastSeen: record.date, due: Date.parse(record.date) + (remembered ? [1, 3, 7, 14][Math.min(streak - 1, 3)] * 86400000 : 300000) }
  }
  return settleExpedition({ ...profile, growth: awardPractice(profile, record), xp: profile.xp + record.xp, words, records: [record, ...profile.records].slice(0, 1000) }, record)
}
export function selectWords(profile: LearningProfile, pack: string, count = 8) {
  const pool = allStudyWords(profile).filter(word => pack === 'review' ? profile.words[word.id] && profile.words[word.id].streak < 3 : pack === 'notebook' ? profile.notebook?.saved.includes(word.id) : word.pack === pack)
  return [...pool].sort((a, b) => (profile.words[a.id]?.due ?? 0) - (profile.words[b.id]?.due ?? 0)).slice(0, count)
}
export function profileStats(profile: LearningProfile) {
  const today = new Date().toLocaleDateString('en-CA')
  const recordsToday = profile.records.filter(r => new Date(r.date).toLocaleDateString('en-CA') === today)
  const total = profile.records.reduce((sum, r) => sum + r.total, 0)
  const correct = profile.records.reduce((sum, r) => sum + r.correct, 0)
  return { level: Math.floor(profile.xp / 100) + 1, levelProgress: profile.xp % 100, seen: Object.keys(profile.words).length, mastered: Object.values(profile.words).filter(w => w.streak >= 3).length, review: Object.values(profile.words).filter(w => w.streak < 3).length, battles: profile.records.filter(r => ['vocabulary', 'sentence', 'listening'].includes(r.kind)).length, readings: profile.records.filter(r => r.kind === 'reading').length, todayWords: new Set(recordsToday.flatMap(r => r.words?.map(w => w.id) ?? [])).size, minutes: Math.round(profile.records.reduce((sum, r) => sum + r.duration, 0) / 60), accuracy: total ? Math.round(correct / total * 100) : 0 }
}
export function parseBackup(text: string): LearningProfile {
  const value = JSON.parse(text)
  const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0
  if (value?.version !== 1 || !finite(value.xp) || !Array.isArray(value.records) || value.records.length > 1000 || !value.words || typeof value.words !== 'object' || Array.isArray(value.words) || typeof value.companion !== 'string' || !validDailyGoal(value.goal)) throw new Error('文件不是有效的星语学院学习备份。')
  if (value.learningGoals !== undefined && !validLearningGoals(value.learningGoals)) throw new Error('备份中的学习目标无效。')
  if (!['moon', 'leaf', 'spark', 'sun'].includes(value.companion)) throw new Error('备份中的精灵信息无效。')
  if (value.notebook !== undefined && !validateNotebook(value.notebook)) throw new Error('备份中的单词本无效。')
  const knownWords = new Set([...ARCHIVED_WORD_IDS, ...allStudyWords(value).map(w => w.id)])
  const seen = new Set<string>()
  for (const r of value.records) {
    if (!r || typeof r.id !== 'string' || !r.id || seen.has(r.id) || !['vocabulary', 'reading', 'typing', 'sentence', 'listening', 'exam', 'writing', 'speaking'].includes(r.kind) || typeof r.title !== 'string' || typeof r.date !== 'string' || !Number.isFinite(Date.parse(r.date)) || ![r.correct, r.total, r.duration, r.xp].every(finite) || r.correct > r.total || (r.outcome !== undefined && !['victory', 'defeat'].includes(r.outcome))) throw new Error('备份中的练习记录无效。')
    if (r.ultimates !== undefined && (!Number.isInteger(r.ultimates) || r.ultimates < 0 || r.ultimates > r.correct)) throw new Error('备份中的大招记录无效。')
    if ((r.avatar !== undefined && !ALL_OPERATOR_IDS.includes(r.avatar)) || (r.companion !== undefined && !SPIRIT_IDS.includes(r.companion))) throw new Error('备份中的出战搭配无效。')
    if (r.expedition !== undefined && (!r.expedition || !EXPEDITION.some(s => s.id === r.expedition.stage && s.lesson === r.kind) || !Number.isInteger(r.expedition.hp) || r.expedition.hp < 0 || r.expedition.hp > 140)) throw new Error('备份中的远征成绩无效。')
    seen.add(r.id)
    if (r.words && (!Array.isArray(r.words) || r.words.some((w: any) => !w || !knownWords.has(w.id) || typeof w.correct !== 'boolean' || typeof w.hinted !== 'boolean'))) throw new Error('备份中的单词记录无效。')
  }
  for (const [id, w] of Object.entries(value.words) as [string, WordProgress][]) {
    if (!knownWords.has(id) || !w || ![w.attempts, w.correct, w.streak, w.due].every(finite) || w.correct > w.attempts || w.streak > w.correct || !Number.isFinite(Date.parse(w.lastSeen))) throw new Error('备份中的单词进度无效。')
  }
  if (value.avatar !== undefined && !ALL_OPERATOR_IDS.includes(value.avatar)) throw new Error('备份中的角色形象无效。')
  if (value.story !== undefined && !validateStory(value.story)) throw new Error('备份中的剧情进度无效。')
  if (value.trials !== undefined && !validateTrials(value.trials)) throw new Error('备份中的雅思试炼记录无效。')
  if (value.trialDrafts !== undefined && !validateDrafts(value.trialDrafts)) throw new Error('备份中的练习草稿无效。')
  if (value.growth !== undefined && !validGrowth(value.growth)) throw new Error('备份中的星砂或养成进度无效。')
  if (value.expedition !== undefined && !validExpedition(value.expedition)) throw new Error('备份中的航路或星纹无效。')
  return { ...(value.expedition ? { expedition: value.expedition } : {}), ...(value.learningGoals ? { learningGoals: value.learningGoals } : {}), ...(value.growth ? { growth: value.growth } : {}), version: 1, xp: value.xp, records: value.records, words: value.words, companion: value.companion, goal: value.goal, ...(value.avatar ? { avatar: value.avatar } : {}), ...(value.story ? { story: value.story } : {}), ...(value.notebook ? { notebook: value.notebook } : {}), ...(value.trials ? { trials: value.trials } : {}), ...(value.trialDrafts ? { trialDrafts: value.trialDrafts } : {}) }
}
