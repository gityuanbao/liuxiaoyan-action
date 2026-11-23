export const CHARACTERS = {
  mage: { name: '星咏 · 莉娅', title: '星语法师', description: '以单词编织星光，以记忆唤醒魔法。', image: '/art/optimized-v1/mage-897b04833d5b.webp', element: '星光 / 法书', color: '#c7b0ff', facing: 'right', greeting: '星灯失去的声音，藏在群岛的每一段记忆里。我们一起去找回来吧。' },
  knight: { name: '夜巡 · 凛', title: '幻影骑士', description: '将每一次准确拼写，化作划破迷雾的剑芒。', image: '/art/optimized-v1/knight-a619c7335f03.webp', element: '月影 / 长剑', color: '#a2d8ff', facing: 'left', greeting: '我来守住你的左侧。你只需要相信自己，拼出下一道咒语。' },
  ranger: { name: '森语 · 艾琳', title: '森林游侠', description: '记住一片叶子的名字，也就记住了森林的一种声音。', image: '/art/optimized-v1/ranger-e8a71df0954c.webp', element: '森林 / 弓箭', color: '#a4dcc0', facing: 'right', greeting: '森林里的路不会催你。今天想认识多少个新单词？我们慢慢走。' },
  scholar: { name: '书灯 · 伊诺', title: '星塔学者', description: '将散落的单词连成句子，让知识在星塔中点亮。', image: '/art/optimized-v1/scholar-5c1e6fd7c33e.webp', element: '知识 / 星灯', color: '#f0d99f', facing: 'right', greeting: '单词是一颗星，句子是星座。去高塔试试把它们连接起来吧。' },
  bard: { name: '潮音 · 澪', title: '海港吟游者', description: '倾听海风里的韵律，把听见的英文化为回应。', image: '/art/optimized-v1/bard-4d5581eacd6d.webp', element: '潮汐 / 竖琴', color: '#a4d9ff', facing: 'right', greeting: '先听清，再回应。就算第一次没听懂，潮汐也会再唱一遍。' },
  alchemist: { name: '炎星 · 赛恩', title: '星火炼金师', description: '让错误成为下一次成功的配方，炼出属于你的星火。', image: '/art/optimized-v1/alchemist-9e7477f83833.webp', element: '星火 / 炼金', color: '#f6b99e', facing: 'right', greeting: '失败的配方也值得收藏。今天的错词，明天可能就是你的必杀技。' },
  wildfire: { name: '野火', title: '突击干员', description: '每三次普通命中取得护盾，用烟幕延缓敌方行动。', image: 'res://assets/official/operator-07.jpg', element: '突击 / 屏障', color: '#ed985e', facing: 'right', greeting: '烟幕就绪，准备行动。' },
} as const
export type AvatarId = keyof typeof CHARACTERS
export const ALL_OPERATOR_IDS = Object.keys(CHARACTERS) as AvatarId[]
// The classic roster stays available to existing clients with six sets of art.
export const AVATAR_IDS = ALL_OPERATOR_IDS.filter(id => id !== 'wildfire') as AvatarId[]
