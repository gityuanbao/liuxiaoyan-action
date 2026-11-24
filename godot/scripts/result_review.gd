extends RefCounted

const T=preload("res://scripts/design_tokens.gd")
var wrong_only=false
var video_open=false

func reset() -> void:
	wrong_only=false
	video_open=false

func words(h) -> Array:
	var result=h.data.get("result")
	return result.get("review",[]) if result is Dictionary else []

func has_words(h) -> bool:
	return not words(h).is_empty()

func words_visible(h) -> bool:
	return has_words(h) and not video_open

func open_words(h) -> void:
	if not video_open:return
	video_open=false
	h.result_meme.hide()
	h.rebuild()

func open_video(h) -> void:
	if video_open:return
	video_open=true
	var meme:ResultMeme=h.result_meme
	var result_id=str(h.data.result.id)
	if meme.last_result_id==result_id:
		meme.replay()
		meme.show()
	else:
		meme.show_result(result_id,h.state().outcome=="victory")
	h.rebuild()

func filter(h,only_wrong:bool) -> void:
	if wrong_only==only_wrong:return
	wrong_only=only_wrong
	h.rebuild()

func build(h,rect:Rect2,mobile:bool=false) -> void:
	var all_words=words(h)
	if all_words.is_empty():return
	var review_active=not video_open
	var tab_width=86.0 if mobile else 108.0
	var filter_width=75.0 if mobile else 88.0
	var x=rect.position.x
	var y=rect.position.y
	add_button(h,"ResultWordsTab","本轮词单",Rect2(x,y,tab_width,36),func():open_words(h),review_active,mobile)
	add_button(h,"ResultVideoTab","总监回电",Rect2(x+tab_width+6,y,tab_width,36),func():open_video(h),video_open,mobile)
	if not review_active:return
	var wrong_words=all_words.filter(func(row):return row.mistakes>0)
	add_button(h,"ResultAllWords","全部 %d" % all_words.size(),Rect2(rect.end.x-2*filter_width-6,y,filter_width,36),func():filter(h,false),not wrong_only,mobile)
	add_button(h,"ResultWrongWords","错词 %d" % wrong_words.size(),Rect2(rect.end.x-filter_width,y,filter_width,36),func():filter(h,true),wrong_only,mobile)
	var scroll=ScrollContainer.new()
	scroll.name="ResultWordList"
	scroll.position=rect.position+Vector2(0,43)
	scroll.size=rect.size-Vector2(0,43)
	scroll.horizontal_scroll_mode=ScrollContainer.SCROLL_MODE_DISABLED
	scroll.clip_contents=true
	h.ui.add_child(scroll)
	var entries=VBoxContainer.new()
	entries.mouse_filter=Control.MOUSE_FILTER_IGNORE
	entries.add_theme_constant_override("separation",5)
	entries.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	scroll.add_child(entries)
	var visible_words=wrong_words if wrong_only else all_words
	if visible_words.is_empty():
		entries.add_child(make_label(h,"这轮没有答错的词",16,T.MUTED))
	for row in visible_words:
		entries.add_child(make_row(h,row,mobile))

func add_button(h,node_name:String,title:String,rect:Rect2,action:Callable,selected:bool,mobile:bool) -> void:
	if mobile:
		h.mobile_ui.button(h,title,rect,action,selected,false,node_name)
	else:
		var control:Button=h.button(title,rect,action,selected)
		control.name=node_name
		control.add_theme_font_size_override("font_size",15)

func make_row(h,row:Dictionary,mobile:bool) -> Control:
	var wrong=bool(row.mistakes>0)
	var color=T.ORANGE if wrong else T.GREEN
	var item=PanelContainer.new()
	item.mouse_filter=Control.MOUSE_FILTER_IGNORE
	var frame=T.style(Color("282018") if wrong else T.DEEP,T.ORANGE if wrong else T.EDGE)
	frame.border_width_left=3
	frame.content_margin_left=10
	frame.content_margin_right=10
	frame.content_margin_top=5
	frame.content_margin_bottom=5
	item.add_theme_stylebox_override("panel",frame)
	var lines=VBoxContainer.new()
	lines.mouse_filter=Control.MOUSE_FILTER_IGNORE
	lines.add_theme_constant_override("separation",1)
	item.add_child(lines)
	var title=HBoxContainer.new()
	title.mouse_filter=Control.MOUSE_FILTER_IGNORE
	lines.add_child(title)
	var term=make_label(h,str(row.word),20 if mobile else 22,T.TEXT)
	term.size_flags_horizontal=Control.SIZE_EXPAND_FILL
	title.add_child(term)
	var status="答对"
	if wrong:
		status="错 %d 次%s" % [row.mistakes," · 已订正" if row.lastCorrect else ""]
	var mark=make_label(h,status,14,color)
	mark.autowrap_mode=TextServer.AUTOWRAP_OFF
	title.add_child(mark)
	lines.add_child(make_label(h,str(row.meaning),15 if mobile else 16,T.MUTED))
	if not str(row.expected).is_empty():
		lines.add_child(make_label(h,"正确句子  "+str(row.expected),15,T.TEXT))
	return item

func make_label(h,value:String,size_px:int,color:Color) -> Label:
	var label=Label.new()
	label.text=value
	label.mouse_filter=Control.MOUSE_FILTER_IGNORE
	label.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_override("font",h.font)
	label.add_theme_font_size_override("font_size",size_px)
	label.add_theme_color_override("font_color",color)
	return label
