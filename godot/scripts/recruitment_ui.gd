extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")

static func info(h,id:String) -> Dictionary:
	for item in h.data.get("recruitment",{}).get("operators",[]):
		if item.id==id:return item
	return {"id":id,"unlocked":false,"cost":0,"remaining":0,"affordable":false}

static func card_rect(index:int) -> Rect2:
	return Rect2(T.RECRUIT_CARD_ORIGIN+Vector2(index*T.RECRUIT_CARD_STEP,0),T.RECRUIT_CARD_SIZE)

static func build(h,op:Dictionary) -> void:
	var offer=info(h,op.id)
	var selected=h.profile().get("avatar","mage")==op.id
	var label="正在出战" if selected else "选择干员" if offer.unlocked else "解锁并出战" if offer.affordable else "哈弗币不足"
	var b=h.button(label,T.RECRUIT_ACTION,func():h.bridge.request("avatar" if offer.unlocked else "unlock_avatar",{"id":op.id}),true,selected or (not offer.unlocked and not offer.affordable))
	b.name="RecruitOperator";b.add_theme_font_size_override("font_size",20)
	b.tooltip_text="已解锁，选择后下一轮出战。" if offer.unlocked else "消耗 %d 哈弗币永久解锁此干员。" % offer.cost
	var bond:Dictionary={}
	for item in h.data.get("avatars",[]):
		if item.id==op.id:bond=item.bond
	var rank=int(bond.get("rank",1));var xp=int(bond.get("xp",0))
	var cost=30 if rank==1 else 70;var needed=20 if rank==1 else 60
	var upgrade=h.button("已达最高阶" if rank>=3 else "干员进阶  /  %d 哈弗币" % cost,T.RECRUIT_UPGRADE,func():h.bridge.request("upgrade",{"kind":"hero","id":op.id}),false,not offer.unlocked or rank>=3 or xp<needed or h.profile().get("growth",{}).get("coins",0)<cost)
	upgrade.name="UpgradeOperator";upgrade.add_theme_font_size_override("font_size",14)
	if rank<3:upgrade.icon=C.ICON
	upgrade.tooltip_text="先解锁这位干员。" if not offer.unlocked else "已达最高阶。" if rank>=3 else "需要熟练度 %d 与 %d 哈弗币。" % [needed,cost]

static func wallet(h) -> void:
	var p:Dictionary=h.data.get("recruitment",{})
	var r=T.RECRUIT_WALLET
	h.draw_rect(r,Color(T.DEEP,0.85));h.draw_rect(r,T.EDGE,false,1)
	h.text_at(C.NAME,r.position.x+16,r.position.y+25,13,T.MUTED)
	C.amount(h,p.get("coins",0),r.position+Vector2(16,64),30,T.TEXT,false,24)
	h.text_at("可用余额",r.end.x-72,r.position.y+25,12,T.DIM)
	h.text_at("学习等级  Lv.%02d" % p.get("level",1),32,453,13,T.GREEN)
	h.text_at("%d / %d XP" % [p.get("levelProgress",0),p.get("levelRequired",100)],186,453,11,T.MUTED,94,true)
	h.bar(Rect2(32,463,248,3),p.get("levelProgress",0),p.get("levelRequired",100),T.GREEN)
	var operators:Array=p.get("operators",[])
	h.text_at("干员阵容  /  已解锁 %d / %d" % [operators.filter(func(item):return item.unlocked).size(),operators.size()],328,463,12,T.MUTED)
	var offer=info(h,h.shown_operator().id)
	var price=T.RECRUIT_PRICE
	h.draw_rect(price,Color(T.BASE,0.34))
	h.text_at("干员状态" if offer.unlocked else "永久解锁",price.position.x+12,price.position.y+21,12,T.MUTED)
	if offer.unlocked:h.text_at("已解锁",price.position.x+222,price.position.y+21,13,T.GREEN)
	else:C.amount(h,offer.cost,price.position+Vector2(208,22),18,T.TEXT)
	var in_battle=not h.state().is_empty() and h.state().get("outcome")==null
	var message="当前行动干员不变，新选择下轮生效。" if in_battle else "已解锁，随时可以选择出战。" if offer.unlocked else "还差 %d 哈弗币，完成回忆继续积累。" % offer.remaining if offer.remaining>0 else "余额充足，解锁后即可出战。"
	h.text_at(message,958,600,12,T.GREEN if offer.unlocked or offer.affordable else T.MUTED,290)

static func card(h,op:Dictionary,rect:Rect2) -> void:
	var offer=info(h,op.id)
	if not offer.unlocked:h.draw_rect(Rect2(rect.position,Vector2(rect.size.x,78)),Color(0.04,0.07,0.05,0.24))
	h.draw_rect(Rect2(rect.position+Vector2(0,78),Vector2(rect.size.x,38)),T.DEEP)
	var selected=h.shown_operator().id==op.id
	h.text_at(op.name,rect.position.x+9,rect.position.y+103,15,T.GREEN if selected else T.TEXT,66)
	if not offer.unlocked:C.amount(h,offer.cost,rect.position+Vector2(77,103),12,T.REWARD_INK,false,16)
	elif h.profile().get("avatar","mage")==op.id:h.text_at("出战",rect.position.x+94,rect.position.y+102,11,T.GREEN)
	else:h.text_at("已解锁",rect.position.x+86,rect.position.y+102,10,T.DIM)
