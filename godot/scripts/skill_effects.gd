extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
var actor=""
var kind=""
var age=99.0
var duration=1.35
var body_cancelled=false
var fire_cued=false
var casts=0
var textures:Dictionary={}
var receipt=""
const FEEDBACK={"mage":"动力启动 · 能量补充","knight":"声波展开 · 装甲强化","ranger":"侦察完成 · 下一击标记","scholar":"解析完成 · 精准锁定","bard":"急救生效 · 生命恢复","alchemist":"爆破就绪 · 下一击强化"}

func prepare() -> void:
	for id in FEEDBACK:
		var frames=[]
		for i in 4:
			var tex=CanvasTexture.new()
			tex.diffuse_texture=load("res://assets/fx/shield-v27/shield-%d.png" % (i+1) if id=="knight" else "res://assets/fx/skills-v23/"+id+"/fx-%d.png" % i)
			tex.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
			frames.append(tex)
		textures[id]=frames

func trigger(id:String,action:String,before:Dictionary={},after:Dictionary={},boss:bool=false) -> void:
	actor=id;kind=action;age=0;duration=1.35 if action=="tactic" else 1.05;body_cancelled=false;fire_cued=false;casts+=1
	var gains:Array[String]=[]
	for entry in [["playerHp","生命"],["shield","护甲"],["energy","能量"]]:
		var amount=int(after.get(entry[0],0))-int(before.get(entry[0],0))
		if amount>0:gains.append("+%d %s" % [amount,entry[1]])
	if kind=="ultimate":
		gains.push_front("压制延长" if boss else "%d 伤害" % int(after.get("last",{}).get("damage",0)))
	elif actor=="ranger":gains.append("下一击已标记 · 敌袭 +4 秒")
	elif actor=="scholar":gains.append("下一击已锁定")
	elif actor=="alchemist":gains.append("下一击强化 · 两次持续压制" if boss else "下一击强化 · 两次灼烧")
	elif actor=="knight":gains.append("敌袭 +1.2 秒")
	elif actor=="bard" and gains.is_empty():gains.append("生命已满")
	receipt=" · ".join(gains)

func clear() -> void:
	age=99;kind="";body_cancelled=false

func advance(delta:float,paused:bool) -> void:
	if not paused:age+=delta

func active() -> bool:return age<duration and not kind.is_empty()

func body_action() -> String:
	return kind if active() and not body_cancelled else ""

func shield_visible(h) -> bool:
	return h.state().get("avatar")=="knight" and (h.state().get("shield",0)>0 or shield_hit(h))

func shield_hit(h) -> bool:
	return h.fx_kind=="hurt" and h.fx_time>0 and int(h.state().get("last",{}).get("absorbed",0))>0

func shield_rect(h,offset:Vector2=Vector2.ZERO) -> Rect2:
	var ally:Rect2=h.battle_actor_rect(false,offset)
	return Rect2(ally.position+T.SHIELD_OFFSET,T.SHIELD_SIZE)

func shield_contact(h,offset:Vector2=Vector2.ZERO) -> Vector2:
	var rect=shield_rect(h,offset)
	return rect.position+rect.size*T.SHIELD_FRONT

func draw_shield(h,offset:Vector2) -> void:
	var casting=active() and actor=="knight"
	if not casting and not shield_visible(h):return
	var frame=[0,1,1,3][clampi(int(age/duration*4),0,3)] if casting else 1
	var alpha=1.0-minf(1.0,maxf(0.0,age/duration-0.72)/0.28)*0.65 if casting else 0.32
	if shield_hit(h):
		frame=2;alpha=0.40+0.55*maxf(0.0,1.0-(T.FX_TIME-h.fx_time)/0.45)
	# Art is already a side-profile right-facing ')' arc. No frontal or mirrored panel.
	h.draw_texture_rect(textures["knight"][frame],shield_rect(h,offset),false,Color(1,1,1,alpha))

func effect_rect(h,offset:Vector2) -> Rect2:
	var ally:Rect2=h.battle_actor_rect(false,offset)
	var target:Vector2=h.battle_target(true,offset)
	var origin=ally.position
	match actor:
		"mage":return Rect2(origin+Vector2(20,112),Vector2(130,92))
		"knight":return shield_rect(h,offset)
		"ranger":return Rect2(target-Vector2(116,35),Vector2(232,124))
		"scholar":return Rect2(target-Vector2(91,91),Vector2(182,182))
		"bard":return Rect2(origin+Vector2(64,150),Vector2(190,184))
		"alchemist":return Rect2(target-Vector2(136,102),Vector2(272,204))
	return Rect2()

func draw(h,offset:Vector2) -> void:
	draw_shield(h,offset)
	if not active() or not textures.has(actor):return
	var f=clampi(int(age/duration*4),0,3)
	var alpha=1.0-minf(1.0,maxf(0.0,age/duration-0.72)/0.28)
	if h.slow_motion:alpha*=0.45
	var rect=effect_rect(h,offset)
	# Booster exhaust goes behind the ally. Defence/healing stay on the ally;
	# scans/locks and explosions attach to the enemy, including the larger boss.
	if actor=="mage":h.draw_flipped(textures[actor][f],rect,Color(1,1,1,alpha))
	elif actor=="knight":pass
	elif actor!="alchemist" or kind=="ultimate" and age>=0.34:
		h.draw_texture_rect(textures[actor][f],rect,false,Color(1,1,1,alpha))
	else:
		# Arming a detonator deals no immediate damage: show its target, not an explosion on ourselves.
		var target:Vector2=h.battle_target(true,offset)
		for direction in [Vector2(-1,-1),Vector2(1,-1),Vector2(-1,1),Vector2(1,1)]:
			var p=target+direction*31
			h.draw_line(p,p-Vector2(direction.x*10,0),Color(T.ORANGE,alpha),2,true)
			h.draw_line(p,p-Vector2(0,direction.y*10),Color(T.ORANGE,alpha),2,true)
	var op=h.operator_for(actor)
	var label=FEEDBACK[actor] if kind=="tactic" else op.name+" · "+op.ultimate
	if actor=="bard" and receipt=="生命已满":label="战地医疗已施放"
	h.text_at(label,442,344,16,Color(T.GREEN,alpha),410)
	h.text_at(receipt,442,367,13,Color(T.TEXT,alpha),410)
