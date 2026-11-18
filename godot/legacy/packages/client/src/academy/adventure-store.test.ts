import { beforeEach, describe, expect, it } from 'vitest'
import { emptyProfile, parseBackup, selectWords } from './learning-core'
import { addCustomWord, addLearningRecord, addTrialAttempt, collectNotebookWords, restoreLearning, saveTrialDraft, saveWordNote, toggleNotebookWord } from './learning-store'
import { READING_QUESTIONS } from './trial-data'
import { earnedSeals, trialEvaluation, type TrialAttempt } from './trial-core'
import { chapterUnlocked, STORY_CHAPTERS } from './story-data'
const read = () => JSON.parse(localStorage.getItem('starlanguage_learning_v1')!)
beforeEach(() => restoreLearning(JSON.stringify({ ...emptyProfile(), xp: 270 })))
describe('wordbook and exam records', () => {
  it('collects an exam word pack once while preserving existing notes and XP', () => {
    toggleNotebookWord('habitat'); saveWordNote('habitat', '已有笔记')
    collectNotebookWords(['academic-allocate', 'academic-assumption']); collectNotebookWords(['academic-allocate'])
    expect(read()).toMatchObject({ xp: 270, notebook: { saved: ['habitat', 'academic-allocate', 'academic-assumption'], notes: { habitat: '已有笔记' } } })
  })
  it('saves an existing word, personal notes and a custom word without replacing progress', () => {
    toggleNotebookWord('habitat'); saveWordNote('habitat', 'natural habitat 是常见搭配。')
    const id = addCustomWord('feasible', '可行的', 'The solution is feasible.', '这个方案可行。')
    expect(selectWords(read(), 'notebook', 60).map(w => w.id)).toEqual(['habitat', id])
    expect(read()).toMatchObject({ xp: 270, notebook: { notes: { habitat: 'natural habitat 是常见搭配。' } } })
    expect(parseBackup(JSON.stringify(read()))).toEqual(read())
    expect(addCustomWord('FEASIBLE', '可行', '', '')).toBe(id)
    expect(read().notebook.custom).toHaveLength(1)
    toggleNotebookWord('habitat'); expect(read().notebook.notes.habitat).toBeTruthy()
  })
  it('records custom vocabulary in review and only independent recalls build mastery', () => {
    const id = addCustomWord('feasible', '可行的', '', '')
    for (let i = 0; i < 3; i++) addLearningRecord({ id: `word-${i}`, kind: 'vocabulary', title: '单词本战斗', correct: 1, total: 1, duration: 1, xp: 5, date: new Date().toISOString(), words: [{ id, correct: true, hinted: false }] })
    expect(read().words[id].streak).toBe(3)
    expect(selectWords(read(), 'review')).toHaveLength(0)
    addLearningRecord({ id: 'wrong', kind: 'vocabulary', title: '复习', correct: 0, total: 1, duration: 1, xp: 0, date: new Date().toISOString(), words: [{ id, correct: false, hinted: false }] })
    expect(selectWords(read(), 'review')[0].id).toBe(id)
    expect(parseBackup(JSON.stringify(read()))).toEqual(read())
  })
  it('rejects invalid wordbook entries and malformed backups while preserving saved progress', () => {
    for (const word of ['two words', '=IMPORT()', '123', '']) expect(() => addCustomWord(word, '释义', '', '')).toThrow()
    expect(() => toggleNotebookWord('not-found')).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...read(), notebook: { saved: ['unknown'], notes: {}, custom: [] } }))).toThrow()
    expect(read().xp).toBe(270)
  })
  it('saves real answers once, derives the seal, and preserves exact responses in a backup', () => {
    const answers = READING_QUESTIONS.map(q => q.answers[0]); answers[6] = 'wrong'; answers[7] = 'wrong'
    const attempt: TrialAttempt = { id: 'reading-attempt', trial: 'reading', mode: 'challenge', date: new Date().toISOString(), duration: 600, answers, checks: [], reflection: '判断题要注意限制条件与范围。', replays: 0, ...trialEvaluation('reading', answers, [], '') }
    saveTrialDraft('reading', { answers, checks: [], reflection: '' })
    addTrialAttempt(attempt); addTrialAttempt(attempt)
    expect(read().xp).toBe(293); expect(read().records).toHaveLength(1)
    expect(read().trials[0]).toMatchObject({ correct: 6, total: 8, completed: true })
    expect(read().trialDrafts.reading).toBeUndefined()
    expect(earnedSeals(read().trials).has('reading')).toBe(true)
    expect(parseBackup(JSON.stringify(read()))).toEqual(read())
    expect(() => parseBackup(JSON.stringify({ ...read(), trials: [{ ...attempt, correct: 8 }] }))).toThrow()
  })
  it('does not reward an unanswered timed-out attempt or turn it into a repaired seal', () => {
    const answers = Array(8).fill('')
    addTrialAttempt({ id: 'empty', trial: 'listening', mode: 'challenge', date: new Date().toISOString(), duration: 600, answers, checks: [], reflection: '', replays: 0, ...trialEvaluation('listening', answers, [], '') })
    expect(read().xp).toBe(270); expect(earnedSeals(read().trials).size).toBe(0)
  })
  it('requires a previous chapter and a real matching seal for second-volume dialogue', () => {
    const answers = READING_QUESTIONS.map(q => q.answers[0])
    const p = { ...emptyProfile(), story: { completed: STORY_CHAPTERS.slice(0, 7).map(c => c.id), positions: {}, choices: {} }, trials: [{ id: 'reading', trial: 'reading' as const, mode: 'learn' as const, date: new Date().toISOString(), duration: 100, answers, checks: [], reflection: '', replays: 0, ...trialEvaluation('reading', answers, [], '') }] }
    expect(chapterUnlocked(p, 7)).toBe(true)
    expect(chapterUnlocked({ ...p, trials: [] }, 7)).toBe(false)
    expect(chapterUnlocked({ ...p, story: { ...p.story, completed: p.story.completed.slice(0, 6) } }, 7)).toBe(false)
  })
})
