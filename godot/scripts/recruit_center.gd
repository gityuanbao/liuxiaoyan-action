extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")
const REVEAL_SECONDS=1.35
var pending:bool=false
var revealing:bool=false
var clock=0.0
var result:Dictionary={}
var error_message=""
var preview_id=""

func open() -> void:
	if pending:return
	result={};revealing=false;error_message="";preview_id=""

func browse(h,operator_id:String) -> void:
	h.go("recruit")
	preview_id=operator_id
	h.queue_redraw()

func request(h) -> void:
	if pending or revealing or not result.is_empty() or h.page!="recruit":return
	var offer:Dictionary=h.data.recruitment.get("gacha",{})
	if offer.is_empty() or int(h.data.recruitment.coins)<int(offer.cost):return
	pending=true;error_message=""
	h.bridge.request("recruit_draw",{"expectedSerial":int(offer.serial)})
	h.rebuild.call_deferred()

func receive(h,value:Dictionary) -> void:
	pending=false
	var draw=value.get("recruitment",{}).get("gacha",{}).get("lastDraw")
	if not draw is Dictionary or h.page!="recruit":return
	result=draw.duplicate();clock=0;revealing=not h.slow_motion
	if h.battle_audio:h.battle_audio.play_ui_cue("recruit" if h.slow_motion else "navigate")

func failed(message:String) -> void:
	if pending:pending=false;error_message=message

func finish(h) -> void:
	if not revealing:return
	revealing=false;clock=REVEAL_SECONDS
	if h.battle_audio:h.battle_audio.play_ui_cue("recruit")
	h.rebuild()

func advance(h,delta:float) -> void:
	if h.page!="recruit" or not revealing:return
	clock+=delta
	if clock>=REVEAL_SECONDS or h.slow_motion:finish(h)
	else:h.queue_redraw()

func layout(h) -> Dictionary:
	var phone:bool=h.mobile_ui.enabled
	var w:float=h.mobile_ui.canvas.x if phone else 1280.0
	var margin:=16 if phone else 34
	var top:=99 if phone else 144
	var block_end:=315 if phone else 531
	var split:=floorf(w*0.46)
	return {"phone":phone,"w":w,"margin":margin,
		"art":Rect2(margin,top,split-margin-6,block_end-top),
		"info":Rect2(split+6,top,w-margin-split-6,block_end-top),
		"back":Rect2(w-margin-(111 if phone else 148),56 if phone else 89,111 if phone else 148,36 if phone else 41),
		"roster":Rect2(margin,327 if phone else 548,w-margin*2,53 if phone else 60)}

func roster_card(r:Dictionary,index:int,total:int) -> Rect2:
	var row:Rect2=r.roster
	var gap:=5 if r.phone else 9
	var width:float=(row.size.x-gap*(total-1))/total
	return Rect2(row.position.x+index*(width+gap),row.position.y,width,row.size.y)

func build(h) -> void:
	var r=layout(h)
	var right:Rect2=r.info
	var back=h.button("返回干员",r.back,func():h.go("spirits"))
	back.name="RecruitBack"
	back.add_theme_font_size_override("font_size",15 if r.phone else 18)
	var offer:Dictionary=h.data.recruitment.get("gacha",{})
	if offer.is_empty():return
	for i in offer.pool.size():
		var item:Dictionary=offer.pool[i]
		var b=h.button("",roster_card(r,i,offer.pool.size()),func():
			preview_id=item.id
			h.queue_redraw(),false,pending or revealing or not result.is_empty())
		b.name="RecruitPreview_"+item.id
		b.tooltip_text=item.name+(" · 已获得" if item.owned else " · 保底候选")
		for style in ["normal","hover","pressed","disabled"]:
			b.add_theme_stylebox_override(style,T.style(Color.TRANSPARENT,Color.TRANSPARENT,0))
	var wallet=int(h.data.recruitment.coins)
	var cost=int(offer.cost)
	var inset:=12 if r.phone else 23
	var height:=42 if r.phone else 53
	var btn=Rect2(right.position.x+inset,right.end.y-inset-height,right.size.x-inset*2,height)
	var caption="抽取一次  ·  %d 哈弗币" % cost
	if pending:caption="正在抽取…"
	elif revealing:caption="跳过揭晓"
	elif not result.is_empty():caption="收下奖励"
	elif wallet<cost:caption="还差 %d 哈弗币" % (cost-wallet)
	var disabled=pending or (result.is_empty() and wallet<cost)
	var action=h.button(caption,btn,func():
		if revealing:finish(h)
		elif not result.is_empty():
			result.clear()
			h.rebuild()
		else:request(h),true,disabled)
	action.name="RecruitDraw"
	action.add_theme_font_override("font",h.display_font)
	action.add_theme_font_size_override("font_size",17 if r.phone else 24)
	action.add_theme_stylebox_override("normal",T.style(T.GREEN,T.GREEN))
	action.add_theme_stylebox_override("hover",T.style(Color("c8ffdf"),T.GREEN))
	action.add_theme_color_override("font_color",T.INK)
	action.add_theme_color_override("font_hover_color",T.INK)

func shown_card(h,pool:Array) -> Dictionary:
	var selected=preview_id if not preview_id.is_empty() else h.shown_operator().id
	if not result.is_empty() and result.get("id"):selected=result.id
	for item in pool:
		if item.id==selected:return item
	return pool[0]

func draw(h) -> void:
	var r=layout(h)
	var phone:bool=r.phone
	var art:Rect2=r.art
	var info:Rect2=r.info
	var heading:=82 if phone else 119
	h.text_at("干员招募",r.margin,heading,26 if phone else 42,T.TEXT)
	var offer:Dictionary=h.data.get("recruitment",{}).get("gacha",{})
	if offer.is_empty():return
	var card:=shown_card(h,offer.pool)
	var finished:=not result.is_empty() and not revealing
	var jackpot:=finished and int(result.get("coinReward",0))==int(offer.jackpot)
	var accent:=T.ORANGE if jackpot else T.GREEN
	if finished and not result.get("id"):
		draw_coin_result(h,art,accent,phone)
	else:
		h.draw_operator_poster(h.operator_for(str(card.id)),art)
		var strip:=54 if phone else 84
		h.draw_rect(Rect2(art.position.x,art.end.y-strip,art.size.x,strip),Color(T.INK,0.90))
		h.draw_rect(Rect2(art.position.x,art.end.y-strip,3,strip),accent)
		var identity="新干员已加入" if finished else "已获得" if card.owned else "保底候选"
		h.text_at(identity,art.position.x+14,art.end.y-strip+19,13 if phone else 16,accent)
		h.text_at(str(card.name),art.position.x+14,art.end.y-10,25 if phone else 40,T.TEXT)
	h.draw_rect(art,T.EDGE,false,1)
	if revealing:draw_scan(h,art,accent,phone)
	h.panel(info,Color(T.INK,0.96),T.EDGE)
	draw_rules(h,info,offer,finished,phone,accent)
	for i in offer.pool.size():
		var item:Dictionary=offer.pool[i]
		var tile=roster_card(r,i,offer.pool.size())
		var selected=item.id==card.id
		h.panel(tile,T.SELECTED if selected else T.SURFACE,T.GREEN if selected else T.EDGE)
		var inset:=6.0 if phone else 8.0
		var thumb:=minf(tile.size.x*0.36,tile.size.y-12.0)
		h.image_cover(h.textures["portrait_"+item.id],Rect2(tile.position+Vector2(inset,(tile.size.y-thumb)/2),Vector2.ONE*thumb))
		var x=tile.position.x+inset*2+thumb
		var max_width=tile.end.x-x-3
		h.text_at(str(item.name),x,tile.position.y+(22 if phone else 25),13 if phone else 18,T.TEXT,max_width)
		h.text_at("已获得" if item.owned else "待招募",x,tile.position.y+(40 if phone else 45),10 if phone else 13,T.GREEN if item.owned else T.MUTED,max_width)

func draw_rules(h,rect:Rect2,offer:Dictionary,finished:bool,phone:bool,accent:Color) -> void:
	var inset:=12 if phone else 23
	var x=rect.position.x+inset
	var y=rect.position.y
	var width=rect.size.x-inset*2
	var remaining=int(offer.limit)-int(offer.pity)
	var unowned=int(offer.remainingOperators)
	if not phone:C.balance(h,Rect2(rect.end.x-220,rect.position.y+14,199,32),int(h.data.recruitment.coins))
	var title="全员已招募" if unowned==0 else "本抽解锁一名新干员" if remaining==1 else "再抽 %d 次必得新干员" % remaining
	h.text_at(title,x,y+(25 if phone else 53),18 if phone else 30,T.TEXT,width if phone else width-193)
	h.bar(Rect2(x,y+(34 if phone else 73),width,4 if phone else 6),int(offer.limit) if unowned==0 else int(offer.pity),int(offer.limit),T.GREEN)
	var note="每抽可继续领取哈弗币" if unowned==0 else "%d / %d 抽    剩余 %d 名干员等概率入选" % [offer.pity,offer.limit,unowned]
	h.text_at(note,x,y+(57 if phone else 109),13 if phone else 17,T.MUTED,width)
	var top=y+(71 if phone else 140)
	if finished:
		var coins=int(result.get("coinReward",result.get("duplicateReward",0)))
		h.text_at("本次奖励" if not result.get("guaranteed",false) else "保底奖励已到账",x,top+(21 if phone else 40),17 if phone else 26,accent)
		C.amount(h,coins,Vector2(x,top+(52 if phone else 98)),28 if phone else 42,accent,true,24 if phone else 34)
		h.text_at("已存入钱包",x+(129 if phone else 190),top+(51 if phone else 97),14 if phone else 17,T.MUTED)
	else:
		h.text_at("每抽返币",x,top+(16 if phone else 32),15 if phone else 23,T.TEXT)
		var gap:=5 if phone else 8
		var rewards:Array=offer.coinRewards.duplicate()
		rewards.append(offer.jackpot)
		var width_each=(width-3*gap)/4
		for i in rewards.size():
			var grand=i==rewards.size()-1
			var tile=Rect2(x+i*(width_each+gap),top+(24 if phone else 49),width_each,34 if phone else 61)
			h.panel(tile,Color("3e3020") if grand else T.SURFACE,T.ORANGE if grand else T.EDGE)
			h.text_at("+%d" % int(rewards[i]),tile.position.x+6,tile.position.y+(23 if phone else 38),15 if phone else 24,T.ORANGE if grand else T.TEXT)
			if grand:h.text_at("%d%%" % roundi(offer.jackpotRate*100),tile.end.x-(29 if phone else 46),tile.end.y-9,11 if phone else 15,T.ORANGE)
	if not error_message.is_empty():
		h.text_at(error_message,x,rect.end.y-(58 if phone else 82),13,T.RED,width)

func draw_coin_result(h,art:Rect2,accent:Color,phone:bool) -> void:
	h.draw_rect(art,Color("15231f"))
	var center=art.get_center()
	var radius:=43.0 if phone else 81.0
	for i in 3:
		h.draw_arc(center,radius+i*11,0,TAU,64,Color(accent,0.42-i*0.13),1.0,true)
	var size:=radius*1.48
	h.draw_texture_rect(C.ICON,Rect2(center-Vector2.ONE*size/2,Vector2.ONE*size),false)
	h.text_at("获得 300 哈弗币" if int(result.coinReward)==300 else "获得哈弗币",art.position.x+14,art.end.y-16,17 if phone else 24,accent)
func draw_scan(h,art:Rect2,accent:Color,phone:bool) -> void:
	var progress=clampf(clock/REVEAL_SECONDS,0,1)
	var cut=art.position.x+art.size.x*progress
	h.draw_rect(Rect2(cut,art.position.y,art.end.x-cut,art.size.y),Color(T.INK,0.98))
	for i in 3:
		var edge=minf(art.end.x,cut+i*(3 if phone else 5))
		h.draw_line(Vector2(edge,art.position.y),Vector2(edge,art.end.y),Color(accent,1.0-i*0.24),2)
	if progress<0.5:h.text_at("正在解密干员档案",art.position.x+16,art.position.y+30,15 if phone else 22,T.TEXT)
