# 刘晓艳行动 · Git源宝团队制作
# Copyright (c) 2026 Git源宝团队。详见 res://COPYRIGHT.md。
extends Control

const T = preload("res://scripts/design_tokens.gd")
const Bridge = preload("res://scripts/game_bridge.gd")
const Look = preload("res://scripts/presentation.gd")
var bridge: GameBridge
var data: Dictionary = {}
var page = "home"
var selected_stage = 0
var collection_page = 0
var collection_filter = "all"
var ui: Control
var field: LineEdit
var font: Font
var display_font: Font
var mono: Font
var textures: Dictionary = {}
var mentor_text = "出击之前先记住：拼写要准，命要保住。别把字母落在基地。"
var mentor_visible = 0.0
var tick_clock = 0.0
var fx_time = 0.0
var fx_kind = ""
var damage = 0
var feedback = "拼写蓄能，回车释放。连续 4 次命中触发爆发。"
var audio: AudioStreamPlayer
var paused_by_focus = false
var slow_motion = false
var error_text = ""
var result_time = 0.0
var last_word = ""
var saved_draft = ""
var qa = false

func _ready() -> void:
	qa = OS.get_cmdline_user_args().has("--qa")
	font = SystemFont.new()
	font.font_names = PackedStringArray(["Microsoft YaHei", "Noto Sans CJK SC", "PingFang SC", "sans-serif"])
	display_font = SystemFont.new()
	display_font.font_names = font.font_names
	display_font.font_weight = T.FONT_DISPLAY_WEIGHT
	mono = SystemFont.new()
	mono.font_names = PackedStringArray(["Consolas", "DejaVu Sans Mono", "monospace"])
	font=load("res://fonts/NotoSansSC-Regular.ttf")
	ThemeDB.fallback_font=font
	font.fallbacks=[load("res://fonts/DejaVuSans.ttf")]
	mono=load("res://fonts/SourceCodePro-Regular.ttf")
	mono.fallbacks=[font]
	display_font=load("res://fonts/NotoSansSC-Bold.ttf")
	display_font.fallbacks=[font]
	textures["hangar"] = load("res://assets/generated/base.png")
	load_atlas("res://assets/generated/mentor.png", ["mentor", "mentor_smile", "mentor_stern", "mentor_salute"], 2, 2)
	load_atlas("res://assets/generated/allies.png", ["verb", "noun", "adjective", "sun"], 2, 2)
	load_atlas("res://assets/generated/enemies.png", ["crystal", "thorn", "tide", "gargoyle"], 2, 2)
	ui = Control.new()
	ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(ui)
	audio = AudioStreamPlayer.new()
	add_child(audio)
	audio.finished.connect(func(): bridge.request("heard"))
	bridge = preload("res://scripts/browser_bridge.gd").new() if OS.has_feature("web") else Bridge.new()
	bridge.updated.connect(_on_update)
	bridge.failed.connect(func(message): error_text = message.replace("星砂", "哈弗币").replace("星纹", "配件").replace("星灵", "队员"); say(error_text))
	add_child(bridge)
	get_window().focus_exited.connect(_focus_lost)
	get_window().focus_entered.connect(_focus_gained)
	rebuild()
	if qa: _run_qa.call_deferred()

func _process(delta: float) -> void:
	mentor_visible = minf(mentor_text.length(), mentor_visible + delta / T.TYPE_SPEED)
	fx_time = maxf(0, fx_time - delta)
	if page == "result": result_time += delta
	if page == "battle" and bridge.ready_to_play:
		tick_clock += delta
		if tick_clock >= 0.1 and not bridge.busy:
			bridge.request("tick", {"delta": minf(tick_clock * 1000, 500)})
			tick_clock = 0
	queue_redraw()

func say(text: String) -> void:
	mentor_text = text
	mentor_visible = 0

func load_atlas(path: String, names: Array, columns: int, rows: int) -> void:
	var sheet: Texture2D = load(path)
	var cell = sheet.get_size() / Vector2(columns, rows)
	for i in names.size():
		var region = AtlasTexture.new()
		region.atlas = sheet
		region.region = Rect2(Vector2(i % columns, i / columns) * cell, cell)
		region.filter_clip = true
		textures[names[i]] = region

func state() -> Dictionary:
	return data.get("state", {}) if data.get("state") != null else {}

func profile() -> Dictionary:
	return data.get("profile", {})

func stat(key: String) -> int:
	return int(data.get("stats", {}).get(key, 0))

func _on_update(value: Dictionary, action: String) -> void:
	var previous = state()
	var old_index = int(data.get("index", 0))
	var old_chanting = data.get("chanting", false)
	var old_page=page
	data = value
	var s = state()
	if action in ["start", "start_book", "study_start","daily_start", "review_start", "retry_study", "boss_start"]:
		page = "battle"
		error_text = ""
		feedback = "拼写蓄能，回车释放。连续 4 次命中触发爆发。"
		tick_clock = 0
		say("字母写完整再动手。你是在背单词，不是在给它发摩斯电码。")
	if action == "submit" and not previous.is_empty():
		if s.get("hits", 0) > previous.get("hits", 0):
			fx_kind = "hit"
			damage = int(s.get("last", {}).get("damage", 0))
			fx_time = T.FX_TIME
			feedback = "命中 %d 伤害 · %s" % [damage, "四连击爆发！" if s.get("last", {}).get("burst", false) else "准备下一个词"]
			if is_instance_valid(field): field.text = ""
			if s.get("last", {}).get("warded", false): say("它还剩最后一道防线。能量满后，完整写出大招短语。")
		elif s.get("mistakes", 0) > previous.get("mistakes", 0):
			fx_kind = "miss"
			fx_time = T.FX_TIME
			feedback = "错拼 · 连击重置，生命与能量不扣除。修改后重试。"
			say("字母排错队了。仔细看，再拼一次——这次没扣你的血。")
	if not previous.is_empty() and s.get("botAttacks", 0) > previous.get("botAttacks", 0):
		fx_kind = "hurt"
		damage = int(s.get("last", {}).get("damage", 0))
		fx_time = T.FX_TIME
		feedback = "敌方行动 · 受到 %d 伤害" % damage
	if s.get("outcome") != null and page == "battle":
		audio.stop()
		page = "result"
		result_time = 0
		say("打得不错。别得意，能在明天默写出来，才算真本事。" if s.outcome == "victory" else "回来就练。输给单词不丢人，假装自己会了才丢人。")
	if action == "tick" and old_chanting and not data.get("chanting", false) and is_instance_valid(field): field.text = saved_draft
	var controls_only=old_page=="battle" and page=="battle" and action in ["tick","submit","prepare","tactic"]
	if (action != "tick" and not controls_only) or page=="result" or (old_index != int(data.get("index", 0)) and not controls_only) or old_chanting != data.get("chanting", false):
		rebuild()
	if controls_only: _update_battle_controls()
	if action in ["submit","prepare","tactic","chant","pause","hint","bookmark"]:resume_word_input()

func resume_word_input() -> void:
	if page!="battle" or data.get("paused",false) or not is_instance_valid(field) or not field.editable:return
	field.grab_focus()
	# Focus and edit mode are distinct in Godot 4.5 (e.g. after pause).
	if not field.is_editing():field.edit()

func go(target: String) -> void:
	if page == "battle" and target != "battle":
		bridge.request("pause", {"value": true})
		audio.stop()
		bridge.request("audio_stop")
	page = target
	error_text = ""
	if target == "map": say("路线一次走一段。前一关没过，别惦记后面的大家伙。")
	if target == "collection": say("跟打不算记牢。连续三次独立回忆，才有资格从巩固名单里毕业。")
	if target == "spirits": say("搭档各有长处。选你用得顺手的，别光看谁长得精神。")
	rebuild()

func _focus_lost() -> void:
	if page == "battle" and not data.get("paused", false):
		paused_by_focus = true
		bridge.request("pause", {"value": true})
		audio.stop()
		bridge.request("audio_stop")

func _focus_gained() -> void:
	if paused_by_focus:
		paused_by_focus = false
		say("你回来了。点击继续，接着把这场打完。")

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			if page == "battle": bridge.request("pause", {"value": not data.get("paused", false)})
			else: go("home")
		if event.keycode == KEY_F11:
			get_window().mode = Window.MODE_WINDOWED if get_window().mode == Window.MODE_FULLSCREEN else Window.MODE_FULLSCREEN

func button(caption: String, rect: Rect2, callback: Callable, accent: bool = false, disabled: bool = false) -> Button:
	var b = Button.new()
	b.text = caption
	b.position = rect.position
	b.size = rect.size
	b.add_theme_font_override("font", font)
	b.add_theme_font_size_override("font_size", T.FONT_BODY)
	b.add_theme_color_override("font_color", T.INK if accent else T.TEXT)
	b.add_theme_color_override("font_hover_color", T.INK)
	b.add_theme_color_override("font_disabled_color", T.DIM)
	b.add_theme_stylebox_override("normal", T.style(T.ORANGE if accent else T.PANEL, T.ORANGE if accent else T.EDGE))
	b.add_theme_stylebox_override("hover", T.style(T.ORANGE, T.ORANGE))
	b.add_theme_stylebox_override("pressed", T.style(T.GREEN, T.GREEN))
	b.add_theme_stylebox_override("focus", T.style(Color.TRANSPARENT, T.TEXT, 2))
	b.add_theme_stylebox_override("disabled", T.style(T.DEEP, T.BASE))
	b.disabled = disabled
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.pressed.connect(callback)
	ui.add_child(b)
	return b

func rebuild() -> void:
	var draft = field.text if is_instance_valid(field) else ""
	var keep_field=page=="battle" and not data.get("choice") is Dictionary and is_instance_valid(field)
	for child in ui.get_children():
		if keep_field and child==field:continue
		ui.remove_child(child)
		child.queue_free()
	if not keep_field:field = null
	if page != "home": button("‹ 基地", Rect2(32, 14, 96, 36), func(): go("home"))
	button("减弱动效" if not slow_motion else "标准动效", Rect2(1030, 14, 112, 36), func(): slow_motion = not slow_motion; rebuild()).add_theme_font_size_override("font_size", T.FONT_SMALL)
	if not bridge.ready_to_play: return
	match page:
		"home":
			button("出击  /  继续远征", Rect2(48, 300, 300, 64), func(): go("map"), true)
			button("仓库  ·  学习词汇", Rect2(48, 380, 300, 48), func(): collection_filter = "all"; collection_page = 0; go("collection"))
			button("错词本  ·  待巩固", Rect2(48, 440, 300, 48), func(): collection_filter = "review"; collection_page = 0; go("collection"))
			button("小队  ·  出战搭配", Rect2(48, 500, 300, 48), func(): go("spirits"))
			button("配件与委托", Rect2(1000, 514, 216, 40), func(): go("arsenal"))
		"map":
			var stages: Array = data.get("stages", [])
			for i in stages.size():
				var p = node_position(i)
				var st: Dictionary = stages[i]
				var name = str(i + 1).pad_zeros(2) + ("  ◆" if st.get("boss", false) else "  ◇")
				button(name, Rect2(p - Vector2(36, 22), Vector2(72, 44)), func(): selected_stage = i; rebuild(), i == selected_stage)
			if not stages.is_empty():
				var chosen: Dictionary = stages[selected_stage]
				button("开始这段行动" if chosen.unlocked else "完成前一关解锁", Rect2(972, 470, 240, 50), func(): bridge.request("start", {"id": chosen.id}), true, not chosen.unlocked)
			if not state().is_empty() and state().get("outcome") == null:
				button("继续暂停的战斗", Rect2(972, 530, 240, 40), func(): page = "battle"; bridge.request("pause", {"value": false}); rebuild())
		"battle":
			button("继续" if data.get("paused", false) else "暂停", Rect2(800, 82, 92, 36), func(): bridge.request("pause", {"value": not data.get("paused", false)}))
			button("路线", Rect2(904, 82, 72, 36), func(): go("map"))
			if not data.get("chanting", false):
				button("提示", Rect2(694, 354, 82, 34), func(): bridge.request("hint")).name="Hint"
				button("收藏", Rect2(786, 354, 82, 34), func(): bridge.request("bookmark")).name="Bookmark"
			if data.get("stage", {}).get("lesson") == "listening":
				button("重听" if data.get("heard", false) else "播放英文", Rect2(370, 350, 150, 40), play_audio, true, data.get("paused", false) or data.get("playing", false)).name="ReadAudio"
			var new_field=not is_instance_valid(field)
			if new_field:field = LineEdit.new()
			# Enter must submit without leaving text editing or hiding the mobile keyboard.
			field.keep_editing_on_text_submit = true
			field.position = Vector2(48, 432)
			field.size = Vector2(704, 52)
			field.add_theme_font_override("font", mono)
			field.add_theme_font_size_override("font_size", T.FONT_LABEL)
			field.add_theme_stylebox_override("normal", T.style(T.DEEP, T.EDGE))
			field.add_theme_stylebox_override("focus", T.style(T.DEEP, T.ORANGE, 2))
			field.add_theme_color_override("font_color", T.TEXT)
			field.placeholder_text = "输入英文，按 Enter 释放攻击…"
			if new_field:field.text = draft
			if new_field:
				field.text_submitted.connect(func(_text): submit())
				ui.add_child(field)
			button("释放攻击  ↵", Rect2(768, 432, 160, 52), submit, true).name = "Submit"
			button("追击  ·  30 能量", Rect2(48, 505, 208, 56), func(): bridge.request("prepare", {"spell": "surge"})).name = "Surge"
			button("守护  ·  20 能量", Rect2(272, 505, 208, 56), func(): bridge.request("prepare", {"spell": "ward"})).name = "Ward"
			button("战技  ·  每场一次", Rect2(496, 505, 208, 56), func(): bridge.request("tactic")).name = "Tactic"
			button("返回拼写" if data.get("chanting", false) else "大招  ·  100 能量", Rect2(720, 505, 208, 56), func():
				if not data.get("chanting", false): saved_draft = field.text; field.text = ""
				else: field.text = saved_draft
				bridge.request("chant")).name = "Chant"
			_update_battle_controls()
			if new_field:
				resume_word_input()
				field.caret_column = field.text.length()
		"collection":
			for i in 3:
				var key = ["all", "review", "saved"][i]
				button(["全部词汇", "待巩固", "收藏词汇"][i], Rect2(32 + i * 170, 148, 154, 40), func(): collection_filter = key; collection_page = 0; rebuild(), collection_filter == key)
			button("上一页", Rect2(962, 148, 116, 40), func(): collection_page = maxi(0, collection_page - 1); rebuild(), false, collection_page == 0)
			button("下一页", Rect2(1094, 148, 116, 40), func(): collection_page += 1; rebuild(), false, (collection_page + 1) * 12 >= collected().size())
		"spirits":
			var spirits: Array = data.get("spirits", [])
			for i in spirits.size():
				var sp: Dictionary = spirits[i]
				var chosen = profile().get("companion", "moon") == sp.id
				button("已出战" if chosen else "选择队员" if sp.unlocked else "完成 %d 场战斗解锁" % sp.threshold, Rect2(48 + i * 304, 352, 272, 42), func(): bridge.request("companion", {"id": sp.id}), chosen, not sp.unlocked).tooltip_text = sp.skill.description
				button("进阶  ·  R%d" % int(sp.bond.rank), Rect2(48 + i * 304, 402, 272, 34), func(): bridge.request("upgrade", {"kind": "spirit", "id": sp.id}), false, not sp.unlocked or sp.bond.rank >= 3).add_theme_font_size_override("font_size", T.FONT_SMALL)
			var names = ["突击", "防御", "侦察", "情报", "支援", "爆破"]
			var ids = ["mage", "knight", "ranger", "scholar", "bard", "alchemist"]
			for i in ids.size():
				button(names[i], Rect2(48 + i * 197, 508, 181, 44), func(): bridge.request("avatar", {"id": ids[i]}), profile().get("avatar", "mage") == ids[i])
		"arsenal":
			for i in 3:
				var rune: Dictionary = data.runes[i]
				button("改装 / 升级", Rect2(48 + i * 304, 300, 126, 40), func(): bridge.request("rune", {"id": rune.id}), false, rune.rank >= 3)
				button("装备", Rect2(182 + i * 304, 300, 126, 40), func(): bridge.request("equip_rune", {"id": rune.id}), profile().get("expedition", {}).get("equipped", "") == rune.id, rune.rank == 0)
			for i in data.commissions.size():
				var c: Dictionary = data.commissions[i]
				button("已领取" if c.claimed else "领取 +%d" % c.reward, Rect2(1032, 168 + i * 64, 168, 42), func(): bridge.request("claim", {"id": c.id}), false, c.claimed or c.progress < c.target)
		"result":
			button("返回路线", Rect2(410, 510, 220, 52), func(): go("map"), true)
			button("再来一场", Rect2(650, 510, 220, 52), func(): bridge.request("start", {"id": data.stage.id}))

func _update_battle_controls() -> void:
	if not is_instance_valid(field): return
	var s = state()
	var stopped = data.get("stopped", false) or float(data.get("cooldown", 0)) > 0
	field.editable = not data.get("paused",false)
	field.placeholder_text = "已暂停 · 点击继续" if data.get("paused", false) else "请先完整听完英文" if data.get("stopped", false) else "输入英文，按 Enter 释放攻击…"
	var chanting = data.get("chanting", false)
	for name in ["Submit", "Surge", "Ward", "Tactic", "Chant"]:
		var b = ui.get_node_or_null(name)
		if not b: continue
		b.focus_mode=Control.FOCUS_NONE
		b.disabled = stopped
		if name == "Surge": b.disabled = stopped or chanting or s.get("energy", 0) < 30
		if name == "Ward": b.disabled = stopped or chanting or s.get("energy", 0) < 20 or s.get("shield", 0) >= 40
		if name == "Tactic": b.disabled = stopped or chanting or s.get("tacticUsed", false) or s.get("normalHits", 0) < 3 or (s.get("avatar", "mage") == "mage" and s.get("energy", 0) >= 100)
		if name == "Chant": b.disabled = stopped or s.get("energy", 0) < 100

func submit() -> void:
	if is_instance_valid(field) and not data.get("stopped",false) and float(data.get("cooldown",0))<=0 and not field.text.strip_edges().is_empty(): bridge.request("submit", {"text": field.text})

func play_audio() -> void:
	if data.get("paused", false) or data.get("playing", false): return
	var path = "res://legacy_media" + str(data.get("audio", ""))
	if not ResourceLoader.exists(path):
		say("找不到本关音频，请检查项目的 legacy_media 文件夹。")
		return
	bridge.request("audio")
	audio.stream = load(path)
	audio.play()

func collected() -> Array:
	var rows: Array = data.get("collection", [])
	if collection_filter == "review": return rows.filter(func(w): return w.get("needsReview",w.streak<3))
	if collection_filter == "saved": return rows.filter(func(w): return profile().get("notebook", {}).get("saved", []).has(w.id))
	return rows

func text_at(value: String, x: float, y: float, size_px: int = T.FONT_BODY, color: Color = T.TEXT, width: float = -1, is_mono: bool = false) -> void:
	var face=mono if is_mono else display_font if size_px>=T.FONT_DISPLAY_THRESHOLD else font
	draw_string(face, Vector2(x, y), value, HORIZONTAL_ALIGNMENT_LEFT, width, size_px, color)

func wrapped(value: String, rect: Rect2, size_px: int = T.FONT_BODY, color: Color = T.TEXT) -> void:
	var line = ""
	var y = rect.position.y
	for ch in value:
		if ch == "\n" or font.get_string_size(line + ch, HORIZONTAL_ALIGNMENT_LEFT, -1, size_px).x > rect.size.x:
			text_at(line, rect.position.x, y, size_px, color)
			y += size_px * 1.6
			line = "" if ch == "\n" else ch
		else: line += ch
		if y > rect.end.y: return
	text_at(line, rect.position.x, y, size_px, color)

func panel(rect: Rect2, color: Color = T.PANEL, edge: Color = T.EDGE) -> void:
	var p = rect.position
	var e = rect.end
	var c = T.CUT
	var poly = PackedVector2Array([p, Vector2(e.x-c,p.y), Vector2(e.x,p.y+c), e, Vector2(p.x+c,e.y), Vector2(p.x,e.y-c)])
	draw_colored_polygon(poly, color)
	poly.append(p)
	draw_polyline(poly, edge, 1.0)

func bar(rect: Rect2, value: float, max_value: float, color: Color) -> void:
	draw_rect(rect, T.DEEP)
	draw_rect(Rect2(rect.position, Vector2(rect.size.x * clampf(value / maxf(1,max_value), 0, 1), rect.size.y)), color)
	for x in range(int(rect.position.x) + 12, int(rect.end.x), 16): draw_line(Vector2(x, rect.position.y), Vector2(x, rect.end.y), T.DEEP, 2)

func sprite(name: String, rect: Rect2, tint: Color = Color.WHITE) -> void:
	draw_texture_rect(textures[name], rect, false, tint)

func backdrop(rect: Rect2, tint: Color = Color.WHITE) -> void:
	var tex: Texture2D = textures["hangar"]
	var ratio = maxf(rect.size.x / tex.get_width(), rect.size.y / tex.get_height())
	var source = rect.size / ratio
	draw_texture_rect_region(tex, rect, Rect2((tex.get_size()-source)/2,source), tint)

func node_position(i: int) -> Vector2:
	var row = i / 6
	var col = i % 6 if row == 0 else 5 - i % 6
	return Vector2(110 + col * 148, 268 + row * 206)

func _draw() -> void:
	if not font: return
	draw_rect(Rect2(Vector2.ZERO, T.CANVAS), T.INK)
	for x in range(0,1280,T.GRID_STEP): draw_line(Vector2(x,64),Vector2(x,688),T.GRID)
	for y in range(64,688,T.GRID_STEP): draw_line(Vector2(0,y),Vector2(1280,y),T.GRID)
	draw_rect(Rect2(0,0,1280,64),T.DEEP)
	draw_line(Vector2(32,63),Vector2(1248,63),T.EDGE)
	if page == "home":
		text_at("刘晓艳行动", 32, 41, T.FONT_LABEL)
		text_at("战术学习终端", 160, 39, T.FONT_SMALL, T.MUTED)
	else: text_at("刘晓艳行动  /  " + {"map":"远征航路","battle":"拼写交战","collection":"词汇仓库","spirits":"出战搭配","arsenal":"补给整备","result":"战后报告"}.get(page,""),148,39,T.FONT_BODY)
	text_at("本地已连接" if bridge and bridge.ready_to_play else "正在连接…", 875, 38, T.FONT_SMALL, T.GREEN if bridge and bridge.ready_to_play else T.ORANGE)
	for i in 4: draw_rect(Rect2(1165+i*6,35-i*4,3,6+i*4),T.GREEN)
	draw_rect(Rect2(1204,23,30,16),T.MUTED,false,1)
	draw_rect(Rect2(1207,26,23,10),T.GREEN)
	draw_rect(Rect2(1235,28,3,6),T.MUTED)
	match page:
		"home": draw_home()
		"map": draw_map()
		"battle": draw_battle()
		"collection": draw_collection()
		"spirits": draw_spirits()
		"arsenal": draw_arsenal()
		"result": draw_result()
	# Mentor is a texture; dialogue reveal is presentation-only.
	panel(Rect2(32,T.DIALOG_Y,1216,T.DIALOG_H),T.DEEP)
	var expression = "mentor_stern" if fx_kind == "miss" and fx_time > 0 else "mentor_smile" if fx_kind == "hit" and fx_time > 0 else "mentor_salute" if page == "result" and state().get("outcome") == "victory" else "mentor"
	sprite(expression,Rect2(40,T.DIALOG_Y,84,82))
	draw_rect(Rect2(135,T.DIALOG_Y+16,3,50),T.ORANGE)
	text_at("英语总监",154,T.DIALOG_Y+26,T.FONT_SMALL,T.ORANGE)
	text_at(mentor_text.substr(0,int(mentor_visible)),154,T.DIALOG_Y+57,T.FONT_BODY,T.TEXT,1066)
	draw_line(Vector2(32,688),Vector2(1248,688),T.EDGE)
	text_at("刘晓艳行动  /  英语总监坐镇",32,709,T.FONT_MICRO,T.MUTED)
	text_at("Esc 暂停 / 返回    F11 全屏    1280 × 720",898,709,T.FONT_MICRO,T.MUTED,-1,true)
	if not error_text.is_empty():
		panel(Rect2(350,66,580,56),T.DEEP,T.RED)
		wrapped(error_text,Rect2(366,88,548,30),T.FONT_SMALL,T.RED)
	for y in range(64,688,4): draw_line(Vector2(0,y),Vector2(1280,y),T.SCAN)

func draw_home() -> void:
	text_at("远征基地 / 01",48,112,T.FONT_SMALL,T.ORANGE)
	text_at("XIAOYAN / OPS",48,185,T.FONT_TITLE,T.ORANGE,-1,true)
	text_at("刘晓艳行动",46,250,T.FONT_HERO)
	text_at("把每一个词，打进记忆。",48,278,T.FONT_BODY,T.MUTED)
	panel(Rect2(380,96,596,470),T.DEEP)
	backdrop(Rect2(382,150,592,416))
	text_at("整备区",404,128,T.FONT_LABEL)
	text_at("队员待命",834,126,T.FONT_SMALL,T.GREEN)
	var n = {"moon":"verb","leaf":"noun","spark":"adjective","sun":"sun"}.get(profile().get("companion","moon"),"verb")
	sprite("mentor",Rect2(490,188,340,340))
	sprite(n,Rect2(814,406,128,128))
	draw_line(Vector2(478,499),Vector2(862,499),T.ORANGE,2)
	draw_rect(Rect2(398,522,560,32),Color(T.DEEP,0.85))
	text_at("出战 / " + Look.SQUAD.get(profile().get("companion","moon"),""),410,544,T.FONT_SMALL,T.TEXT)
	panel(Rect2(992,96,256,470),T.PANEL)
	text_at("行动档案",1012,132,T.FONT_LABEL)
	var values = [str(stat("seen")).pad_zeros(3),str(stat("mastered")).pad_zeros(3),str(stat("review")).pad_zeros(3)]
	var labels = ["接触词汇","已掌握 · 三次独立回忆","待巩固词汇"]
	for i in 3:
		text_at(values[i],1012,198+i*100,T.FONT_WORD,T.ORANGE if i==2 else T.TEXT,-1,true)
		text_at(labels[i],1012,224+i*100,T.FONT_SMALL,T.MUTED)
		if i<2: draw_line(Vector2(1012,244+i*100),Vector2(1228,244+i*100),T.EDGE)
	text_at("学习等级  %02d" % maxi(stat("level"),1),1012,472,T.FONT_BODY)
	bar(Rect2(1012,486,216,6),stat("levelProgress"),data.get("stats",{}).get("levelRequired",100),T.ORANGE)

func draw_map() -> void:
	text_at("行动路线",32,120,T.FONT_TITLE)
	text_at("四个区域 · 十二关行动 · 逐关解锁",206,116,16,T.MUTED)
	panel(Rect2(32,152,912,418),T.DEEP)
	# Topographic survey lines distinguish the map from a generic dashboard.
	for ring in range(7):
		var points = PackedVector2Array()
		for i in range(41):
			var angle = i * TAU / 40
			points.append(Vector2(490,365)+Vector2(cos(angle)*(155+ring*28),sin(angle)*(70+ring*16)))
		draw_polyline(points,T.GRID,2)
	text_at("◇ 普通遭遇     ◆ 首领     绿框：当前选择",56,184,T.FONT_SMALL,T.MUTED)
	for i in 11:
		var p = node_position(i)
		var q = node_position(i+1)
		draw_dashed_line(p,q,T.EDGE,2,7)
	var stages: Array = data.get("stages",[])
	for i in stages.size():
		var p = node_position(i)
		var st: Dictionary = stages[i]
		text_at(Look.stage(st),p.x-60,p.y+48,T.FONT_SMALL,T.TEXT if st.unlocked else T.DIM,128)
		text_at("★".repeat(int(st.stars)) if st.stars else Look.region(st),p.x-40,p.y+72,T.FONT_MICRO,T.ORANGE if st.stars else T.DIM,115)
	panel(Rect2(960,152,288,418),T.PANEL)
	if stages.is_empty(): return
	var chosen: Dictionary = stages[selected_stage]
	text_at("行动 %02d" % (selected_stage+1),980,186,T.FONT_SMALL,T.GREEN)
	text_at(Look.stage(chosen),980,225,T.FONT_LABEL)
	text_at(Look.region(chosen) + (" / 首领" if chosen.get("boss", false) else " / 遭遇"),980,253,T.FONT_SMALL,T.MUTED)
	draw_map_preview(chosen)
	text_at("目标生命 %d" % int(chosen.hp),980,400,T.FONT_BODY)
	var lesson = {"vocabulary":"中文默写" if chosen.get("recall",false) else "单词跟打","listening":"听音拼写","sentence":"完整句子"}.get(chosen.lesson,"")
	text_at(lesson + "  /  首通 +%d 哈弗币" % int(chosen.reward),980,432,T.FONT_SMALL,T.MUTED)
	if chosen.get("seal",false): text_at("最终防线：需要短语大招",980,455,T.FONT_SMALL,T.ORANGE)

func draw_map_preview(chosen:Dictionary) -> void:
	sprite(chosen.monster,Rect2(1055,270,104,104))

func draw_battle() -> void:
	var s = state()
	if s.is_empty(): return
	text_at(Look.stage(data.stage),32,114,T.FONT_LABEL)
	text_at("命中 %02d   连击 %02d" % [s.hits,s.combo],360,110,T.FONT_BODY,T.GREEN if s.combo>=3 else T.MUTED)
	panel(Rect2(32,136,912,278),T.DEEP)
	backdrop(Rect2(34,138,908,274),Color(0.65,0.72,0.65,0.7))
	var shake = Vector2.ZERO
	if fx_time>0 and not slow_motion: shake=Vector2(sin(fx_time*95)*3,cos(fx_time*75)*2)*fx_time/T.FX_TIME
	var hurt = T.RED if fx_kind == "hurt" and fx_time>0.3 else Color.WHITE
	var ally = {"moon":"verb","leaf":"noun","spark":"adjective","sun":"sun"}.get(s.get("companion","moon"),"verb")
	sprite(ally,Rect2(Vector2(66,246)+shake,Vector2(142,142)),hurt)
	text_at(Look.SQUAD.get(s.get("companion","moon"),""),52,180,T.FONT_SMALL,T.TEXT)
	bar(Rect2(52,194,208,10),s.playerHp,140,T.GREEN)
	text_at("HP %d / 140   盾 %d" % [s.playerHp,s.shield],52,226,T.FONT_SMALL,T.MUTED,-1,true)
	sprite(data.stage.monster,Rect2(Vector2(752,218)+shake,Vector2(144,144)),T.ORANGE if fx_kind=="hit" and fx_time>0.3 else Color.WHITE)
	text_at(Look.ENEMIES.get(data.stage.monster,""),694,168,T.FONT_SMALL,T.ORANGE)
	bar(Rect2(694,182,232,10),s.botHp,s.enemyMaxHp,T.RED)
	text_at("HP %d / %d" % [s.botHp,s.enemyMaxHp],694,214,T.FONT_SMALL,T.MUTED,-1,true)
	panel(Rect2(290,226,638 if data.get("chanting",false) else 418,178),T.DEEP,T.ORANGE if data.get("chanting",false) else T.EDGE)
	text_at("短语大招" if data.get("chanting",false) else "听写任务" if data.stage.lesson=="listening" else "拼写任务",310,254,T.FONT_SMALL,T.ORANGE)
	var prompt = str(data.get("prompt",""))
	if prompt.length()<20: text_at(prompt,310,305,T.FONT_WORD,T.TEXT,378,true)
	else: wrapped(prompt,Rect2(310,284,598 if data.get("chanting",false) else 378,110 if data.get("chanting",false) else 63),T.FONT_BODY,T.TEXT)
	if data.word != null and not data.get("chanting",false) and data.stage.lesson!="listening":
		text_at(data.word.translation if data.stage.lesson=="sentence" else data.word.meaning,310,337,T.FONT_BODY,T.MUTED,378)
	var intent: Dictionary = data.get("intent",{})
	var remaining = maxf(0,(float(s.nextBotAt)-float(s.elapsed))/1000)
	text_at("敌袭倒计时  %.1fs" % remaining,52,398,T.FONT_SMALL,T.ORANGE)
	bar(Rect2(48,418,880,4),remaining*1000,float(intent.get("interval",14000)),T.ORANGE)
	if s.combo>=3: panel(Rect2(44,501,888,64),Color.TRANSPARENT,T.GREEN)
	text_at(feedback,48,583,T.FONT_SMALL,T.RED if fx_kind=="miss" and fx_time>0 else T.MUTED,880)
	panel(Rect2(960,136,288,440),T.PANEL)
	text_at("本局词袋",980,173,T.FONT_LABEL)
	text_at("记录本局拼写 · 无容量限制",980,202,T.FONT_SMALL,T.MUTED)
	var attempts: Array = data.get("attempts",[])
	var recent: Array = []
	for item in attempts:
		if not recent.has(item.id): recent.append(item.id)
	text_at("%02d 词" % recent.size(),980,236,T.FONT_BODY,T.ORANGE)
	for i in mini(recent.size(),8):
		var col = i%2
		var row = i/2
		var r = Rect2(980+col*124,252+row*50,112,40)
		panel(r,T.DEEP)
		text_at(recent[maxi(0,recent.size()-8)+i],r.position.x+8,r.position.y+26,T.FONT_SMALL,T.TEXT,96,true)
	text_at("能量  %03d / 100" % s.energy,980,488,T.FONT_BODY,T.GREEN)
	bar(Rect2(980,505,244,9),s.energy,100,T.GREEN)
	var prepared = s.get("preparedSpell")
	text_at("已准备："+str({"surge":"追击","ward":"掩护"}.get(prepared,"")) if prepared else "连续 4 次命中触发爆发",980,548,T.FONT_SMALL,T.MUTED,244)
	if fx_time>0:
		if fx_kind=="hit":
			var offset = (T.FX_TIME-fx_time)*55
			text_at("-%d" % damage,790,255-offset,T.FONT_TITLE,T.GREEN,-1,true)
			if not slow_motion: draw_line(Vector2(205,320),Vector2(790,260),Color(T.GREEN,fx_time/T.FX_TIME),4)
		elif fx_kind=="hurt": text_at("-%d" % damage,140,285-(T.FX_TIME-fx_time)*50,T.FONT_TITLE,T.RED,-1,true)
	if data.get("paused",false):
		panel(Rect2(330,260,340,100),T.DEEP,T.ORANGE)
		text_at("行动暂停",414,303,T.FONT_TITLE)
		text_at("点击右上角「继续」恢复",396,337,T.FONT_SMALL,T.MUTED)

func draw_collection() -> void:
	text_at("错词巩固" if collection_filter=="review" else "词汇仓库",32,120,T.FONT_TITLE)
	text_at("战斗学习即时同步，复习状态与记忆曲线一致。",260,116,T.FONT_BODY,T.MUTED)
	var rows = collected()
	if rows.is_empty():
		panel(Rect2(32,216,1216,348),T.DEEP)
		sprite("noun",Rect2(558,240,152,152))
		text_at("这里还没有词条",532,434,T.FONT_LABEL)
		text_at("先学习一个词，这里就会同步出现词条与复习排期。",414,471,T.FONT_BODY,T.MUTED)
	for i in mini(12,maxi(0,rows.size()-collection_page*12)):
		var w: Dictionary = rows[collection_page*12+i]
		var r = Rect2(32+i%4*308,216+(i/4)*116,292,100)
		panel(r,T.PANEL)
		text_at(w.word,r.position.x+16,r.position.y+32,T.FONT_LABEL,T.TEXT,260,true)
		text_at(w.meaning,r.position.x+16,r.position.y+59,T.FONT_SMALL,T.MUTED,260)
		text_at(str(w.get("memoryStatus","待独立回忆"))+" / "+str(w.get("reviewIn","待安排")),r.position.x+16,r.position.y+84,T.FONT_MICRO,T.ORANGE if w.get("needsReview",true) else T.GREEN)

func draw_spirits() -> void:
	text_at("小队整备",32,120,T.FONT_TITLE)
	text_at("选择同行队员，搭配你的战斗专长。",250,116,T.FONT_BODY,T.MUTED)
	var spirits: Array = data.get("spirits",[])
	for i in spirits.size():
		var sp: Dictionary = spirits[i]
		panel(Rect2(32+i*304,150,288,300),T.PANEL,T.ORANGE if profile().get("companion","moon")==sp.id else T.EDGE)
		sprite(["verb","noun","adjective","sun"][i],Rect2(110+i*304,166,128,128),Color.WHITE if sp.unlocked else Color(0.4,0.45,0.4))
		text_at(Look.SQUAD.get(sp.id,""),52+i*304,317,T.FONT_BODY)
		text_at(Look.PASSIVES.get(sp.id,""),224+i*304,315,T.FONT_MICRO,T.MUTED,84)
	text_at("角色战斗专长",48,484,T.FONT_BODY,T.ORANGE)

func draw_arsenal() -> void:
	text_at("补给整备",32,120,T.FONT_TITLE)
	text_at("哈弗币 %d" % int(profile().get("growth",{}).get("coins",0)),780,116,T.FONT_LABEL,T.ORANGE)
	if not data.has("runes"): return
	for i in 3:
		var rune: Dictionary = data.runes[i]
		panel(Rect2(32+i*304,150,288,208),T.PANEL)
		text_at(Look.RUNES.get(rune.id,""),52+i*304,190,T.FONT_LABEL)
		text_at("等级 %d / 3" % int(rune.rank),52+i*304,221,T.FONT_SMALL,T.ORANGE)
		wrapped(rune.description,Rect2(52+i*304,253,244,35),T.FONT_SMALL,T.MUTED)
	panel(Rect2(32,380,896,184),T.DEEP)
	text_at("每次命中，都在积累。",52,423,T.FONT_TITLE)
	wrapped("首次通关、独立回忆与战斗表现带来哈弗币。改装配件，强化下一次出击；并肩战斗越多，队员的熟练度越高。",Rect2(52,467,840,60),T.FONT_BODY,T.MUTED)
	for i in data.commissions.size():
		var c: Dictionary = data.commissions[i]
		text_at(Look.COMMISSIONS[i],950,160+i*64,T.FONT_SMALL,T.MUTED,272)

func draw_result() -> void:
	var s = state()
	if s.is_empty(): return
	var won = s.get("outcome")=="victory"
	var color = T.GREEN if won else T.RED
	panel(Rect2(240,94,800,474),T.DEEP,color)
	text_at("行动报告 / " + Look.region(data.get("stage",{})),280,134,T.FONT_SMALL,T.MUTED)
	var book_mode=data.get("stage",{}).get("bookMode",false)
	text_at("训练完成" if won and book_mode else "远征胜利" if won else "本次落败",468,221,T.FONT_HERO,color)
	text_at("词书学习进度与成长已保存。" if won and book_mode else "战斗结果已保存，航路与成长已同步。" if won else "本次学习仍会记录。调整搭配，再来一次。",405,265,T.FONT_BODY,T.MUTED)
	var total = int(s.get("hits",0))+int(s.get("mistakes",0))
	var distinct: Array = []
	for a in data.get("attempts",[]):
		if not distinct.has(a.id): distinct.append(a.id)
	var metrics = [str(distinct.size()),str(roundi(float(s.get("hits",0))/maxi(1,total)*100))+"%",str(int(data.get("peak",0))),"+"+str(int(data.get("result",{}).get("xp",0)))]
	for i in 4:
		text_at(metrics[i],316+i*178,370,T.FONT_WORD,T.TEXT,-1,true)
		text_at(["本局单词","正确率","最高连击","学习经验"][i],316+i*178,408,T.FONT_BODY,T.MUTED)
	text_at("命中 %d 次  /  总伤害 %d  /  短语大招 %d 次" % [s.hits,s.dealt,s.ultimateUses],408,464,T.FONT_BODY,T.MUTED)
	if won and result_time<3 and not slow_motion:
		var y = 520-result_time*120
		draw_line(Vector2(952,y+80),Vector2(952,y),Color(T.ORANGE,0.4),3)
		draw_rect(Rect2(948,y,8,8),T.ORANGE)

func _run_qa() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	if not bridge.ready_to_play:
		push_error("QA: bridge did not connect")
		get_tree().quit(2)
		return
	var directory = ProjectSettings.globalize_path("res://qa")
	DirAccess.make_dir_recursive_absolute(directory)
	for target in ["home","map","collection","spirits","arsenal"]:
		go(target)
		mentor_visible = mentor_text.length()
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(directory+"/"+target+".png")
	bridge.request("start", {"id":"bridge-1"})
	await get_tree().create_timer(0.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/battle.png")
	# Play a complete real engine battle, including a wrong spelling.
	field.text = "incorrect"
	field.text_submitted.emit(field.text)
	await get_tree().create_timer(0.2).timeout
	for i in 30:
		if page == "result": break
		field.text = str(data.get("word",{}).get("word",""))
		field.text_submitted.emit(field.text)
		await get_tree().create_timer(0.65).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/result.png")
	go("collection")
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/collection-filled.png")
	bridge.request("start", {"id":"bridge-1"})
	await bridge.updated
	for i in 600:
		if page=="result": break
		while bridge.busy: await get_tree().process_frame
		bridge.request("tick", {"delta":500})
		await bridge.updated
	# Let the result presentation finish before capturing and closing the audio engine.
	await get_tree().create_timer(4.0).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/defeat.png")
	print("QA_RESULT ", JSON.stringify({"page":page,"result":data.get("result"),"profile":profile()}))
	get_tree().quit(0 if page=="result" else 3)

