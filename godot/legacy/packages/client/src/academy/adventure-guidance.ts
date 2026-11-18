import { EXPEDITION } from './expedition-data'
import type { Screen } from '../store'
import type { LearningProfile, LearningRecord } from './learning-core'
import { STORY_CHAPTERS, chapterUnlocked } from './story-data'
import { STORY_ENCOUNTERS, storyEncounterCleared } from './story-encounters'

export interface JourneyObjective { title: string; phase: string; detail: string; action: string; screen: Screen; chapter?: string }
export function journeyObjective(profile: LearningProfile): JourneyObjective {
  if (profile.expedition) {
    const next = EXPEDITION.find(s => !profile.expedition?.clears[s.id])
    return next ? { title: next.name, phase: `星灯远征 · ${next.region}`, detail: '看清下一次遭遇，选择搭配，用准确拼写点亮航路。', action: '继续星灯远征', screen: 'expedition' } : { title: '十二道航标已亮起', phase: '远征完结', detail: '重访航路提升星级，或前往学术四域，练习听读写说。', action: '前往四域试炼', screen: 'exam' }
  }
  const index = STORY_CHAPTERS.findIndex(c => !profile.story?.completed.includes(c.id))
  if (index < 0) return { title: '航路已经重新连接', phase: '两卷故事已记录', detail: '重访四域，带着新的词汇与表达，再回应一次星灯。', action: '重访四域', screen: 'exam' }
  const chapter = STORY_CHAPTERS[index], encounter = STORY_ENCOUNTERS[chapter.id]
  if (!chapterUnlocked(profile, index)) {
    const screen: Screen = chapter.seal ? 'exam' : chapter.requires === 'reading' ? 'atlas' : chapter.requires === 'listening' ? 'listening' : chapter.requires === 'sentence' ? 'sentence' : 'vocabulary'
    const actions = { exam: '前往四域试炼', atlas: '前往阅读秘境', listening: '前往回声海港', sentence: '前往星文高塔', vocabulary: '前往风之森林' }
    return { title: chapter.title, phase: '下章的线索', detail: chapter.requirement, action: actions[screen as keyof typeof actions], screen, chapter: chapter.id }
  }
  const at = profile.story?.positions[chapter.id] ?? 0
  const cleared = storyEncounterCleared(profile, chapter.id)
  if (encounter && at >= encounter.at && !cleared) return { title: encounter.title, phase: '主线任务待完成', detail: encounter.trial ? '进入本章雅思任务，保存练习后回到对白，继续追踪线索。' : '回到本章遭遇，以准确拼写逐次削弱幻影。胜利后继续战后对白。', action: encounter.trial ? '继续剧情任务' : '前往剧情遭遇', screen: 'story', chapter: chapter.id }
  return { title: chapter.title, phase: cleared && at > 0 ? '主线任务已完成' : '当前主线', detail: cleared && at > 0 ? '带着找回的线索读完本章，记录这段旅途，开启下一章。' : '听听旅伴的线索，作出你的回应。故事会引你走向下一次遭遇。', action: cleared && at > 0 ? '继续战后对白' : '继续故事', screen: 'story', chapter: chapter.id }
}

export type DebriefReason = 'missed' | 'assisted' | 'recalled'
export function battleDebrief(attempts: NonNullable<LearningRecord['words']>) {
  const result = new Map<string, { id: string; reason: DebriefReason }>()
  const rank = { recalled: 0, assisted: 1, missed: 2 }
  for (const attempt of attempts) {
    const reason: DebriefReason = !attempt.correct ? 'missed' : attempt.hinted ? 'assisted' : 'recalled'
    const previous = result.get(attempt.id)
    if (!previous || rank[reason] > rank[previous.reason]) result.set(attempt.id, { id: attempt.id, reason })
  }
  return [...result.values()]
}
