export const SPELL_CARDS = {
  surge: { name: '破雾追击', type: '追击', cost: 30, damage: 12, shield: 0, icon: '✦', art: '/art/monster-cards-v1/card-ranger.webp', rule: '下次拼写命中，额外造成 12 伤害。' },
  ward: { name: '星纹守护', type: '守护', cost: 20, damage: 0, shield: 14, icon: '◇', art: '/art/monster-cards-v1/card-knight.webp', rule: '下次拼写命中，同时获得 14 护盾。' },
} as const
export type PreparedSpell = keyof typeof SPELL_CARDS
