extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const R=preload("res://scripts/recruitment_ui.gd")
const S=preload("res://scripts/skill_descriptions.gd")
const C=preload("res://scripts/currency_ui.gd")
const HERO=Rect2(320,34,570,570)
var actor=""
var previous=""
var age=1.0
var clock=0.0
var tab="tactic"
var playing=false
var hovered=-1
var was_open=false
var line_cache={}
var weights=[0.0,0.0,0.0,0.0,0.0,0.0]

func advance(h,delta:float) -> void:
	if h.page!="spirits":was_open=false;return
	var id=str(h.shown_operator().id)
	if not was_open or actor!=id:
		previous=actor if was_open else "";actor=id;age=0;clock=0;playing=false;was_open=true
	age+=delta
	clock+=delta
	if playing and clock>duration(h):playing=false
	for i in 6:
		var selected=h.OPS[i].id==id
		weights[i]=move_toward(float(weights[i]),1.0 if selected else 0.35 if i==hovered else 0.0,delta*6)

func duration(h) -> float:
	var total=0.0
	for entry in h.character_gifs.action_data(actor,tab).get("frames",[]):total+=float(entry.ms)/1000.0
	return total

func choose(h,index:int) -> void:
	h.inspect_operator=wrapi(index,0,6);h.rebuild()

func preview(h) -> void:
	clock=0;playing=not h.slow_motion;h.queue_redraw()

func detail(h,value:String,at:Vector2,size_px:int,color:Color) -> void:
	var key=value+str(size_px)
	if not line_cache.has(key):
		var regex=RegEx.new();regex.compile("[0-9]+|[^0-9]")
		var lines=[];var line=""
		for token in regex.search_all(value):
			var part=token.get_string()
			if h.font.get_string_size(line+part,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px).x>288:
				lines.append(line);line=""
			line+=part
		lines.append(line);line_cache[key]=lines
	for i in line_cache[key].size():h.text_at(line_cache[key][i],at.x,at.y+i*(size_px+9),size_px,color)

func build(h) -> void:
	for i in 6:
		var index=i
		var b=h.button("",Rect2(32,142+i*74,224,64),func():choose(h,index))
		b.name="Operator_"+h.OPS[i].id
		# Name and role already appear on the card. No duplicate popup over price.
		b.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,Color.TRANSPARENT))
		b.add_theme_stylebox_override("hover",T.style(Color(0.5,1,0.7,0.04),T.GREEN))
		b.mouse_entered.connect(func():hovered=index)
		b.mouse_exited.connect(func():if hovered==index:hovered=-1)
	for kind in ["tactic","ultimate"]:
		var key=kind
		var b=h.button("战术技能" if kind=="tactic" else "短语大招",Rect2(958 if kind=="tactic" else 1106,150,140,34),func():tab=key;playing=false;h.rebuild(),tab==kind)
		b.name="Inspect_"+kind;b.add_theme_font_size_override("font_size",15)
	var demo=h.button("演示动作",Rect2(752,550,150,34),func():preview(h),false,h.slow_motion)
	demo.name="PreviewOperatorAction";demo.add_theme_font_size_override("font_size",15)
	R.build(h,h.shown_operator())

func draw(h) -> void:
	var op=h.shown_operator()
	var offer=R.info(h,op.id)
	var rank=1
	var xp=0
	for item in h.data.get("avatars",[]):
		if item.id==op.id:rank=int(item.get("bond",{}).get("rank",1));xp=int(item.get("bond",{}).get("xp",0))
	h.draw_rect(Rect2(16,82,256,522),Color(T.INK,0.86))
	h.draw_rect(Rect2(940,82,324,522),Color(T.INK,0.92))
	h.text_at("特战干员",32,116,27,T.TEXT)
	h.text_at("选择你的学习搭档",32,134,12,T.MUTED)
	for i in 6:
		var r=Rect2(32,142+i*74,224,64)
		var item=h.OPS[i]
		var owned=R.info(h,item.id)
		var selected=op.id==item.id
		var w=1.0 if selected and h.slow_motion else float(weights[i])
		h.draw_rect(r,Color(T.SELECTED,0.12+w*0.65))
		h.image_cover(h.textures["portrait_"+item.id],Rect2(r.position,Vector2(62,64)),Color(1,1,1,0.5+0.5*w))
		h.draw_rect(Rect2(r.position,Vector2(3,64)),Color(T.GREEN,w))
		h.text_at(item.name,r.position.x+76,r.position.y+26,20,T.TEXT if selected else T.MUTED)
		h.text_at(item.role,r.position.x+76,r.position.y+48,12,T.GREEN if selected else T.MUTED)
		if owned.unlocked:
			h.text_at("出战" if h.profile().get("avatar","mage")==item.id else "已解锁",r.end.x-54,r.position.y+48,12,T.GREEN)
		else:C.amount(h,int(owned.cost),Vector2(r.end.x-72,r.position.y+48),12,T.MUTED,false,14)
	var fade=1.0 if h.slow_motion else clampf(age/0.28,0,1)
	if fade<1 and not previous.is_empty():h.draw_character(previous,"idle",h.ui_time,HERO,Color(1,1,1,1-fade))
	var rect=HERO
	rect.position.x+=(1-fade)*18
	h.draw_character(op.id,tab if playing else "idle",clock if playing else h.ui_time,rect,Color(1,1,1,fade))
	h.text_at(op.role+" / "+("当前出战" if h.profile().get("avatar","mage")==op.id else "可出战" if offer.unlocked else "待解锁"),310,516,13,T.GREEN)
	h.text_at(op.name,306,558,38,T.TEXT)
	h.text_at(op.en,310,582,15,T.MUTED,-1,true)
	if playing:h.text_at("技能动作演示",752,533,12,T.GREEN)
	h.text_at("哈弗币",958,110,12,T.MUTED)
	C.amount(h,h.data.get("recruitment",{}).get("coins",0),Vector2(1070,118),25,T.TEXT,false,20)
	h.draw_texture_rect(h.textures["skill_"+op.id+"_"+tab],Rect2(958,200,44,44),false)
	h.text_at(op.skill if tab=="tactic" else op.ultimate,1016,229,24,T.TEXT)
	detail(h,S.passive(op.id,rank),Vector2(958,266),14,T.MUTED)
	h.draw_line(Vector2(958,300),Vector2(1246,300),T.EDGE)
	detail(h,S.tactic(op.id,rank) if tab=="tactic" else S.ultimate(op.id,rank),Vector2(958,327),15,T.GREEN)
	h.wrapped("三次普通命中后解锁，每轮一次。" if tab=="tactic" else "积满 100 能量，输入完整短语发动。",Rect2(958,397,288,32),13,T.MUTED)
	h.text_at("总监战中，攻击威力转为压制。",958,417,11,T.ORANGE)
	h.text_at("进阶 R%d  /  熟练度 %d" % [rank,xp],958,435,12,T.MUTED)
	h.draw_rect(T.RECRUIT_PRICE,Color(T.BASE,0.34))
	h.text_at("永久解锁" if not offer.unlocked else "干员状态",970,511,13,T.MUTED)
	h.text_at("已解锁" if offer.unlocked else "%d 哈弗币" % offer.cost,1130,511,14,T.GREEN)
	var message="当前行动不变，下轮生效。" if not h.state().is_empty() and h.state().get("outcome")==null else "还差 %d 哈弗币" % offer.remaining if not offer.unlocked and not offer.affordable else "选择后即可出战" if offer.unlocked else "永久解锁此干员"
	h.text_at(message,958,598,12,T.MUTED)
