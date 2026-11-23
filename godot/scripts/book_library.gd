extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const CARD_ORIGIN=Vector2(32,154)
const CUSTOM=preload("res://scripts/custom_book_ui.gd")
const TITLES={"zk":"中考英语","gk":"高考英语","cet4":"大学英语四级","cet6":"大学英语六级","ky":"考研英语"}
const CODES={"zk":"中考","gk":"高考","cet4":"CET / 04","cet6":"CET / 06","ky":"POSTGRAD"}
const NOTES={"zk":"初中阶段常用词汇","gk":"高中阶段常用词汇","cet4":"从基础词汇开始，建立日常积累。","cet6":"扩展词汇范围，巩固辨析与拼写。","ky":"面向考研词汇标签的系统学习。"}

static func open(h) -> void:
	h.book_draft={"id":h.data.bookSettings.selected,"batch":h.data.study.settings.batch,"goal":h.data.study.settings.goal,"difficulty":h.data.study.settings.get("difficulty","all")}
	h.book_setup_open=true;h.rebuild()

static func close(h) -> void:
	h.book_setup_open=false;h.rebuild()

static func choose(h,key:String,value) -> void:
	h.book_draft[key]=value;h.rebuild()

static func card_rect(index:int,total:int) -> Rect2:
	var step=1216.0/total
	return Rect2(CARD_ORIGIN+Vector2(index*step,0),Vector2(step-12,252))

static func build(h) -> void:
	h.button("返回今日计划",Rect2(1024,80,224,36),func():close(h)).add_theme_font_size_override("font_size",15)
	h.button("自定义词书",Rect2(826,80,182,36),func():h.custom_book_ui.open(h),false,not h.state().is_empty() and h.state().get("outcome")==null).name="EditCustomBook"
	for i in h.data.books.size():
		var book:Dictionary=h.data.books[i]
		var selected=h.book_draft.id==book.id
		var b=h.button("",card_rect(i,h.data.books.size()),func():choose(h,"id",book.id))
		b.name="Book_"+book.id
		b.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,T.GREEN if selected else T.EDGE,2 if selected else 1))
		b.add_theme_stylebox_override("hover",T.style(Color(T.GREEN,0.06),T.GREEN,2))
	for i in CUSTOM.LEVELS.size():
		var level=CUSTOM.LEVELS[i]
		var b=h.button(CUSTOM.LEVEL_LABELS[i],Rect2(262+i*176,426,164,38),func():choose(h,"difficulty",level),h.book_draft.difficulty==level)
		b.name="Difficulty_"+level
		b.add_theme_font_size_override("font_size",16)
	for i in 3:
		var amount=[5,10,15][i]
		var b=h.button("%d 词" % amount,Rect2(48+i*112,529,100,42),func():choose(h,"batch",amount),h.book_draft.batch==amount)
		b.name="Batch_"+str(amount);b.add_theme_font_size_override("font_size",17)
	for i in 4:
		var amount=[5,10,20,30][i]
		var b=h.button("%d 词" % amount,Rect2(452+i*100,529,90,42),func():choose(h,"goal",amount),h.book_draft.goal==amount)
		b.name="Goal_"+str(amount);b.add_theme_font_size_override("font_size",17)
	var save=h.button("保存词书与计划",Rect2(920,529,304,42),func():h.bridge.request("book_plan_save",h.book_draft.duplicate()),true)
	save.name="SaveBookPlan";save.add_theme_font_size_override("font_size",19)

static func draw(h) -> void:
	h.text_at("选择词书",32,113,30,T.TEXT)
	h.text_at("选定一本词书，把学习变成每天的行动。",222,111,14,T.MUTED)
	for i in h.data.books.size():
		var book:Dictionary=h.data.books[i]
		var selected=h.book_draft.id==book.id
		var r=card_rect(i,h.data.books.size())
		var x=r.position.x;var y=r.position.y
		h.draw_rect(r,T.SURFACE)
		h.draw_rect(Rect2(x,y,5,r.size.y),T.GREEN if selected else T.EDGE)
		h.text_at(CODES.get(book.id,"我的词条"),x+13,y+31,14,T.GREEN if selected else T.MUTED,-1,true)
		h.text_at(TITLES.get(book.id,book.name),x+13,y+66,20,T.TEXT,r.size.x-24)
		h.text_at("%d" % CUSTOM.count(book,h.book_draft.difficulty),x+13,y+108,32,T.GREEN if selected else T.TEXT,-1,true)
		h.text_at("当前范围",x+107,y+105,13,T.MUTED)
		h.text_at(NOTES.get(book.id,"可导入或手动添加词条"),x+13,y+139,12,T.MUTED,r.size.x-23)
		h.draw_line(Vector2(x+13,y+153),Vector2(r.end.x-13,y+153),T.EDGE)
		h.text_at("已学 %d  /  到期 %d" % [book.seen,book.get("due",0)],x+13,y+179,13,T.MUTED,r.size.x-23)
		h.bar(Rect2(x+13,y+192,r.size.x-26,4),book.seen,book.count,T.GREEN)
		var sample:PackedStringArray=[]
		for j in mini(3,book.preview.size()):sample.append(book.preview[j].word)
		h.text_at(" · ".join(sample),x+13,y+224,12,T.MUTED,r.size.x-23,true)
	h.text_at("词汇难度",48,452,18,T.TEXT)
	h.text_at("基础词按常用词频前 2000 名筛选",804,452,13,T.MUTED)
	h.panel(Rect2(32,485,1216,117),T.SURFACE)
	h.text_at("每轮词数",48,516,18,T.TEXT)
	h.text_at("每日总目标",452,516,18,T.TEXT)
	var name=h.book_draft.id
	for book in h.data.books:
		if book.id==h.book_draft.id:name=book.name;break
	h.text_at(name,920,516,18,T.GREEN,304)
	h.text_at("到期复习优先，之后再补新词。",48,590,12,T.MUTED)
	h.text_at("保存后用于后续计划；当前行动与历史学习记录保留。",32,140,12,T.DIM,860)
