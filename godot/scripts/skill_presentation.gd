extends Control

# Visual child of the original command Button; input and skill rules remain in main.gd.
const T=preload("res://scripts/design_tokens.gd")
var icon_texture:Texture2D
var label_font:Font
var skill_title=""
var detail=""
var selected=false

static func icon_key(command:String, operator_id:String) -> String:
	return {"Surge":"surge","Ward":"ward","Tactic":operator_id+"_tactic","Chant":operator_id+"_ultimate"}.get(command,"")

func _ready() -> void:
	mouse_filter=Control.MOUSE_FILTER_IGNORE
	texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR

func sync(data:Dictionary) -> void:
	var command=str(get_parent().name)
	var s:Dictionary=data.get("state",{})
	var last:Dictionary=s.last if s.get("last") is Dictionary else {}
	# Callers provide the normalized battle state without modifying bridge data.
	selected=(command=="Chant" and data.get("chanting",false)) or (command=="Surge" and s.get("preparedSpell")=="surge") or (command=="Ward" and s.get("preparedSpell")=="ward")
	match command:
		"Surge": detail="已装填·待命中" if selected else "30 能量"
		"Ward": detail="已装填·待命中" if selected else "20 能量"
		"Tactic":
			detail="本轮已使用" if s.get("tacticUsed",false) else "能量已满" if s.get("avatar")=="mage" and s.get("energy",0)>=100 else "战技就绪" if s.get("normalHits",0)>=3 else "命中 %d/3 解锁" % s.get("normalHits",0)
		"Chant": detail="点击取消短语" if selected else "100 能量 · 短语"
	if data.get("paused",false): detail="行动已暂停"
	elif float(data.get("cooldown",0))>0: detail="大招已释放" if command=="Chant" and last.get("ultimate",false) else "命中反馈中"
	elif command=="Ward" and s.get("shield",0)>=40: detail="装甲已满"
	var button:Button=get_parent()
	button.add_theme_stylebox_override("normal",T.style(T.SELECTED if selected else T.DEEP,T.GREEN if selected else T.EDGE))
	queue_redraw()

func _draw() -> void:
	var button:Button=get_parent()
	var color=T.MUTED if button.disabled else T.GREEN
	if icon_texture: draw_texture_rect(icon_texture,T.SKILL_ICON_RECT,false,color)
	if label_font:
		draw_string(label_font,T.SKILL_TITLE_POS,skill_title,HORIZONTAL_ALIGNMENT_LEFT,89,T.SKILL_TITLE_SIZE,T.MUTED if button.disabled else T.TEXT)
		draw_string(label_font,T.SKILL_DETAIL_POS,detail,HORIZONTAL_ALIGNMENT_LEFT,89,T.SKILL_DETAIL_SIZE,T.GREEN if selected else T.MUTED)
	if selected: draw_rect(Rect2(1,45,138,2),T.GREEN)
