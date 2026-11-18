export type TrialId = 'listening' | 'reading' | 'writing' | 'speaking'
export const TRIAL_VOCABULARY: Record<TrialId, string[]> = { listening: ['academic-assumption', 'academic-allocate', 'academic-implication', 'academic-mitigate'], reading: ['academic-disparity', 'academic-empirical', 'academic-resilience', 'academic-substantial'], writing: ['academic-proportion', 'academic-fluctuate', 'academic-whereas', 'academic-nevertheless'], speaking: ['academic-viable', 'academic-incentive', 'academic-coherent', 'academic-predominantly'] }
export interface TrialQuestion { prompt: string; answers: string[]; options?: string[]; limit?: number; explanation: string }
export const TRIALS = [
  { id: 'listening', name: '回声之印', subject: '听力', subtitle: '捕捉细节与观点', guide: 'bard', scene: 'harbor', minutes: 10, description: '两段原创音频、8 题：预约对话与学术短讲。' },
  { id: 'reading', name: '洞察之印', subject: '阅读', subtitle: '从证据中找到航路', guide: 'scholar', scene: 'archive', minutes: 20, description: '原创长文、8 题：判断、标题、选择与填空。' },
  { id: 'writing', name: '构筑之印', subject: '写作', subtitle: '让观点拥有骨架', guide: 'alchemist', scene: 'archive', minutes: 60, description: 'Task 1 原创图表 + Task 2 双方观点议论文。' },
  { id: 'speaking', name: '共鸣之印', subject: '口语', subtitle: '以自己的声音回应', guide: 'knight', scene: 'prologue', minutes: 14, description: 'NPC 三部分对话、1 分钟准备、2 分钟独白。' },
] as const
export const LISTENING_SCRIPTS = [
  `Student: Hello. I would like to book a study room for our environmental research group.
Librarian: Certainly. There are rooms in the East Building and the North Building. The East Building is being repaired this week, so we are taking bookings for the North Building only.
Student: There will be twelve of us. Is there a room large enough?
Librarian: The smallest room seats eight, but Room Seven accommodates fourteen. That would be the best choice. It has a screen and a whiteboard.
Student: We had hoped to start at nine on Saturday.
Librarian: I'm afraid the room is used for staff training until ten. You can begin at ten thirty, and stay until one if you wish.
Student: Ten thirty is fine. Do we need to pay?
Librarian: The room is free for registered students. Visitors pay twelve pounds, but that does not apply to your group. You will need to leave your student card at reception while you use the room.
Student: Are we allowed to bring drinks?
Librarian: Water is permitted, but other drinks must remain outside. If you need a break, the cafe is on the ground floor. Please take your rubbish with you when you leave.
Student: Understood. I'll tell everyone to meet at reception.`,
  `Lecturer: Today we will examine how urban trees affect the temperature of nearby buildings. It is tempting to assume that any increase in the number of trees produces an equivalent improvement. In fact, their location can matter as much as their number.
One research team compared streets in the same district. The streets had similar traffic levels and building heights, but differed in their tree cover. Over several summer afternoons, the researchers measured temperatures using sensors placed at pedestrian height. They also recorded wind speed, since a breeze can change the results.
Trees reduce heat in two ways. First, their leaves provide shade, limiting the amount of sunlight that reaches roads and walls. Second, water evaporates from the leaves, removing some heat from the surrounding air. Neither process is equally effective in every situation. Young trees may cast little shade, and trees under water stress may release less moisture.
The researchers found lower afternoon temperatures on the more heavily shaded streets. However, they cautioned against claiming that trees alone caused every difference. The materials used on pavements and the shape of buildings could also contribute. Their findings therefore support planting as one part of a broader strategy, rather than as a complete solution.
The next phase will investigate winter conditions. A tree that is beneficial in summer might block useful sunlight in colder months. Planners should consider seasonal changes and local conditions before selecting species. The aim is not simply to maximise tree numbers, but to allocate limited space in a way that produces lasting benefits.`,
]
export const LISTENING_QUESTIONS: TrialQuestion[] = [
  { prompt: '1. Which building is available this week?', options: ['East Building', 'North Building', 'South Building'], answers: ['North Building'], explanation: 'East Building 正在维修；本周只能预约 North Building。' },
  { prompt: '2. How many people can Room Seven accommodate? Write a NUMBER.', answers: ['14'], limit: 1, explanation: '小房间 8 人，团队 12 人，但 Room Seven 的容量是 14；要区分三个数字。题目要求数字，不能写 fourteen。' },
  { prompt: '3. What time can the group begin? Write NO MORE THAN TWO WORDS AND/OR A NUMBER.', answers: ['10:30', 'ten thirty', '10.30'], limit: 2, explanation: '原计划九点，培训到十点，最终确认开始时间为 ten thirty。' },
  { prompt: '4. Which drink is allowed in the study room?', options: ['Coffee', 'Water', 'Tea'], answers: ['Water'], explanation: '只有 water 被允许；其他饮料留在外面。' },
  { prompt: '5. Temperatures were measured using ______. ONE WORD ONLY.', answers: ['sensors'], limit: 1, explanation: '短讲第二段：using sensors placed at pedestrian height。' },
  { prompt: '6. What caution do the researchers express?', options: ['Every difference must be caused by trees.', 'Other features may contribute to the differences.', 'Tree planting has no effect on temperatures.'], answers: ['Other features may contribute to the differences.'], explanation: '铺路材料与建筑形状可能共同作用，不能把所有差异归因于树木。' },
  { prompt: '7. The next phase will investigate conditions in ______. ONE WORD ONLY.', answers: ['winter'], limit: 1, explanation: '研究下一阶段看 winter conditions，而非再次重复夏季测量。' },
  { prompt: '8. What is the lecturer’s main recommendation?', options: ['Plant as many trees as possible everywhere.', 'Select trees with regard to local and seasonal conditions.', 'Replace every pavement with a garden.'], answers: ['Select trees with regard to local and seasonal conditions.'], explanation: '结尾反对只追求数量，要求考虑季节和当地条件。' },
]
export const READING_TITLE = 'The Value of Urban Shade'
export const READING_PARAGRAPHS = [
  `For much of the twentieth century, planting trees in city streets was treated mainly as a matter of appearance. A pleasant avenue could attract visitors or improve the reputation of a neighbourhood. More recently, planners have begun to examine a different question: how can trees help cities cope with heat? The answer is more complicated than simply adding greenery. A tree may benefit the surrounding area in several ways, but its contribution depends on its size, location and access to water.`,
  `Trees can cool an area through shade and evaporation. Leaves intercept sunlight before it reaches dark surfaces, such as roads, which would otherwise absorb energy and release it later. Water also moves from the soil through the tree and eventually enters the air through its leaves. This process uses heat. However, the two mechanisms do not always work equally well. A small tree may release moisture while casting little shade. During a drought, some trees conserve water by reducing the moisture they release, so a species that performs well under ordinary conditions may be less effective during extreme heat.`,
  `One study compared three streets in a single district. Researchers chose streets with similar building heights and traffic levels, but different amounts of tree cover. They measured air temperatures at pedestrian height over several summer afternoons and recorded wind speed at the same time. The more heavily shaded street was cooler on average. Yet the team did not conclude that trees explained all of the difference. Pavement materials and the arrangement of buildings were not identical, and these factors might also influence temperature. The comparison provided useful evidence without removing every source of uncertainty.`,
  `Costs and benefits are also distributed unevenly. Wealthier neighbourhoods often have established trees, while rapidly developed areas may have fewer. Planting new trees in an exposed district can therefore appear fairer than improving an already green area. Even so, planting is only the beginning. Young trees need sufficient soil, protection from damage and reliable maintenance. If a local authority pays for planting but allocates too little money to later care, many of the trees may fail. Some planners argue that measuring the survival rate after several years is more informative than reporting the number originally planted.`,
  `A further complication is the relationship between summer and winter. Shade is welcome on a hot afternoon, but buildings may benefit from sunlight in colder months. Deciduous trees, which lose their leaves, can offer one possible compromise. Their suitability still depends on local weather, the width of streets and the needs of residents. Trees can also obstruct visibility or compete for space with transport infrastructure. These issues do not mean that planting should be abandoned; rather, they demonstrate why a single design cannot be transferred unchanged to every location.`,
  `The emerging approach treats trees as part of a wider urban system. Reflective surfaces, building design and accessible public spaces may complement tree planting. Residents can contribute knowledge about places where shade is most needed, while researchers can test whether a proposed intervention has the intended effect. Reliable planning requires both forms of evidence. The objective is not to identify a universal winner among different solutions, but to combine appropriate measures and examine their consequences over time.`,
]
export const READING_QUESTIONS: TrialQuestion[] = [
  { prompt: '1. In the twentieth century, the visual appeal of street trees received attention. TRUE / FALSE / NOT GIVEN', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answers: ['TRUE'], explanation: 'A 段：treated mainly as a matter of appearance，对应 visual appeal 的同义改写。' },
  { prompt: '2. All tree species become more effective at cooling during droughts.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answers: ['FALSE'], explanation: 'B 段：一些树木会减少水分释放，极端高温时可能 less effective；all 和 more 与原文相反。' },
  { prompt: '3. The study’s cooler street contained twice as many trees as either of the other streets.', options: ['TRUE', 'FALSE', 'NOT GIVEN'], answers: ['NOT GIVEN'], explanation: 'C 段比较遮阴量，却没有树木数量或 twice 的比例。' },
  { prompt: '4. Choose the best heading for paragraph D.', options: ['The importance of continued care', 'The decline of private gardens', 'A new method of measuring wind'], answers: ['The importance of continued care'], explanation: 'D 段从种植投入延伸到后续维护和存活率，主旨不是单纯多种树。' },
  { prompt: '5. Choose the best heading for paragraph F.', options: ['Finding one solution for every city', 'Combining measures and sources of knowledge', 'Replacing residents with researchers'], answers: ['Combining measures and sources of knowledge'], explanation: 'F 段兼顾多种措施以及居民和研究者两类证据。' },
  { prompt: '6. Why do the researchers avoid attributing every temperature difference to trees?', options: ['They did not take any measurements.', 'Other street characteristics were not identical.', 'The streets were in different countries.'], answers: ['Other street characteristics were not identical.'], explanation: 'C 段：路面材料、建筑排列并非完全相同，所以仍有不确定性。' },
  { prompt: '7. During a drought, some trees reduce the ______ they release. ONE WORD ONLY.', answers: ['moisture'], limit: 1, explanation: 'B 段：reducing the moisture they release。填空应保留原词拼写。' },
  { prompt: '8. The ______ rate after several years may be more useful than the initial planting total. ONE WORD ONLY.', answers: ['survival'], limit: 1, explanation: 'D 段：survival rate 对照 number originally planted。' },
]
export const WRITING_PROMPTS = [
  'The chart shows the percentage of journeys made by four modes of transport in a fictional city in 2010, 2015 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
  'Some people believe that universities should focus on practical skills that prepare students for employment. Others think that universities should provide a broad education, including subjects that are not directly related to a career. Discuss both views and give your own opinion. Write at least 250 words.',
]
export const TRANSPORT_DATA = [ { mode: 'Car', values: [50, 45, 35], color: '#bc9bea' }, { mode: 'Rail', values: [20, 25, 35], color: '#85bddb' }, { mode: 'Bicycle', values: [10, 15, 20], color: '#a7d5b8' }, { mode: 'Other', values: [20, 15, 10], color: '#ecd5a3' } ]
export const WRITING_CHECKS = [
  { id: 'task', title: '任务回应', detail: 'Task 1 有总览、主要趋势和比较；Task 2 回应双方观点并明确立场。' },
  { id: 'cohesion', title: '连贯与衔接', detail: '每段围绕一个中心，论据展开充分，衔接表达自然。' },
  { id: 'lexis', title: '词汇使用', detail: '核对搭配与用词准确性，避免为了高级而使用不合适的词。' },
  { id: 'grammar', title: '语法检查', detail: '检查句式变化、主谓一致、冠词和标点；标出至少一处可改进的句子。' },
]
export const SPEAKING_PARTS = [
  { title: 'Part 1 · 熟悉话题', minutes: 4, questions: ['What do you enjoy learning about?', 'Where do you usually study, and why?', 'Has the way you learn changed since you were younger?'] },
  { title: 'Part 2 · 个人独白', minutes: 2, questions: ['Describe a place where you learned something important. Say where it was, what you learned, who helped you, and explain why the experience was important to you.'] },
  { title: 'Part 3 · 抽象讨论', minutes: 5, questions: ['Why do some people find it difficult to keep learning as adults?', 'Should governments invest more in public libraries or online education?', 'How can technology improve access to education, and what problems might it create?'] },
]
export const SPEAKING_CHECKS = [
  { id: 'fluency', title: '流利与连贯', detail: '能延长回答，用理由与例子组织表达；停顿有没有打断意思？' },
  { id: 'lexis', title: '词汇与改述', detail: '遇到不会的词能否换一种说法？搭配是否自然？' },
  { id: 'grammar', title: '句式与准确性', detail: '是否使用不止一种句式，并能检查常见语法错误？' },
  { id: 'pronunciation', title: '发音与可理解度', detail: '录音回听后检查重音、语调和清晰度；文本笔记不能代替发音证据。' },
]
