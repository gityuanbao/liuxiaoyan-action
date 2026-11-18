class_name ResultMeme
extends Control
const T=preload("res://scripts/design_tokens.gd")
const ASSET_ROOT="res://assets/result_video/"
var host:Control
var picture:TextureRect
var reaction:TextureRect
var video:VideoStreamPlayer
var caption:Label
var replay_button:Button
var pause_button:Button
var mute_button:Button
var pictures:Dictionary={}
var clips:Array=[]
var active_clip:Dictionary={}
var last_choices:Dictionary={}
var last_result_id=""
var selected_image=""
var age=0.0
var shown_count=0
var lifetime=0.85
var modal=false
var is_result=false
var pending_start=false
var play_finished=false
var play_count=0
var end_age=0.0
var rng=RandomNumberGenerator.new()

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter=Control.MOUSE_FILTER_IGNORE
	z_index=60
	rng.randomize()
	picture=TextureRect.new()
	picture.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	picture.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	picture.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(picture)
	for id in ["victory","defeat","question"]:pictures[id]=load("res://assets/memes/"+id+".png")
	video=VideoStreamPlayer.new()
	video.name="ResultVideo"
	video.expand=true
	video.loop=false
	video.position=T.RESULT_VIDEO.position
	video.size=T.RESULT_VIDEO.size
	video.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
	video.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(video)
	video.finished.connect(_finished)
	reaction=TextureRect.new()
	reaction.name="TimedReaction"
	reaction.expand_mode=TextureRect.EXPAND_IGNORE_SIZE
	reaction.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	reaction.position=T.RESULT_REACTION.position;reaction.size=T.RESULT_REACTION.size
	reaction.mouse_filter=Control.MOUSE_FILTER_IGNORE
	add_child(reaction);reaction.hide()
	caption=Label.new()
	caption.position=T.RESULT_VIDEO_CAPTION.position
	caption.size=T.RESULT_VIDEO_CAPTION.size
	caption.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
	caption.vertical_alignment=VERTICAL_ALIGNMENT_CENTER
	caption.mouse_filter=Control.MOUSE_FILTER_IGNORE
	caption.add_theme_color_override("font_color",T.TEXT)
	caption.add_theme_font_size_override("font_size",22)
	add_child(caption)
	replay_button=_button("重播",T.RESULT_REPLAY,replay)
	pause_button=_button("暂停",T.RESULT_PAUSE,toggle_pause)
	mute_button=_button("声音：开",T.RESULT_MUTE,toggle_sound)
	var path=ASSET_ROOT+"manifest.json"
	if FileAccess.file_exists(path):
		var manifest=JSON.parse_string(FileAccess.get_file_as_string(path))
		if manifest is Dictionary:clips=manifest.get("clips",[])
	visibility_changed.connect(_visibility_changed)
	hide()

func bind(value:Control) -> void:
	host=value
	caption.add_theme_font_override("font",host.font)
	for b in [replay_button,pause_button,mute_button]:b.add_theme_font_override("font",host.font)

func _button(label:String,rect:Rect2,action:Callable) -> Button:
	var b=Button.new()
	b.text=label;b.position=rect.position;b.size=rect.size
	b.add_theme_font_size_override("font_size",14)
	b.add_theme_stylebox_override("normal",T.style(T.PANEL,T.EDGE))
	b.add_theme_stylebox_override("hover",T.style(T.HOVER,T.GREEN))
	b.add_theme_stylebox_override("focus",T.style(Color.TRANSPARENT,T.GREEN,2))
	b.add_theme_color_override("font_color",T.TEXT)
	b.pressed.connect(action)
	add_child(b)
	return b

func available(won:bool) -> Array:
	return clips.filter(func(c):return c.get("outcome")==("victory" if won else "defeat") and ResourceLoader.exists(ASSET_ROOT+str(c.file)))

func has_videos(won:bool) -> bool:return not available(won).is_empty()

func show_result(result_id:String,won:bool) -> void:
	if result_id.is_empty() or result_id==last_result_id:return
	last_result_id=result_id
	video.stop()
	selected_image="victory" if won else "defeat"
	var options=available(won)
	var fresh=options.filter(func(c):return c.id!=last_choices.get(selected_image,""))
	if not fresh.is_empty():options=fresh
	active_clip=options[rng.randi_range(0,options.size()-1)] if not options.is_empty() else {}
	if not active_clip.is_empty():last_choices[selected_image]=active_clip.id
	is_result=true;modal=false;age=0.0;shown_count+=1;play_finished=false
	end_age=0.0;reaction.hide();picture.modulate.a=1.0;video.modulate.a=1.0
	picture.position=T.RESULT_VIDEO.position;picture.size=T.RESULT_VIDEO.size
	picture.texture=load(ASSET_ROOT+str(active_clip.poster)) if not active_clip.is_empty() else pictures[selected_image]
	picture.show();video.hide()
	caption.text=""
	caption.show()
	for b in [replay_button,pause_button,mute_button]:b.show()
	video.stream=load(ASSET_ROOT+str(active_clip.file)) if not active_clip.is_empty() else null
	pending_start=video.stream!=null
	if is_instance_valid(host) and host.mentor_voice and pending_start:
		host.mentor_voice.pending_page.clear()
		host.mentor_voice.clear_caption()
	show()

func _play() -> void:
	if not visible or not is_result or video.stream==null:return
	if host.mentor_voice:host.mentor_voice.clear_caption()
	video.paused=false
	video.volume=1.0 if host.mentor_voice.enabled else 0.0
	video.play();video.show();picture.hide()
	video.modulate.a=1.0;reaction.hide();end_age=0.0
	pending_start=false;play_finished=false;play_count+=1
	pause_button.text="暂停"

func replay() -> void:
	if active_clip.is_empty():return
	video.stop();video.hide();picture.show();caption.text=""
	picture.texture=load(ASSET_ROOT+str(active_clip.poster))
	picture.modulate.a=1.0;video.modulate.a=1.0;reaction.hide();end_age=0.0
	age=0.0;pending_start=true;play_finished=false

func toggle_pause() -> void:
	if video.is_playing():video.paused=not video.paused
	elif play_finished:replay()
	pause_button.text="继续" if video.paused else "暂停"

func toggle_sound() -> void:
	if is_instance_valid(host) and host.mentor_voice:
		host.mentor_voice.toggle()
		video.volume=1.0 if host.mentor_voice.enabled else 0.0
		mute_button.text="声音：开" if host.mentor_voice.enabled else "声音：关"

func _finished() -> void:
	play_finished=true
	end_age=0.0;reaction.hide()
	picture.texture=pictures.get(str(active_clip.get("end_image",selected_image)),pictures[selected_image])
	picture.modulate.a=0.0;picture.show()
	pause_button.text="播放"
	caption.text=str(active_clip.get("end_caption",""))

func _visibility_changed() -> void:
	if not visible and is_instance_valid(video):
		video.stop();video.paused=false
		pending_start=false
		if is_instance_valid(reaction):reaction.hide()

func show_miss() -> void:
	if visible and is_result:return
	video.stop();video.hide();caption.hide()
	reaction.hide();picture.modulate.a=1.0
	for b in [replay_button,pause_button,mute_button]:b.hide()
	is_result=false;pending_start=false;modal=false
	selected_image="question"
	picture.texture=pictures.question
	picture.size=Vector2(132,132);picture.position=Vector2(1024,230)
	picture.show();age=0.0;show()

func status_text() -> String:
	if pending_start:return "等待读词" if host.battle_audio.reading_busy else "准备播放"
	if play_finished:return "播放完毕"
	if video.paused:return "已暂停"
	return "正在播放" if video.is_playing() else ""

func is_speaking() -> bool:
	return visible and is_result and video.is_playing() and not video.paused and video.volume>0.0

func _process(delta:float) -> void:
	if not visible:return
	age+=delta
	if not is_result:
		if age>=lifetime:hide()
		return
	if not is_instance_valid(host):return
	if host.page!="result":hide();return
	video.volume=1.0 if host.mentor_voice.enabled else 0.0
	mute_button.text="声音：开" if host.mentor_voice.enabled else "声音：关"
	if pending_start and age>=T.RESULT_VIDEO_LEAD and not host.battle_audio.reading_busy:_play()
	if play_finished:
		end_age+=delta
		var blend=clampf(end_age/T.RESULT_END_FADE,0.0,1.0)
		picture.modulate.a=blend;video.modulate.a=1.0-blend
		return
	if video.is_playing():
		var text=""
		for cue in active_clip.get("cues",[]):
			if video.stream_position>=float(cue.at):text=str(cue.text)
		caption.text=text
		reaction.hide()
		for cue in active_clip.get("reaction_cues",[]):
			var elapsed=video.stream_position-float(cue.at)
			var duration=float(cue.duration)
			if elapsed>=0.0 and elapsed<duration:
				reaction.texture=pictures.get(str(cue.image),pictures.question)
				reaction.modulate.a=clampf(minf(elapsed,duration-elapsed)/0.1,0.0,1.0)
				reaction.show()

func handle_key(_event:InputEvent) -> bool:
	# Results remain navigable while the right-hand video is playing.
	return false
