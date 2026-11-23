class_name CharacterAnimations
extends RefCounted

# Godot plays the exact decoded GIF frames and their GIF timing.
var characters: Dictionary = {}
var cache: Dictionary = {}
var warm_queue: Array[String] = []
const MAX_CACHED_FRAMES = 64

func _init() -> void:
	var path="res://assets/characters/animations.json"
	if FileAccess.file_exists(path):
		var parsed=JSON.parse_string(FileAccess.get_file_as_string(path))
		if parsed is Dictionary: characters=parsed.get("characters",{})

# Prepare only the two combatants, in gameplay order. The first visible frame
# of any animation is always available immediately, including skill previews.
func queue_battle(ally:String,enemy:String) -> void:
	warm_queue.clear()
	for action in ["idle","shoot","hurt","tactic","ultimate","charge","taunt","defeat"]:
		for id in [ally,enemy]:
			var actions:Dictionary=characters.get(id,{}).get("actions",{})
			for entry in actions.get(action,{}).get("frames",[]):
				var path=str(entry.file)
				if not cache.has(path) and path not in warm_queue:warm_queue.append(path)

func warm_next() -> void:
	while not warm_queue.is_empty():
		var path:String=warm_queue.pop_front()
		if not cache.has(path):
			_texture(path)
			break

func _texture(path:String) -> Texture2D:
	var texture:Texture2D=cache.get(path)
	if texture:
		# Dictionary insertion order doubles as a small least-recently-used list.
		cache.erase(path)
	else:
		texture=load(path)
		if cache.size()>=MAX_CACHED_FRAMES:cache.erase(cache.keys()[0])
	cache[path]=texture
	return texture

func action_data(id: String, action: String) -> Dictionary:
	var actions:Dictionary=characters.get(id,{}).get("actions",{})
	return actions.get(action,actions.get("idle",{}))

func frame_index(id: String, action: String, seconds: float) -> int:
	var animation=action_data(id,action)
	var frames:Array=animation.get("frames",[])
	if frames.is_empty(): return 0
	var duration=0.0
	for entry in frames: duration+=float(entry.ms)
	var cursor=maxf(0,seconds*1000)
	if animation.get("loop",false): cursor=fmod(cursor,maxf(1,duration))
	for i in frames.size():
		cursor-=float(frames[i].ms)
		if cursor<0: return i
	return frames.size()-1

func frame(id: String, action: String, seconds: float) -> Texture2D:
	var animation=action_data(id,action)
	var frames:Array=animation.get("frames",[])
	if frames.is_empty(): return null
	var path:String=frames[frame_index(id,action,seconds)].file
	return _texture(path)
