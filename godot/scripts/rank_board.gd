extends RefCounted

const T = preload("res://scripts/design_tokens.gd")
const TOP_LIMIT = 10

var api: JavaScriptObject
var callback: JavaScriptObject
var snapshot: Dictionary = {}
var pending = ""
var selected_rank = 0
var scroll_offset = 0

func open(h) -> void:
	if OS.has_feature("web") and not api:
		api = JavaScriptBridge.get_interface("WordGameLeaderboard")
		if api: callback = JavaScriptBridge.create_callback(on_result.bind(h))
	selected_rank = 0
	scroll_offset = 0
	h.go("rankings")
	if api: request(h,"refresh")

func request(h, action: String) -> void:
	if not api or not pending.is_empty(): return
	remember_scroll(h)
	pending = action
	h.rebuild.call_deferred()
	match action:
		"refresh": api.refresh(callback)
		"submit": api.submit(callback)
		"worship": api.worship(selected_rank,callback)

func on_result(args: Array, h) -> void:
	var action = pending
	pending = ""
	var decoded = JSON.parse_string(str(args[0])) if args.size() == 1 else null
	if not decoded is Dictionary:
		snapshot = {"status":"error","message":"排行榜返回异常，请重新刷新。"}
	else:
		snapshot = decoded
	if selected_item().is_empty(): selected_rank = 0
	if action == "worship" and snapshot.get("status") == "ok" and worship_record().get("earned",false):
		h.bridge.request("state")
	if h.page == "rankings": h.rebuild.call_deferred()

func items() -> Array:
	var rows = snapshot.get("items",[])
	if not rows is Array: return []
	return rows.slice(0,TOP_LIMIT).filter(func(row): return row is Dictionary and row.has("rank"))

func own_rank() -> int:
	var mine = snapshot.get("mine")
	return int(mine.get("rank",0)) if mine is Dictionary and mine.get("ranked",false) else 0

func worship_record() -> Dictionary:
	var event = snapshot.get("worship")
	return event if event is Dictionary else {}

func selected_item() -> Dictionary:
	for row in items():
		if int(row.rank) == selected_rank: return row
	return {}

func remember_scroll(h) -> void:
	var scroll = h.ui.get_node_or_null("RankScroll")
	if scroll: scroll_offset = scroll.scroll_vertical

func select_rank(h, rank: int) -> void:
	if rank == own_rank() or not pending.is_empty(): return
	remember_scroll(h)
	selected_rank = rank
	h.rebuild()

func layout(h) -> Dictionary:
	var compact: bool = h.mobile_ui.enabled
	var canvas: Vector2 = h.mobile_ui.canvas if compact else T.CANVAS
	var narrow = canvas.x < 560
	var top = 65.0 if compact else 96.0
	var width = minf(canvas.x - (28 if compact else 80), 1096)
	var board = Rect2((canvas.x-width)/2,top,width,canvas.y-top-20)
	var gap = 12.0
	var list_rect = Rect2(board.position,Vector2(width if narrow else (width-gap)*0.59,board.size.y*0.54 if narrow else board.size.y))
	var panel = Rect2(board.position+Vector2(0,list_rect.size.y+gap),Vector2(width,board.size.y-list_rect.size.y-gap)) if narrow else Rect2(list_rect.end.x+gap,top,board.end.x-list_rect.end.x-gap,board.size.y)
	return {"canvas":canvas,"compact":compact,"board":board,"list":list_rect,"side":panel}

func button(h, caption: String, rect: Rect2, handler: Callable, name: String, disabled: bool = false, primary: bool = false) -> void:
	var control: Button = h.button(caption,rect,handler,primary,disabled)
	control.name = name
	control.add_theme_font_size_override("font_size",15 if h.mobile_ui.enabled else 17)
	control.size = rect.size
	if primary:
		control.add_theme_stylebox_override("normal",T.style(T.GREEN,T.GREEN))
		control.add_theme_stylebox_override("hover",T.style(Color("c0ffd2"),T.GREEN))
		control.add_theme_color_override("font_color",T.INK)
		control.add_theme_color_override("font_hover_color",T.INK)

func build(h) -> void:
	var area = layout(h)
	var board: Rect2 = area.board
	button(h,"返回学习",Rect2(board.end.x-110,13 if area.compact else 24,110,40),func():h.go("books"),"RankBack")
	if not api and snapshot.is_empty(): return
	if snapshot.get("status") == "unsupported": return
	var busy = not pending.is_empty()
	var side: Rect2 = area.side
	var pad = 14.0 if area.compact else 22.0
	var first = Vector2(side.position.x+pad,side.position.y+(82 if area.compact else 105))
	var usable_width = side.size.x-pad*2
	var half = (usable_width-8)/2
	button(h,"刷新榜单",Rect2(first,Vector2(half,42)),func():request(h,"refresh"),"RankRefresh",busy)
	button(h,"同步成绩",Rect2(first+Vector2(half+8,0),Vector2(half,42)),func():request(h,"submit"),"RankSubmit",busy or not snapshot.get("canSubmit",false))
	if snapshot.get("status") == "ok":
		var can_worship = snapshot.get("canWorship",false) and selected_rank > 0 and selected_rank != own_rank() and not busy
		button(h,"膜拜并领取 10 币",Rect2(side.position.x+pad,side.end.y-58,usable_width,44),func():request(h,"worship"),"RankWorship",not can_worship,true)
		build_rows(h,area)

func build_rows(h, area: Dictionary) -> void:
	var rows = items()
	if rows.is_empty(): return
	var board: Rect2 = area.list
	var inset = 10 if area.compact else 14
	var scroll = ScrollContainer.new()
	scroll.name = "RankScroll"
	scroll.position = board.position + Vector2(inset,54)
	scroll.size = board.size - Vector2(inset*2,64)
	scroll.follow_focus = true
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	h.ui.add_child(scroll)
	var column = VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation",4)
	scroll.add_child(column)
	for item in rows:
		var rank = int(item.rank)
		var own = rank == own_rank()
		var active = selected_rank == rank
		var row = Button.new()
		row.name = "RankEntry_%d" % rank
		row.text = ""
		row.tooltip_text = "膜拜目标 · 第 %d 名" % rank if not own else "你的学习排名"
		row.custom_minimum_size.y = 43 if area.compact else 48
		row.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
		row.add_theme_stylebox_override("normal",T.style(T.SELECTED if active or own else T.DEEP,T.GREEN if active else T.EDGE))
		row.add_theme_stylebox_override("hover",T.style(T.HOVER,T.GREEN))
		row.add_theme_stylebox_override("pressed",T.style(T.SELECTED,T.GREEN,2))
		row.add_theme_stylebox_override("focus",T.style(Color.TRANSPARENT,T.GREEN,2))
		row.pressed.connect(func():select_rank(h,rank))
		column.add_child(row)
		var line = HBoxContainer.new()
		line.mouse_filter = Control.MOUSE_FILTER_IGNORE
		line.add_theme_constant_override("separation",8)
		row.add_child(line)
		line.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		line.offset_left = 10
		line.offset_right = -10
		var rank_color = T.ORANGE if rank == 1 else T.TEXT if rank <= 3 else T.MUTED
		var number = label("%02d" % rank,h.mono,15 if area.compact else 18,rank_color)
		number.custom_minimum_size.x = 31 if area.compact else 42
		line.add_child(number)
		var nickname = str(item.get("nickname","玩家")).replace("\r"," ").replace("\n"," ").strip_edges()
		if nickname.is_empty(): nickname = "玩家"
		var player = label(nickname+("（你）" if own else ""),h.font,15 if area.compact else 18,T.GREEN if own else T.TEXT)
		player.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		line.add_child(player)
		var score = label("%d XP" % int(item.get("score",0)),h.mono,13 if area.compact else 16,T.GREEN if active else T.MUTED)
		score.custom_minimum_size.x = 90 if area.compact else 115
		score.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		line.add_child(score)
	scroll.set_deferred("scroll_vertical",scroll_offset)

func label(value: String, typeface: Font, px: int, color: Color) -> Label:
	var control = Label.new()
	control.text = value
	control.clip_text = true
	control.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	control.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	control.add_theme_font_override("font",typeface)
	control.add_theme_font_size_override("font_size",px)
	control.add_theme_color_override("font_color",color)
	return control

func draw(h) -> void:
	var area = layout(h)
	var board: Rect2 = area.board
	var backdrop = Rect2(Vector2.ZERO,area.canvas)
	h.draw_rect(backdrop,T.INK)
	var art = h.textures.get("hangar")
	if art: h.image_cover(art,backdrop,Color(0.30,0.35,0.32))
	h.draw_rect(backdrop,Color(T.INK,0.56))
	h.text_at("排行榜",board.position.x,43 if area.compact else 55,28 if area.compact else 36,T.TEXT)
	if (not api and snapshot.is_empty()) or snapshot.get("status") == "unsupported":
		h.panel(board,T.SURFACE,T.EDGE)
		h.text_at("B 站 Toy 内可用",board.position.x+18,board.position.y+43,24,T.GREEN)
		h.wrapped("排行榜和每日膜拜需要连接哔哩哔哩 Toy 服务。",Rect2(board.position.x+18,board.position.y+78,board.size.x-36,52),16,T.MUTED)
		return
	var list_rect: Rect2 = area.list
	var side: Rect2 = area.side
	var compact: bool = area.compact
	var pad = 14 if compact else 22
	h.panel(list_rect,T.SURFACE,T.EDGE)
	h.draw_rect(Rect2(list_rect.position,Vector2(list_rect.size.x,2)),T.GREEN)
	h.panel(side,T.SURFACE,T.EDGE)
	h.text_at("前 10 名",list_rect.position.x+pad,list_rect.position.y+34,19 if compact else 24,T.TEXT)
	h.text_at("累计学习经验",list_rect.end.x-124,list_rect.position.y+33,13 if compact else 15,T.MUTED)
	draw_side(h,side,compact,pad)
	var loading = "正在读取排行榜…" if not pending.is_empty() else ""
	var status = str(snapshot.get("status",""))
	var empty_message = "还没有学习成绩。" if status == "ok" else "暂时无法读取排行榜。"
	if items().is_empty():
		var explanation = str(snapshot.get("message",""))
		var message = loading if not loading.is_empty() else explanation if status != "ok" and not explanation.is_empty() else empty_message
		h.wrapped(message,Rect2(list_rect.position.x+pad,list_rect.position.y+86,list_rect.size.x-pad*2,80),17,T.MUTED)

func draw_side(h, side: Rect2, compact: bool, pad: int) -> void:
	var x = side.position.x+pad
	var top = side.position.y
	var width = side.size.x-2*pad
	var mine = snapshot.get("mine")
	var own = own_rank()
	var mine_text = "第 %d 名  ·  %d XP" % [own,int(mine.get("score",0))] if own > 0 else "暂未上榜，先同步学习成绩。" if mine is Dictionary else "登录 B 站后可查看个人排名。"
	h.text_at("我的排名",x,top+35,19 if compact else 24,T.TEXT)
	h.text_at(mine_text,x,top+65,15 if compact else 18,T.GREEN if own > 0 else T.MUTED,width)
	var divider_y = top+(142 if compact else 171)
	h.draw_line(Vector2(x,divider_y),Vector2(side.end.x-pad,divider_y),T.EDGE)
	h.text_at("每日膜拜",x,divider_y+29,17 if compact else 21,T.TEXT)
	var selected = selected_item()
	var record = worship_record()
	var message = "选择一位上榜玩家，每天可领取 10 哈弗币。"
	if snapshot.get("status") != "ok":
		message = "榜单加载后即可选择膜拜。"
	elif record.get("available",true) == false:
		message = "今天已膜拜，明天再来。"
	elif mine == null:
		message = "登录 B 站后可膜拜。"
	elif not selected.is_empty():
		message = "第 %d 名  %s" % [selected_rank,str(selected.get("nickname","玩家"))]
	if not pending.is_empty():
		message = {"refresh":"正在刷新榜单…","submit":"正在同步学习成绩…","worship":"正在领取奖励…"}.get(pending,message)
	elif not str(snapshot.get("message","")).is_empty():
		message = str(snapshot.message)
	h.wrapped(message,Rect2(x,divider_y+53,width,minf(64,side.end.y-divider_y-112)),15 if compact else 18,T.GREEN if record.get("earned",false) else T.MUTED)
