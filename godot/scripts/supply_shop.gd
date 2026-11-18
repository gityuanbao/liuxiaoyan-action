extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")
const DESCRIPTIONS={"armor":"开场增加 16 点护甲，抵挡敌方伤害。","battery":"开场增加 20 点能量，更早使用战斗技能。"}

static func build(h) -> void:
	h.button("返回战备配置",Rect2(1024,80,224,36),func():h.go("arsenal")).add_theme_font_size_override("font_size",15)
	for i in h.data.recruitment.supplies.size():
		var item:Dictionary=h.data.recruitment.supplies[i]
		var b=h.button("储备已满" if item.owned>=item.max else "购买一份" if item.affordable else "哈弗币不足",Rect2(56+i*412,444,344,46),func():h.bridge.request("buy_supply",{"id":item.id}),true,item.owned>=item.max or not item.affordable)
		b.name="BuySupply_"+item.id;b.add_theme_font_size_override("font_size",18)
		var enabled:bool=h.data.progression.autoSupply[item.id]
		var toggle=h.button("下场使用：开" if enabled else "下场使用：关",Rect2(56+i*412,395,344,30),func():h.bridge.request("supply_enabled",{"id":item.id,"enabled":not enabled}),enabled)
		toggle.name="ToggleSupply_"+item.id;toggle.add_theme_font_size_override("font_size",14)
	h.button("招募干员",Rect2(888,444,336,46),func():h.go("spirits")).add_theme_font_size_override("font_size",18)

static func draw(h) -> void:
	h.text_at("行动补给",32,116,30,T.TEXT)
	h.text_at("把学习奖励用于下一次出击。",222,112,14,T.MUTED)
	C.balance(h,Rect2(700,80,232,44),h.data.recruitment.coins)
	for i in h.data.recruitment.supplies.size():
		var item:Dictionary=h.data.recruitment.supplies[i]
		var x=32+i*412
		h.panel(Rect2(x,150,392,374),T.SURFACE)
		h.draw_texture_rect(h.textures["skill_"+("ward" if item.id=="armor" else "surge")],Rect2(x+24,174,72,72),false)
		h.text_at("出击消耗品",x+116,191,12,T.MUTED)
		h.text_at(item.name,x+116,229,26,T.TEXT)
		h.text_at("+16 护甲" if item.id=="armor" else "+20 能量",x+24,293,30,T.GREEN)
		h.text_at(DESCRIPTIONS[item.id],x+24,326,13,T.MUTED,344)
		h.draw_line(Vector2(x+24,347),Vector2(x+368,347),T.EDGE)
		h.text_at("已储备 %d / %d" % [item.owned,item.max],x+24,382,16,T.TEXT)
		C.amount(h,item.cost,Vector2(x+278,384),24,T.TEXT,false,24)
	h.panel(Rect2(864,150,384,374),T.SURFACE)
	h.text_at("哈弗币用途",888,192,22,T.TEXT)
	h.text_at("01  永久招募干员",888,240,17,T.TEXT)
	h.text_at("02  干员与装备进阶",888,278,17,T.TEXT)
	h.text_at("03  储备出击补给",888,316,17,T.GREEN)
	h.text_at("累计获得 %d · 已使用 %d" % [h.data.recruitment.earned,h.data.recruitment.spent],888,373,13,T.MUTED)
	h.text_at("基础学习与复习免费开放。",888,411,13,T.MUTED)
	h.text_at("开启后，新行动自动使用 1 份；关闭则保留库存。续战不重复扣除，每类上限 3 份。",32,557,13,T.MUTED)
	h.text_at("护甲总量最多 40，能量最多 100；补给不代答、不跳词，也不增加学习奖励。",32,585,12,T.DIM)
