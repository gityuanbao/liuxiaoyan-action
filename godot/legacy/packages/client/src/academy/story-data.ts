import type { AvatarId } from './character-data'
import type { LearningProfile, LearningRecord } from './learning-core'
import { earnedSeals } from './trial-core'
import type { TrialId } from './trial-data'
import type { StorySceneId } from './world-lore'

export interface StoryLine { speaker: AvatarId | 'you'; text: string; alternate?: string; scene?: StorySceneId; shot?: 'wide' | 'close'; caption?: string }
export interface StoryChapter {
  id: string; title: string; region: string; requirement: string;
  requires?: LearningRecord['kind']; choices: readonly { id: string; text: string }[]; choiceAt: number;
  seal?: TrialId; scene?: StorySceneId; volume?: 1 | 2;
  lines: StoryLine[];
}
export const STORY_CHAPTERS: StoryChapter[] = [
  { id: 'arrival', title: '序章 · 失声的星灯', region: '星语学院', requirement: '踏入群岛即可阅读', choices: [{ id: 'memory', text: '先记住单词，稳稳地出发。' }, { id: 'courage', text: '边战斗边学习，马上去探索。' }], choiceAt: 2, lines: [
    { speaker: 'mage', text: '你终于到了。昨夜，照亮群岛的星灯忽然失去了声音，通往外海的航路也随之沉睡。', scene: 'prologue', shot: 'wide', caption: '昨夜 · 星灯熄灭' },
    { speaker: 'knight', text: '雾蚀让人记得字母，却忘记它们的意思。我们找到了四枚碎片；它们只回应被记住、读懂、听清的文字。', scene: 'prologue', shot: 'close' },
    { speaker: 'you', text: '我还不太熟练，但我愿意试试。第一步应该从哪里开始？' },
    { speaker: 'mage', text: '那就从风之森林开始。慢一点也没关系，把每一个词记清楚，就是可靠的力量。', alternate: '好，那就带上勇气去风之森林。我会陪你试错；不用等到完美，才开始第一场决斗。' },
    { speaker: 'knight', text: '桥上的雾蚀来了。我守住退路，你负责拼写咒语。每次准确输入都会削弱幻影；赢下这场遭遇，我们才能抵达森林。', scene: 'archive', shot: 'wide', caption: '旅人的词之书' },
    { speaker: 'mage', text: '月光桥重新亮了。你的咒语驱散了守桥幻影，艾琳就在前方等我们。带上词之书，一起进入森林吧。' },
  ] },
  { id: 'forest', title: '第一章 · 森林的名字', region: '风之森林', requirement: '完成一场词汇决斗胜利', requires: 'vocabulary', choices: [{ id: 'memory', text: '名字让我们理解，也让我们保护。' }, { id: 'courage', text: '记住它们，我就能走得更远。' }], choiceAt: 2, lines: [
    { speaker: 'ranger', text: '桥上的幻影散去了。谢谢你。我叫艾琳，这片森林的守望者。' },
    { speaker: 'ranger', text: '刚才的 tree 是树，water 是水。接下来我们慢慢认识 habitat，栖息地。名字会变长，我会陪你看清每一个字母。' },
    { speaker: 'you', text: '原来学习这些单词，还能让我看见以前忽略的东西。' },
    { speaker: 'ranger', text: '是呀。理解一片森林，才知道该如何保护它。你找到的第一枚碎片，就叫“记忆”。', alternate: '旅途会变长，但你也会变强。森林愿意为认得它名字的人，留下一条新的路。' },
    { speaker: 'scholar', text: '星塔来信了。先把森林里的名字记清楚；等这些词语不再陌生，我们再去读完整的航海记录。' },
  ] },
  { id: 'archive', title: '第二章 · 书页里的航路', region: '云端学院', requirement: '完成一场词汇决斗，或沿用已有阅读记录', requires: 'vocabulary', choices: [{ id: 'memory', text: '我想学会定位线索。' }, { id: 'courage', text: '我想先把整篇故事读懂。' }], choiceAt: 2, lines: [
    { speaker: 'scholar', text: '你把森林里的名字带回来了。我把它们写进这页航海日志；旧的阅读记录里，也能找到同一条线索。' },
    { speaker: 'scholar', text: '航海日志写着：星灯的歌声，不在最高的塔里，而在每一个敢于回应的人心里。' },
    { speaker: 'you', text: '所以，先认出一个词，也能在地图上找到一小段路。' },
    { speaker: 'scholar', text: '等等，日志上的坐标正在褪色。雾蚀把它们藏进了重叠的声音里——先听清，再把听见的名字写回来。', alternate: '你已经记住了航路上的词，可雾蚀开始吞掉它们的声音。先听一个，再写一个，把坐标留下。' },
    { speaker: 'bard', text: '坐标回来了。刚才那些重叠的声音，就是海港的求救。我叫澪，沿着这条航路来找我吧。' },
  ] },
  { id: 'tide', title: '第三章 · 潮汐的回声', region: '回声海港', requirement: '完成一场听力决斗胜利', requires: 'listening', choices: [{ id: 'memory', text: '没听懂时，我想再听一次。' }, { id: 'courage', text: '我想挑战完整句子的听写。' }], choiceAt: 2, lines: [
    { speaker: 'bard', text: '你听见了，对吗？海风把散落的声音送回来，你的回答让它们有了形状。' },
    { speaker: 'bard', text: '听力不是比谁更快猜中。先听清单词的边界，再把声音变成文字。重听也算认真学习。' },
    { speaker: 'you', text: '有些词在句子里听起来完全不同，但我开始能分辨了。' },
    { speaker: 'bard', text: '海港的回声把我们带到了星文之门。门缝里有雾在流动——试着把熟悉的短词连起来，像 I see the moon. 一样，就能让门记起它原本的意思。', alternate: '你已经能分辨完整的声音了。现在门上的词却散开了，试着用完整句子回应。我会在身后稳住潮声。' },
    { speaker: 'alchemist', text: '门真的开了。我是赛恩，高塔的炼金师。刚才散开的星文正飞向塔顶，跟上它们，我们离星灯已经很近了。' },
  ] },
  { id: 'constellation', title: '第四章 · 句子组成的星座', region: '星文高塔', requirement: '完成一场句子决斗胜利', requires: 'sentence', choices: [{ id: 'memory', text: '准确表达，比孤立记忆更有力量。' }, { id: 'courage', text: '我想把这份力量带回学院。' }], choiceAt: 2, lines: [
    { speaker: 'scholar', text: '你把单词连成了完整的句子。看，塔顶那些散落的星点，终于成为同一个星座。' },
    { speaker: 'alchemist', text: '错过的字母、反复修改的句子，都是配方的一部分。成功没有把它们抹去，而是把它们变成了经验。' },
    { speaker: 'you', text: '我已经能用新的方式回应这个世界了。' },
    { speaker: 'scholar', text: '四枚碎片正在会合，可守灯幻影拦住了最后一束光。把一路学过的词汇带上；继续用熟悉的单词回应它；能量满了，也可以试试自己的长句大招。', alternate: '学院就在雾的另一边。守灯幻影还握着星灯的名字，我们得用学过的词逐次削弱它，一起找回星灯的名字。' },
    { speaker: 'mage', text: '欢迎回来。第一段旅途结束了，但群岛还有更多故事。设置下一个学习目标，我们明天再出发。' },
  ] },
  { id: 'four-seals', volume: 2, scene: 'prologue', title: '第五章 · 雾海之外', region: '星灯航路', requirement: '读完第一卷即可进入第二卷', choiceAt: 2, choices: [{ id: 'memory', text: '先把四种回应练得可靠。' }, { id: 'courage', text: '我要挑战限时的四域试炼。' }], lines: [
    { speaker: 'knight', text: '碎片让近海的灯重新亮了，可外海仍被雾蚀包围。要开辟新的路，我们需要四枚完整的印记。', scene: 'prologue', shot: 'wide', caption: '第二卷 · 四种回应' },
    { speaker: 'scholar', text: '从词到句子只是开始。你还要听懂条件、从文章找到证据、写清自己的观点，并用声音回应另一个人。', scene: 'archive', shot: 'close' },
    { speaker: 'you', text: '我想向学术类雅思 7 分以上前进。但我不想只收集漂亮的数字。' },
    { speaker: 'mage', text: '那就把每一次练习写进航海日志。印记记录真实完成的一步，分数需要真实的反馈。', alternate: '限时试炼会更紧张。即使印记还没有亮，复盘也会告诉你下一次该从哪里开始。' },
    { speaker: 'bard', text: '先来海港吧。雾里有一段被误听的预约和一段研究讲述；我们要分清原计划、最终选择与真正的结论。', scene: 'harbor', shot: 'wide' },
  ] },
  { id: 'echo-seal', volume: 2, seal: 'listening', scene: 'harbor', title: '第六章 · 被误听的约定', region: '回声海港', requirement: '在四域试炼修复听力印记', choiceAt: 2, choices: [{ id: 'memory', text: '记住被更正的细节。' }, { id: 'courage', text: '继续追问讲述者的态度。' }], lines: [
    { speaker: 'bard', text: '你没有停在第一次听到的数字。原计划会改变，例子也不一定是讲述者的结论。', shot: 'close' },
    { speaker: 'ranger', text: '潮水带回了一页研究记录。别让一个熟悉的关键词，替你决定整段话的意思。', shot: 'wide' },
    { speaker: 'you', text: '我开始注意更正、限制条件，以及听见的信息究竟在回答哪个问题。' },
    { speaker: 'bard', text: '这就是回声之印。重复不是退步，听清之后再回应，才是它的力量。', alternate: '那就把这个问题带去图书馆吧。声音成为文字以后，仍需要证据来证明。' },
    { speaker: 'scholar', text: '去阅读试炼。从城市树木的文章里，分清作者说了什么，又没有说什么。', scene: 'archive', shot: 'wide' },
  ] },
  { id: 'evidence-seal', volume: 2, seal: 'reading', scene: 'archive', title: '第七章 · 证据的边界', region: '星文图书馆', requirement: '在四域试炼修复阅读印记', choiceAt: 2, choices: [{ id: 'memory', text: '给每个判断找原文证据。' }, { id: 'courage', text: '敢于承认文章没有提供答案。' }], lines: [
    { speaker: 'scholar', text: 'Not Given 不是你知道的世界里没有发生，而是这篇文章没有足够证据。雾蚀最爱把猜测装扮成事实。', shot: 'close' },
    { speaker: 'alchemist', text: 'all、some、may、must，看起来很小，却会让一句话的配方彻底改变。' },
    { speaker: 'you', text: '理解文章，不只是认出单词。我需要检查范围、关系，以及作者保留的不确定性。' },
    { speaker: 'scholar', text: '你的洞察之印亮了。现在把证据组织成完整表达，而不只是停在判断。', alternate: '能够承认“不知道”，是可靠推理的一部分。下一步，我们用这种诚实写出观点。' },
    { speaker: 'alchemist', text: '写作试炼准备好了。一张交通图表，两种大学教育的观点。先看清趋势，再让论点拥有理由。', shot: 'wide' },
  ] },
  { id: 'structure-seal', volume: 2, seal: 'writing', scene: 'archive', title: '第八章 · 观点的骨架', region: '构筑工房', requirement: '完成双任务写作与自评复盘', choiceAt: 2, choices: [{ id: 'memory', text: '先修改论证的结构。' }, { id: 'courage', text: '再检查语言是否准确。' }], lines: [
    { speaker: 'alchemist', text: '我看见了你的图表总览和议论文。构筑之印记录的是完成与复盘；文章好不好，还需要更细致的反馈。', shot: 'close' },
    { speaker: 'scholar', text: '一个清晰的观点，需要读者知道你在说什么、为什么这样说，以及证据如何支持它。' },
    { speaker: 'you', text: '我不想把高级词塞进每一行。我想让词语准确地完成它们的工作。' },
    { speaker: 'alchemist', text: '先修一根梁，再修下一根。把具体改进记下来，重写会比机械延长文章更有价值。', alternate: '那就检查搭配、句式和错误。语言不是装饰，它应该帮助你的意思被理解。' },
    { speaker: 'knight', text: '最后一枚印记，需要你亲自开口。把准备好的思路说给我听，也听听自己的声音。', scene: 'prologue', shot: 'wide' },
  ] },
  { id: 'voice-seal', volume: 2, seal: 'speaking', scene: 'prologue', title: '第九章 · 属于你的声音', region: '晨光航路', requirement: '完成三部分口语思路与自评复盘', choiceAt: 2, choices: [{ id: 'memory', text: '带着录音继续改进。' }, { id: 'courage', text: '把经验说给新的旅人听。' }], lines: [
    { speaker: 'knight', text: '你用理由和例子把回答延长了。若这次只写了思路，下次要真正说出来；清晰的笔记还不能告诉我们发音如何。', shot: 'close' },
    { speaker: 'mage', text: '回声、洞察、构筑、共鸣。四种回应让航路重新连接，也让你拥有了新的学习方法。', shot: 'wide' },
    { speaker: 'you', text: '我还没有走到终点，但已经知道下一次应该怎样练习。' },
    { speaker: 'knight', text: '把录音回听一遍，标记一个值得修改的地方。下一次，试着让它更从容。', alternate: '那就去吧。你不必像别人一样说话，你需要让自己的经验被另一个人理解。' },
    { speaker: 'mage', text: '雾海之外还有新的岛。你的词之书和航海日志，会和你一起继续成长。', scene: 'harbor', shot: 'wide', caption: '第二卷 · 航路重连' },
  ] },
]
export interface StoryProgress { completed: string[]; positions: Record<string, number>; choices: Record<string, string> }
export const emptyStory = (): StoryProgress => ({ completed: [], positions: {}, choices: {} })
export function chapterUnlocked(profile: LearningProfile, index: number) {
  const chapter = STORY_CHAPTERS[index]
  if (!chapter) return false
  if (index > 0 && !profile.story?.completed.includes(STORY_CHAPTERS[index - 1].id)) return false
  if (chapter.seal && !earnedSeals(profile.trials).has(chapter.seal)) return false
  const trialEquivalent = profile.trials?.some(a => chapter.requires === 'reading' ? a.trial === 'reading' && a.total > 0 : chapter.requires === 'listening' ? a.trial === 'listening' && a.completed : chapter.requires === 'sentence' ? a.trial === 'writing' && a.completed : false)
  const legacyReading = chapter.id === 'archive' && (profile.records.some(r => r.kind === 'reading' && r.total > 0) || profile.trials?.some(a => a.trial === 'reading' && a.total > 0))
  return !chapter.requires || !!legacyReading || !!trialEquivalent || profile.records.some(r => r.kind === chapter.requires && (chapter.requires === 'reading' ? r.total > 0 : r.outcome === 'victory' || (!r.outcome && r.title.includes('决斗胜利'))))
}
export function validateStory(value: unknown): value is StoryProgress {
  const story = value as StoryProgress
  if (!story || !Array.isArray(story.completed) || new Set(story.completed).size !== story.completed.length || !story.positions || !story.choices || typeof story.positions !== 'object' || typeof story.choices !== 'object' || Array.isArray(story.positions) || Array.isArray(story.choices)) return false
  return story.completed.every(id => STORY_CHAPTERS.some(c => c.id === id)) && Object.entries(story.positions).every(([id, position]) => { const c = STORY_CHAPTERS.find(c => c.id === id); return !!c && Number.isInteger(position) && position >= 0 && position < c.lines.length }) && Object.entries(story.choices).every(([id, choice]) => STORY_CHAPTERS.find(c => c.id === id)?.choices.some(c => c.id === choice))
}
// Resume unfinished accessible chapters, otherwise retain the furthest accessible memory.
export function resumeStoryIndex(profile: LearningProfile) {
  const pending = STORY_CHAPTERS.findIndex((c, i) => chapterUnlocked(profile, i) && !profile.story?.completed.includes(c.id))
  if (pending >= 0) return pending
  for (let i = STORY_CHAPTERS.length - 1; i >= 0; i--) if (chapterUnlocked(profile, i)) return i
  return 0
}
