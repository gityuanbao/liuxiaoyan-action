import { expect, it } from 'vitest'
import { battleStoryLine } from './story-battle'
import { STORY_ENCOUNTERS } from './story-encounters'
import { castTactic, createDuel, castWord } from './duel-engine'
it('ties voices and recovered objects to the encounter and real battle state', () => {
  const story = { ...STORY_ENCOUNTERS.arrival, chapter: 'arrival' }, s = createDuel('normal', 'knight')
  expect(battleStoryLine(story,s).text).toContain('桥')
  expect(battleStoryLine(story,{ ...s, botHp: 60 }).text).toContain('森林')
  let ready = s; for (let i=0;i<3;i++) ready=castWord(ready,'cat','cat')
  expect(battleStoryLine(story,castTactic(ready))).toMatchObject({ side: 'left' })
  expect(battleStoryLine(story,{ ...s, outcome: 'victory', botHp: 0 }).progress).toBe('记忆已找回')
  expect(battleStoryLine({ ...STORY_ENCOUNTERS.tide, chapter: 'tide' },s).memory).toContain('高塔')
})
