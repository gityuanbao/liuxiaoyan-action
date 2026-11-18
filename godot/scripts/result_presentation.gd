extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")

static func arrange_controls(h) -> void:
	for b in h.ui.get_children():
		if not b is Button:continue
		var rect:Rect2
		if b.text in ["返回路线","返回学习中心"]:rect=T.RESULT_BACK
		elif b.text in ["再来一场","查看本轮复习排期"]:rect=T.RESULT_SECOND
		else:continue
		b.position=rect.position;b.size=rect.size
		b.add_theme_font_size_override("font_size",15)
	if h.data.get("result",{}).has("rewards") and not h.ui.has_node("ResultRecruit"):
		var recruit=h.button("招募干员  ›",T.RESULT_RECRUIT,func():h.go("spirits"))
		recruit.name="ResultRecruit";recruit.add_theme_font_size_override("font_size",12)

static func draw(h) -> void:
	var s:Dictionary=h.state()
	if s.is_empty():return
	var won=s.get("outcome")=="victory"
	var accent=T.GREEN if won else T.RED
	var op=h.operator_for(str(s.get("avatar","mage")))
	var boss=h.DirectorBoss.active(h)
	var mission=h.data.get("learningMission")
	var choice=mission is Dictionary and mission.get("answerMode","spelling")!="spelling"
	var book_mode=h.data.get("stage",{}).get("bookMode",false)
	h.text_at("行动报告",32,117,T.FONT_PAGE,T.TEXT)
	h.text_at(h.Look.region(h.data.get("stage",{})),208,114,16,T.MUTED)
	h.panel(T.RESULT_BODY,T.SURFACE)
	h.draw_rect(Rect2(32,140,1216,3),accent)
	h.draw_rect(Rect2(32,143,236,451),Color(T.BASE,0.24))
	h.draw_character("director" if boss else op.id,"defeat" if boss and won else "taunt" if boss else "idle",h.result_time if boss else h.ui_time,T.RESULT_ACTOR,Color(0.90,0.94,0.88))
	h.panel(T.RESULT_ACTOR_LABEL,T.SURFACE)
	h.text_at("英语总监" if boss else op.name+" / "+op.role,60,542,17,T.TEXT,180)
	h.text_at("百词挑战" if boss else op.en,60,561,11,T.MUTED,180,true)
	var x=T.RESULT_TEXT_X
	h.text_at("任务完成" if won else "行动失利",x,183,14,accent)
	var title="本轮结束 · 仍需巩固" if won and mission is Dictionary and mission.needsReview>0 else "本轮回忆完成" if won and mission is Dictionary else "词单完成" if won and book_mode else "行动完成" if won else "回家吧，孩子"
	if boss and won:title="英语总监 · 挑战成功"
	elif choice and won:title="本轮辨认完成" if mission.needsReview==0 else "本轮结束 · 仍需巩固"
	h.text_at(title,x,232,T.RESULT_TITLE_SIZE,accent,T.RESULT_TEXT_WIDTH)
	h.text_at("先补齐薄弱词，再按排期复习。" if won and mission is Dictionary and mission.needsReview>0 else "本轮记录已保存，记得回来复习。" if won else "错词已记录，整备后再来挑战。",x,263,14,T.MUTED,T.RESULT_TEXT_WIDTH)
	var total=int(s.get("hits",0))+int(s.get("mistakes",0))
	var distinct:Array=[]
	for a in h.data.get("attempts",[]):
		if not distinct.has(a.id):distinct.append(a.id)
	var metrics=[str(distinct.size()).pad_zeros(2),str(roundi(float(s.get("hits",0))/maxi(1,total)*100))+"%",str(int(h.data.get("peak",0))).pad_zeros(2),"+"+str(int(h.data.get("result",{}).get("xp",0)))]
	if mission is Dictionary:metrics[1]=str(roundi(float(mission.get("recognized",0) if choice else mission.recalled)/maxi(1,int(mission.selectedTotal))*100))+"%"
	if boss:
		metrics[0]="%d/100" % h.data.boss.completed
		var attempts=h.data.get("attempts",[])
		metrics[1]=str(roundi(float(attempts.filter(func(a):return a.correct).size())/maxi(1,attempts.size())*100))+"%"
	for i in 4:
		var mx=x+(i%2)*208
		var y=301+(i/2)*85
		h.text_at(["本局单词","辨认完成率" if choice else "独立回忆率" if mission is Dictionary else "正确率","最高连击","学习经验"][i],mx,y,13,T.MUTED)
		h.text_at(metrics[i],mx,y+42,T.RESULT_METRIC_SIZE,T.TEXT,188,true)
	h.draw_line(Vector2(x,359),Vector2(696,359),T.EDGE)
	var rewards:Dictionary=h.data.get("result",{}).get("rewards",{})
	if not rewards.is_empty():
		h.draw_rect(Rect2(x,503,276,26),Color(T.SELECTED,0.65))
		h.text_at(C.NAME,x+10,521,12,T.MUTED)
		C.amount(h,rewards.get("coins",0),Vector2(x+64,521),15,T.GREEN,true,18)
		h.text_at("余额 "+C.number(h.data.get("recruitment",{}).get("coins",0)),x+151,521,12,T.REWARD_INK,115)
	if mission is Dictionary:
		h.text_at("辨认 %d/%d  ·  待巩固 %d" % [mission.recognized,mission.selectedTotal,mission.needsReview] if choice else "独立回忆 %d/%d  ·  跟打 %d  ·  待巩固 %d" % [mission.recalled,mission.selectedTotal,mission.copied,mission.needsReview],x,469,15,T.GREEN if mission.needsReview==0 else T.ORANGE,T.RESULT_TEXT_WIDTH)
		h.text_at("辨认与拼写分别记录，请按排期继续复习。" if choice else "本局回忆不等于记牢，请按排期继续复习。",x,495,12,T.MUTED,T.RESULT_TEXT_WIDTH)
	else:
		h.text_at("独立回忆 %d 词  ·  打断攻击 %d 次" % [h.data.boss.independent,h.data.boss.interrupts] if boss else "命中 %d 次  ·  总伤害 %d  ·  大招 %d 次" % [s.hits,s.dealt,s.ultimateUses],x,469,14,T.MUTED,T.RESULT_TEXT_WIDTH)
		var answer=h.data.get("lastAnswer")
		if answer is Dictionary and answer.get("correct",false):h.text_at("末词  "+str(answer.word),x,495,14,T.GREEN,T.RESULT_TEXT_WIDTH)
	h.text_at("英语总监",728,181,16,T.TEXT)
	h.text_at("胜利回电" if won else "战后提醒",1130,181,13,accent,94)
	h.draw_rect(T.RESULT_VIDEO,Color.BLACK)
	h.draw_rect(T.RESULT_VIDEO,T.EDGE,false,1)
	if h.result_meme and h.result_meme.is_result:
		h.text_at(h.result_meme.status_text(),1112,558,12,T.MUTED,112)
		if h.result_meme.video.is_playing():
			var duration=maxf(0.01,float(h.result_meme.active_clip.get("duration",1)))
			h.bar(Rect2(728,477,496,2),h.result_meme.video.stream_position,duration,accent)
