export interface LearningGoals { band: number; note: string }
export const MAX_DAILY_WORDS = 1000
export const defaultLearningGoals = (): LearningGoals => ({ band: 7, note: '' })
export const validDailyGoal = (goal: number) => Number.isInteger(goal) && goal >= 1 && goal <= MAX_DAILY_WORDS
export function validLearningGoals(value: unknown): value is LearningGoals {
  const goals = value as LearningGoals
  return !!goals && typeof goals === 'object' && !Array.isArray(goals) && typeof goals.band === 'number' && Number.isFinite(goals.band) && goals.band >= 1 && goals.band <= 9 && Number.isInteger(goals.band * 2) && typeof goals.note === 'string' && goals.note.length <= 160
}
