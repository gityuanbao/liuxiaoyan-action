extends Node

var enabled=true
var level=0.45
var config_path="user://presentation.cfg"
var tracks:Dictionary={}
var players:Array[AudioStreamPlayer]=[]
var weights=[0.0,0.0]
var active=0
var current_key=""
var wanted_key=""
var paused=false
var duck_target=0.0
var duck_db=0.0
var switch_count=0

func _ready() -> void:
	for flag in OS.get_cmdline_user_args():
		if "qa" in flag: config_path="user://qa-presentation.cfg"
	var config=ConfigFile.new()
	if config.load(config_path)==OK:
		enabled=bool(config.get_value("audio","music_enabled",true))
		level=clampf(float(config.get_value("audio","music_level",0.45)),0.1,1.0)
	var manifest=JSON.parse_string(FileAccess.get_file_as_string("res://assets/music/manifest.json"))
	for key in manifest:
		tracks[key]=load("res://assets/music/"+manifest[key].file)
	for i in 2:
		var p=AudioStreamPlayer.new();add_child(p);players.append(p)

func save() -> void:
	var config=ConfigFile.new();config.load(config_path)
	config.set_value("audio","music_enabled",enabled)
	config.set_value("audio","music_level",level)
	config.save(config_path)

func toggle() -> void:
	enabled=not enabled
	if enabled: start(wanted_key)
	else:
		for p in players:p.stop()
		weights=[0.0,0.0];current_key=""
	save()

func cycle_level() -> void:
	level=0.25 if level>=0.99 else minf(1.0,(floorf(level*4)+1)*0.25)
	save()

func start(key:String) -> void:
	if not enabled or not tracks.has(key):return
	active=1-active
	players[active].stop();players[active].stream=tracks[key]
	players[active].volume_db=-60;players[active].play()
	players[active].stream_paused=paused
	weights[active]=0.0;current_key=key;switch_count+=1

func sync(h) -> void:
	var key="boss" if h.page=="battle" and h.DirectorBoss.active(h) else "combat" if h.page=="battle" else "menu"
	if h.startup_locked:key=""
	wanted_key=key
	paused=h.page=="battle" and h.data.get("paused",false)
	duck_target=-20.0 if h.battle_audio and (h.battle_audio.reading_busy or h.battle_audio.dictation) else -12.0 if h.mentor_voice and h.mentor_voice.is_speaking() else 0.0
	if h.result_meme and h.result_meme.is_speaking():duck_target=-16.0
	if h.opening_preview and h.opening_preview.playing:duck_target=-24.0
	if key.is_empty():
		for p in players:p.stop()
		weights=[0.0,0.0];current_key=""
	elif key!=current_key and enabled:start(key)
	for p in players:p.stream_paused=paused

func _process(delta:float) -> void:
	duck_db=move_toward(duck_db,duck_target,delta*45)
	if not enabled or current_key.is_empty() or paused:return
	var p=players[active]
	if not p.playing or (p.stream.get_length()-p.get_playback_position()<1.0 and weights[active]>=0.99):start(current_key)
	for i in 2:
		weights[i]=move_toward(weights[i],1.0 if i==active else 0.0,delta/0.9)
		players[i].volume_db=linear_to_db(maxf(0.001,weights[i]*level))-5.0+duck_db
		if i!=active and weights[i]<=0:players[i].stop()

func _exit_tree() -> void:
	for p in players:p.stop()
