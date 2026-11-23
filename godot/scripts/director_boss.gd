extends RefCounted

const T=preload("res://scripts/design_tokens.gd")
const CUSTOM=preload("res://scripts/custom_book_ui.gd")

static func active(h) -> bool:
	return h.data.get("stage") is Dictionary and h.data.stage.get("bossMode",false)

static func build(h) -> void:
	var available=0
	var difficulty=str(h.data.study.settings.get("difficulty","all"))
	for i in h.data.get("books",[]).size():
		var book=h.data.books[i]
		var step=634.0/h.data.books.size()
		var selected=h.data.bookSettings.selected==book.id
		if selected:available=CUSTOM.count(book,difficulty)
		var label="自定义" if book.id=="custom" else str(book.name).replace("大学英语","").replace("英语","")
		h.button(label,Rect2(592+i*step,208,step-8,44),func(): h.bridge.request("book_select",{"id":book.id}),selected).add_theme_font_size_override("font_size",16)
	h.button("中文默写",Rect2(592,296,304,44),func(): h.boss_recall=true;h.rebuild(),h.boss_recall)
	h.button("看词练习",Rect2(912,296,306,44),func(): h.boss_recall=false;h.rebuild(),not h.boss_recall)
	h.button("整备出战干员",Rect2(592,544,240,42),func(): h.go("spirits")).add_theme_font_size_override("font_size",16)
	var running=not h.state().is_empty() and h.state().get("outcome")==null
	if running and available>=100:
		h.button("开始新挑战 · 替换当前行动",Rect2(848,544,370,42),func(): h.bridge.request("boss_start",{"recall":h.boss_recall}),true).add_theme_font_size_override("font_size",16)
	else:
		h.button("返回普通学习",Rect2(848,544,370,42),func(): h.go("books")).add_theme_font_size_override("font_size",16)

static func draw(h) -> void:
	h.text_at("特别行动 / BOSS CHALLENGE",32,112,13,T.ORANGE,-1,true)
	h.text_at("英语总监",30,171,48,T.TEXT)
	h.text_at("百词挑战",34,208,24,T.ORANGE)
	h.draw_character("director","taunt",fmod(h.ui_time,6.0),Rect2(88,115,460,460))
	h.panel(Rect2(32,548,500,54),T.SURFACE,T.EDGE)
	h.text_at("100 个不同单词  /  5,000 血量",48,580,20,T.TEXT)
	h.panel(Rect2(568,134,680,468),T.SURFACE,T.EDGE)
	h.draw_rect(Rect2(568,134,680,3),T.ORANGE)
	var difficulty=str(h.data.study.settings.get("difficulty","all"))
	var level=CUSTOM.LEVELS.find(difficulty)
	h.text_at("挑战词书  /  %s  /  需 100 词" % CUSTOM.LEVEL_LABELS[maxi(0,level)],592,181,15,T.ORANGE)
	h.text_at("02 / 回忆方式",592,280,15,T.ORANGE)
	h.text_at("中文默写计独立回忆；看词、提示与纠错单独记录。",592,370,14,T.MUTED)
	h.draw_line(Vector2(592,390),Vector2(1218,390),T.EDGE)
	h.text_at("Ⅰ 4.5 秒    →    Ⅱ 3.8 秒    →    Ⅲ 3.2 秒",592,422,20,T.TEXT)
	h.text_at("拼对整词：击破 50 点词汇护甲，并打断当前攻击。",592,454,17,T.GREEN)
	h.text_at("攻击技能延长压制；护盾、治疗与补充能量照常生效。",592,480,14,T.MUTED)
	var running=not h.state().is_empty() and h.state().get("outcome")==null
	h.text_at("开始新挑战会替换本轮；已产生的学习记录保留。" if running else "优先抽取到期与错词，补足 100 词；第 50 / 80 词后加速。",592,517,13,T.MUTED)

static func hud(h) -> void:
	var b:Dictionary=h.data.boss
	var s=h.state()
	h.panel(Rect2(418,140,450,65),T.SURFACE,T.ORANGE)
	h.text_at("英语总监",432,163,20,T.TEXT)
	h.text_at("阶段 %s / %s" % [["Ⅰ","Ⅱ","Ⅲ"][int(b.phase)-1],b.attackName],630,161,12,T.ORANGE,222)
	h.bar(Rect2(432,176,420,6),s.botHp,s.enemyMaxHp,T.ORANGE)
	h.hit_feedback.hp_trail(h,Rect2(432,176,420,6))
	h.text_at("HP %04d / %04d" % [s.botHp,s.enemyMaxHp],432,198,11,T.MUTED,-1,true)
	h.text_at("词汇护甲 %03d 层" % b.remaining,733,198,11,T.MUTED)
	if b.action=="charge":
		h.text_at("正在蓄力 · 拼对单词打断",446,293,19,T.ORANGE)
		h.bar(Rect2(446,307,342,4),1500-b.attackIn,1500,T.ORANGE)
	elif b.staggered:
		h.text_at("攻击已打断",504,288,22,T.GREEN)
		h.text_at("继续拼写，保持压制",500,313,13,T.MUTED)

static func progress(h) -> void:
	var b:Dictionary=h.data.boss
	h.text_at("击破 %03d / 100  ·  独立回忆 %03d  ·  打断 %03d" % [b.completed,b.independent,b.interrupts],430,398,13,T.TEXT,420)
