extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")

static func info(h,id:String) -> Dictionary:
	for item in h.data.get("recruitment",{}).get("operators",[]):
		if item.id==id:return item
	return {"id":id,"unlocked":false}

static func build(h,op:Dictionary) -> void:
	var owned=bool(info(h,op.id).unlocked)
	var selected=h.profile().get("avatar","mage")==op.id
	var action=h.button("正在出战" if selected else "选择干员" if owned else "查看卡池",T.RECRUIT_ACTION,func():
		if owned:h.bridge.request("avatar",{"id":op.id})
		else:h.recruit_center.browse(h,op.id),true,selected)
	action.name="RecruitOperator";action.add_theme_font_size_override("font_size",20)
	if not owned:return
	var bond:Dictionary={}
	for avatar in h.data.get("avatars",[]):
		if avatar.id==op.id:bond=avatar.bond
	var rank=int(bond.get("rank",1));var xp=int(bond.get("xp",0))
	var cost=30 if rank==1 else 70;var needed=20 if rank==1 else 60
	var upgrade=h.button("已达最高阶" if rank>=3 else "干员进阶  /  %d 哈弗币" % cost,T.RECRUIT_UPGRADE,func():h.bridge.request("upgrade",{"kind":"hero","id":op.id}),false,not owned or rank>=3 or xp<needed or h.data.recruitment.coins<cost)
	upgrade.name="UpgradeOperator";upgrade.add_theme_font_size_override("font_size",14)
	if rank<3:upgrade.icon=C.ICON
	upgrade.tooltip_text="已达最高阶。" if rank>=3 else "需要熟练度 %d 与 %d 哈弗币。" % [needed,cost]
