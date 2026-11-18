export const MONSTERS = {
  crystal: { name: '雾晶团', habitat: '月光桥', image: '/art/monster-cards-v1/monster-crystal.webp', color: '#c6b2ee' },
  thorn: { name: '棘根妖', habitat: '风之森林', image: '/art/monster-cards-v1/monster-thorn.webp', color: '#abc38c' },
  tide: { name: '潮汐灵', habitat: '回声海港', image: '/art/monster-cards-v1/monster-tide.webp', color: '#9fd8ee' },
  gargoyle: { name: '符石翼兽', habitat: '星文高塔', image: '/art/monster-cards-v1/monster-gargoyle.webp', color: '#c3aecf' },
} as const
export type MonsterId = keyof typeof MONSTERS
export const MONSTER_IDS = Object.keys(MONSTERS) as MonsterId[]
export function monsterForEncounter(pack: string, lesson: string, chapter?: string): MonsterId {
  if (chapter === 'arrival' || pack === 'beginner' && lesson === 'vocabulary') return 'crystal'
  if (chapter === 'forest') return 'thorn'
  if (chapter === 'archive' || lesson === 'listening' || pack === 'travel' || pack === 'human') return 'tide'
  if (chapter === 'tide' || chapter === 'constellation' || chapter === 'voice-seal' || lesson === 'sentence' || ['academic', 'education', 'technology'].includes(pack)) return 'gargoyle'
  return 'thorn'
}
