extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const MODES=[
	{"title":"词汇行动","page":"books","scene":"valley","caption":"四级 · 六级 · 考研","detail":"选定词单，拼写出招；复习排期和每日打卡同步记录。","rect":Rect2(Vector2(32,T.MODE_CARD_Y),T.MODE_MAIN_SIZE)},
	{"title":"远征战场","page":"map","scene":"spaceport","caption":"四大战区 / 十二关远征","detail":"跟随路线推进，搭配干员技能，逐关突破防线。","rect":Rect2(Vector2(648,T.MODE_CARD_Y),T.MODE_MAIN_SIZE)},
	{"title":"英语总监","page":"boss","scene":"director","caption":"100 词 / 5,000 血量","detail":"正确拼写打断攻击，连续回忆完成百词挑战。","rect":Rect2(32,T.MODE_MINOR_Y,394,T.MODE_MINOR_H)},
	{"title":"记忆训练","page":"memory","scene":"city","caption":"到期复习 / 薄弱词","detail":"查看到期词与记忆曲线，巩固尚未记稳的单词。","rect":Rect2(442,T.MODE_MINOR_Y,394,T.MODE_MINOR_H)},
	{"title":"行动基地","page":"home","scene":"dam","caption":"干员 / 装备 / 档案","detail":"整备出战干员，查看学习档案和当前行动。","rect":Rect2(852,T.MODE_MINOR_Y,396,T.MODE_MINOR_H)}]

static func choose(h,index:int) -> void:
	h.mode_choice=clampi(index,0,MODES.size()-1)
	h.mode_age=0
	h.rebuild()

static func enter(h) -> void:
	h.go(MODES[h.mode_choice].page)

static func prepare(h) -> void:
	if h.mode_weights.is_empty():
		for i in MODES.size():h.mode_weights.append(1.0 if i==h.mode_choice else 0.0)
	if not h.textures.has("mode_text_shade"):
		var gradient=Gradient.new()
		gradient.offsets=PackedFloat32Array([0.0,0.46,1.0])
		gradient.colors=PackedColorArray(T.MODE_SHADE_COLORS)
		var shade=GradientTexture2D.new()
		shade.gradient=gradient;shade.width=256;shade.height=8
		shade.fill_from=Vector2.ZERO;shade.fill_to=Vector2(1,0)
		h.textures["mode_text_shade"]=shade

static func advance(h,delta:float) -> void:
	prepare(h)
	for i in MODES.size():
		h.mode_weights[i]=move_toward(h.mode_weights[i],1.0 if i==h.mode_choice else 0.0,delta/T.MODE_FADE_SECONDS)

static func build(h) -> void:
	prepare(h)
	for i in MODES.size():
		var idx=i
		var b=h.button("",MODES[i].rect,func():choose(h,idx))
		b.name="ModeCard"+str(i)
		b.tooltip_text=MODES[i].detail
		b.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,T.GREEN if i==h.mode_choice else T.EDGE,2 if i==h.mode_choice else 1))
		b.add_theme_stylebox_override("hover",T.style(Color(0.7,1,0.8,0.035),T.TEXT,2))
		b.add_theme_stylebox_override("pressed",T.style(Color(0.7,1,0.8,0.08),T.GREEN,2))
	var b=h.button("进入"+MODES[h.mode_choice].title,Rect2(974,649,260,34),func():enter(h),true)
	b.name="EnterMode"
	b.add_theme_font_size_override("font_size",17)
	if not h.state().is_empty() and h.state().get("outcome")==null:
		h.button("继续当前行动",Rect2(1080,84,168,38),func(): h.go("battle");h.bridge.request("pause",{"value":false}),true).add_theme_font_size_override("font_size",16)

static func text(h,value:String,pos:Vector2,size_px:int,color:Color,width:float=-1) -> void:
	h.text_at(value,pos.x+1,pos.y+2,size_px,T.MODE_TEXT_SHADOW,width)
	h.text_at(value,pos.x,pos.y,size_px,color,width)

static func draw(h) -> void:
	prepare(h)
	h.text_at("选择行动",32,119,28,T.TEXT)
	h.text_at("选择模式，进入战场。",182,116,14,T.MUTED)
	for i in MODES.size():
		var m=MODES[i]
		var r:Rect2=m.rect
		var selected=i==h.mode_choice
		var weight:float=h.mode_weights[i]
		var tint=T.MODE_IDLE_TINT.lerp(T.MODE_SELECTED_TINT,weight)
		var title_color=T.MODE_IDLE_TEXT.lerp(T.TEXT,weight)
		var caption_color=T.MODE_IDLE_TEXT.lerp(T.ORANGE if i==2 else T.GREEN,weight)
		h.image_cover(h.textures["scene_"+m.scene],r,tint)
		# Shade only the text side, before drawing the character; never cover its body.
		h.draw_texture_rect(h.textures["mode_text_shade"],Rect2(r.position,Vector2(r.size.x*(0.62 if i<2 else 0.88),r.size.y)),false)
		if i<2:
			h.draw_character("mage" if i==0 else "alchemist","idle",h.ui_time,Rect2(r.position+T.MODE_ACTOR_OFFSET,T.MODE_ACTOR_SIZE),tint)
			text(h,m.title,r.position+Vector2(T.MODE_CARD_PAD,226),T.MODE_TITLE_SIZE,title_color,270)
			text(h,m.caption,r.position+Vector2(T.MODE_CARD_PAD,260),T.MODE_CAPTION_SIZE,caption_color,270)
		else:
			if i==2:
				var tex=h.character_gifs.frame("director","idle",h.ui_time)
				# Preserve portrait aspect ratio inside the smaller card.
				h.draw_texture_rect_region(tex,Rect2(r.position+Vector2(252,5),Vector2(116,137)),Rect2(170,78,205,242),tint)
			text(h,m.title,r.position+Vector2(T.MODE_CARD_PAD,64),T.MODE_MINOR_TITLE_SIZE,title_color,216)
			text(h,m.caption,r.position+Vector2(T.MODE_CARD_PAD,98),T.MODE_CAPTION_SIZE,caption_color,230)
		if weight>0:
			h.draw_rect(Rect2(r.position,Vector2(4,r.size.y)),Color(T.GREEN,weight))
			h.draw_rect(Rect2(r.position,Vector2(r.size.x,2)),Color(T.GREEN,weight))
		if selected:
			h.draw_rect(Rect2(r.position+Vector2(T.MODE_CARD_PAD,12),Vector2(66,22)),T.GREEN)
			h.text_at("已选择",r.position.x+T.MODE_CARD_PAD+12,r.position.y+28,12,T.INK)
	h.panel(Rect2(960,614,288,78),T.SURFACE,T.GREEN)
	h.text_at(MODES[h.mode_choice].caption,974,637,13,T.MUTED,260)
