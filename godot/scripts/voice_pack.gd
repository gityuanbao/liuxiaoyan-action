class_name MentorVoicePack
extends Node

# Dialogue owns its caption and audio clock. Runtime never needs an API key.
signal caption_changed(value: String)
const COOLDOWN_SECONDS = 2.5
const PENDING_LIFETIME = 2.5
var enabled = true
var player: AudioStreamPlayer
var clips: Array = []
var last_time = -100.0
var cursors: Dictionary = {}
var config_path = "user://presentation.cfg"
var active_clip: Dictionary = {}
var active_finished = true
var finished_age = 99.0
var active_event = ""
var active_event_context = ""
var suspended = false
var blocked = false
var silent_clock = 0.0
var frozen_clock = 0.0
var pending_event = ""
var pending_expires = 0.0
var preferred_first: Dictionary = {}
var context = "general"
var reading_hold = false
var pending_priority = false
var page_cues: Dictionary = {}
var active_page_key = ""
var pending_page:Dictionary={}
var page_cursors: Dictionary = {}
var shuffle_bags: Dictionary = {}
var last_choices: Dictionary = {}
var recent_choices: Array = []
var randomizer=RandomNumberGenerator.new()
var history_path="user://dialogue-history.cfg"

func _ready() -> void:
	if OS.get_cmdline_user_args().has("--qa") or OS.get_cmdline_user_args().has("--voice-qa") or OS.get_cmdline_user_args().has("--audio-qa") or OS.get_cmdline_user_args().has("--page-voice-qa") or OS.get_cmdline_user_args().has("--startup-qa") or OS.get_cmdline_user_args().has("--study-qa"):
		config_path="user://qa-presentation.cfg"
		history_path="user://qa-dialogue-history.cfg"
	randomizer.randomize()
	var history=ConfigFile.new()
	if history.load(history_path)==OK:
		last_choices=history.get_value("rotation","last",{})
	player=AudioStreamPlayer.new()
	player.volume_db=-3.0
	add_child(player)
	player.finished.connect(_on_finished)
	var config=ConfigFile.new()
	if config.load(config_path)==OK: enabled=bool(config.get_value("audio","mentor_enabled",true))
	var path="res://assets/voice/manifest.json"
	if FileAccess.file_exists(path):
		var parsed=JSON.parse_string(FileAccess.get_file_as_string(path))
		if parsed is Dictionary:
			clips=parsed.get("clips",[])
			preferred_first=parsed.get("preferred_first",{})
			page_cues=parsed.get("page_cues",{})

func _on_finished() -> void:
	active_finished=true
	finished_age=0

func _exit_tree() -> void:
	if player:
		player.stop()
		player.stream=null

func _process(delta: float) -> void:
	if suspended or blocked or reading_hold: return
	if active_finished: finished_age+=delta
	if not enabled and not active_finished:
		silent_clock+=delta
		if silent_clock>=float(active_clip.get("duration",0)): _on_finished()
	if active_finished and not pending_page.is_empty():
		var queued=pending_page.duplicate();pending_page.clear()
		if queued.key=="plan_select":
			preview("guide_plan")
			var scope="ky" if queued.book=="ky" else "general"
			page_cursors["plan_select:"+scope]=int(page_cursors.get("plan_select:"+scope,0))+1
		else:page_event(queued.key,queued.book)
		return
	if not pending_event.is_empty():
		if pending_priority:
			var important=pending_event
			pending_priority=false
			pending_event=""
			trigger(important,true)
			return
		var now=Time.get_ticks_msec()/1000.0
		if now>pending_expires: pending_event=""
		elif active_finished and now-last_time>=COOLDOWN_SECONDS:
			var event=pending_event
			pending_event=""
			trigger(event)

func toggle() -> void:
	var position=playback_seconds()
	enabled=not enabled
	if not enabled:
		silent_clock=position
		player.stop()
	elif not active_clip.is_empty() and not active_finished and not blocked:
		player.play(position)
		player.stream_paused=suspended or reading_hold
	var config=ConfigFile.new()
	config.load(config_path)
	config.set_value("audio","mentor_enabled",enabled)
	config.save(config_path)

func stop() -> void:
	if player: player.stop()
	active_finished=true
	finished_age=99
	active_event=""
	pending_event=""
	pending_priority=false
	suspended=false

func clear_caption() -> void:
	stop()
	active_clip={}

func set_paused(value: bool) -> void:
	if value==suspended: return
	if value: frozen_clock=playback_seconds()
	suspended=value
	if not value and _resume_priority(): return
	if player: player.stream_paused=value or reading_hold

func set_reading(value: bool) -> void:
	if value==reading_hold: return
	if value: frozen_clock=playback_seconds()
	reading_hold=value
	# Start a queued result before releasing the old line's paused stream.
	if not value and _resume_priority(): return
	if player: player.stream_paused=suspended or reading_hold
	if not value and not pending_event.is_empty():
		pending_expires=Time.get_ticks_msec()/1000.0+PENDING_LIFETIME

func _resume_priority() -> bool:
	if not pending_priority or pending_event.is_empty() or suspended or reading_hold or blocked: return false
	var important=pending_event
	pending_priority=false
	pending_event=""
	return trigger(important,true)

func set_blocked(value: bool) -> void:
	if value and not blocked: stop()
	blocked=value

func playback_seconds() -> float:
	if active_finished: return float(active_clip.get("duration",0))
	if suspended or reading_hold: return frozen_clock
	if not enabled: return silent_clock
	if not player or not player.playing: return 0.0
	return maxf(0,player.get_playback_position()+AudioServer.get_time_since_last_mix()-AudioServer.get_output_latency())

static func visible_at(clip: Dictionary, seconds: float) -> int:
	var count=0
	for cue in clip.get("cues",[]):
		if float(cue.at)>seconds: break
		count=int(cue.visible)
	return count

func caption_visible() -> int:
	if active_finished: return str(active_clip.get("caption","")).length()
	return visible_at(active_clip,playback_seconds())

func caption_is_visible() -> bool:
	return not blocked and not active_clip.is_empty() and (not active_finished or finished_age<DesignTokens.COMMS_HOLD_SECONDS)

func is_speaking() -> bool:
	return enabled and not suspended and not reading_hold and not blocked and player and player.playing

func enter_page(key: String, book: String, screen: String="") -> bool:
	var token=screen+":"+key+":"+book
	if token==active_page_key: return false
	if key=="plan_select" and active_clip.get("id","")=="uploaded_english" and not active_finished:
		pending_page={"key":key,"book":book};active_page_key=token
		return true
	pending_page.clear()
	if not page_event(key,book): return false
	active_page_key=token
	return true

func page_event(key: String, book: String) -> bool:
	if not player or blocked or suspended or reading_hold: return false
	var scope="ky" if book=="ky" else "general"
	var candidates=page_candidates(key,book)
	if candidates.is_empty(): return false
	var cursor_key=key+":"+scope
	var clip:Dictionary=_choose(candidates,"page:"+cursor_key)
	if not _play_clip(clip): return false
	page_cursors[cursor_key]=int(page_cursors.get(cursor_key,0))+1
	return true

func page_candidates(key: String, book: String) -> Array:
	var routes:Dictionary=page_cues.get(key,{})
	var ids:Array=routes.get("ky" if book=="ky" else "general",routes.get("general",[]))
	return clips.filter(func(c): return c.id in ids)

func opening_page(book: String) -> bool:
	# The branded opening remains fixed; subsequent lobby entries use the random pool.
	if not preview("uploaded_english"): return false
	context="ky" if book=="ky" else "general"
	active_page_key="home:home:"+book
	page_cursors["home:"+context]=int(page_cursors.get("home:"+context,0))+1
	return true

func _choose(candidates: Array, key: String) -> Dictionary:
	var ids:Array=candidates.map(func(c): return str(c.id))
	var bag:Array=shuffle_bags.get(key,[]).filter(func(id): return id in ids)
	if bag.is_empty():
		bag=ids.duplicate()
		for i in range(bag.size()-1,0,-1):
			var j=randomizer.randi_range(0,i)
			var swap=bag[i];bag[i]=bag[j];bag[j]=swap
	var chosen=0
	for i in bag.size():
		if bag[i]!=last_choices.get(key,"") and bag[i] not in recent_choices:
			chosen=i;break
		if bag[chosen]==last_choices.get(key,"") and bag[i]!=last_choices.get(key,""): chosen=i
	var id=bag[chosen]
	bag.remove_at(chosen)
	shuffle_bags[key]=bag
	last_choices[key]=id
	recent_choices.append(id)
	if recent_choices.size()>3: recent_choices.pop_front()
	var history=ConfigFile.new()
	history.set_value("rotation","last",last_choices)
	history.save(history_path)
	return candidates[ids.find(id)]

func event_clips(event: String) -> Array:
	var scoped=clips.filter(func(c): return event in c.get("events",[]) and c.get("scope","general") in [context,"all"])
	if not scoped.is_empty(): return scoped
	return clips.filter(func(c): return event in c.get("events",[]) and c.get("scope","general")=="general")

func trigger(event: String,priority: bool=false) -> bool:
	if not player or blocked or suspended: return false
	if not active_finished and active_event==event and active_event_context==context: return false
	var candidates=event_clips(event)
	if candidates.is_empty(): return false
	if reading_hold:
		if priority or not pending_priority:
			pending_event=event
			pending_priority=priority
		return false
	var now=Time.get_ticks_msec()/1000.0
	if not priority and (not active_finished or now-last_time<COOLDOWN_SECONDS):
		pending_event=event
		pending_expires=now+PENDING_LIFETIME
		return false
	var cursor=int(cursors.get(event,0))
	var clip:Dictionary=_choose(candidates,"event:"+context+":"+event)
	if not _play_clip(clip): return false
	active_event=event
	active_event_context=context
	cursors[event]=cursor+1
	return true

func preview(id: String) -> bool:
	if blocked or suspended or reading_hold: return false
	for clip in clips:
		if clip.id==id: return _play_clip(clip)
	return false

func _play_clip(clip: Dictionary) -> bool:
	var path="res://assets/voice/"+str(clip.file)
	if not ResourceLoader.exists(path): return false
	player.stop()
	player.stream_paused=false
	player.stream=load(path)
	active_clip=clip
	active_finished=false
	finished_age=0
	active_event=""
	silent_clock=0
	frozen_clock=0
	pending_event=""
	pending_priority=false
	last_time=Time.get_ticks_msec()/1000.0
	# Never emit a caption for an event that is only queued.
	caption_changed.emit(str(clip.get("caption","")))
	if enabled: player.play()
	return true
