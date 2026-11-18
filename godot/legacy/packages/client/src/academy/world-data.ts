import type { Screen } from '../store'
export const NAV = [
  { screen: 'academy', label: '地图', icon: 'compass' },
  { screen: 'vocabulary', label: '词汇', icon: 'sword' },
  { screen: 'sentence', label: '句子', icon: 'spark' },
  { screen: 'listening', label: '听力', icon: 'sound' },
  { screen: 'atlas', label: '阅读', icon: 'book' },
  { screen: 'exam', label: '四域', icon: 'trophy' },
  { screen: 'notebook', label: '单词本', icon: 'book' },
  { screen: 'appearance', label: '角色', icon: 'people' },
  { screen: 'story', label: '剧情', icon: 'star' },
  { screen: 'world', label: '世界', icon: 'compass' },
  { screen: 'spirits', label: '星灵', icon: 'leaf' },
  { screen: 'study', label: '手记', icon: 'chart' },
] as const
export interface WorldRegion { id: string; name: string; screen: Screen; icon: string; x: number; y: number; description: string; color: string }
export const WORLD_REGIONS: WorldRegion[] = [
  { id: 'forest', name: '风之森林', screen: 'vocabulary', icon: 'sword', x: 24, y: 41, description: '输入英文单词，向雾蚀小怪打出咒卡。', color: '#b2e7c4' },
  { id: 'tower', name: '星文高塔', screen: 'sentence', icon: 'spark', x: 43, y: 19, description: '用完整英文句子施法，练习表达与语境。', color: '#e7d3a2' },
  { id: 'harbor', name: '回声海港', screen: 'listening', icon: 'sound', x: 80, y: 57, description: '先听英文，再输入听到的单词或句子。', color: '#acdafa' },
  { id: 'academy', name: '云端学院', screen: 'atlas', icon: 'book', x: 53, y: 37, description: '进入 IELTS-practice 阅读题库，寻找文字中的线索。', color: '#d9bdff' },
  { id: 'garden', name: '星灵花园', screen: 'spirits', icon: 'leaf', x: 39, y: 61, description: '与星灵结伴，收藏一起成长的伙伴。', color: '#c9e0b4' },
  { id: 'camp', name: '旅人营地', screen: 'appearance', icon: 'people', x: 71, y: 24, description: '选择六位旅伴中的一位作为你的角色形象。', color: '#ffd0b2' },
  { id: 'ruins', name: '回忆遗迹', screen: 'story', icon: 'star', x: 21, y: 65, description: '阅读章节、作出选择，找回星灯失去的声音。', color: '#dcc2ff' },
  { id: 'observatory', name: '星历观测台', screen: 'study', icon: 'chart', x: 87, y: 42, description: '查看练习记录、词汇记忆与学习备份。', color: '#e7dcba' },
  { id: 'trials', name: '星灯圣域', screen: 'exam', icon: 'trophy', x: 57, y: 15, description: '雅思学术类 7+：听、读、写、说四域试炼。', color: '#f3d690' },
]
