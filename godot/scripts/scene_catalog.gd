extends RefCounted

const SCENES={
	"dam":{"name":"零号大坝","path":"res://assets/generated/zero-dam-battle-v15.png","focus":0.60},
	"valley":{"name":"长弓溪谷","path":"res://assets/maps/v23/valley.png","focus":0.60},
	"city":{"name":"巴克什","path":"res://assets/maps/v23/city.png","focus":0.60},
	"spaceport":{"name":"航天基地","path":"res://assets/maps/v23/spaceport.png","focus":0.60},
	"director":{"name":"总监指挥中庭","path":"res://assets/maps/v23/director.png","focus":0.60}}

static func key_for(stage:Dictionary) -> String:
	if stage.get("bossMode",false): return "director"
	if stage.get("bookMode",false): return {"cet4":"dam","cet6":"valley","ky":"city"}.get(stage.get("pack","cet4"),"dam")
	var id=str(stage.get("id",""))
	for entry in [["forest","valley"],["harbor","city"],["tower","spaceport"]]:
		if id.begins_with(entry[0]): return entry[1]
	return "dam"

static func current(h) -> String:
	if h.page=="map" and not h.data.get("stages",[]).is_empty():
		return key_for(h.data.stages[clampi(h.selected_stage,0,h.data.stages.size()-1)])
	return key_for(h.data.stage if h.data.get("stage") is Dictionary else {})

static func prepare(h) -> void:
	for key in SCENES:
		var tex=CanvasTexture.new()
		tex.diffuse_texture=load(SCENES[key].path)
		tex.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
		h.textures["scene_"+key]=tex
