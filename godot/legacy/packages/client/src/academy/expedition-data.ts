import type { MonsterId } from './monster-data'
import type { DuelDifficulty } from './duel-engine'
export interface ExpeditionStage {
  id: string; name: string; region: string; monster: MonsterId; pack: string;
  lesson: 'vocabulary' | 'listening' | 'sentence'; difficulty: DuelDifficulty;
  hp: number; reward: number; recall?: boolean; maxLength?: number; boss?: boolean; seal?: boolean;
  before: string; after: string;
}
export const EXPEDITION: ExpeditionStage[] = [
  { id: 'bridge-1', name: '第一束微光', region: '月光桥', monster: 'crystal', pack: 'beginner', lesson: 'vocabulary', difficulty: 'relaxed', hp: 60, reward: 15, before: '莉娅蹲下来，指向桥边颤动的晶团：“别急着念长咒。先试试 sun，让它记起太阳。”', after: '晶团散成细小的光点，桥面浮出一盏灯。原来最短的词，也能照亮一点路。' },
  { id: 'bridge-2', name: '桥下的名字', region: '月光桥', monster: 'crystal', pack: 'beginner', lesson: 'vocabulary', difficulty: 'relaxed', hp: 85, reward: 18, before: '第二盏灯沉在雾里。月芽竖起耳朵。莉娅说：“继续拼，不用抢。连续四次准确命中，星光会自己汇拢。”', after: '四周的灯接连亮起。月芽追着光跑回来，尾巴上的月纹也更清楚了。' },
  { id: 'bridge-3', name: '守桥的晶核', region: '月光桥', monster: 'crystal', pack: 'beginner', lesson: 'vocabulary', difficulty: 'relaxed', hp: 130, reward: 30, boss: true, before: '桥中央的晶核慢慢转向你。“它每第三次会重击。”莉娅翻开书，“看清蓄势，再决定什么时候用战技。”', after: '晶核终于安静。雾后传来树叶的声响。莉娅把第一枚路标交给你：“接下来，你来带路。”' },
  { id: 'forest-1', name: '树根拦路', region: '风之森林', monster: 'thorn', pack: 'environment', lesson: 'vocabulary', difficulty: 'relaxed', hp: 110, reward: 18, maxLength: 8, before: '森林的路被枯根缠住。凛握住剑柄：“先认出它们的名字。resource，climate……每一个词，都能斩开一点荆棘。”', after: '枯根裂开，露出湿润的新芽。凛收剑时笑了：“你已经不需要一直看着我的手了。”' },
  { id: 'forest-2', name: '不看书的一步', region: '风之森林', monster: 'thorn', pack: 'environment', lesson: 'vocabulary', difficulty: 'relaxed', hp: 130, reward: 22, maxLength: 8, recall: true, before: '风吹合了书页。凛没有替你翻开：“试着从中文记起它。想不起来就看提示，没有人要求你第一次就全会。”', after: '你叫出了树与气候的名字。林间的声音回来了，远处却有更沉的脚步。' },
  { id: 'forest-3', name: '古根的心跳', region: '风之森林', monster: 'thorn', pack: 'environment', lesson: 'vocabulary', difficulty: 'normal', hp: 180, reward: 40, maxLength: 8, boss: true, before: '古根每三次蓄势都会砸下重击。凛站在你左侧：“护盾能挡，战技能拖。别把所有力量都留到最后。”', after: '最后一根黑刺化为叶片。林鹿从树影中走出，港口的钟声沿着风传来。' },
  { id: 'harbor-1', name: '听见海风', region: '回声海港', monster: 'tide', pack: 'human', lesson: 'listening', difficulty: 'relaxed', hp: 100, reward: 22, before: '海面没有字，只有一个人的声音。澪示意你停下：“先完整听完。它说出的那个词，就是我们要找的航标。”', after: '你把声音写成了光，第一座浮标重新亮起。澪轻轻应了一声，像终于等到回信。' },
  { id: 'harbor-2', name: '被偷走的回声', region: '回声海港', monster: 'tide', pack: 'human', lesson: 'listening', difficulty: 'normal', hp: 140, reward: 25, before: '潮汐灵卷走了积蓄的魔力。“它每第二次攻击会抽走能量。”澪说，“听的时候不用急，真正的较量在你写完之后。”', after: '浪花退下去，藏在水里的音节一个个浮上来。你发现，自己已经能先于字幕认出几个词。' },
  { id: 'harbor-3', name: '潮声的守望者', region: '回声海港', monster: 'tide', pack: 'human', lesson: 'listening', difficulty: 'normal', hp: 195, reward: 45, boss: true, before: '最远的浮标仍在黑暗里。澪举起琴：“重听也没关系。等你确认那个声音，再把它送回来。”', after: '潮声重新有了方向。一艘旧渡船靠岸，船头指着云上的高塔。澪将旋律留在你的书页里。' },
  { id: 'tower-1', name: '一句话的重量', region: '星文高塔', monster: 'gargoyle', pack: 'beginner', lesson: 'sentence', difficulty: 'relaxed', hp: 140, reward: 25, before: '凛推开塔门，石翼兽醒来了。伊诺指着它的护甲：“试着把词连成一句话。连击能穿过石甲，错了就重新接上。”', after: '第一道石门松开。你写下的句子停在空中，成为向上的台阶。' },
  { id: 'tower-2', name: '星文的回廊', region: '星文高塔', monster: 'gargoyle', pack: 'environment', lesson: 'sentence', difficulty: 'normal', hp: 190, reward: 30, maxLength: 8, before: '塔里的句子开始谈论森林与世界。伊诺合上笔记：“这次不只是在点灯。你已经在用英文说出一件事。”', after: '回廊尽头的星盘开始旋转。所有航路在这里交汇，而最中央还有一个空白的名字。' },
  { id: 'tower-3', name: '把名字还给黎明', region: '星文高塔', monster: 'gargoyle', pack: 'beginner', lesson: 'sentence', difficulty: 'normal', hp: 260, reward: 65, boss: true, seal: true, before: '石翼兽守着最后一盏星灯。莉娅、凛和澪退到你身后：“先削弱它，积攒能量。最后的封印，要用你的完整长句打开。”', after: '你念完最后一个词，星灯照亮了整片群岛。旅伴们没有说再见——书里还有未读的世界，但这条航路，已经由你亲手走完。' },
]
export const RUNES = {
  dawn: { name: '破晓星纹', glyph: '✧', color: '#efba8b', description: '每级：普通拼写命中伤害 +2。适合快速突破。' },
  ward: { name: '守望星纹', glyph: '◇', color: '#9fd8ee', description: '每级：开场护盾 +8，每次普通命中护盾 +1。适合稳住阵线。' },
  insight: { name: '灵感星纹', glyph: '✦', color: '#c6b2ee', description: '每级：普通拼写命中能量 +3。适合长句大招。' },
} as const
export type RuneId = keyof typeof RUNES
export const RUNE_IDS = Object.keys(RUNES) as RuneId[]
export const RUNE_COSTS = [20, 45, 80]
