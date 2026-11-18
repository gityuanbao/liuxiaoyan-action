extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const MODES=["spelling","choose_meaning","choose_word"]
const NAMES=["拼写单词","看单词选意思","看意思选单词"]
static func active(h) -> bool:return h.data.get("choice") is Dictionary and not h.data.get("chanting",false)
static func option(h,item:Dictionary,index:int,rect:Rect2,size_px:int=16) -> Button:
	var q:Dictionary=h.data.choice
	var locked=bool(q.answered) or h.data.get("paused",false) or h.data.get("stopped",false)
	var edge=T.GREEN if q.get("correctId","")==item.id else T.RED if q.get("selected","")==item.id else T.EDGE
	var b=h.button("",rect,func():h.bridge.request("choose",{"token":q.token,"option":item.id}),false,locked)
	b.clip_contents=true;b.name="ChoiceOption_%d" % index;b.tooltip_text=item.label
	b.add_theme_stylebox_override("disabled",T.style(T.SELECTED if edge==T.GREEN else T.DEEP,edge,2 if edge!=T.EDGE else 1))
	var letter=Label.new();letter.text=["A","B","C","D"][index];letter.position=Vector2(12,0);letter.size=Vector2(24,rect.size.y)
	letter.vertical_alignment=VERTICAL_ALIGNMENT_CENTER;letter.add_theme_color_override("font_color",edge if edge!=T.EDGE else T.MUTED);letter.add_theme_font_size_override("font_size",17);letter.mouse_filter=Control.MOUSE_FILTER_IGNORE;b.add_child(letter)
	var label=Label.new();label.text=item.label;label.position=Vector2(44,7);label.size=rect.size-Vector2(54,14)
	label.autowrap_mode=TextServer.AUTOWRAP_ARBITRARY;label.vertical_alignment=VERTICAL_ALIGNMENT_CENTER;label.clip_text=true
	label.add_theme_font_override("font",h.font);label.add_theme_font_size_override("font_size",mini(size_px,13) if item.label.length()>28 else size_px);label.add_theme_color_override("font_color",T.TEXT if edge!=T.RED else T.RED);label.mouse_filter=Control.MOUSE_FILTER_IGNORE;b.add_child(label);label.size=rect.size-Vector2(54,14)
	return b
static func build(h) -> void:
	if not active(h):return
	for child in h.ui.get_children():
		if child is Control and child.position.y>=420 and child.position.y<604:
			h.ui.remove_child(child);child.queue_free()
	h.field=null
	for i in 4:option(h,h.data.choice.options[i],i,Rect2(648+(i%2)*300,450+(i/2)*74,284,66),14)
	for i in 4:
		var action=["surge","ward","tactic","chant"][i]
		var label=["Q 强化射击","E 装甲掩护","Z "+h.shown_operator().skill,"C 短语大招"][i]
		var s=h.state()
		var locked=h.data.choice.answered or h.data.paused or (s.energy<30 if i==0 else s.energy<20 if i==1 else s.tacticUsed or s.normalHits<3 if i==2 else s.energy<100)
		var b=h.button(label,Rect2(48+i*106,557,98,35),func():h.bridge.request(action if action in ["tactic","chant"] else "prepare",{} if action in ["tactic","chant"] else {"spell":action}),false,locked)
		b.name=["Surge","Ward","Tactic","Chant"][i];b.add_theme_font_size_override("font_size",12)
	if h.data.choice.answered:h.button("下一题",Rect2(480,557,120,35),func():h.bridge.request("choice_next",{"token":h.data.choice.token}),true,h.data.paused).name="ChoiceNext"
static func draw(h) -> void:
	if not active(h):return
	var q:Dictionary=h.data.choice
	h.draw_rect(Rect2(32,420,1216,184),T.INK)
	h.panel(Rect2(32,420,584,184),T.SURFACE)
	h.panel(Rect2(632,420,616,184),T.SURFACE)
	h.text_at("看单词，选择对应意思" if q.mode=="choose_meaning" else "看意思，选择对应单词",48,447,15,T.GREEN)
	h.text_at("选择一个答案" if not q.answered else "辨认正确" if q.correct else "正确答案已标绿",648,442,13,T.GREEN if not q.answered or q.correct else T.RED)
	if q.answered:
		h.text_at(h.data.lastAnswer.word,48,483,29,T.TEXT,548,true)
		h.wrapped(h.data.lastAnswer.meaning,Rect2(48,510,548,34),14,T.MUTED)
	else:
		h.wrapped(q.prompt,Rect2(48,490,548,48),24 if q.mode=="choose_meaning" else 19,T.TEXT)
