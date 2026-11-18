extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const Q=preload("res://scripts/choice_ui.gd")
var enabled=false
var canvas=Vector2(360,780)
var portrait=true
var touch=false
var last_size=Vector2i.ZERO
var draft_book=""
var draft_batch=10
var draft_goal=20
var draft_mode="spelling"
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
	var b=h.button(label,rect,fn,accent,disabled);b.add_theme_font_size_override("font_size",16)
	var primary=id in ["MobileStart","MobileRecruit","ChoiceNext","Submit","MobileResultNext"]
	var fill=T.GREEN if primary and not disabled else Color("263a2e") if accent else Color("18211d")
	var style=T.style(fill,T.GREEN if accent else Color("344239"))
	style.content_margin_left=6;style.content_margin_right=6
	b.add_theme_stylebox_override("normal",style)
	b.add_theme_color_override("font_color",T.INK if primary and not disabled else T.GREEN if accent else T.TEXT)
	b.add_theme_color_override("font_hover_color",T.INK if primary else T.TEXT)
	b.add_theme_stylebox_override("hover",T.style(Color("baffce") if primary else Color("304436"),T.GREEN))
	b.add_theme_stylebox_override("disabled",T.style(Color("17201c"),Color("2b3730")))
	if not id.is_empty():b.name=id
	return b

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
		return {"scene":scene,"question":question,"options":options,"skills":Rect2(16,ht-156,w-32,44),"next":Rect2(16,ht-104,w-32,44),"caption":Rect2(16,ht-52,w-32,44)}
	var left=floor(w*0.42)
	var scene=Rect2(16,54,w-32,154)
	var question=Rect2(16,220,left-24,88)
	var options=[]
	var option_width=(w-left-32)/2
	for i in 4:options.append(Rect2(left+8+(i%2)*(option_width+8),220+(i/2)*62,option_width,54))
	return {"scene":scene,"question":question,"options":options,"skills":Rect2(16,318,left-24,46),"next":Rect2(w-164,348,148,40),"caption":Rect2(16,370,w-200,26)}

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
			var selected=h.page==target or (i==0 and h.page in ["home","modes","map"])
			var b=button(h,["学习","干员","成长"][i],Rect2(194+i*64,7,60,36),func():h.go(target),selected,false,"MobileNav_"+target)
			var normal=T.style(Color.TRANSPARENT,T.GREEN if selected else Color.TRANSPARENT)
			normal.set_border_width_all(0);normal.border_width_bottom=2;b.add_theme_stylebox_override("normal",normal)
	button(h,"声音",Rect2(w-72,7,56,36),func():h.go("sound"),false,false,"MobileSound")
	match h.page:
		"battle":build_battle(h)
		"result":
			button(h,"返回学习计划",Rect2(24,ht-62,(w-60)/2,44),func():h.go("books"),false,false,"MobileResultBack")
			button(h,"再练本轮薄弱词" if h.data.get("learningMission") is Dictionary and h.data.learningMission.needsReview>0 else "继续今日计划",Rect2(36+(w-60)/2,ht-62,(w-60)/2,44),func():h.bridge.request("retry_study") if h.data.get("learningMission") is Dictionary and h.data.learningMission.needsReview>0 else h.go("books"),true,false,"MobileResultNext")
		"spirits":build_operators(h)
		"progression","arsenal","supplies":build_growth(h)
		"sound","voices":
			var controls=[["游戏音效",h.battle_audio.effects_enabled,func():h.battle_audio.toggle_effects();h.rebuild()],["单词读音",h.battle_audio.words_enabled,func():h.battle_audio.toggle_words();h.rebuild()],["总监语音",h.mentor_voice.enabled,func():h.mentor_voice.toggle();h.rebuild()],["减少动效",h.slow_motion,func():h.slow_motion=not h.slow_motion;h.rebuild()]]
			for i in controls.size():button(h,controls[i][0]+("：开" if controls[i][1] else "：关"),Rect2(16 if portrait else 16+(i%2)*w/2,100+(i if portrait else i/2)*60,w-32 if portrait else w/2-24,48),controls[i][2],controls[i][1])
		"memory","collection":
			button(h,"复习到期词",Rect2(16,ht-106,w-32,48),func():h.bridge.request("review_start"),true,h.data.get("memory",{}).get("due",0)==0)
		_ :build_plan(h)

func plan_area() -> Rect2:
	return Rect2(floor(canvas.x*0.36),58,canvas.x-floor(canvas.x*0.36)-24,320)

func book_rect(index:int) -> Rect2:
	var r=plan_area();var width=(r.size.x-16)/3
	return Rect2(r.position.x+index*(width+8),86,width,88)

func build_plan(h) -> void:
	var w=canvas.x;var ht=canvas.y
	if draft_book.is_empty():
		draft_book=h.data.bookSettings.selected;draft_batch=int(h.data.study.settings.batch);draft_goal=int(h.data.study.settings.goal)
		draft_mode=h.data.study.settings.get("answerMode","spelling")
	var r=plan_area();var x=r.position.x;var area=r.size.x
	for i in 3:
		var id=["cet4","cet6","ky"][i]
		var card=button(h,"",book_rect(i),func():draft_book=id;h.rebuild(),draft_book==id,start_pending,"MobileBook_"+id)
		card.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,T.GREEN if draft_book==id else T.EDGE))
		card.add_theme_stylebox_override("hover",T.style(Color(T.GREEN,0.05),T.GREEN))
	for i in 3:
		var mode=Q.MODES[i]
		button(h,["拼写单词","选择词义","选择单词"][i],Rect2(x+i*(area+8)/3,204,(area-16)/3,42),func():draft_mode=mode;h.rebuild(),draft_mode==mode,start_pending,"AnswerMode_"+mode)
	var half=(area-24)/2
	for i in 3:
		var amount=[5,10,15][i]
		button(h,str(amount),Rect2(x+i*(half+6)/3,278,(half-12)/3,40),func():draft_batch=amount;h.rebuild(),draft_batch==amount,start_pending,"MobileBatch_%d" % amount)
	for i in 4:
		var amount=[5,10,20,30][i]
		button(h,str(amount),Rect2(x+half+24+i*(half+6)/4,278,(half-18)/4,40),func():draft_goal=amount;h.rebuild(),draft_goal==amount,start_pending,"MobileGoal_%d" % amount)
	var active=not h.state().is_empty() and h.state().get("outcome")==null
	button(h,"正在准备行动…" if start_pending else "继续当前行动" if active else "保存计划并开始",Rect2(x,334,area,44),func():
		if active:h.ActionFlow.run(h)
		else:
			if start_pending:return
			start_pending=true;h.error_text=""
			h.bridge.request("mobile_plan_start",{"id":draft_book,"batch":draft_batch,"goal":draft_goal,"answerMode":draft_mode})
			h.rebuild.call_deferred()
		,true,start_pending,"MobileStart")
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
	if Q.active(h):
		for i in 4:
			var option=Q.option(h,h.data.choice.options[i],i,r.options[i],17)
			option.tooltip_text="";option.focus_mode=Control.FOCUS_NONE
		button(h,"下一题" if h.data.choice.answered else "请选择一个答案",r.next,func():h.bridge.request("choice_next",{"token":h.data.choice.token}),true,not h.data.choice.answered or h.data.paused,"ChoiceNext")
	else:
		var rect:Rect2=r.options[0]
		var new_field=not is_instance_valid(h.field)
		if new_field:h.field=LineEdit.new()
		h.field.keep_editing_on_text_submit=true
		h.field.position=rect.position+Vector2(0,4);h.field.size=Vector2(canvas.x-rect.position.x-16,58)
		h.field.add_theme_font_size_override("font_size",22);h.field.placeholder_text="输入英文 · 回车提交"
		h.field.add_theme_stylebox_override("normal",T.style(T.DEEP,T.EDGE))
		h.field.add_theme_stylebox_override("focus",T.style(T.DEEP,T.GREEN,2))
		if new_field:h.field.text=h.battle_draft
		h.field.add_theme_font_override("font",h.font)
		h.field.editable=not h.data.paused
		if new_field:
			h.field.text_submitted.connect(func(_v):h.submit());h.ui.add_child(h.field)
			h.resume_word_input()
		button(h,"提交单词",r.next,func():h.submit(),true,h.data.paused or h.data.cooldown>0,"Submit").focus_mode=Control.FOCUS_NONE
	for i in 4:
		var action=["surge","ward","tactic","chant"][i]
		var disabled=h.data.paused or h.data.cooldown>0 or (h.data.get("chanting",false) and i<3) or (Q.active(h) and h.data.choice.answered) or (s.energy<30 if i==0 else s.energy<20 or s.shield>=40 if i==1 else s.tacticUsed or s.normalHits<3 or (s.avatar=="mage" and s.energy>=100) if i==2 else s.energy<100)
		var b=button(h,"",Rect2(r.skills.position+Vector2(i*(r.skills.size.x+8)/4,0),Vector2((r.skills.size.x-24)/4,46)),func():use_skill(h,action),false,disabled,["Surge","Ward","Tactic","Chant"][i])
		b.focus_mode=Control.FOCUS_NONE
		var icon=TextureRect.new();icon.texture=h.textures.get("skill_"+(["surge","ward",str(s.avatar)+"_tactic",str(s.avatar)+"_ultimate"][i]))
		icon.expand_mode=TextureRect.EXPAND_IGNORE_SIZE;icon.stretch_mode=TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.position=Vector2(6,7);icon.size=Vector2(28,28);icon.modulate=T.DIM if disabled else T.TEXT
		icon.mouse_filter=Control.MOUSE_FILTER_IGNORE;b.add_child(icon)
		var cost=Label.new();cost.text=["30","20","战技","大招"][i];cost.position=Vector2(35,12)
		cost.add_theme_font_override("font",h.font);cost.add_theme_font_size_override("font_size",12);cost.add_theme_color_override("font_color",T.DIM if disabled else T.GREEN)
		cost.mouse_filter=Control.MOUSE_FILTER_IGNORE;b.add_child(cost)

func use_skill(h,action:String) -> void:
	if action=="chant" and is_instance_valid(h.field):
		if not h.data.get("chanting",false):h.saved_draft=h.field.text;h.field.text=""
		else:h.field.text=h.saved_draft
	h.bridge.request(action if action in ["tactic","chant"] else "prepare",{} if action in ["tactic","chant"] else {"spell":action})

func build_operators(h) -> void:
	var w=canvas.x
	for i in h.OPS.size():
		var index=i
		var b=button(h,"",operator_card_rect(i),func():h.operator_select.choose(h,index),false,false,"MobileOperator_"+h.OPS[i].id)
		b.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,Color.TRANSPARENT))
		b.add_theme_stylebox_override("hover",T.style(Color(0.5,1,0.7,0.04),T.GREEN))
	var op=h.shown_operator();var info=h.RecruitmentUI.info(h,op.id)
	var left=w*0.5-24
	for i in 2:
		var kind=["tactic","ultimate"][i]
		button(h,"演示战技" if i==0 else "演示大招",Rect2(24+i*(left+8)/2,334,(left-8)/2,44),func():h.operator_select.tab=kind;h.operator_select.preview(h),false,h.slow_motion,"MobileSkill_"+kind)
	button(h,"当前出战" if h.profile().get("avatar","mage")==op.id else "选择干员" if info.unlocked else "解锁 · %d 哈弗币" % info.cost,Rect2(w*0.5+24,334,w*0.5-48,44),func():h.bridge.request("avatar" if info.unlocked else "unlock_avatar",{"id":op.id}),true,h.profile().get("avatar","mage")==op.id or (not info.unlocked and not info.affordable),"MobileRecruit")

func operator_card_rect(index:int) -> Rect2:
	var width=(canvas.x*0.5-40)/2
	return Rect2(24+(index%2)*(width+8),100+(index/2)*72,width,64)

func draw_operators(h) -> void:
	var op=h.shown_operator()
	for i in h.OPS.size():
		var item=h.OPS[i];var info=h.RecruitmentUI.info(h,item.id);var r=operator_card_rect(i)
		var selected=item.id==op.id
		h.draw_rect(r,T.SELECTED if selected else Color(T.INK,0.8))
		h.draw_rect(r,T.GREEN if selected else T.EDGE,false,1)
		h.image_cover(h.textures["portrait_"+item.id],Rect2(r.position,Vector2(54,64)))
		h.text_at(item.name,r.position.x+62,r.position.y+25,16,T.TEXT if selected else T.MUTED)
		if info.unlocked:h.text_at("当前出战" if h.profile().get("avatar","mage")==item.id else "已解锁",r.position.x+62,r.position.y+48,11,T.GREEN)
		else:h.CurrencyUI.amount(h,int(info.cost),r.position+Vector2(62,48),12,T.MUTED,false,13)
	var side=minf(260,canvas.x*0.5-24)
	h.text_at(op.name,canvas.x*0.5+24,84,24,T.TEXT)
	h.text_at(op.role,canvas.x*0.5+106,82,13,T.GREEN)
	h.draw_character(op.id,h.operator_select.tab if h.operator_select.playing else "idle",h.operator_select.clock if h.operator_select.playing else h.ui_time,Rect2(canvas.x*0.75-side/2,46,side,side))
	h.text_at(op.skill+" / "+op.ultimate,canvas.x*0.5+24,318,13,T.MUTED)

func build_growth(h) -> void:
	var w=canvas.x;var p=h.data.progression
	button(h,"领取 %d 哈弗币" % p.pending if p.pending>0 else "升级后领取奖励",Rect2(36,290,w*0.40-60,44),func():h.bridge.request("claim_levels"),true,p.pending<=0)
	for i in 2:
		var item=h.data.recruitment.supplies[i]
		var x=w*0.43;var area=w-x-36
		button(h,"购买 · %d 哈弗币" % item.cost,Rect2(x,166+i*138,(area-8)*0.56,40),func():h.bridge.request("buy_supply",{"id":item.id}),false,not item.affordable or item.owned>=item.max)
		button(h,"下场使用" if p.autoSupply[item.id] else "暂不使用",Rect2(x+(area-8)*0.56+8,166+i*138,(area-8)*0.44,40),func():h.bridge.request("supply_enabled",{"id":item.id,"enabled":not p.autoSupply[item.id]}),p.autoSupply[item.id])

func arrange_media(h) -> void:
	if not h.result_meme:return
	var meme=h.result_meme
	if h.page=="result":
		meme.show()
		var rect=Rect2(canvas.x*0.49,74,canvas.x*0.51-24,238)
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
	if h.textures.has("hangar"):h.image_cover(h.textures.hangar,Rect2(Vector2.ZERO,canvas),Color(0.24,0.29,0.25))
	h.draw_rect(Rect2(0,0,w,50),Color("101914"))
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
		if mission is Dictionary:h.text_at("本轮 %d / %d" % [h.data.lesson.completed,h.data.lesson.total],w-230,31,13,T.MUTED)
	match h.page:
		"battle":draw_battle(h)
		"result":
			var x=16;var area=w-32 if portrait else w*0.45-16
			h.text_at("任务完成" if h.state().outcome=="victory" else "回家吧，孩子",x,97,28,T.GREEN if h.state().outcome=="victory" else T.RED)
			var mission:Dictionary=h.data.get("learningMission",{})
			label(h,"本轮辨认 %d 词 / 待巩固 %d" % [mission.get("recognized",0),mission.get("needsReview",0)] if h.data.get("choice") is Dictionary else "本轮学习已记录",Rect2(x,116,area,48),17)
			label(h,"+%d XP   +%d 哈弗币" % [h.data.learningRewards.xp,h.data.learningRewards.coins],Rect2(x,165,area,42),23,T.GREEN)
			label(h,"辨认与拼写分开记录，按排期继续复习。",Rect2(x,211,area,38),13,T.MUTED)
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
		"sound","voices":
			h.text_at("声音与动效",16,84,22,T.TEXT)
		_:
			draw_plan(h)
	arrange_media(h)

func draw_plan(h) -> void:
	var r=plan_area();var x=r.position.x;var area=r.size.x
	var stage_key={"cet4":"dam","cet6":"valley","ky":"city"}.get(draft_book,"dam")
	var hero=Rect2(16,60,x-34,318)
	h.image_cover(h.textures["scene_"+stage_key],hero,Color(0.55,0.61,0.55))
	h.draw_rect(Rect2(16,60,x-34,96),Color(0.03,0.06,0.04,0.68))
	h.text_at("学习行动",30,91,24,T.TEXT)
	var op=h.operator_for(h.profile().get("avatar","mage"))
	h.text_at(op.name+" / "+op.role,30,116,13,T.GREEN)
	var size=minf(270,x+4)
	h.draw_character(op.id,"idle",h.ui_time,Rect2(x*0.5-size/2,68,size,size))
	h.draw_rect(Rect2(16,326,x-34,52),Color(0.03,0.06,0.04,0.9))
	h.text_at("今日已学",30,347,12,T.MUTED)
	h.text_at("%d / %d 词" % [h.data.study.today.count,draft_goal],x-116,347,14,T.TEXT)
	h.bar(Rect2(30,361,x-62,4),h.data.study.today.count,draft_goal,T.GREEN)
	h.draw_rect(Rect2(x-12,58,area+24,328),Color(0.045,0.075,0.056,0.9))
	h.text_at("选择词书",x,76,14,T.TEXT)
	for i in 3:
		var book=h.data.books[i];var card=book_rect(i);var chosen=book.id==draft_book
		h.draw_rect(card,Color("21372a") if chosen else Color("17221c"))
		h.draw_rect(Rect2(card.position,Vector2(3,card.size.y)),T.GREEN if chosen else T.EDGE)
		h.text_at(["四级词书","六级词书","考研词书"][i],card.position.x+12,card.position.y+28,18,T.TEXT if chosen else T.MUTED)
		h.text_at("%d 词" % book.count,card.position.x+12,card.position.y+49,12,T.GREEN if chosen else T.DIM)
		h.text_at("已学 %d" % book.seen,card.position.x+12,card.position.y+70,11,T.MUTED)
		if chosen:h.draw_circle(card.end-Vector2(14,15),3,T.GREEN)
	h.text_at("训练方式",x,196,13,T.TEXT)
	h.text_at("每轮词数",x,270,13,T.MUTED)
	h.text_at("每日目标",x+(area-24)/2+24,270,13,T.MUTED)

func actor_rect(enemy:bool) -> Rect2:
	var scene:Rect2=battle_rects().scene
	var side=148.0 if enemy else 184.0
	return Rect2(Vector2(scene.position.x+scene.size.x*(0.77 if enemy else 0.23)-side/2,scene.end.y-side-6),Vector2(side,side))

func draw_battle(h) -> void:
	var r=battle_rects();var s:Dictionary=h.state()
	if s.is_empty():return
	h.image_cover(h.textures["scene_"+h.SceneCatalog.current(h)],r.scene,Color(0.80,0.84,0.80))
	var scene:Rect2=r.scene
	h.draw_character(str(s.avatar),h.skill_effects.body_action() if not h.skill_effects.body_action().is_empty() else h.character_action(false),h.skill_effects.age if h.skill_effects.active() else h.ui_time,actor_rect(false))
	var enemy=str(h.data.stage.monster)
	h.draw_character(enemy,h.character_action(true),h.ui_time,actor_rect(true))
	if h.fx_time>0 and h.fx_kind in ["hit","hurt"]:h.draw_shooting(T.FX_TIME-h.fx_time,h.fx_kind=="hurt",Vector2.ZERO)
	if h.skill_effects.active():
		var actor=h.skill_effects.actor
		var frames=h.skill_effects.textures.get(actor,[])
		if not frames.is_empty():h.draw_texture_rect(frames[mini(3,int(h.skill_effects.age*4))],Rect2(scene.position+Vector2(52,36),Vector2(80,80)),false)
	h.bar(Rect2(scene.position+Vector2(8,8),Vector2(scene.size.x*0.42,4)),s.playerHp,140,T.GREEN)
	h.bar(Rect2(scene.position+Vector2(scene.size.x*0.55,8),Vector2(scene.size.x*0.42-8,4)),s.botHp,s.enemyMaxHp,T.RED)
	h.draw_rect(Rect2(scene.position+Vector2(0,scene.size.y-24),Vector2(scene.size.x,24)),Color(0.03,0.06,0.04,0.72))
	h.text_at("生命 %d" % s.playerHp,scene.position.x+8,scene.end.y-8,12,T.TEXT)
	h.text_at("敌方 %d" % s.botHp,scene.end.x-90,scene.end.y-8,12,T.TEXT)
	var q=h.data.get("choice")
	h.panel(r.question,T.SURFACE)
	if q is Dictionary:
		var title="选择中文意思" if q.mode=="choose_meaning" else "选择英文单词"
		h.text_at("答对了" if q.answered and q.correct else "看清正确答案" if q.answered else title,r.question.position.x+12,r.question.position.y+23,13,T.GREEN if not q.answered or q.correct else T.RED)
		label(h,(h.data.lastAnswer.word+" · "+str(h.data.lastAnswer.meaning).split(";")[0].split("；")[0]) if q.answered else q.prompt,Rect2(r.question.position+Vector2(12,26),r.question.size-Vector2(24,28)),14 if q.answered else 19 if q.mode=="choose_word" else 27,T.TEXT)
	else:
		h.text_at("输入短语释放大招" if h.data.get("chanting",false) else "拼写正确" if h.data.get("answerFeedback",false) else "根据提示拼写",r.question.position.x+12,r.question.position.y+22,12,T.GREEN)
		label(h,str(h.data.get("prompt","")),Rect2(r.question.position+Vector2(12,30),r.question.size-Vector2(24,38)),22 if str(h.data.get("prompt","")).length()<20 else 15,T.TEXT)
	var comms=h.Communications.presentation(h)
	var caption=str(comms.caption)
	var notice=h.error_text if not h.error_text.is_empty() else h.level_notice if h.level_notice_time>0 else ""
	if not notice.is_empty():
		h.text_at(notice,r.caption.position.x,r.caption.position.y+13,12,T.GREEN,r.caption.size.x)
		label(h,caption,Rect2(r.caption.position+Vector2(0,16),r.caption.size-Vector2(0,16)),12,T.MUTED)
	else:label(h,caption,r.caption,13,T.MUTED)
