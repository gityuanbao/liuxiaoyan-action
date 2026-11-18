import { describe, expect, it } from 'vitest'
import { emptyProfile, type LearningRecord } from './learning-core'
import { STORY_ENCOUNTERS, storyEncounterCleared } from './story-encounters'
import { WORDS } from './words'
import { humanClip } from './audio-library-data'
const battle = (id: string, outcome: 'victory' | 'defeat', kind: LearningRecord['kind'] = 'vocabulary'): LearningRecord => ({ id, kind, outcome, title:'遭遇', xp:10, duration:5, correct:1, total:1, date:new Date().toISOString() })
describe('story encounter checkpoints', () => {
  it('needs a victory in the matching chapter and lesson, not another victory or a defeat', () => {
    const p=emptyProfile()
    for (const r of [battle('vocabulary:ordinary','victory'),battle('story:arrival:loss','defeat'),battle('story:arrival:wrong-lesson','victory','sentence'),battle('story:voice-seal:other','victory')]) {
      p.records=[r]; expect(storyEncounterCleared(p,'arrival')).toBe(false)
    }
    p.records=[battle('story:arrival:win','victory')]; expect(storyEncounterCleared(p,'arrival')).toBe(true)
  })
  it('keeps completed old chapters playable and covers every chapter with one encounter', () => {
    const p={...emptyProfile(), story:{completed:['arrival'],positions:{arrival:5},choices:{arrival:'memory'}}}
    expect(storyEncounterCleared(p,'arrival')).toBe(true)
    expect(Object.keys(STORY_ENCOUNTERS)).toHaveLength(10)
  })
  it('starts with short words, delays full papers and keeps the first sentence encounter short', () => {
    expect(STORY_ENCOUNTERS.arrival).toMatchObject({ lesson: 'vocabulary', pack: 'beginner' })
    expect(WORDS.filter(w => w.pack === 'beginner').every(w => w.word.length <= 6 && w.example.split(' ').length <= 5)).toBe(true)
    expect(STORY_ENCOUNTERS.forest).toMatchObject({ lesson: 'vocabulary', maxWordLength: 8 })
    expect(STORY_ENCOUNTERS.forest.trial).toBeUndefined()
    expect(STORY_ENCOUNTERS.tide).toMatchObject({ lesson: 'sentence', pack: 'beginner' })
    expect(STORY_ENCOUNTERS.constellation.ultimateSeal).not.toBe(true)
    expect(STORY_ENCOUNTERS['voice-seal'].ultimateSeal).toBe(true)
    expect(WORDS.filter(w => humanClip(w.word) && w.word.length <= STORY_ENCOUNTERS.archive.maxWordLength!).length).toBeGreaterThan(2)
    const old = { ...emptyProfile(), records: [battle('legacy-reading', 'victory', 'reading')] }
    expect(storyEncounterCleared(old, 'forest')).toBe(true)
  })
})
