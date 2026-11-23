extends RefCounted

const T=preload("res://scripts/design_tokens.gd")
const CUSTOM=preload("res://scripts/custom_book_ui.gd")

static func describe(h) -> Dictionary:
	var d:Dictionary=h.data
	var active=not h.state().is_empty() and h.state().get("outcome")==null
	var mission=d.get("learningMission")
	var weak=mission is Dictionary and mission.needsReview>0 and not active
	var book=str(d.get("bookSettings",{}).get("selected","cet4"))
	if (active or (weak and h.page!="books")) and d.get("stage") is Dictionary and d.stage.get("bookMode",false): book=str(d.stage.pack)
	var name="经典行动"
	var eligible=0
	var mode=str(d.get("study",{}).get("settings",{}).get("answerMode","spelling"))
	var mode_label="选中文意思" if mode=="choose_meaning" else "选英文单词" if mode=="choose_word" else ""
	for item in d.get("books",[]):
		if item.id==book:
			name=str(item.name)
			eligible=CUSTOM.count(item,str(d.study.settings.get("difficulty","all")))
	var result={"book":book,"context":name+" · %d 词计划" % d.get("study",{}).get("preview",[]).size(),"action":"plan","label":"确认词单并出击"}
	if active:
		result.action="resume"
		result.label="继续当前行动"
		result.context=(name+" · %d/%d 步" % [d.lesson.completed,d.lesson.total]) if d.get("lesson") is Dictionary else "经典行动 · 进度已保留"
		if d.get("boss") is Dictionary:
			result.label="继续总监挑战"
			result.context="英语总监 · 已击破 %d/100 词" % d.boss.completed
	elif h.page=="boss":
		result.action="boss_start" if eligible>=100 else "empty"
		result.label="开始百词挑战" if eligible>=100 else "当前范围不足 100 词"
		result.context=name+" · "+("中文默写" if h.boss_recall else "看词练习")+" · %d 词可选" % eligible
	elif h.page=="books":
		if d.study.settings.get("planMode","daily")=="daily":
			var plan:Dictionary=d.study.daily
			if weak and d.stage.pack==book:
				result.action="retry";result.label="复测薄弱词 · %d" % mission.needsReview;result.context=name+" · 先补齐本轮回忆"
			else:
				result.action={"learn":"daily_start","review":"daily_start","checkin":"checkin","done":"done","empty":"empty"}[plan.action]
				result.label={"learn":"学习新词 · %d 词" % plan.count,"review":"复习到期词 · %d 词" % plan.count,"checkin":"完成今日打卡","done":"今日计划已完成","empty":"换词书或自主练习"}[plan.action]
				result.context=name+" · "+(mode_label if not mode_label.is_empty() else "中文默写" if plan.recall else "先学后测") if plan.count>0 else plan.title
		elif not d.get("study",{}).get("preview",[]).is_empty():
			result.action="start"
			result.label="开始本轮学习"
			result.context=name+" · %d 词已选定" % d.study.preview.size()
		else:
			result.action="empty"
			result.label="当前范围没有可练单词"
			result.context="切换难度、学习范围或词性"
	elif weak:
		result.action="retry"
		result.label="复测薄弱词 · %d" % mission.needsReview
		result.context=name+" · 本轮仍有薄弱词"
	elif h.page!="books" and d.get("study",{}).get("today",{}).get("ready",false) and not d.study.today.checked:
		result.action="checkin"
		result.label="完成今日打卡"
		result.context="今日已学 %d / %d 词" % [d.study.today.count,d.study.today.goal]
	elif d.get("memory",{}).get("due",0)>0:
		result.action="review"
		result.label="复习到期词 · %d" % d.memory.due
		result.context=name+" · 先巩固，再学新词"
	return result

static func run(h) -> void:
	match describe(h).action:
		"empty","done": return
		"resume":
			h.go("battle")
			h.bridge.request("pause",{"value":false})
		"retry": h.bridge.request("retry_study")
		"checkin":
			h.bridge.request("check_in")
			h.go("books")
		"review": h.bridge.request("review_start")
		"start": h.bridge.request("study_start")
		"daily_start": h.bridge.request("daily_start")
		"boss_start": h.bridge.request("boss_start",{"recall":h.boss_recall})
		_: h.go("books")

static func build(h) -> void:
	if h.page in ["battle","modes"] or not h.bridge.ready_to_play: return
	if h.page=="books" and h.book_setup_open:return
	var next=describe(h)
	var button=h.button(next.label,Rect2(974,649,260,34),func(): run(h),true,next.action in ["empty","done"])
	button.name="NextAction"
	button.add_theme_font_size_override("font_size",17)
	button.add_theme_stylebox_override("normal",T.style(T.GREEN,T.GREEN))
	button.add_theme_stylebox_override("hover",T.style(Color("beffd1"),T.GREEN))
	button.add_theme_color_override("font_color",T.INK)
	button.add_theme_color_override("font_hover_color",T.INK)
	button.tooltip_text=next.context

static func draw(h) -> void:
	if h.page in ["battle","modes"] or not h.bridge.ready_to_play: return
	if h.page=="books" and h.book_setup_open:return
	var next=describe(h)
	h.panel(Rect2(960,614,288,78),T.SURFACE,T.GREEN)
	h.text_at(next.context,974,637,13,T.MUTED,260)

static func memory_for_mission(h) -> void:
	if h.data.get("stage") is Dictionary and h.data.stage.get("bookMode",false):
		h.bridge.request("book_select",{"id":h.data.stage.pack})
	h.go("memory")
