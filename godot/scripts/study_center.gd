class_name StudyCenter
extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")
const SOURCES=[["new","新词"],["due","到期复习"],["wrong","错词"],["saved","收藏"],["all","全部"]]
const PARTS=[["all","全部词性"],["noun","名词"],["verb","动词"],["adjective","形容词"]]
static var preview_cache:Dictionary={}

static func active(h) -> bool:return not h.state().is_empty() and h.state().get("outcome")==null
static func daily(h) -> bool:return h.data.study.settings.get("planMode","daily")=="daily"
static func option(h,label:String,rect:Rect2,callback:Callable,selected:bool=false,disabled:bool=false,size_px:int=14) -> Button:
	var b=h.button(label,rect,callback,selected,disabled);b.add_theme_font_size_override("font_size",size_px);return b

static func build(h) -> void:
	if not h.data.has("study"):return
	if h.book_setup_open:h.BookLibrary.build(h);return
	var s:Dictionary=h.data.study.settings
	var study:Dictionary=h.data.study
	var today:Dictionary=study.today
	option(h,"选择词书 / 修改计划",Rect2(608,142,212,38),func():h.BookLibrary.open(h),false,false,16).name="OpenBookLibrary"
	option(h,"今日计划",Rect2(32,206,196,42),func():h.bridge.request("study_settings",{"planMode":"daily"}),daily(h),false,17).name="DailyPlan"
	option(h,"自主练习",Rect2(240,206,196,42),func():h.bridge.request("study_settings",{"planMode":"custom"}),not daily(h),false,17).name="CustomPlan"
	option(h,"复习排期",Rect2(1092,80,156,36),func():h.go("memory"),false,false,15)
	option(h,"排行榜",Rect2(972,80,112,36),h.open_rank_board,false,false,15).name="OpenRankBoard"
	for i in 3:
		var mode=h.ChoiceUI.MODES[i]
		option(h,["拼写单词","看词选义","看义选词"][i],Rect2(460+i*126,206,116,42),func():h.bridge.request("study_settings",{"answerMode":mode}),s.get("answerMode","spelling")==mode,false,15).name="AnswerMode_"+mode
	if not daily(h):
		for i in SOURCES.size():
			var id=SOURCES[i][0]
			option(h,SOURCES[i][1]+" %d" % study.counts[id],Rect2(48+i*154,282,144,32),func():h.bridge.request("study_settings",{"source":id}),s.source==id)
		for i in PARTS.size():
			var id=PARTS[i][0]
			option(h,PARTS[i][1],Rect2(112+i*126,328,116,32),func():h.bridge.request("study_settings",{"pos":id}),s.pos==id)
		option(h,"先学后测",Rect2(48,374,144,34),func():h.bridge.request("study_settings",{"recall":false}),not s.recall,study.recallRequired)
		option(h,"直接默写",Rect2(202,374,144,34),func():h.bridge.request("study_settings",{"recall":true}),s.recall)
		option(h,"‹ 上一组",Rect2(490,374,98,34),func():h.bridge.request("study_settings",{"chapter":int(s.chapter)-1}),false,s.chapter==0)
		option(h,"下一组 ›",Rect2(714,374,98,34),func():h.bridge.request("study_settings",{"chapter":int(s.chapter)+1}),false,s.chapter>=study.chapters-1)
	elif study.daily.action in ["done","empty"]:
		option(h,"进入自主练习",Rect2(48,438,204,42),func():h.bridge.request("study_settings",{"planMode":"custom"}),false,false,16)
	option(h,"已保存 / 每轮 %d 词" % s.batch,Rect2(48,554,252,36),func():h.BookLibrary.open(h),false,false,15)
	option(h,"整备干员",Rect2(328,554,172,36),func():h.go("spirits"),false,false,15)
	option(h,"调整计划",Rect2(1108,394,116,36),func():h.BookLibrary.open(h),false,false,14)
	var label="今日已打卡 ✓" if today.checked else "完成本轮后打卡" if active(h) and today.ready else "完成今日打卡" if today.ready else "距目标还差 %d 词" % maxi(0,int(today.goal-today.count))
	option(h,label,Rect2(888,450,336,48),func():h.bridge.request("check_in"),true,today.checked or not today.ready or active(h),17).name="StudyCheckIn"

static func preview_text(h,value:String,width:float,size_px:int,english:bool=false) -> String:
	var face=h.mono if english else h.font
	var key=str([face.get_instance_id(),value,width,size_px])
	if preview_cache.has(key):return preview_cache[key]
	if preview_cache.size()>=512:preview_cache.clear()
	if face.get_string_size(value,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px).x<=width:
		preview_cache[key]=value
		return value
	while not value.is_empty() and face.get_string_size(value+"…",HORIZONTAL_ALIGNMENT_LEFT,-1,size_px).x>width:
		value=value.left(-1)
	preview_cache[key]=value+"…"
	return preview_cache[key]

static func word_rows(h,words:Array,recall:bool,y:float,rows:int) -> void:
	for i in mini(rows*2,words.size()):
		var word:Dictionary=words[i]
		var x=48+(i/rows)*382
		var baseline=y+(i%rows)*25
		h.text_at("待回忆 %02d" % (i+1) if recall else preview_text(h,word.word,132,15,true),x,baseline,15,T.MUTED if recall else T.TEXT,132,not recall)
		h.text_at(preview_text(h,word.meaning.replace("\n"," / "),210,13),x+144,baseline,13,T.MUTED,210)

static func draw(h) -> void:
	if h.book_setup_open:h.BookLibrary.draw(h);return
	h.text_at("学习中心",32,116,T.FONT_PAGE,T.TEXT)
	var wallet:Dictionary=h.data.get("recruitment",{})
	h.text_at("学习成长",206,94,11,T.MUTED)
	h.text_at("Lv.%02d" % wallet.get("level",1),206,115,18,T.GREEN,-1,true)
	h.text_at("%d / %d XP" % [wallet.get("levelProgress",0),wallet.get("levelRequired",100)],292,113,12,T.MUTED,102,true)
	h.bar(Rect2(398,105,150,3),wallet.get("levelProgress",0),wallet.get("levelRequired",100),T.GREEN)
	C.balance(h,T.STUDY_BALANCE,int(wallet.get("coins",0)))
	if not h.data.has("study"):return
	var study:Dictionary=h.data.study
	var s:Dictionary=study.settings
	var today:Dictionary=study.today
	h.panel(Rect2(32,134,804,54),T.SURFACE)
	for book in h.data.books:
		if book.id==h.data.bookSettings.selected:
			h.text_at(book.name,48,168,21,T.GREEN)
			h.text_at("%d 词 · 已学 %d · 到期 %d" % [book.count,book.seen,book.get("due",0)],265,167,13,T.MUTED,324)
	h.panel(Rect2(32,264,804,342),T.SURFACE)
	h.panel(Rect2(864,134,384,472),T.SURFACE)
	h.draw_rect(Rect2(864,134,384,3),T.GREEN)
	if daily(h):
		var plan:Dictionary=study.daily
		var next=h.ActionFlow.describe(h)
		var retry=next.action=="retry"
		var continuing=active(h)
		h.text_at("当前行动尚未结束" if continuing else "先巩固本轮薄弱词" if retry else plan.title,48,298,24,T.TEXT)
		h.text_at("继续完成本轮，再结算与打卡。词书和词量调整留到下一轮。" if continuing else "上一轮还有未独立回忆的词，先完成复测。" if retry else plan.detail,48,325,13,T.MUTED,764)
		h.text_at("本书到期 %d 词" % plan.due,48,356,14,T.GREEN if plan.due>0 else T.MUTED)
		h.text_at("今日距目标 %d 词" % plan.remaining,304,356,14,T.MUTED)
		h.text_at("本书未学 %d 词" % plan.newAvailable,560,356,14,T.MUTED)
		h.draw_line(Vector2(48,369),Vector2(812,369),T.EDGE)
		if continuing:
			h.text_at(next.context,48,408,20,T.GREEN,764)
			if h.data.get("learningMission") is Dictionary:
				h.text_at(h.data.learningMission.phase+" / "+h.data.learningMission.objective,48,447,14,T.TEXT,764)
			h.text_at("点击右下角“继续当前行动”，回到原来的单词和输入内容。",48,490,14,T.MUTED,764)
		elif retry:
			h.text_at("本轮薄弱词 / %d 词 · 中文默写" % h.data.learningMission.needsReview,48,397,14,T.GREEN)
			word_rows(h,h.data.learningMission.weakWords,true,426,3)
		elif not plan.preview.is_empty():
			h.text_at("本轮 %d 词 / 至少 %d 步 · %s" % [plan.count,plan.steps,"中文默写" if plan.recall else "熟悉 → 遮挡回忆"],48,397,14,T.GREEN)
			word_rows(h,plan.preview,plan.recall,426,3)
			h.text_at("以下为词单预览；其余 %d 词也会进入本轮。" % maxi(0,plan.count-6) if plan.count>6 else "按右下角开始。本轮拼写与回忆完成后再结算。",48,507,12,T.MUTED)
		else:
			h.text_at("已达到 %d 词总目标，请完成打卡。" % today.goal if plan.action=="checkin" else "不重复刷词凑进度，按需选择其他练习。",48,408,17,T.TEXT,764)
	else:
		h.text_at("词性",48,350,14,T.MUTED)
		h.text_at("第 %d / %d 组" % [s.chapter+1,study.chapters],597,397,14,T.MUTED)
		h.text_at("本轮 %d 词 · %s" % [study.preview.size(),"中文默写" if s.recall else "先学后测"],48,433,13,T.GREEN)
		if study.preview.is_empty():h.text_at("当前范围为空，请切换内容或词性。",48,470,16,T.MUTED)
		else:word_rows(h,study.preview,s.recall,461,2)
		h.text_at("到期复习和错词需遮住英文。提示或改对的词会再安排回忆。" if study.recallRequired else "自主练习不改变今日计划的复习优先顺序。",48,515,12,T.MUTED)
	h.text_at("保存的计划将延续到下一轮",48,543,12,T.MUTED)
	var op=h.operator_for(str(h.profile().get("avatar","mage")))
	h.text_at("出战 / "+op.name+" · "+op.role,530,568,15,T.TEXT)
	h.text_at("战技 / "+op.skill,530,589,12,T.MUTED)
	h.text_at("今日总目标",888,171,20,T.TEXT)
	h.text_at("所有词书合计 / 不同单词",888,198,12,T.MUTED)
	h.text_at("%02d / %02d" % [today.count,today.goal],888,246,36,T.TEXT,-1,true)
	h.bar(Rect2(888,260,336,6),today.count,today.goal,T.GREEN)
	h.text_at("连续 %d 天 · 累计 %d 天" % [today.streak,today.totalDays],888,290,16,T.GREEN)
	for i in today.week.size():
		var day=today.week[i];var x=888+i*48
		h.panel(Rect2(x,308,40,32),T.SELECTED if day.checked else T.DEEP,T.GREEN if day.checked else T.EDGE)
		h.text_at("✓" if day.checked else str(int(day.count)),x+11,331,15,T.GREEN if day.checked else T.MUTED)
		h.text_at(str(day.date).substr(5).replace("-","/"),x+3,358,11,T.MUTED)
	h.text_at("每日目标 / 已打卡后修改从明天起生效" if today.checked else "每日目标 / 新词与复习都计入",888,383,12,T.MUTED)
	h.text_at("每天 %d 词" % s.goal,888,418,18,T.GREEN)
	h.text_at("今日回忆 %d 词 · 到期复习 %d 词" % [today.get("practiceRecallCount",0),today.get("reviewCount",0)],888,523,12,T.MUTED)
	h.draw_line(Vector2(888,534),Vector2(1224,534),T.EDGE)
	for i in 2:
		var y=554+i*22
		h.text_at(["首次独立回忆","到期复习"][i],888,y,12,T.TEXT)
		h.text_at(["+12 XP","+8 XP"][i],1042,y,14,T.GREEN,-1,true)
		C.amount(h,[6,4][i],Vector2(1154,y),14,T.REWARD_INK,true,18)
	h.text_at("每词每日一次 · 跟打与提示不领奖",888,596,11,T.DIM,336)
