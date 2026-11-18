import type { AvatarId } from './character-data'
import type { LearningProfile } from './learning-core'
import type { TrialId } from './trial-data'
import type { StorySceneId } from './world-lore'

export interface StoryEncounter {
  maxWordLength?: number; ultimateSeal?: boolean; at: number; title: string; description: string; scene: StorySceneId;
  lesson?: 'vocabulary' | 'sentence' | 'listening'; pack?: string;
  opponent?: AvatarId; enemy?: string; trial?: TrialId;
}
export const STORY_ENCOUNTERS: Record<string, StoryEncounter> = {
  arrival: { at: 4, title: '月光桥 · 第一道咒语', description: '先从 sun、moon、tree 这样的短词开始。照着英文准确拼写，每次命中都会削弱守桥幻影。', lesson: 'vocabulary', pack: 'beginner', opponent: 'knight', enemy: '雾蚀 · 守桥幻影', scene: 'forest' },
  forest: { maxWordLength: 8, at: 3, title: '森林里的名字', description: '熟悉拼写后，试着记住气候、资源和栖息地的名字。仍然只需输入单词，完整试卷留待第二卷。', lesson: 'vocabulary', pack: 'environment', opponent: 'ranger', enemy: '雾蚀 · 林间幻影', scene: 'forest' },
  archive: { maxWordLength: 9, at: 3, title: '书页间的回声', description: '先听一个真人朗读的单词，再拼写回应。完整听完后才开始计时，可以重复播放。', lesson: 'listening', pack: 'human', opponent: 'bard', enemy: '雾蚀 · 回声幻影', scene: 'harbor' },
  tide: { at: 3, title: '星文之门', description: '把熟悉的短词连起来：I see the moon. 从简单短句开始，逐次命中打开星文之门。', lesson: 'sentence', pack: 'beginner', opponent: 'alchemist', enemy: '雾蚀 · 封印守卫', scene: 'courtyard' },
  constellation: { maxWordLength: 10, at: 3, title: '星灯重燃', description: '用学过的森林词语击退守灯幻影。满能量时可以试试长句大招，也可以继续拼写单词直到胜利。', lesson: 'vocabulary', pack: 'environment', opponent: 'knight', enemy: '雾蚀 · 守灯幻影', scene: 'prologue' },
  'four-seals': { at: 3, title: '海港失约之谜', description: '误听的预约与研究结论阻断了航路。进入听力任务，修复回声印记，再回应澪。', trial: 'listening', scene: 'harbor' },
  'echo-seal': { at: 3, title: '雾中证据', description: '声音已经归来。现在分清文章说了什么、没有说什么，修复洞察印记。', trial: 'reading', scene: 'archive' },
  'evidence-seal': { at: 3, title: '构筑航路', description: '用图表总览与完整论证架起新的航路。完成双任务写作和具体复盘，点亮构筑印记。', trial: 'writing', scene: 'archive' },
  'structure-seal': { at: 3, title: '骑士的问答', description: '凛等待你的回答。完成三部分口语思路与自评；也可以录下真正的声音再回听。', trial: 'speaking', scene: 'prologue' },
  'voice-seal': { ultimateSeal: true, at: 3, title: '黎明前的最后一战', description: '四枚印记汇成新的力量。用完整句子与长句大招击退雾蚀，让外海重新迎来晨光。', lesson: 'sentence', pack: 'education', opponent: 'knight', enemy: '雾蚀 · 黎明守卫', scene: 'harbor' },
}
export function storyEncounterCleared(profile: LearningProfile, chapter: string) {
  const encounter = STORY_ENCOUNTERS[chapter]
  if (!encounter || profile.story?.completed.includes(chapter)) return true
  // Keep credit for the earlier forest reading route when loading an existing journey.
  if (chapter === 'forest' && (profile.trials?.some(a => a.trial === 'reading' && a.total > 0) || profile.records.some(r => r.kind === 'reading' && r.total > 0))) return true
  if (encounter.trial) return !!profile.trials?.some(a => a.trial === encounter.trial && (chapter === 'forest' ? a.total > 0 : a.completed))
  return profile.records.some(r => r.id.startsWith(`story:${chapter}:`) && r.kind === encounter.lesson && r.outcome === 'victory')
}
