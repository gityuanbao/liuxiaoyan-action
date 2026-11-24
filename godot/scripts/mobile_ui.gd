extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const Q=preload("res://scripts/choice_ui.gd")
const CUSTOM=preload("res://scripts/custom_book_ui.gd")
var enabled=false
var canvas=Vector2(360,780)
var portrait=true
var touch=false
var last_size=Vector2i.ZERO
var draft_book=""
var draft_batch=10
var draft_goal=20
var draft_difficulty="all"
const PHONE_MODES=["choose_meaning","choose_word"]
const BOOK_LABELS={"zk":"中考","gk":"高考","cet4":"四级","cet6":"六级","ky":"考研","custom":"自编"}
const BOOK_MAPS={"zk":"valley","gk":"spaceport","cet4":"dam","cet6":"city","ky":"director"}
const SURFACE=T.SURFACE
const BORDER=T.EDGE
const MINT=T.GREEN
var draft_mode="choose_meaning"
var start_pending=false
var orientation_paused=false

static func phone_window(window) -> bool:
	var sz:Vector2i=window.size
	return sz.x<float(sz.y)*1.2 or (sz.y<600 and sz.x<1100) or OS.has_feature("android") or OS.has_feature("ios") or OS.get_cmdline_user_args().has("--mobile-qa") or (OS.has_feature("web") and bool(JavaScriptBridge.eval("window.WordToyMobile || matchMedia('(pointer:coarse)').matches")))

func sync(h) -> bool:
	var window=h.get_window();var sz:Vector2i=window.size
	var mobile_window=phone_window(window)
	if sz==last_size and mobile_window==enabled:return false
	last_size=sz;var previous=enabled
	enabled=mobile_window
	if enabled:
		portrait=sz.x<float(sz.y)*1.2
		canvas=Vector2(360,maxi(640,roundi(360.0*sz.y/maxi(1,sz.x)))) if portrait else Vector2(maxi(720,roundi(400.0*sz.x/maxi(1,sz.y))),400)
		window.content_scale_factor=1.0;window.content_scale_size=Vector2i(canvas)
	elif previous:
		window.content_scale_size=Vector2i(1920,1080);window.content_scale_factor=1.5
	if h.bridge and h.bridge.ready_to_play and not h.state().is_empty() and h.state().get("outcome")==null:
		if enabled and portrait and not h.data.get("paused",false):
			orientation_paused=true;h.bridge.request("pause",{"value":true})
		elif not portrait and orientation_paused:
			orientation_paused=false;h.bridge.request("pause",{"value":false})
	return enabled or previous

func button(h,label:String,rect:Rect2,fn:Callable,accent=false,disabled=false,id="") -> Button:
	var b=h.button(label,rect,fn,accent,disabled);b.add_theme_font_size_override("font_size",17)
	b.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
	var primary=id in ["MobileStart","MobileRecruit","Submit","MobileResultNext"]
	var fill=MINT if primary and not disabled else Color("24473b") if accent else SURFACE
	var style=touch_style(fill,MINT if accent else BORDER)
	b.add_theme_stylebox_override("normal",style)
	if primary or accent:b.add_theme_font_override("font",h.display_font)
	b.add_theme_color_override("font_color",T.INK if primary and not disabled else T.GREEN if accent else T.TEXT)
	b.add_theme_color_override("font_hover_color",T.INK if primary else T.TEXT)
	b.add_theme_stylebox_override("hover",touch_style(Color("baffce") if primary else Color("304b40"),MINT))
	b.add_theme_stylebox_override("pressed",touch_style(Color("a6ffd1"),MINT))
	b.add_theme_stylebox_override("disabled",touch_style(Color("192520"),Color("32423c")))
	if not id.is_empty():b.name=id
	return b

static func touch_style(fill:Color,edge:Color) -> StyleBoxFlat:
	var style=T.style(fill,edge)
	style.set_corner_radius_all(1)
	style.content_margin_left=5;style.content_margin_right=5
	return style

func label(h,value:String,rect:Rect2,px=16,color=T.TEXT) -> void:
	h.wrapped(value,Rect2(rect.position+Vector2(0,px),rect.size-Vector2(0,px)),px,color)

func battle_rects() -> Dictionary:
	var w=canvas.x;var ht=canvas.y
	if portrait:
		var scene=Rect2(16,62,w-32,minf(156,ht*0.19))
		var question=Rect2(16,scene.end.y+8,w-32,82)
		var rows=4 if ht>=740 else 2
		var start=question.end.y+8
		var height=minf(68,floor((ht-166-start-(rows-1)*8)/rows)) if rows==4 else floor((ht-166-start-8)/2)
		var options=[]
		for i in 4:options.append(Rect2(16 if rows==4 else 16+(i%2)*(w-24)/2,start+(i if rows==4 else i/2)*(height+8),w-32 if rows==4 else (w-40)/2,height))
		return {"scene":scene,"question":question,"options":options,"skills":Rect2(16,ht-156,w-32,44),"caption":Rect2(16,ht-52,w-32,44)}
	var split=floor(w*0.40)
	var scene=Rect2(12,52,w-24,157)
	var question=Rect2(12,217,split-20,85)
	var options=[]
	var option_width=(w-split-20)/2
	for i in 4:options.append(Rect2(split+(i%2)*(option_width+8),217+(i/2)*64,option_width,58))
	return {"scene":scene,"question":question,"options":options,"skills":Rect2(12,310,split-20,48),"caption":Rect2(12,362,w-24,31)}

func build(h) -> void:
	h.clear_ui()
	if portrait:return
	if not h.bridge or not h.bridge.ready_to_play:return
	var w=canvas.x;var ht=canvas.y
	if h.page in ["battle","result"]:
		button(h,"返回计划",Rect2(16,7,84,36),func():h.go("books"),false,false,"MobilePlan")
	else:
		for i in 3:
			var target=["books","spirits","progression"][i]
			var selected=h.page==target or (target=="spirits" and h.page=="recruit") or (i==0 and h.page in ["home","modes","map"])
			var b=button(h,["学习中心","特战干员","干员成长"][i],Rect2(171+i*84,5,80,40),func():h.go(target),selected,false,"MobileNav_"+target)
			var normal=T.style(Color.TRANSPARENT,T.GREEN if selected else Color.TRANSPARENT)
			normal.set_border_width_all(0);normal.border_width_bottom=2;b.add_theme_stylebox_override("normal",normal)
	if h.page != "battle":
		button(h,"版本更新",Rect2(432,7,90,36),h.open_version_notes,false,false,"MobileVersionNotes")
	button(h,"声音",Rect2(w-72,7,56,36),func():h.go("sound"),false,false,"MobileSound")
	match h.page:
		"battle":build_battle(h)
		"result":
			button(h,"查看干员卡池",Rect2(205,7,112,36),func():h.go("recruit"),false,false,"MobileResultRecruit")
			button(h,"返回学习计划",Rect2(24,ht-62,(w-60)/2,44),func():h.go("books"),false,false,"MobileResultBack")
			button(h,"再练本轮薄弱词" if h.data.get("learningMission") is Dictionary and h.data.learningMission.needsReview>0 else "继续今日计划",Rect2(36+(w-60)/2,ht-62,(w-60)/2,44),func():h.bridge.request("retry_study") if h.data.get("learningMission") is Dictionary and h.data.learningMission.needsReview>0 else h.go("books"),true,false,"MobileResultNext")
			h.result_review.build(h,result_area(),true)
		"spirits":build_operators(h)
		"recruit":h.recruit_center.build(h)
		"favorites":h.FavoritesCenter.build(h)
		"progression","arsenal","supplies":build_growth(h)
		"sound","voices":
			var controls=[["游戏音效",h.battle_audio.effects_enabled,func():h.battle_audio.toggle_effects();h.rebuild()],["单词读音",h.battle_audio.words_enabled,func():h.battle_audio.toggle_words();h.rebuild()],["总监语音",h.mentor_voice.enabled,func():h.mentor_voice.toggle();h.rebuild()],["减少动效",h.slow_motion,func():h.slow_motion=not h.slow_motion;h.rebuild()]]
			for i in controls.size():button(h,controls[i][0]+("：开" if controls[i][1] else "：关"),Rect2(16 if portrait else 16+(i%2)*w/2,100+(i if portrait else i/2)*60,w-32 if portrait else w/2-24,48),controls[i][2],controls[i][1])
		"memory","collection":
			button(h,"复习到期词",Rect2(16,ht-106,w-32,48),func():h.bridge.request("review_start"),true,h.data.get("memory",{}).get("due",0)==0)
			button(h,"收藏单词",Rect2(w-155,59,139,35),func():h.go("favorites"))
		_ :build_plan(h)

func plan_area() -> Rect2:
	return Rect2(floor(canvas.x*0.36),58,canvas.x-floor(canvas.x*0.36)-24,320)

func book_rect(index:int,count:int) -> Rect2:
	var r=plan_area();var width=(r.size.x-6*(count-1))/count
	return Rect2(r.position.x+index*(width+6),86,width,62)

func build_plan(h) -> void:
	var w=canvas.x;var ht=canvas.y
	if draft_book.is_empty():
		draft_book=h.data.bookSettings.selected;draft_batch=int(h.data.study.settings.batch);draft_goal=int(h.data.study.settings.goal)
		draft_difficulty=h.data.study.settings.get("difficulty","all")
		var previous=h.data.study.settings.get("mobileAnswerMode",h.data.study.settings.get("answerMode","choose_meaning"))
		draft_mode=previous if previous in PHONE_MODES else "choose_meaning"
	var r=plan_area();var x=r.position.x;var area=r.size.x
	var active=not h.state().is_empty() and h.state().get("outcome")==null
	button(h,"自定义词书",Rect2(r.end.x-110,52,110,30),func():h.custom_book_ui.open(h),false,active or start_pending,"EditCustomBook").add_theme_font_size_override("font_size",14)
	var available=0
	for i in h.data.books.size():
		var id=h.data.books[i].id
		if id==draft_book:available=CUSTOM.count(h.data.books[i],draft_difficulty)
		var card=button(h,"",book_rect(i,h.data.books.size()),func():draft_book=id;h.rebuild(),draft_book==id,start_pending,"MobileBook_"+id)
		card.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,T.GREEN if draft_book==id else T.EDGE))
		card.add_theme_stylebox_override("hover",T.style(Color(T.GREEN,0.05),T.GREEN))
	for i in CUSTOM.LEVELS.size():
		var level=CUSTOM.LEVELS[i]
		var width=(area-12)/3
		button(h,CUSTOM.LEVEL_LABELS[i],Rect2(x+i*(width+6),153,width,33),func():draft_difficulty=level;h.rebuild(),draft_difficulty==level,start_pending,"Difficulty_"+level).add_theme_font_size_override("font_size",14)
	for i in PHONE_MODES.size():
		var mode=PHONE_MODES[i]
		button(h,["看词选意","看意选词"][i],Rect2(x+i*(area+8)/2,204,(area-8)/2,40),func():draft_mode=mode;h.rebuild(),draft_mode==mode,start_pending,"AnswerMode_"+mode)
	var half=(area-24)/2
	for i in 3:
		var amount=[5,10,15][i]
		button(h,str(amount),Rect2(x+i*(half+6)/3,278,(half-12)/3,40),func():draft_batch=amount;h.rebuild(),draft_batch==amount,start_pending,"MobileBatch_%d" % amount)
	for i in 4:
		var amount=[5,10,20,30][i]
		button(h,str(amount),Rect2(x+half+24+i*(half+6)/4,278,(half-18)/4,40),func():draft_goal=amount;h.rebuild(),draft_goal==amount,start_pending,"MobileGoal_%d" % amount)
	if not active:
		button(h,"总监百词挑战" if available>=100 else "百词挑战需 100 词",Rect2(24,273,x-50,38),func():h.bridge.request("mobile_boss_start",{"id":draft_book,"answerMode":draft_mode,"difficulty":draft_difficulty}),false,start_pending or available<100,"MobileBoss")
	var extra_y = 272 if active else 315
	var extra_height = 39 if active else 33
	var extra_width = (x-58)/2
	button(h,"收藏单词",Rect2(24,extra_y,extra_width,extra_height),func():h.go("favorites"),false,false,"MobileFavorites").add_theme_font_size_override("font_size",14)
	button(h,"排行榜",Rect2(32+extra_width,extra_y,extra_width,extra_height),h.open_rank_board,false,false,"OpenRankBoard").add_theme_font_size_override("font_size",14)
	button(h,"正在准备行动…" if start_pending else "继续当前行动" if active else "当前难度没有词条" if available==0 else "保存计划并开始",Rect2(x,334,area,44),func():
		if active:h.ActionFlow.run(h)
		else:
			if start_pending:return
			start_pending=true;h.error_text=""
			h.bridge.request("mobile_plan_start",{"id":draft_book,"batch":draft_batch,"goal":draft_goal,"difficulty":draft_difficulty,"answerMode":draft_mode})
			h.rebuild.call_deferred()
		,true,start_pending or (not active and available==0),"MobileStart")
	if not h.error_text.is_empty():
		var message=Label.new()
		message.text=h.error_text;message.position=Vector2(24,266);message.size=Vector2(x-44,62)
		message.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;message.mouse_filter=Control.MOUSE_FILTER_IGNORE
		message.add_theme_font_override("font",h.font);message.add_theme_font_size_override("font_size",14)
		message.add_theme_color_override("font_color",T.RED);message.add_theme_stylebox_override("normal",T.style(T.INK,T.RED))
		h.ui.add_child(message)

func build_battle(h) -> void:
	var r=battle_rects();var s:Dictionary=h.state()
	button(h,"继续" if h.data.paused else "暂停",Rect2(canvas.x-72,7,56,36),func():h.bridge.request("pause",{"value":not h.data.paused}),false,false,"MobilePause")
	var sound=h.ui.get_node_or_null("MobileSound")
	if sound:h.ui.remove_child(sound);sound.queue_free()
	h.FavoritesCenter.bookmark(h,Rect2(338,7,96,36),true)
	if Q.active(h):
		for i in 4:
			var option=Q.option(h,h.data.choice.options[i],i,r.options[i],18,true)
			option.tooltip_text="";option.focus_mode=Control.FOCUS_NONE
	for i in 4:
		var action=["surge","ward","tactic","chant"][i]
		var disabled=h.data.paused or h.data.cooldown>0 or (h.data.get("chanting",false) and i<3) or (Q.active(h) and h.data.choice.answered) or (s.energy<30 if i==0 else s.energy<20 or s.shield>=40 if i==1 else s.tacticUsed or s.normalHits<3 or (s.avatar=="mage" and s.energy>=100) if i==2 else s.energy<100)
		var b=button(h,"",Rect2(r.skills.position+Vector2(i*(r.skills.size.x+8)/4,0),Vector2((r.skills.size.x-24)/4,46)),func():use_skill(h,action),false,disabled,["Surge","Ward","Tactic","Chant"][i])
		b.focus_mode=Control.FOCUS_NONE
		var icon=TextureRect.new();icon.texture=h.textures.get("skill_"+(["surge","ward",str(s.avatar)+"_tactic",str(s.avatar)+"_ultimate"][i]))
		icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.position=Vector2(6,7);icon.size=Vector2(28,28);icon.modulate=T.DIM if disabled else T.TEXT
		icon.mouse_filter=Control.MOUSE_FILTER_IGNORE;b.add_child(icon)
		var cost=Label.new();cost.text=["强化","护甲","战技","大招"][i];cost.position=Vector2(32,10)
		cost.add_theme_font_override("font",h.font);cost.add_theme_font_size_override("font_size",14);cost.add_theme_color_override("font_color",T.MUTED if disabled else MINT)
		cost.mouse_filter=Control.MOUSE_FILTER_IGNORE;b.add_child(cost)

func use_skill(h,action:String) -> void:
	h.bridge.request(action if action in ["tactic","chant"] else "prepare",{} if action in ["tactic","chant"] else {"spell":action})

func build_operators(h) -> void:
	var w=canvas.x
	button(h,"干员招募  ›",Rect2(w*0.5-117,55,102,39),func():h.go("recruit"),true,false,"OpenRecruitCenter")
	if h.OPS.size()>h.operator_select.PAGE_SIZE:
		button(h,"%d / %d ›" % [h.operator_select.roster_page+1,ceili(float(h.OPS.size())/h.operator_select.PAGE_SIZE)],Rect2(w*0.5-197,55,72,39),func():h.operator_select.next_roster_page(h),false,false,"MoreOperators")
	for i in h.operator_select.visible_slots(h):
		var index=h.operator_select.index_for(i)
		var b=button(h,"",operator_card_rect(i),func():h.operator_select.choose(h,index),false,false,"MobileOperator_"+h.OPS[index].id)
		b.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,Color.TRANSPARENT))
		b.add_theme_stylebox_override("hover",T.style(Color(0.5,1,0.7,0.04),T.GREEN))
	var op=h.shown_operator();var info=h.RecruitmentUI.info(h,op.id)
	var left=w*0.5-24
	for i in 2:
		var kind=["tactic","ultimate"][i]
		button(h,"演示战技" if i==0 else "演示大招",Rect2(24+i*(left+8)/2,334,(left-8)/2,44),func():h.operator_select.tab=kind;h.operator_select.preview(h),false,h.slow_motion,"MobileSkill_"+kind)
	button(h,"当前出战" if h.profile().get("avatar","mage")==op.id else "选择干员" if info.unlocked else "查看卡池  ›",Rect2(w*0.5+24,334,w*0.5-48,44),func():
		if info.unlocked:h.bridge.request("avatar",{"id":op.id})
		else:h.recruit_center.browse(h,op.id),true,h.profile().get("avatar","mage")==op.id,"MobileRecruit")

func operator_card_rect(index:int) -> Rect2:
	var width=(canvas.x*0.5-40)/2
	return Rect2(24+(index%2)*(width+8),100+(index/2)*57,width,51)

func draw_operators(h) -> void:
	var op=h.shown_operator()
	for i in h.operator_select.visible_slots(h):
		var item=h.OPS[h.operator_select.index_for(i)];var info=h.RecruitmentUI.info(h,item.id);var r=operator_card_rect(i)
		var selected=item.id==op.id
		h.draw_rect(r,T.SELECTED if selected else Color(T.INK,0.8))
		h.draw_rect(r,T.GREEN if selected else T.EDGE,false,1)
		h.image_cover(h.textures["portrait_"+item.id],Rect2(r.position,Vector2(49,r.size.y)))
		h.text_at(item.name,r.position.x+57,r.position.y+22,16,T.TEXT if selected else T.MUTED)
		if info.unlocked:h.text_at("当前出战" if h.profile().get("avatar","mage")==item.id else "已解锁",r.position.x+57,r.position.y+42,11,T.GREEN)
		else:h.text_at("保底候选",r.position.x+57,r.position.y+42,12,T.MUTED)
	var stage=Rect2(canvas.x*0.5+24,68,canvas.x*0.5-48,181)
	h.image_cover(h.textures.hangar,stage,Color(0.68,0.71,0.66))
	h.draw_rect(stage,T.EDGE,false,1)
	var side=minf(242,stage.size.x-16)
	var model=Rect2(stage.get_center().x-side/2,stage.end.y-side*0.95,side,side)
	h.operator_select.draw_model(h,op.id,model)
	if h.operator_select.playing:
		h.text_at("干员入场" if h.operator_select.entering else "技能动作演示",stage.position.x+10,stage.position.y+22,13,T.GREEN)
	var identity=Rect2(stage.position.x,stage.end.y,stage.size.x,49)
	h.draw_rect(identity,Color(T.INK,0.88))
	h.draw_rect(Rect2(identity.position,Vector2(3,49)),T.ORANGE if op.id=="wildfire" else T.GREEN)
	h.text_at(op.name,identity.position.x+12,identity.end.y-14,25,T.TEXT)
	h.text_at(op.en+"  /  "+op.role,identity.position.x+99,identity.end.y-15,14,T.GREEN)
	var owned=h.RecruitmentUI.info(h,op.id).unlocked
	h.text_at(op.skill+" / "+op.ultimate if owned else "获取方式  /  干员卡池随机招募",canvas.x*0.5+24,318,13,T.MUTED if owned else T.GREEN)

func build_growth(h) -> void:
	var w=canvas.x;var p=h.data.progression
	button(h,"领取 %d 哈弗币" % p.pending if p.pending>0 else "升级后领取奖励",Rect2(36,290,w*0.40-60,44),func():h.bridge.request("claim_levels"),true,p.pending<=0)
	button(h,"查看干员卡池",Rect2(36,342,w*0.40-60,38),func():h.go("recruit"),false,false,"MobileGrowthRecruit")
	for i in 2:
		var item=h.data.recruitment.supplies[i]
		var x=w*0.43;var area=w-x-36
		button(h,"购买 · %d 哈弗币" % item.cost,Rect2(x,166+i*138,(area-8)*0.56,40),func():h.bridge.request("buy_supply",{"id":item.id}),false,not item.affordable or item.owned>=item.max)
		button(h,"下场使用" if p.autoSupply[item.id] else "暂不使用",Rect2(x+(area-8)*0.56+8,166+i*138,(area-8)*0.44,40),func():h.bridge.request("supply_enabled",{"id":item.id,"enabled":not p.autoSupply[item.id]}),p.autoSupply[item.id])

func result_area() -> Rect2:
	return Rect2(canvas.x*0.48,64,canvas.x*0.52-20,256)

func arrange_media(h) -> void:
	if not h.result_meme:return
	var meme=h.result_meme
	if h.page=="result":
		if h.result_review.words_visible(h):return
		meme.show()
		var slot=result_area()
		if h.result_review.has_words(h):
			slot.position.y+=42
			slot.size.y-=42
		var width=minf(slot.size.x,slot.size.y*16.0/9.0)
		var media_size=Vector2(width,width*9.0/16.0)
		var rect=Rect2(slot.get_center()-media_size*0.5,media_size)
		meme.video.position=rect.position;meme.video.size=rect.size;meme.picture.position=rect.position;meme.picture.size=rect.size
		meme.caption.position=Vector2(rect.position.x,rect.end.y-38);meme.caption.size=Vector2(rect.size.x,36);meme.caption.add_theme_font_size_override("font_size",14);meme.caption.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
		meme.caption.add_theme_stylebox_override("normal",T.style(Color(0.04,0.06,0.05,0.88),Color.TRANSPARENT))
		meme.reaction.position=rect.position+Vector2(rect.size.x-64,0);meme.reaction.size=Vector2(64,64)
		for b in [meme.replay_button,meme.pause_button,meme.mute_button]:b.hide()
	elif not meme.is_result and meme.visible:
		var r=battle_rects().scene;meme.picture.size=Vector2(60,60);meme.picture.position=r.position+Vector2(r.size.x-66,40)

func draw(h) -> void:
	var w=canvas.x;var ht=canvas.y
	h.draw_rect(Rect2(Vector2.ZERO,canvas),T.INK)
	if not h.font:return
	if portrait:
		h.text_at("请横置手机",28,ht*0.44,30,T.GREEN,w-56)
		label(h,"横屏后继续选择计划与答题\n进行中的战斗会自动暂停",Rect2(28,ht*0.48,w-56,100),17,T.MUTED)
		if h.result_meme:h.result_meme.hide()
		return
	var background=h.textures.get("scene_"+h.SceneCatalog.current(h)) if h.page in ["battle","result"] else h.textures.get("hangar")
	if background:h.image_cover(background,Rect2(Vector2.ZERO,canvas),Color(0.38,0.42,0.38))
	h.draw_rect(Rect2(0,0,w,canvas.y),Color(T.INK,0.54))
	h.draw_rect(Rect2(0,0,w,50),T.INK)
	h.draw_line(Vector2(16,49),Vector2(w-16,49),T.EDGE,1)
	if h.page in ["battle","result"]:
		h.text_at("学习行动" if h.page=="battle" else "行动结算",116,31,17,T.TEXT)
	else:
		if h.textures.has("brand_icon"):h.draw_texture_rect(h.textures.brand_icon,Rect2(20,9,30,30),false)
		if h.textures.has("brand_wordmark"):h.draw_texture_rect(h.textures.brand_wordmark,Rect2(58,17,112,22),false)
	if not h.bridge or not h.bridge.ready_to_play:label(h,"正在整备学习计划…",Rect2(24,130,w-48,80),22);return
	if h.page!="battle":
		h.CurrencyUI.amount(h,int(h.data.recruitment.coins),Vector2(w-175,31),13,T.TEXT,false,17)
	else:
		var mission=h.data.get("learningMission")
		if mission is Dictionary:h.text_at("本轮 %d / %d" % [h.data.lesson.completed,h.data.lesson.total],w-226,32,16,T.MUTED)
	match h.page:
		"battle":draw_battle(h)
		"result":
			var x=32;var area=w*0.45-32
			h.panel(Rect2(16,64,w*0.46-16,248),T.SURFACE,T.EDGE)
			h.draw_rect(Rect2(16,64,3,50),T.GREEN if h.state().outcome=="victory" else T.RED)
			h.text_at("任务完成" if h.state().outcome=="victory" else "回家吧，孩子",x,97,28,T.GREEN if h.state().outcome=="victory" else T.RED)
			var mission:Dictionary=h.data.learningMission if h.data.get("learningMission") is Dictionary else {}
			label(h,"本轮辨认 %d 词 / 待巩固 %d" % [mission.get("recognized",0),mission.get("needsReview",0)] if h.data.get("choice") is Dictionary else "本轮学习已记录",Rect2(x,116,area,48),17)
			label(h,"+%d XP   +%d 哈弗币" % [h.data.learningRewards.xp,h.data.learningRewards.coins],Rect2(x,165,area,42),23,T.GREEN)
			label(h,"本轮已计入学习进度，错词可再次练习。",Rect2(x,211,area,38),13,T.MUTED)
		"progression","arsenal","supplies":
			var p=h.data.progression
			h.draw_rect(Rect2(24,70,w*0.40-36,292),Color(T.DEEP,0.94))
			h.text_at("干员成长",36,103,22,T.TEXT)
			h.text_at("Lv.%d" % p.level,36,156,36,T.GREEN)
			h.text_at(p.title,36,183,14,T.MUTED)
			h.bar(Rect2(36,203,w*0.40-60,5),p.progress,p.required,T.GREEN)
			h.text_at("%d / %d XP" % [p.progress,p.required],36,231,14,T.TEXT)
			h.text_at("学习积累经验，升级领取奖励。",36,265,12,T.MUTED,w*0.40-60)
			for i in 2:
				var item=h.data.recruitment.supplies[i];var x=w*0.43
				h.draw_rect(Rect2(x-12,70+i*138,w-x-12,150 if i==0 else 154),Color(T.DEEP,0.94))
				h.text_at(item.name,x,104+i*138,20,T.TEXT)
				h.text_at("护甲 +%d" % item.shield if item.shield>0 else "能量 +%d" % item.energy,x,132+i*138,13,T.GREEN)
				h.text_at("库存 %d / %d" % [item.owned,item.max],w-124,132+i*138,12,T.MUTED)
		"memory","collection":
			h.text_at("复习排期",16,94,26,T.TEXT)
			for i in mini(6 if portrait else 3,h.data.memory.rows.size()):
				var row=h.data.memory.rows[i];label(h,row.word+"  /  "+row.reviewIn,Rect2(16,112+i*60,w-32,56),16,T.GREEN if row.overdue else T.TEXT)
		"spirits":
			h.text_at("特战干员",24,82,24,T.TEXT)
			draw_operators(h)
		"recruit":h.recruit_center.draw(h)
		"favorites":h.FavoritesCenter.draw(h)
		"sound","voices":
			h.text_at("声音与动效",16,84,22,T.TEXT)
		_:
			draw_plan(h)
	arrange_media(h)

func draw_plan(h) -> void:
	var r=plan_area();var x=r.position.x;var area=r.size.x
	var op=h.operator_for(h.profile().get("avatar","mage"))
	var art=Rect2(16,60,x-34,208)
	h.panel(Rect2(16,60,x-34,318),T.SURFACE,T.EDGE)
	h.image_cover(h.operator_artwork(op),art)
	h.draw_rect(Rect2(16,211,x-34,57),Color(T.INK,0.88))
	h.draw_rect(Rect2(16,211,3,57),MINT)
	h.text_at("今日学习计划",28,238,25,T.TEXT)
	h.text_at(op.name+"  /  "+op.role,29,260,15,MINT)
	h.text_at("今日已学",28,366,15,T.MUTED)
	h.text_at("%d / %d 词" % [h.data.study.today.count,draft_goal],x-120,366,17,T.TEXT)
	h.bar(Rect2(28,372,x-58,3),h.data.study.today.count,draft_goal,MINT)
	h.panel(Rect2(x-12,58,area+24,328),T.SURFACE,T.EDGE)
	h.text_at("选择词书",x,77,17,T.TEXT)
	for i in h.data.books.size():
		var book=h.data.books[i];var card=book_rect(i,h.data.books.size());var chosen=book.id==draft_book
		var texture=h.textures["scene_"+BOOK_MAPS.get(book.id,"dam")]
		h.image_cover(texture,card,Color.WHITE if chosen else Color(0.64,0.69,0.65))
		h.draw_rect(Rect2(card.position+Vector2(0,19),card.size-Vector2(0,19)),Color(T.INK,0.84))
		if chosen:h.draw_rect(Rect2(card.position,Vector2(3,card.size.y)),MINT)
		h.text_at(BOOK_LABELS.get(book.id,book.name),card.position.x+6,card.position.y+38,18,T.TEXT,card.size.x-10)
		h.text_at("%d 词" % CUSTOM.count(book,draft_difficulty),card.position.x+6,card.position.y+55,13,MINT if chosen else T.MUTED,card.size.x-10)
	h.text_at("训练方式",x,200,13,T.MUTED)
	h.text_at("每轮词数",x,270,15,T.TEXT)
	h.text_at("每日目标",x+(area-24)/2+24,270,15,T.TEXT)

func actor_rect(enemy:bool) -> Rect2:
	var scene:Rect2=battle_rects().scene
	var side=164.0 if enemy else 180.0
	return Rect2(Vector2(scene.position.x+scene.size.x*(0.77 if enemy else 0.23)-side/2,scene.end.y-side-6),Vector2(side,side))

func draw_battle(h) -> void:
	var r=battle_rects();var s:Dictionary=h.state()
	if s.is_empty():return
	h.image_cover(h.textures["scene_"+h.SceneCatalog.current(h)],r.scene,Color(0.94,0.98,0.95))
	var scene:Rect2=r.scene
	h.draw_character(str(s.avatar),h.skill_effects.body_action() if not h.skill_effects.body_action().is_empty() else h.character_action(false),h.skill_effects.age if h.skill_effects.active() else h.ui_time,actor_rect(false))
	var enemy=str(h.data.stage.monster)
	var boss=h.DirectorBoss.active(h)
	h.draw_character(enemy,h.director_action if boss else h.character_action(true),h.director_clock if boss else h.ui_time,actor_rect(true))
	if h.fx_time>0 and h.fx_kind in ["hit","hurt"]:h.draw_shooting(T.FX_TIME-h.fx_time,h.fx_kind=="hurt",Vector2.ZERO)
	if h.skill_effects.active():
		var actor=h.skill_effects.actor
		var frames=h.skill_effects.textures.get(actor,[])
		if actor=="wildfire":h.skill_effects.draw_wildfire(h,Vector2.ZERO)
		elif not frames.is_empty():h.draw_texture_rect(frames[mini(3,int(h.skill_effects.age*4))],Rect2(scene.position+Vector2(52,36),Vector2(80,80)),false)
	var plate_width=clampf(scene.size.x*0.19,132,166)
	var ally=Rect2(scene.position+Vector2(6,5),Vector2(plate_width,43))
	var opponent=Rect2(scene.end.x-plate_width-6,ally.position.y,plate_width,43)
	var op=h.operator_for(str(s.avatar))
	for plate in [ally,opponent]:
		h.panel(plate,Color(T.INK,0.87),T.EDGE)
	h.draw_rect(Rect2(ally.position,Vector2(3,43)),T.GREEN)
	h.draw_rect(Rect2(opponent.end.x-3,opponent.position.y,3,43),T.RED)
	h.text_at(op.name,ally.position.x+9,ally.position.y+17,15,T.TEXT)
	h.text_at("生命 %d" % s.playerHp,ally.position.x+9,ally.position.y+37,13,T.MUTED)
	h.text_at("英语总监" if boss else h.Look.ENEMIES.get(enemy,"敌方"),opponent.position.x+9,opponent.position.y+17,15,T.TEXT)
	h.text_at("生命 %d" % s.botHp,opponent.position.x+9,opponent.position.y+37,13,T.MUTED)
	h.bar(Rect2(ally.position+Vector2(9,21),Vector2(plate_width-18,3)),s.playerHp,140,T.GREEN)
	var enemy_bar=Rect2(opponent.position+Vector2(9,21),Vector2(plate_width-18,3))
	h.bar(enemy_bar,s.botHp,s.enemyMaxHp,T.RED)
	if not boss:h.hit_feedback.hp_trail(h,enemy_bar)
	var q=h.data.get("choice")
	h.panel(r.question,SURFACE,BORDER)
	if q is Dictionary:
		var title="看词选意" if q.mode=="choose_meaning" else "看意选词"
		h.text_at("答对了" if q.answered and q.correct else "看清正确答案" if q.answered else title,r.question.position.x+12,r.question.position.y+22,15,T.GREEN if not q.answered or q.correct else T.RED)
		label(h,(h.data.lastAnswer.word+" · "+str(h.data.lastAnswer.meaning).split(";")[0].split("；")[0]) if q.answered else q.prompt,Rect2(r.question.position+Vector2(12,30),r.question.size-Vector2(24,28)),16 if q.answered else 22 if q.mode=="choose_word" else 30,T.TEXT)
	else:
		h.text_at("正在准备选项…",r.question.position.x+12,r.question.position.y+32,16,T.MUTED)
	var comms=h.Communications.presentation(h)
	var caption="轻点选项作答，答后自动进入下一题。" if comms.mode=="guide" else str(comms.caption)
	var notice=h.error_text if not h.error_text.is_empty() else h.level_notice if h.level_notice_time>0 else ""
	if not notice.is_empty():
		h.text_at(notice,r.caption.position.x,r.caption.position.y+13,12,T.GREEN,r.caption.size.x)
		label(h,caption,Rect2(r.caption.position+Vector2(0,16),r.caption.size-Vector2(0,16)),12,T.MUTED)
	else:label(h,caption,r.caption,13,T.MUTED)
