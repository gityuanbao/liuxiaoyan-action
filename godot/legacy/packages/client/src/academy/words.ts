export interface StudyWord { id: string; word: string; meaning: string; example: string; translation: string; pack: string }
// Removed curriculum entries are valid in historical records, never question candidates.
export const ARCHIVED_WORD_IDS = new Set<string>()
export const PACKS = [
  { id: 'beginner', name: '启程 · 基础单词', subtitle: '从短词开始施法', icon: 'star', color: '#a2ded1', description: '短单词与简单句，先熟悉拼写攻击，再逐步挑战雅思主题。' },
  { id: 'environment', name: '自然与环境', subtitle: '探索风之森林', icon: 'leaf', color: '#3da896', description: '生态、资源与可持续发展，雅思阅读常见主题。' },
  { id: 'education', name: '教育与成长', subtitle: '点亮知识高塔', icon: 'book', color: '#8970cf', description: '学习、研究与学术表达，为阅读和写作积累词汇。' },
  { id: 'technology', name: '科技与社会', subtitle: '穿越星光都市', icon: 'spark', color: '#588bcc', description: '创新、数字技术与社会变化，理解现代议题。' },
  { id: 'travel', name: '生活与旅行', subtitle: '抵达晨曦海岸', icon: 'compass', color: '#dc9a64', description: '出行、住宿与日常场景，练习听力常用词。' },
]
// Original examples written for this application. These are practice words, not an official IELTS question bank.
const rows: Record<string, string> = {
  beginner: `sun|太阳|The sun is warm.|阳光很温暖。
moon|月亮|I see the moon.|我看见了月亮。
tree|树|This tree is green.|这棵树是绿色的。
book|书|I have a book.|我有一本书。
water|水|I need some water.|我需要一些水。
bird|鸟|A bird can fly.|鸟会飞。
star|星星|That star is bright.|那颗星星很亮。
home|家|We can go home.|我们可以回家了。
rain|雨|I like the rain.|我喜欢下雨。
fish|鱼|The fish is small.|这条鱼很小。
light|光|I see a light.|我看见一束光。
friend|朋友|You are my friend.|你是我的朋友。
river|河流|The river is long.|这条河很长。
cloud|云|The cloud is white.|这朵云是白色的。
flower|花|This flower is red.|这朵花是红色的。`,
  environment: `habitat|栖息地|The forest provides a habitat for many birds.|森林为许多鸟类提供了栖息地。
biodiversity|生物多样性|Protecting biodiversity benefits the whole planet.|保护生物多样性有益于整个地球。
conservation|保护；保存|Wildlife conservation needs long-term support.|野生动物保护需要长期支持。
pollution|污染|Air pollution affects public health.|空气污染影响公共健康。
renewable|可再生的|Wind is a renewable source of energy.|风是可再生能源。
sustainable|可持续的|The city is developing sustainable transport.|这座城市正在发展可持续交通。
emission|排放；排放物|The factory reduced its carbon emission.|工厂减少了碳排放。
ecosystem|生态系统|Each species plays a role in the ecosystem.|每个物种都在生态系统中发挥作用。
resource|资源|Fresh water is a valuable resource.|淡水是宝贵的资源。
climate|气候|The local climate is becoming warmer.|当地气候正在变暖。
recycle|回收利用|We recycle paper and glass at school.|我们在学校回收纸张和玻璃。
species|物种|Several species live in this small lake.|这个小湖里生活着多个物种。
drought|干旱|A long drought damaged the crops.|长期干旱损害了庄稼。
agriculture|农业|Modern agriculture relies on careful water use.|现代农业依赖合理用水。
vegetation|植被|The vegetation protects the soil from erosion.|植被保护土壤免受侵蚀。`,
  education: `curriculum|课程体系|The new curriculum includes practical skills.|新课程体系包括实用技能。
scholarship|奖学金|She received a scholarship to study abroad.|她获得了出国留学的奖学金。
qualification|资格；资历|This qualification can improve your career options.|这项资格能增加你的职业选择。
research|研究|The team conducts research on memory.|这个团队开展记忆研究。
assessment|评估；考核|Regular assessment helps teachers plan lessons.|定期评估帮助教师安排课程。
academic|学术的|Academic writing requires clear evidence.|学术写作需要清晰的证据。
literacy|读写能力|Early reading supports literacy development.|早期阅读有助于读写能力的发展。
tuition|学费；教学|Tuition fees vary between universities.|不同大学的学费有所不同。
lecture|讲座；授课|The lecture explained a complex theory.|这场讲座解释了一个复杂的理论。
discipline|学科；纪律|Biology is a scientific discipline.|生物学是一门科学学科。
evidence|证据|The report presents strong evidence.|报告提供了有力的证据。
analysis|分析|The analysis revealed an interesting pattern.|分析揭示了一个有趣的规律。
hypothesis|假设|The experiment tested the hypothesis.|实验检验了这个假设。
evaluate|评价；评估|Students evaluate different sources of information.|学生评估不同的信息来源。
comprehension|理解力|Daily practice improves reading comprehension.|日常练习提升阅读理解力。`,
  technology: `innovation|创新|Innovation can make public services more efficient.|创新能提升公共服务效率。
automation|自动化|Automation changes the way people work.|自动化改变人们的工作方式。
digital|数字的|Digital tools help students share ideas.|数字工具帮助学生交流想法。
infrastructure|基础设施|Reliable infrastructure supports economic growth.|可靠的基础设施支持经济增长。
efficient|高效的|The new system is more efficient.|新系统更加高效。
privacy|隐私|Users should be able to protect their privacy.|用户应当能够保护自己的隐私。
device|设备|This device measures air quality.|这个设备测量空气质量。
network|网络|A strong network connects the research teams.|强大的网络连接各个研究团队。
algorithm|算法|The algorithm sorts the information quickly.|算法快速整理信息。
access|使用权；获取|Everyone needs access to reliable information.|每个人都需要获取可靠的信息。
urban|城市的|Urban planning affects daily life.|城市规划影响日常生活。
population|人口|The population has grown over the past decade.|过去十年间人口增长了。
employment|就业|New industries create employment opportunities.|新产业创造就业机会。
manufacture|制造|The company will manufacture electric vehicles.|这家公司将制造电动汽车。
distribution|分配；分布|The distribution of resources should be fair.|资源分配应当公平。`,
  travel: `accommodation|住宿|We booked accommodation near the station.|我们预订了车站附近的住宿。
reservation|预订|Please confirm your reservation by email.|请通过电子邮件确认你的预订。
itinerary|行程|Our itinerary includes a visit to the museum.|我们的行程包括参观博物馆。
departure|出发；离开|The departure time is printed on your ticket.|出发时间印在你的票上。
destination|目的地|The island is a popular holiday destination.|这座岛是热门度假目的地。
transport|交通运输|Public transport makes the city easier to explore.|公共交通让探索城市更方便。
insurance|保险|Travel insurance can cover unexpected costs.|旅行保险可以支付意外费用。
currency|货币|You can exchange currency at the airport.|你可以在机场兑换货币。
facility|设施|The sports facility opens early.|运动设施很早就开放。
reception|接待处|Leave your key at reception.|把钥匙留在接待处。
refund|退款|You may request a refund for the unused ticket.|你可以申请未使用车票的退款。
luggage|行李|Keep your luggage with you at all times.|始终把行李带在身边。
pedestrian|行人|The street is safe for pedestrians.|这条街对行人来说很安全。
commute|通勤|Many people commute by train.|许多人乘火车通勤。
available|可用的；有空的|A single room is available tonight.|今晚有一间单人房可用。`,
}
export const WORDS: StudyWord[] = Object.entries(rows).flatMap(([pack, text]) => text.split('\n').map(row => {
  const [word, meaning, example, translation] = row.split('|')
  return { id: word, word, meaning, example, translation, pack }
}))
export const SPIRITS = [
  { id: 'moon', name: '月芽', title: '初始伙伴 · 星月系', description: '把第一次勇敢尝试，收藏成一颗星。', requirement: '进入学院即可结伴', threshold: 0, color: '#8a74d6' },
  { id: 'leaf', name: '森铃', title: '森林守护者 · 自然系', description: '每学会一个新词，森林就多一片叶子。', requirement: '完成 2 场战斗', threshold: 2, color: '#4eaf93' },
  { id: 'spark', name: '星烁', title: '闪光旅伴 · 电光系', description: '让记忆中的单词，成为闪耀的力量。', requirement: '完成 5 场战斗', threshold: 5, color: '#5a96d4' },
  { id: 'sun', name: '曦羽', title: '晨曦使者 · 光明系', description: '陪你抵达每一个新的学习目的地。', requirement: '完成 10 场战斗', threshold: 10, color: '#e2a063' },
]
