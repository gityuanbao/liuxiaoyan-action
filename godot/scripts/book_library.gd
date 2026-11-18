extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const CARD_ORIGIN=Vector2(32,154)
const CARD_SIZE=Vector2(392,278)
const CARD_STEP=412
const TITLES={"cet4":"大学英语四级","cet6":"大学英语六级","ky":"考研英语"}
const CODES={"cet4":"CET / 04","cet6":"CET / 06","ky":"POSTGRAD"}
const NOTES={"cet4":"从基础词汇开始，建立日常积累。","cet6":"扩展词汇范围，巩固辨析与拼写。","ky":"面向考研词汇标签的系统学习。"}

static func open(h) -> void:
	h.book_draft={"id":h.data.bookSettings.selected,"batch":h.data.study.settings.batch,"goal":h.data.study.settings.goal}
	h.book_setup_open=true;h.rebuild()

static func close(h) -> void:
	h.book_setup_open=false;h.rebuild()

static func choose(h,key:String,value) -> void:
	h.book_draft[key]=value;h.rebuild()

static func build(h) -> void:
	h.button("返回今日计划",Rect2(1024,80,224,36),func():close(h)).add_theme_font_size_override("font_size",15)
	for i in h.data.books.size():
		var book:Dictionary=h.data.books[i]
		var selected=h.book_draft.id==book.id
		var b=h.button("",Rect2(CARD_ORIGIN+Vector2(i*CARD_STEP,0),CARD_SIZE),func():choose(h,"id",book.id))
		b.name="Book_"+book.id
		b.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,T.GREEN if selected else T.EDGE,2 if selected else 1))
		b.add_theme_stylebox_override("hover",T.style(Color(T.GREEN,0.06),T.GREEN,2))
		b.tooltip_text="ECDICT 开源词库 · 已学进度与复习记录保留。"
	for i in 3:
		var amount=[5,10,15][i]
		var b=h.button("%d 词" % amount,Rect2(48+i*112,508,100,42),func():choose(h,"batch",amount),h.book_draft.batch==amount)
		b.name="Batch_"+str(amount);b.add_theme_font_size_override("font_size",17)
	for i in 4:
		var amount=[5,10,20,30][i]
		var b=h.button("%d 词" % amount,Rect2(452+i*100,508,90,42),func():choose(h,"goal",amount),h.book_draft.goal==amount)
		b.name="Goal_"+str(amount);b.add_theme_font_size_override("font_size",17)
	var save=h.button("保存词书与计划",Rect2(920,508,304,42),func():h.bridge.request("book_plan_save",h.book_draft.duplicate()),true)
	save.name="SaveBookPlan";save.add_theme_font_size_override("font_size",19)

static func draw(h) -> void:
	h.text_at("选择词书",32,113,30,T.TEXT)
	h.text_at("选定一本词书，把学习变成每天的行动。",222,111,14,T.MUTED)
	for i in h.data.books.size():
		var book:Dictionary=h.data.books[i]
		var selected=h.book_draft.id==book.id
		var r=Rect2(CARD_ORIGIN+Vector2(i*CARD_STEP,0),CARD_SIZE)
		var x=r.position.x;var y=r.position.y
		h.draw_rect(r,T.SURFACE)
		h.draw_rect(Rect2(x,y,6,CARD_SIZE.y),T.GREEN if selected else T.EDGE)
		h.text_at(CODES[book.id],x+24,y+35,15,T.GREEN if selected else T.MUTED,-1,true)
		h.text_at("待保存" if selected and h.data.bookSettings.selected!=book.id else "当前词书" if h.data.bookSettings.selected==book.id else "词汇专项",x+302,y+35,12,T.GREEN if selected else T.DIM)
		h.text_at(TITLES[book.id],x+24,y+79,27,T.TEXT)
		h.text_at("%d" % int(book.count),x+24,y+123,32,T.GREEN if selected else T.TEXT,-1,true)
		h.text_at("个词条",x+128,y+120,13,T.MUTED)
		h.text_at(NOTES[book.id],x+24,y+153,12,T.MUTED,344)
		h.draw_line(Vector2(x+24,y+171),Vector2(x+368,y+171),T.EDGE)
		h.text_at("已学 %d" % book.seen,x+24,y+195,13,T.TEXT)
		h.text_at("未学 %d" % maxi(0,book.count-book.seen),x+138,y+195,13,T.MUTED)
		h.text_at("到期 %d" % book.get("due",0),x+274,y+195,13,T.GREEN if book.get("due",0)>0 else T.MUTED)
		h.bar(Rect2(x+24,y+208,344,4),book.seen,book.count,T.GREEN)
		var sample:PackedStringArray=[]
		for j in mini(3,book.preview.size()):sample.append(book.preview[j].word)
		h.text_at(" · ".join(sample),x+24,y+242,12,T.MUTED,344,true)
		h.text_at("ECDICT / 开源词库筛选",x+24,y+262,10,T.DIM)
	h.panel(Rect2(32,450,1216,152),T.SURFACE)
	h.text_at("每轮词数",48,482,18,T.TEXT)
	h.text_at("每日总目标",452,482,18,T.TEXT)
	h.text_at(TITLES[h.book_draft.id],920,482,18,T.GREEN)
	h.text_at("熟悉与回忆合为一轮",48,574,12,T.MUTED)
	h.text_at("到期复习优先，再补新词；词书之间共用每日目标。",452,574,12,T.MUTED,420)
	h.text_at("每轮 %d 词 · 每日 %d 词" % [h.book_draft.batch,h.book_draft.goal],920,574,12,T.MUTED)
	h.text_at("保存后用于后续计划；当前行动与历史学习记录保留。",32,140,12,T.DIM,860)
