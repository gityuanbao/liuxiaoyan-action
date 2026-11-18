import type { AvatarId } from './character-data'
import { SPIRIT_SKILLS, type SpiritId } from './combat-skills'
export const TACTICS = {
  mage: { name: '星辉引燃', role: '快速蓄能', effect: '补充40能量，提前进入长句咏唱。' },
  knight: { name: '坚壁誓约', role: '防守反击', effect: '获得22护盾，并将下一次反击延后1.2秒。' },
  ranger: { name: '缚风之箭', role: '连击与打断', effect: '下一次反击延后4秒；下一次命中额外造成6伤害。' },
  scholar: { name: '语境透镜', role: '完整句子', effect: '下一次句子命中额外造成16伤害；单词命中消耗此效果并额外造成4伤害。' },
  bard: { name: '回潮短歌', role: '持续治疗', effect: '恢复26生命，在长句与听写之间稳住节奏。' },
  alchemist: { name: '余烬配方', role: '纠错与灼烧', effect: '施加两次灼烧，每次在敌人行动前造成10伤害；下一次纠错攻击获得额外伤害。' },
} satisfies Record<AvatarId, { name: string; role: string; effect: string }>
export const HERO_GROWTH: Record<AvatarId, string[]> = {
  mage: ['每次普通命中额外4能量', '每次普通命中额外8能量', '每次普通命中额外12能量'],
  knight: ['每次普通命中获得3护盾', '每次普通命中获得5护盾', '每次普通命中获得7护盾'],
  ranger: ['三连击起额外3伤害', '三连击起额外5伤害', '三连击起额外7伤害'],
  scholar: ['句子命中额外4伤害', '句子命中额外8伤害', '句子命中额外12伤害'],
  bard: ['每三次命中恢复6生命', '每三次命中恢复10生命', '每三次命中恢复14生命'],
  alchemist: ['纠错后命中额外6伤害；灼烧10', '纠错后命中额外10伤害；灼烧13', '纠错后命中额外14伤害；灼烧16'],
}
export const SPIRIT_FORMS: Record<SpiritId, { shape: string; awakened: string }> = { moon: { shape: '月狐', awakened: '三尾月辉狐' }, leaf: { shape: '林鹿', awakened: '铃花灵鹿' }, spark: { shape: '雷龙', awakened: '晶翼雷龙' }, sun: { shape: '曦鸟', awakened: '流金曦凤' } }
export const spiritEvery = (id: SpiritId, rank: number) => SPIRIT_SKILLS[id].every - (rank >= 3 && id !== 'moon' ? 1 : 0)
export function spiritEffect(id: SpiritId, rank: number) {
  const every = spiritEvery(id, rank), extra = Math.max(0, rank - 1)
  return id === 'moon' ? `每${every}次普通命中补充${8 + extra * 4}能量${rank >= 3 ? '，并延缓反击0.8秒' : ''}` : id === 'leaf' ? `每${every}次普通命中恢复${8 + extra * 4}生命` : id === 'spark' ? `每${every}次普通命中追加${6 + extra * 4}伤害` : `每${every}次普通命中获得${10 + extra * 5}护盾`
}
