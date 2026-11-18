class_name CharacterAnimations
extends RefCounted

# Godot plays the exact decoded GIF frames and their GIF timing.
var characters: Dictionary = {}
var cache: Dictionary = {}

func _init() -> void:
	var path="res://assets/characters/animations.json"
	if FileAccess.file_exists(path):
		var parsed=JSON.parse_string(FileAccess.get_file_as_string(path))
		if parsed is Dictionary: characters=parsed.get("characters",{})
	# Boot preloads these resources in batches. Keep the frames ready so the first
	# shot/hit never reads a PNG from disk on the render thread.
	for character in characters.values():
		for action in character.get("actions",{}).values():
			for entry in action.get("frames",[]):
				var file=str(entry.file)
				if not cache.has(file):cache[file]=load(file)

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
	if not cache.has(path): cache[path]=load(path)
	return cache[path]
