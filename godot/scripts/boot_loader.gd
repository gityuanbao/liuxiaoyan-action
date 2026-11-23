extends Control

# The logo remains one image while moving into the actual lobby header.
const T = preload("res://scripts/design_tokens.gd")
const MAIN_SCENE = "res://scenes/main.tscn"
const MAX_PARALLEL = 4
const BRIDGE_TIMEOUT = 25.0
var icon: Texture2D = preload("res://assets/branding/demulan-emblem-v17.png")
var wordmark: Texture2D = preload("res://assets/branding/wordmark-v41.tres")
var font: Font
var mono: Font
var shield: Control
var error_actions: HBoxContainer
var game: Control
var tasks: Array[String] = []
var in_flight: Array[String] = []
var retained: Dictionary = {}
var completed = 0
var total = 0
var target_progress = 0.0
var progress = 0.0
var age = 0.0
var bridge_age = 0.0
var ready_age = 0.0
var transition_age = 0.0
var revealing = false
var finished = false
var skip_requested = false
var error_message = ""
var status_text = "正在整备基地"
var intro_started = false
var intro_age = 0.0
var voice_started = false
var voice_start_age = -1.0
var effects_enabled = true
var sound_toggle:Button
var config_path="user://presentation.cfg"
var effect_history: Array = []
var sound_players: Array[AudioStreamPlayer] = []
var sound_cursor = 0
var sound_stage = 0
var sound_assets = {
	"connect":preload("res://assets/sfx/support.ogg"),
	"scan":preload("res://assets/sfx/click.ogg"),
	"signature":preload("res://assets/sfx/startup-signature-v18.ogg")
}

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_IGNORE
	font=SystemFont.new()
	font.font_names=PackedStringArray(["Microsoft YaHei","Noto Sans CJK SC","PingFang SC","sans-serif"])
	mono=SystemFont.new()
	mono.font_names=PackedStringArray(["Consolas","DejaVu Sans Mono","monospace"])
	font=load("res://fonts/NotoSansSC-Regular.ttf")
	ThemeDB.fallback_font=font
	font.fallbacks=[load("res://fonts/DejaVuSans.ttf")]
	mono=load("res://fonts/SourceCodePro-Regular.ttf")
	mono.fallbacks=[font]
	# Existing focused checks continue to run the original scene directly.
	if preload("res://scripts/mobile_ui.gd").phone_window(get_window()):
		finished=true
		game=load(MAIN_SCENE).instantiate();add_child(game)
		set_process(false);set_process_input(false)
		return
	for flag in ["--qa","--smoke","--voice-qa","--audio-qa","--study-qa","--meme-qa","--page-voice-qa"]:
		if OS.get_cmdline_user_args().has(flag):
			finished=true
			game=load(MAIN_SCENE).instantiate()
			add_child(game)
			set_process(false)
			set_process_input(false)
			return
	texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
	shield=Control.new()
	shield.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shield.mouse_filter=Control.MOUSE_FILTER_STOP
	shield.z_index=100
	add_child(shield)
	shield.gui_input.connect(func(event):
		if event is InputEventMouseButton and event.pressed and event.button_index==MOUSE_BUTTON_LEFT: skip_requested=true)
	var config=ConfigFile.new()
	config_path="user://qa-presentation.cfg" if OS.get_cmdline_user_args().has("--startup-qa") else "user://presentation.cfg"
	if config.load(config_path)==OK: effects_enabled=bool(config.get_value("audio","effects_enabled",true))
	for i in 3:
		var player=AudioStreamPlayer.new()
		add_child(player)
		sound_players.append(player)
	sound_toggle=Button.new()
	sound_toggle.position=Vector2(1084,654)
	sound_toggle.size=Vector2(164,38)
	sound_toggle.add_theme_font_override("font",font)
	sound_toggle.add_theme_font_size_override("font_size",14)
	sound_toggle.add_theme_stylebox_override("normal",T.style(T.INK,T.EDGE))
	sound_toggle.add_theme_stylebox_override("hover",T.style(T.PANEL,T.GREEN))
	sound_toggle.add_theme_color_override("font_color",T.TEXT)
	sound_toggle.pressed.connect(_toggle_sound)
	shield.add_child(sound_toggle)
	_update_sound_button()
	_build_error_actions()
	_begin.call_deferred()

func _exit_tree() -> void:
	# Threaded requests must be collected even when a retry closes this scene early.
	for path in in_flight:
		if ResourceLoader.load_threaded_get_status(path)!=ResourceLoader.THREAD_LOAD_INVALID_RESOURCE:
			ResourceLoader.load_threaded_get(path)
	in_flight.clear()
	for player in sound_players:
		player.stop()
		player.stream=null

func _sound(key: String, gain: float=-14.0, pitch: float=1.0) -> void:
	if not effects_enabled: return
	var player=sound_players[sound_cursor%sound_players.size()]
	sound_cursor+=1
	player.stream=sound_assets[key]
	player.volume_db=gain
	player.pitch_scale=pitch
	player.play()
	effect_history.append({"sound":key,"at":age,"gain":gain,"pitch":pitch})

func _start_intro() -> void:
	intro_started=true
	if not skip_requested: _sound("signature",-2.0)

func _update_sound_button() -> void:
	sound_toggle.text="开场声音：开" if effects_enabled else "开场静音 · 点击开启"

func _toggle_sound() -> void:
	effects_enabled=not effects_enabled
	var config=ConfigFile.new()
	config.load(config_path)
	config.set_value("audio","effects_enabled",effects_enabled)
	config.save(config_path)
	if is_instance_valid(game):
		game.battle_audio.effects_enabled=effects_enabled
		game.rebuild()
	if not effects_enabled:
		for player in sound_players: player.stop()
	elif intro_started and not revealing and intro_age<sound_assets.signature.get_length():
		_sound("signature",-2.0)
		sound_players[(sound_cursor-1)%sound_players.size()].seek(intro_age)
	_update_sound_button()

func _opening_voice() -> void:
	if voice_started: return
	voice_started=true
	voice_start_age=age
	var book=str(game.data.get("bookSettings",{}).get("selected","cet4"))
	game.mentor_voice.opening_page(book)

func _build_error_actions() -> void:
	error_actions=HBoxContainer.new()
	error_actions.position=Vector2(500,590)
	error_actions.add_theme_constant_override("separation",16)
	shield.add_child(error_actions)
	for caption in ["重新连接","退出游戏"]:
		var b=Button.new()
		b.text=caption
		b.custom_minimum_size=Vector2(132,40)
		b.add_theme_font_override("font",font)
		b.add_theme_font_size_override("font_size",16)
		b.add_theme_stylebox_override("normal",T.style(T.DEEP,T.EDGE))
		b.add_theme_stylebox_override("hover",T.style(T.PANEL,T.GREEN))
		b.add_theme_stylebox_override("focus",T.style(Color.TRANSPARENT,T.GREEN,2))
		b.pressed.connect(_retry if caption=="重新连接" else func(): get_tree().quit())
		error_actions.add_child(b)
	error_actions.hide()

func _add_asset(path: String) -> void:
	if path not in tasks: tasks.append(path)

func _begin() -> void:
	# Only the lobby art is on the critical path. Single-threaded Web builds
	# synchronously decode each queued texture, even when called by the pump.
	await get_tree().process_frame
	if OS.has_feature("web"):
		await RenderingServer.frame_post_draw
		JavaScriptBridge.eval("window.dispatchEvent(new CustomEvent('toy-game-milestone',{detail:{name:'frame:boot',at:performance.now()}}))")
	_add_asset("res://assets/generated/base.png")
	var scenes=preload("res://scripts/scene_catalog.gd").SCENES
	for scene in scenes.values():_add_asset(scene.path)
	_add_asset(MAIN_SCENE)
	total=tasks.size()
	_pump()

func _pump() -> void:
	for path in in_flight.duplicate():
		var state=ResourceLoader.load_threaded_get_status(path)
		if state==ResourceLoader.THREAD_LOAD_LOADED:
			retained[path]=ResourceLoader.load_threaded_get(path)
			in_flight.erase(path)
			completed+=1
		elif state in [ResourceLoader.THREAD_LOAD_FAILED,ResourceLoader.THREAD_LOAD_INVALID_RESOURCE]:
			push_error("Startup asset failed: "+path)
			_fail("部分游戏素材未能载入。请刷新网页后重试。")
			return
	var started_this_frame=0
	while not tasks.is_empty() and in_flight.size()<MAX_PARALLEL and started_this_frame<MAX_PARALLEL:
		var path=tasks.pop_front()
		started_this_frame+=1
		# The dummy renderer has no thread-safe texture uploads; CLI checks use a small synchronous batch.
		if DisplayServer.get_name()=="headless" or OS.has_feature("web"):
			var asset=ResourceLoader.load(path)
			if not asset:
				_fail("部分游戏素材未能载入。请刷新网页后重试。")
				return
			retained[path]=asset
			completed+=1
			continue
		var error=ResourceLoader.load_threaded_request(path)
		if error!=OK:
			push_error("Startup asset request failed: "+str(path))
			_fail("部分游戏素材未能载入。请刷新网页后重试。")
			return
		in_flight.append(path)
	if total==0: return
	target_progress=0.9*float(completed)/total
	status_text="正在整备基地" if completed<float(total)*0.35 else "正在检查干员与装备"
	if completed==total and not is_instance_valid(game):
		status_text="正在读取学习记录"
		game=retained[MAIN_SCENE].instantiate()
		game.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
		game.startup_locked=true
		game.page="modes"
		game.show_behind_parent=true
		add_child(game)
		move_child(game,0)
		game.bridge.failed.connect(func(_message): _fail("学习记录暂时无法读取。重试不会清除已有进度。"))
		if not game.error_text.is_empty(): _fail("学习记录暂时无法读取。重试不会清除已有进度。")

func _process(delta: float) -> void:
	if finished: return
	age+=delta
	if not error_message.is_empty():
		queue_redraw()
		return
	if sound_stage==0 and age>0.18:
		sound_stage=1
		_sound("connect",-18,0.9)
	if sound_stage==1 and progress>0.4:
		sound_stage=2
		_sound("scan",-20)
	if not intro_started:
		_pump()
		if is_instance_valid(game):
			bridge_age+=delta
			status_text="正在读取学习记录"
			if game.bridge.ready_to_play:
				target_progress=1.0
				status_text="基地已就绪"
				ready_age+=delta
			elif bridge_age>BRIDGE_TIMEOUT:
				_fail("连接等待时间较长。请重试，已有学习进度会保留。")
				return
		progress=move_toward(progress,target_progress,delta*0.9)
		if target_progress==1.0 and progress>=0.999 and ready_age>=T.BOOT_READY_HOLD and (age>=T.BOOT_MIN_SECONDS or skip_requested):
			_start_intro()
	elif not revealing:
		intro_age+=delta
		if not voice_started and (intro_age>=T.BOOT_VOICE_DELAY or skip_requested):
			_opening_voice()
		if intro_age>=T.BOOT_TITLE_HOLD or skip_requested: revealing=true
	else:
		transition_age+=delta
		if skip_requested:
			for player in sound_players:
				if player.playing and player.stream==sound_assets.signature:
					player.volume_db=lerpf(-2.0,-55.0,clampf(transition_age/_reveal_duration(),0,1))
		if transition_age>=_reveal_duration(): _finish()
	queue_redraw()

func _reveal_duration() -> float:
	return 0.18 if skip_requested else T.BOOT_REVEAL_SECONDS

func _finish() -> void:
	finished=true
	retained.clear()
	for player in sound_players: player.stop()
	shield.queue_free()
	# The lobby paints the identical icon and title at the final animation coordinates.
	game.finish_startup()
	set_process(false)
	set_process_input(false)
	queue_redraw()

func _fail(message: String) -> void:
	if finished or not error_message.is_empty(): return
	error_message=message
	status_text="基地连接中断"
	for player in sound_players: player.stop()
	error_actions.show()
	error_actions.get_child(0).grab_focus()
	queue_redraw()

func _retry() -> void:
	get_tree().reload_current_scene()

func _input(event: InputEvent) -> void:
	if finished or not error_message.is_empty(): return
	if event is InputEventKey and event.pressed:
		if event.keycode in [KEY_ENTER,KEY_KP_ENTER,KEY_SPACE,KEY_ESCAPE]: skip_requested=true
		if event.keycode==KEY_F11:
			get_window().mode=Window.MODE_WINDOWED if get_window().mode==Window.MODE_FULLSCREEN else Window.MODE_FULLSCREEN
		get_viewport().set_input_as_handled()

func _center(value: String, baseline: float, size_px: int, color: Color) -> void:
	draw_string(font,Vector2((1280-font.get_string_size(value,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px).x)/2,baseline),value,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px,color)

func _draw() -> void:
	if finished or not font: return
	var ratio=clampf(transition_age/_reveal_duration(),0,1) if revealing else 0.0
	var ease=ratio*ratio*(3.0-2.0*ratio)
	var veil=1.0-smoothstep(0.3,1.0,ease)
	draw_rect(Rect2(Vector2.ZERO,T.CANVAS),Color(0,0,0,veil))
	var fade=clampf(age/0.3,0,1)
	# Two brief offsets use slices of the same bitmap; the settled mark stays clean.
	var mark_age=maxf(0,intro_age-T.BOOT_MARK_DELAY)
	var settle=1.0-pow(1.0-clampf(mark_age/T.BOOT_MARK_SETTLE,0,1),4)
	var mark_scale=lerpf(2.15,1.0,settle) if intro_started and not skip_requested else 1.0
	var hero_size=T.BOOT_ICON_RECT.size*mark_scale
	var hero_rect=Rect2(T.BOOT_ICON_RECT.get_center()-hero_size/2,hero_size)
	var icon_rect=Rect2(hero_rect.position.lerp(T.BRAND_ICON_RECT.position,ease),hero_rect.size.lerp(T.BRAND_ICON_RECT.size,ease))
	var icon_alpha=fade*clampf(mark_age/0.06,0,1) if intro_started else fade*0.38
	if revealing: icon_alpha=1.0
	if intro_started and not revealing and mark_age<0.18:
		_draw_mark_slices(icon_rect,icon_alpha,mark_age)
	else:
		draw_texture_rect(icon,icon_rect,false,Color(1,1,1,icon_alpha))
	var detail_alpha=fade*clampf(1-ratio*3,0,1)
	var title_alpha=clampf((intro_age-T.BOOT_TITLE_DELAY)/0.16,0,1) if intro_started else fade*0.38
	if revealing: title_alpha=1.0
	var title_size=T.BOOT_WORDMARK_RECT.size.lerp(T.BRAND_WORDMARK_RECT.size,ease)
	var start_offset=T.BOOT_WORDMARK_RECT.get_center()-T.BOOT_ICON_RECT.get_center()
	var end_offset=T.BRAND_WORDMARK_RECT.get_center()-T.BRAND_ICON_RECT.get_center()
	var bend=Vector2(T.BOOT_WORDMARK_RECT.size.x*0.5,start_offset.y)
	var offset=start_offset*(1-ease)*(1-ease)+bend*2*(1-ease)*ease+end_offset*ease*ease
	var title_center=T.BOOT_WORDMARK_RECT.get_center() if not intro_started else icon_rect.get_center()+offset
	var title_rect=Rect2(title_center-title_size/2+Vector2(0,(1-title_alpha)*5 if intro_started else 0),title_size)
	draw_texture_rect(wordmark,title_rect,false,Color(1,1,1,title_alpha))
	_center(T.BOOT_CREDIT,T.BOOT_CREDIT_BASELINE,T.BOOT_CREDIT_SIZE,Color(T.MUTED,detail_alpha*0.85))
	if intro_started:
		if voice_started and detail_alpha>0:
			var caption=game.mentor_text.substr(0,game.mentor_voice.caption_visible())
			_center(caption,650,18,Color(T.TEXT,detail_alpha))
		return
	if detail_alpha<=0: return
	var tint=T.RED if not error_message.is_empty() else T.TEXT
	_center(status_text,482,14,Color(T.MUTED,detail_alpha))
	var percent="%02d%%" % floori(progress*100)
	draw_string(mono,Vector2((1280-mono.get_string_size(percent,HORIZONTAL_ALIGNMENT_LEFT,-1,13).x)/2,532),percent,HORIZONTAL_ALIGNMENT_LEFT,-1,13,Color(T.DIM,detail_alpha))
	draw_rect(T.BOOT_BAR_RECT,Color(T.EDGE,detail_alpha*0.5))
	draw_rect(Rect2(T.BOOT_BAR_RECT.position,Vector2(T.BOOT_BAR_RECT.size.x*progress,T.BOOT_BAR_RECT.size.y)),Color(tint,detail_alpha))
	if not error_message.is_empty():
		_center(error_message,668,15,Color(T.RED,detail_alpha))

func _draw_mark_slices(rect: Rect2, opacity: float, mark_age: float) -> void:
	var offsets=[-0.035,0.06,-0.02] if mark_age<0.065 else [0.025,-0.03,0.015]
	if mark_age>0.12: offsets=[0.0,0.0,0.0]
	var texture_size=Vector2(icon.get_size())
	for i in 3:
		var source=Rect2(0,texture_size.y*i/3.0,texture_size.x,texture_size.y/3.0)
		var target=Rect2(rect.position+Vector2(rect.size.x*offsets[i],rect.size.y*i/3.0),Vector2(rect.size.x,rect.size.y/3.0))
		draw_texture_rect_region(icon,target,source,Color(1,1,1,opacity))
