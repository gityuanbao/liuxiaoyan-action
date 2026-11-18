import { expect, it } from 'vitest'
import { battleDebrief, journeyObjective } from './adventure-guidance'
import { emptyProfile } from './learning-core'
import { STORY_CHAPTERS } from './story-data'
it('points a new traveller to the opening chapter without mutating progress', () => {
  const profile = emptyProfile(), before = JSON.stringify(profile)
  expect(journeyObjective(profile)).toMatchObject({ chapter: 'arrival', screen: 'story', action: '继续故事' })
  expect(JSON.stringify(profile)).toBe(before)
})
it('directs a blocked old save to the missing activity instead of pretending the next chapter is open', () => {
  const profile = { ...emptyProfile(), story: { completed: ['arrival'], positions: { arrival: 5 }, choices: { arrival: 'memory' } } }
  expect(journeyObjective(profile)).toMatchObject({ chapter: 'forest', screen: 'vocabulary', phase: '下章的线索' })
})
it('distinguishes an unresolved encounter from saved post-battle dialogue', () => {
  const profile = { ...emptyProfile(), story: { completed: [], positions: { arrival: 4 }, choices: { arrival: 'courage' } } }
  expect(journeyObjective(profile)).toMatchObject({ phase: '主线任务待完成', action: '前往剧情遭遇' })
  profile.records.push({ id: 'story:arrival:abc', kind: 'vocabulary', outcome: 'victory', title: '遭遇', correct: 9, total: 9, duration: 15, xp: 65, date: '2026-10-15T01:00:00Z' })
  profile.story.positions.arrival = 5
  expect(journeyObjective(profile)).toMatchObject({ screen: 'story', action: '继续战后对白' })
})
it('gives a return route after both volumes have been completed', () => {
  expect(journeyObjective({ ...emptyProfile(), story: { completed: STORY_CHAPTERS.map(c => c.id), positions: {}, choices: {} } })).toMatchObject({ screen: 'exam', action: '重访四域' })
})
it('deduplicates real word attempts and keeps mistakes ahead of assisted and independent hits', () => {
  expect(battleDebrief([{ id: 'a', correct: true, hinted: false }, { id: 'a', correct: false, hinted: false }, { id: 'a', correct: true, hinted: true }, { id: 'b', correct: true, hinted: true }, { id: 'c', correct: true, hinted: false }])).toEqual([{ id: 'a', reason: 'missed' }, { id: 'b', reason: 'assisted' }, { id: 'c', reason: 'recalled' }])
  expect(battleDebrief([])).toEqual([])
})
