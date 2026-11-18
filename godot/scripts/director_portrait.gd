extends RefCounted

# Portrait-only GIF frames: keep the boss's combat facing independent.
const ROOT="res://assets/portraits/director-v30/"
var actions:Dictionary={}
var cache:Dictionary={}
var current_action="idle"
var current_frame=0
var last_texture:Texture2D

func _init() -> void:
	var parsed=JSON.parse_string(FileAccess.get_file_as_string(ROOT+"manifest.json"))
	if parsed is Dictionary:actions=parsed.get("actions",{})
	for action in actions.values():
		for entry in action.frames:
			var path=ROOT+str(entry.file)
			if not cache.has(path):cache[path]=load(path)

func mood(clip:Dictionary,event:String="") -> String:
	var events:Array=clip.get("events",[])
	if not event.is_empty():events=[event]
	for key in ["victory","combo","ultimate","daily_checkin","daily_done"]:
		if key in events:return "praise"
	for key in ["miss","hurt","defeat"]:
		if key in events:return "scold"
	var caption=str(clip.get("caption",""))
	for word in ["真好","可以啊","Easy","没有一个单词你不会写","解决了"]:
		if word in caption:return "praise"
	for word in ["回家","敢的","狡辩","骗自己","臭老鼠","做一头猪"]:
		if word in caption:return "scold"
	return "talk"

func duration(action:String) -> float:
	var result=0.0
	for entry in actions.get(action,{}).get("frames",[]):result+=float(entry.ms)/1000.0
	return result

func at(action:String,seconds:float) -> Texture2D:
	if not actions.has(action):action="idle"
	current_action=action
	var frames:Array=actions[action].frames
	var cursor=fmod(maxf(0.0,seconds),maxf(duration(action),0.01))*1000.0
	current_frame=frames.size()-1
	for i in frames.size():
		cursor-=float(frames[i].ms)
		if cursor<0:
			current_frame=i;break
	last_texture=cache[ROOT+str(frames[current_frame].file)]
	return last_texture

func sample(h,p:Dictionary) -> Texture2D:
	var v=h.mentor_voice
	if (h.data.get("paused",false) or (v and v.suspended)) and last_texture:
		return last_texture
	var action="idle"
	var clock=float(h.ui_time)
	if p.mode=="voice" and v and not v.active_finished:
		clock=v.playback_seconds()
		action=mood(v.active_clip,v.active_event)
		# A small gesture between speaking beats, timed from the subtitle clock.
		var gesture_clock=fmod(clock,6.4)-4.9
		if action=="talk" and gesture_clock>=0.0 and gesture_clock<duration("glasses"):
			action="glasses";clock=gesture_clock
	elif h.page=="battle" and h.success_time>0.0:
		action="praise";clock=maxf(0.0,1.8-h.success_time)
	else:
		var gesture_clock=fmod(clock,10.6)-9.2
		if gesture_clock>=0.0 and gesture_clock<duration("glasses"):
			action="glasses";clock=gesture_clock
	if h.slow_motion:clock=0.0
	return at(action,clock)
