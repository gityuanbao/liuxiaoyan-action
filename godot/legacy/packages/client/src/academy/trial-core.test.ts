import { describe, expect, it } from 'vitest'
import { isTrialCorrect, trialEvaluation, validateDrafts, wordCount } from './trial-core'
import { LISTENING_QUESTIONS, READING_QUESTIONS } from './trial-data'
describe('Academic trial boundaries', () => {
  it('accepts case and surrounding whitespace, but rejects extra words and misspellings', () => {
    expect(isTrialCorrect(' SENSORS ', LISTENING_QUESTIONS[4])).toBe(true)
    expect(isTrialCorrect('temperature sensors', LISTENING_QUESTIONS[4])).toBe(false)
    expect(isTrialCorrect('sensor', LISTENING_QUESTIONS[4])).toBe(false)
    expect(isTrialCorrect('ten thirty', LISTENING_QUESTIONS[2])).toBe(true)
    expect(isTrialCorrect('ten thirty am', LISTENING_QUESTIONS[2])).toBe(false)
    expect(isTrialCorrect('fourteen', LISTENING_QUESTIONS[1])).toBe(false)
  })
  it('keeps unsupported reading claims distinct from contradictory claims', () => {
    expect(isTrialCorrect('NOT GIVEN', READING_QUESTIONS[2])).toBe(true)
    expect(isTrialCorrect('FALSE', READING_QUESTIONS[2])).toBe(false)
    expect(isTrialCorrect('FALSE', READING_QUESTIONS[1])).toBe(true)
  })
  it('requires both writing tasks, all four relevant self-checks and a concrete reflection', () => {
    const drafts = ['word '.repeat(150), 'word '.repeat(250)], checks = ['task', 'cohesion', 'lexis', 'grammar']
    expect(trialEvaluation('writing', drafts, checks, '我要核对搭配并改写论点的支持句。')).toMatchObject({ completed: true, correct: 0, total: 0 })
    expect(trialEvaluation('writing', [drafts[0], 'word '.repeat(249)], checks, '我要核对搭配并改写论点的支持句。').completed).toBe(false)
    expect(trialEvaluation('writing', drafts, ['fluency', 'lexis', 'grammar', 'pronunciation'], '我要核对搭配并改写论点的支持句。').completed).toBe(false)
    expect(trialEvaluation('writing', drafts, checks, '').completed).toBe(false)
  })
  it('requires all seven speaking responses and identifies completion without an objective score', () => {
    const answers = Array(7).fill('I can explain my own reasons clearly.'), checks = ['fluency', 'lexis', 'grammar', 'pronunciation']
    expect(trialEvaluation('speaking', answers, checks, '下一次要真正录音回听并检查停顿。')).toEqual({ correct: 0, total: 0, completed: true })
    expect(trialEvaluation('speaking', answers.slice(0, 6), checks, '下一次要真正录音回听并检查停顿。').completed).toBe(false)
  })
  it('counts contractions as one word and rejects malformed draft data', () => {
    expect(wordCount("We don't need twenty-five examples." )).toBe(5)
    expect(validateDrafts({ writing: { answers: ['a draft'], checks: [], reflection: '' } })).toBe(true)
    expect(validateDrafts({ unknown: { answers: ['a draft'], checks: [], reflection: '' } })).toBe(false)
    expect(validateDrafts({ writing: { answers: [123], checks: [], reflection: '' } })).toBe(false)
  })
})
