class_name BattleAudio
extends Node

signal reading_changed(active: bool, word: String)
signal reading_completed(word: String)
var effects_enabled = true
var words_enabled = true
var paused = false
var dictation = false
var config_path = "user://presentation.cfg"
var voices: PackedStringArray = []
var voice_id = ""
var read_player: AudioStreamPlayer
var effects: Array[AudioStreamPlayer] = []
var sounds: Dictionary = {}
var pending_words: Array = []
var current_word: Dictionary = {}
var reading_busy = false
var wait_before_read = 0.0
var read_clock = 0.0
var tts_started = false
var using_tts = false
var utterance_serial = 100
var last_read_text = ""
var reading_history: Array = []
var sound_history: Array = []
var resolved_sound_history: Array = []
const DELTA_ALIASES={"click":"delta_hit","impact":"delta_hit","success":"delta_confirm","combo":"delta_combo","support":"delta_scan"}
var recent: Dictionary = {}
var duck_db = 0.0
var mentor_speaking = false
var status = ""
var web_speech: JavaScriptObject
var ui_player:AudioStreamPlayer
var ui_sounds:Dictionary={}
var ui_history:Array=[]
var ui_current=""
var ui_pending=""
var ui_pending_until=0.0
const UI_PRIORITY={"navigate":0,"toggle_on":1,"toggle_off":1,"purchase":2,"reward":2,"recruit":3,"level_up":4}

func _ready() -> void:
	if OS.has_feature("web"): web_speech=JavaScriptBridge.get_interface("WordSpeech")
	if OS.get_cmdline_user_args().has("--qa") or OS.get_cmdline_user_args().has("--voice-qa") or OS.get_cmdline_user_args().has("--audio-qa") or OS.get_cmdline_user_args().has("--page-voice-qa") or OS.get_cmdline_user_args().has("--startup-qa") or OS.get_cmdline_user_args().has("--study-qa"):
		config_path="user://qa-presentation.cfg"
	var config=ConfigFile.new()
	if config.load(config_path)==OK:
		effects_enabled=bool(config.get_value("audio","effects_enabled",true))
		words_enabled=bool(config.get_value("audio","words_enabled",true))
	for file in ["manifest.json","delta-manifest.json"]:
		var manifest=JSON.parse_string(FileAccess.get_file_as_string("res://assets/sfx/"+file))
		for key in manifest.sounds:
			sounds[key]=load("res://assets/sfx/"+str(manifest.sounds[key].file))
	for i in 8:
		var effect=AudioStreamPlayer.new()
		add_child(effect)
		effects.append(effect)
	var ui_manifest=JSON.parse_string(FileAccess.get_file_as_string("res://assets/sfx/ui/manifest.json"))
	for key in ui_manifest.sounds:
		ui_sounds[key]=load("res://assets/sfx/ui/"+str(ui_manifest.sounds[key].file))
	ui_player=AudioStreamPlayer.new()
	add_child(ui_player)
	read_player=AudioStreamPlayer.new()
	read_player.volume_db=-2
	add_child(read_player)
	read_player.finished.connect(_finish_read)
	if DisplayServer.get_name()!="headless" and not OS.has_feature("web"):
		voices=DisplayServer.tts_get_voices_for_language("en")
		if not voices.is_empty(): voice_id=voices[0]
		DisplayServer.tts_set_utterance_callback(DisplayServer.TTS_UTTERANCE_STARTED,_tts_started)
		DisplayServer.tts_set_utterance_callback(DisplayServer.TTS_UTTERANCE_ENDED,_tts_ended)
		DisplayServer.tts_set_utterance_callback(DisplayServer.TTS_UTTERANCE_CANCELED,_tts_canceled)

func _save() -> void:
	var config=ConfigFile.new()
	config.load(config_path)
	config.set_value("audio","effects_enabled",effects_enabled)
	config.set_value("audio","words_enabled",words_enabled)
	config.save(config_path)

func toggle_effects() -> void:
	effects_enabled=not effects_enabled
	if not effects_enabled:
		for player in effects: player.stop()
		ui_player.stop();ui_pending=""
	_save()

func play_ui_cue(name:String) -> void:
	if not effects_enabled or not ui_sounds.has(name):return
	var priority=int(UI_PRIORITY.get(name,0))
	if (reading_busy or dictation) and not paused:
		if priority>=2 and priority>=int(UI_PRIORITY.get(ui_pending,-1)):
			ui_pending=name;ui_pending_until=Time.get_ticks_msec()/1000.0+6.0
		return
	if ui_player.playing and priority<int(UI_PRIORITY.get(ui_current,0)):
		if priority>=2 and priority>=int(UI_PRIORITY.get(ui_pending,-1)):
			ui_pending=name;ui_pending_until=Time.get_ticks_msec()/1000.0+6.0
		return
	var now=Time.get_ticks_msec()/1000.0
	if now-float(recent.get("ui_"+name,-100))<0.12:return
	recent["ui_"+name]=now
	ui_current=name;ui_player.stop();ui_player.stream=ui_sounds[name]
	ui_player.volume_db=-10.0+duck_db
	ui_player.play();ui_history.append(name)
	if ui_history.size()>80:ui_history.pop_front()

func toggle_words() -> void:
	words_enabled=not words_enabled
	if not words_enabled: cancel_reads()
	_save()

func play_effect(name: String, gain: float=0.0) -> void:
	var resolved=str(DELTA_ALIASES.get(name,name))
	if not effects_enabled or not sounds.has(resolved): return
	if paused and name not in ["click","reload"]: return
	var now=Time.get_ticks_msec()/1000.0
	if now-float(recent.get(name,-100))<(0.07 if name=="type" else 0.045): return
	recent[name]=now
	var player=effects[0]
	for available in effects:
		if not available.playing: player=available;break
	player.stop()
	player.stream=sounds[resolved]
	player.set_meta("gain",gain-6.0)
	player.volume_db=gain-6.0+duck_db
	player.play()
	sound_history.append(name)
	resolved_sound_history.append(resolved)
	if resolved_sound_history.size()>100: resolved_sound_history.pop_front()
	if sound_history.size()>100: sound_history.pop_front()

func shot(operator_id: String) -> void:
	var types={"mage":"rifle","knight":"shotgun","ranger":"sniper","scholar":"pistol","bard":"rifle","alchemist":"shotgun"}
	play_effect(types.get(operator_id,"rifle"))
	play_effect("impact",-5)

func enqueue_word(word: Dictionary) -> void:
	if not words_enabled or dictation or word.is_empty(): return
	var text=str(word.get("word","")).strip_edges()
	if text.is_empty(): return
	pending_words.append({"id":str(word.get("id",text)),"word":text})
	if not reading_busy:
		reading_busy=true
		tts_started=false
		wait_before_read=0.13
		reading_changed.emit(true,text)

func display_word() -> String:
	if not reading_busy or dictation: return ""
	if not current_word.is_empty(): return str(current_word.word)
	if not pending_words.is_empty(): return str(pending_words[0].word)
	return ""

func _start_read() -> void:
	if pending_words.is_empty(): _finish_read();return
	current_word=pending_words.pop_front()
	last_read_text=str(current_word.word)
	read_clock=0
	tts_started=false
	using_tts=false
	var path="res://legacy_media/audio/word-"+str(current_word.id)+".wav"
	if web_speech:
		using_tts=true
		utterance_serial+=1
		web_speech.speak(last_read_text,utterance_serial)
	elif ResourceLoader.exists(path):
		read_player.stream=load(path)
		read_player.play()
	else:
		if voice_id.is_empty() and DisplayServer.get_name()!="headless":
			voices=DisplayServer.tts_get_voices_for_language("en")
			if not voices.is_empty(): voice_id=voices[0]
		if voice_id.is_empty():
			status="缺少系统英语语音，无法朗读这个词。"
			_finish_read()
			return
		using_tts=true
		utterance_serial+=1
		DisplayServer.tts_speak(last_read_text,voice_id,90,1.0,0.9,utterance_serial,false)
	reading_history.append(last_read_text)
	if reading_history.size()>100: reading_history.pop_front()

func _tts_started(id: int) -> void:
	if using_tts and id==utterance_serial: tts_started=true

func _tts_ended(id: int) -> void:
	if using_tts and id==utterance_serial: _finish_read()

func _tts_canceled(id: int) -> void:
	if using_tts and id==utterance_serial:
		status="单词读音被中断。"
		_finish_read()

func _finish_read() -> void:
	var completed=str(current_word.get("word",""))
	current_word={}
	using_tts=false
	if not completed.is_empty(): reading_completed.emit(completed)
	if not pending_words.is_empty():
		wait_before_read=0.06
	else:
		reading_busy=false
		wait_before_read=0
		reading_changed.emit(false,completed)

func cancel_reads() -> void:
	if web_speech:web_speech.stop()
	utterance_serial+=1
	using_tts=false
	current_word={}
	pending_words.clear()
	wait_before_read=0
	reading_busy=false
	if read_player: read_player.stop()
	if DisplayServer.get_name()!="headless" and not OS.has_feature("web"): DisplayServer.tts_stop()
	reading_changed.emit(false,"")

func set_paused(value: bool) -> void:
	if value==paused: return
	paused=value
	read_player.stream_paused=value
	for player in effects: player.stream_paused=value
	if using_tts and web_speech:
		web_speech.pause(value)
	elif using_tts:
		if value: DisplayServer.tts_pause()
		else: DisplayServer.tts_resume()

func set_dictation(value: bool) -> void:
	if value and not dictation: cancel_reads()
	dictation=value

func _process(delta: float) -> void:
	duck_db=move_toward(duck_db,-14.0 if reading_busy or dictation else -6.0 if mentor_speaking else 0.0,delta*100)
	if ui_player and ui_player.playing:ui_player.volume_db=-10.0+duck_db
	if not ui_pending.is_empty():
		if not effects_enabled or Time.get_ticks_msec()/1000.0>ui_pending_until:ui_pending=""
		elif not reading_busy and not dictation and not ui_player.playing:
			var queued=ui_pending;ui_pending="";play_ui_cue(queued)
	for player in effects:
		if player.playing: player.volume_db=float(player.get_meta("gain",-6))+duck_db
	if paused: return
	if wait_before_read>0:
		wait_before_read-=delta
		if wait_before_read<=0: _start_read()
	elif reading_busy and using_tts:
		if web_speech:
			var web_state=JSON.parse_string(str(web_speech.state()))
			tts_started=bool(web_state.get("started",false))
			read_clock+=delta
			if not web_state.get("active",false) or read_clock>12:
				status=str(web_state.get("error",""))
				if read_clock>12:web_speech.stop()
				_finish_read()
			return
		read_clock+=delta
		if read_clock>12:
			utterance_serial+=1
			using_tts=false
			DisplayServer.tts_stop()
			status="英语读音超时，请检查系统语音设置。"
			_finish_read()
		elif read_clock>0.5 and tts_started and not DisplayServer.tts_is_speaking():
			_finish_read()

func _exit_tree() -> void:
	if web_speech:web_speech.stop()
	if DisplayServer.get_name()!="headless" and not OS.has_feature("web"):
		for event in [DisplayServer.TTS_UTTERANCE_STARTED,DisplayServer.TTS_UTTERANCE_ENDED,DisplayServer.TTS_UTTERANCE_CANCELED]:
			DisplayServer.tts_set_utterance_callback(event,Callable())
		DisplayServer.tts_stop()
	if read_player: read_player.stop()
	if ui_player:ui_player.stop()
	for player in effects: player.stop()
