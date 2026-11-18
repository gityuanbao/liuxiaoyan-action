import { LISTENING_QUESTIONS, READING_QUESTIONS, type TrialId, type TrialQuestion } from './trial-data'
export interface TrialDraft { answers: string[]; checks: string[]; reflection: string }
export interface TrialAttempt extends TrialDraft { id: string; trial: TrialId; mode: 'learn' | 'challenge'; date: string; duration: number; replays: number; correct: number; total: number; completed: boolean; audioSeconds?: number }
export function wordCount(text: string) { return (text.match(/[a-zA-Z0-9]+(?:['’-][a-zA-Z0-9]+)*/g) ?? []).length }
const normal = (text: string) => text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
export function isTrialCorrect(answer: string, question: TrialQuestion) { return (!question.limit || normal(answer).split(' ').length <= question.limit) && question.answers.some(expected => normal(answer) === normal(expected)) }
export function objectiveQuestions(trial: TrialId) { return trial === 'listening' ? LISTENING_QUESTIONS : trial === 'reading' ? READING_QUESTIONS : [] }
export function trialEvaluation(trial: TrialId, answers: string[], checks: string[], reflection: string) {
  const questions = objectiveQuestions(trial), correct = questions.filter((q, i) => isTrialCorrect(answers[i] ?? '', q)).length
  const checked = (trial === 'writing' ? ['task', 'cohesion', 'lexis', 'grammar'] : ['fluency', 'lexis', 'grammar', 'pronunciation']).every(id => checks.includes(id))
  const completed = questions.length ? correct >= 6 : trial === 'writing' ? wordCount(answers[0] ?? '') >= 150 && wordCount(answers[1] ?? '') >= 250 && checked && reflection.trim().length >= 10 : answers.length === 7 && answers.every(a => wordCount(a) >= 5) && checked && reflection.trim().length >= 10
  return { correct, total: questions.length, completed }
}
export function validateTrials(value: unknown): value is TrialAttempt[] {
  if (!Array.isArray(value) || value.length > 500) return false
  const ids = new Set<string>()
  return value.every(a => {
    if (!a || typeof a.id !== 'string' || !a.id || a.id.length > 100 || ids.has(a.id) || !['listening', 'reading', 'writing', 'speaking'].includes(a.trial) || !['learn', 'challenge'].includes(a.mode) || typeof a.date !== 'string' || !Number.isFinite(Date.parse(a.date)) || !Number.isFinite(a.duration) || a.duration < 0 || a.duration > 86400 || !Number.isInteger(a.replays) || a.replays < 0 || a.replays > 100 || !validDraft(a) || a.answers.length !== (objectiveQuestions(a.trial).length || (a.trial === 'writing' ? 2 : 7)) || (a.audioSeconds !== undefined && (!Number.isFinite(a.audioSeconds) || a.audioSeconds < 0 || a.audioSeconds > 1800))) return false
    ids.add(a.id)
    const result = trialEvaluation(a.trial, a.answers, a.checks, a.reflection)
    return a.correct === result.correct && a.total === result.total && a.completed === result.completed
  })
}
export function validDraft(a: unknown): boolean {
  const draft = a as TrialDraft
  return !!draft && Array.isArray(draft.answers) && draft.answers.length <= 8 && draft.answers.every(s => typeof s === 'string' && s.length <= 20000) && Array.isArray(draft.checks) && new Set(draft.checks).size === draft.checks.length && draft.checks.every(s => ['task', 'cohesion', 'lexis', 'grammar', 'fluency', 'pronunciation'].includes(s)) && typeof draft.reflection === 'string' && draft.reflection.length <= 4000
}
export function validateDrafts(value: unknown): value is Partial<Record<TrialId, TrialDraft>> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([id, draft]) => ['listening', 'reading', 'writing', 'speaking'].includes(id) && validDraft(draft))
}
export function earnedSeals(attempts: TrialAttempt[] = []) { return new Set(attempts.filter(a => a.completed).map(a => a.trial)) }
