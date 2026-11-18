export const WORLD_LORE = [
  { title: '星语群岛', tag: '世界 · 漂浮在星海上的记忆', text: '群岛曾由“星灯”连接。每个人把自己的经验说给灯听，灯便将理解化为航路。灯不奖励漂亮的空话：一个被真正听清的细节，一段有证据的推理，一句诚实完整的表达，都能让它发光。' },
  { title: '雾蚀', tag: '冲突 · 被遗忘的意思', text: '雾蚀并不夺走字母，它夺走词与现实之间的联系。人们仍会念出词，却不再知道词指向什么。街道渐渐只剩标签，航海日志失去因果，朋友的声音变成噪音。幻影是这些断裂记忆的形状。' },
  { title: '四种回应', tag: '力量 · 听、读、写、说', text: '回声之印保存听见的信息；洞察之印把主张与证据连接；构筑之印让观点拥有清晰结构；共鸣之印将经验说给另一个人。四域试炼正是旅人学习这四种回应的地方。' },
  { title: '词之书', tag: '道具 · 属于你的词汇记忆', text: '词之书不会自动替你记住。你把遇到的词、一个例子和自己的想法写进去；再在战斗中无提示地说出它。错误会留下复习标记，准确的回忆让同一道咒语逐渐稳定。' },
  { title: '六位守望者', tag: '伙伴 · 不同方式的成长', text: '莉娅相信每次回应都会蓄积星光；凛用承诺护住下一次尝试；艾琳让连贯的行动成为箭；伊诺追问证据与语境；澪用耐心照顾疲惫的声音；赛恩把失败写进新的配方。他们不会替你作答，却各自提供一种战斗支持。' },
  { title: '旅人的约定', tag: '主线 · 完整表达比漂亮数字更重要', text: '第一卷找回记忆、理解、倾听与句子的碎片。第二卷学习在真实任务里使用它们。游戏印记记录练习完成；雅思 7+ 是你向外界表达的目标，需要持续反馈与真实考试检验。星灯只记录你确实走过的那一步。' },
]
export type StorySceneId = 'prologue' | 'archive' | 'harbor' | 'forest' | 'courtyard'
export const STORY_BACKGROUNDS: Record<StorySceneId, string> = { prologue: '/art/story-v2/prologue.webp', archive: '/art/story-v2/archive.webp', harbor: '/art/story-v2/harbor.webp', forest: '/art/optimized-v1/world-map-d18854ad666b.webp', courtyard: '/art/optimized-v1/courtyard-40f41a4a5b06.webp' }
// Populate only after final videos arrive. Scenes retain their image animation fallback.
export const STORY_VIDEOS: Partial<Record<StorySceneId, string>> = {}
