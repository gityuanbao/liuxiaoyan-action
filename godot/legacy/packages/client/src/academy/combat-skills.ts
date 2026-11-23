import type { AvatarId } from './character-data'
export type SpiritId = 'moon' | 'leaf' | 'spark' | 'sun'
export const CHARACTER_SKILLS = {
  mage: { passive: '星光蓄能', description: '每次普通命中多获得 4 能量。', ultimate: '星河终章', effect: '造成 60 伤害。', damage: 60, chant: 'break through', translation: '突破；突围' },
  knight: { passive: '守夜剑誓', description: '每次普通命中获得 3 护盾，护盾最多 40。', ultimate: '夜幕誓盾', effect: '造成 42 伤害，获得 24 护盾。', damage: 42, chant: 'hold the line', translation: '坚守防线' },
  ranger: { passive: '追风箭', description: '普通攻击达到 3 连击后，每次多造成 3 伤害。', ultimate: '千叶箭雨', effect: '造成 48 伤害，对手下次攻击延后 5 秒。', damage: 48, chant: 'take aim', translation: '瞄准' },
  scholar: { passive: '语境洞察', description: '普通句子攻击额外造成 4 伤害。', ultimate: '星文解构', effect: '造成 46 伤害，返还 20 能量。', damage: 46, chant: 'in sight', translation: '在视野之内' },
  bard: { passive: '潮声和弦', description: '每 3 次普通命中恢复 6 生命，最多恢复至 140。', ultimate: '潮汐回响', effect: '造成 40 伤害，恢复 24 生命。', damage: 40, chant: 'safe and sound', translation: '安然无恙' },
  alchemist: { passive: '纠错炼成', description: '错拼后下一次普通命中额外造成 6 伤害，不叠加。', ultimate: '炎星炼成', effect: '造成 52 伤害；接下来两次对手行动前，各灼烧 10 生命。', damage: 52, chant: 'set off', translation: '引爆；触发' },
  wildfire: { passive: '机动防护', description: '每三次普通命中获得 4 护盾，进阶后为 6 或 8。', ultimate: '盾式破障器', effect: '造成 56 伤害。', damage: 56, chant: 'break the shield', translation: '击破护盾' },
} satisfies Record<AvatarId, { passive: string; description: string; ultimate: string; effect: string; damage: number; chant: string; translation: string }>
export const SPIRIT_SKILLS = {
  moon: { name: '月光充盈', description: '每 3 次普通命中补充 8 能量。', every: 3 },
  leaf: { name: '森息治愈', description: '每 4 次普通命中恢复 8 生命。', every: 4 },
  spark: { name: '闪电追击', description: '每 4 次普通命中追加 6 伤害。', every: 4 },
  sun: { name: '晨曦守护', description: '每 5 次普通命中获得 10 护盾。', every: 5 },
} satisfies Record<SpiritId, { name: string; description: string; every: number }>
