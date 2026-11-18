extends RefCounted

const T=preload("res://scripts/design_tokens.gd")

static func build(h) -> void:
	var m:Dictionary=h.data.get("memory",{})
	h.button("返回学习中心",Rect2(1056,80,192,36),func(): h.go("books")).add_theme_font_size_override("font_size",15)
	for i in m.get("rows",[]).size():
		var item:Dictionary=m.rows[i]
		var selected=m.get("detail") is Dictionary and m.detail.id==item.id
		var b=h.button(item.word+"  /  "+item.reviewIn,Rect2(888,188+i*53,336,44),func(): h.bridge.request("memory_select",{"id":item.id}),selected)
		b.add_theme_font_size_override("font_size",15)
		b.clip_text=true
		b.tooltip_text=item.status+" · "+item.meaning
	h.button("‹ 上页",Rect2(888,516,86,26),func(): h.bridge.request("memory_page",{"page":int(m.page)-1}),false,m.get("page",0)==0).add_theme_font_size_override("font_size",13)
	h.button("下页 ›",Rect2(1138,516,86,26),func(): h.bridge.request("memory_page",{"page":int(m.page)+1}),false,m.get("page",0)>=m.get("pages",1)-1).add_theme_font_size_override("font_size",13)
	h.button("复习本书到期词  ›" if m.get("due",0)>0 else "当前没有到期词",Rect2(888,556,336,38),func(): h.bridge.request("review_start"),true,m.get("due",0)==0).add_theme_font_size_override("font_size",18)

static func draw(h) -> void:
	var m:Dictionary=h.data.get("memory",{})
	h.text_at("记忆曲线",32,116,T.FONT_PAGE,T.TEXT)
	h.text_at("艾宾浩斯遗忘规律 · 自适应间隔复习",206,113,16,T.MUTED)
	h.panel(Rect2(32,134,804,332),T.SURFACE)
	h.panel(Rect2(864,134,384,472),T.SURFACE)
	h.text_at("已学 %d · 到期 %d · 较稳定 %d" % [m.get("seen",0),m.get("due",0),m.get("stable",0)],888,165,14,T.TEXT)
	h.text_at("%d / %d" % [m.get("page",0)+1,m.get("pages",1)],1020,535,13,T.MUTED,-1,true)
	var detail=m.get("detail")
	if detail is Dictionary:
		h.text_at(detail.word,64,184,36,T.TEXT,480,true)
		h.text_at("/"+detail.phonetic+"/" if not detail.phonetic.is_empty() else detail.status,64,211,14,T.MUTED)
		h.text_at(detail.status,660,171,16,T.GREEN)
		h.text_at("下次 "+detail.get("dueAt",detail.reviewIn),612,206,14,T.GREEN)
		h.text_at(detail.meaning.replace("\n"," / "),64,236,14,T.MUTED,736)
		if not detail.curve.is_empty():
			var chart=Rect2(76,277,728,124)
			for i in 3:
				var y=chart.position.y+i*chart.size.y/2
				h.draw_line(Vector2(chart.position.x,y),Vector2(chart.end.x,y),T.EDGE)
				h.text_at(str(100-i*50)+"%",39,y+4,11,T.DIM,-1,true)
			var points=PackedVector2Array()
			for p in detail.curve: points.append(chart.position+Vector2(float(p.day)/float(detail.horizon)*chart.size.x,(1-float(p.r))*chart.size.y))
			h.draw_polyline(points,T.GREEN,2,true)
			var threshold=chart.position.y+chart.size.y*0.1
			h.draw_dashed_line(Vector2(chart.position.x,threshold),Vector2(chart.end.x,threshold),Color(T.ORANGE,0.65),1,5)
			h.text_at("90% 复习目标",690,threshold+16,11,T.ORANGE)
			for i in 5:
				h.text_at(str(snappedf(float(detail.horizon)*i/4,0.1))+" 天",chart.position.x+i*chart.size.x/4-(42 if i==4 else 8),422,11,T.MUTED)
			var marker=chart.position+Vector2(clampf(float(detail.elapsed)/float(detail.horizon),0,1)*chart.size.x,(1-float(detail.retention))*chart.size.y)
			h.draw_circle(marker,4,T.TEXT)
			h.text_at("不再复习时的模型估算 · 当前约 %d%%" % roundi(float(detail.retention)*100),64,263,12,T.MUTED)
		else:
			h.text_at("完成一次回忆后，生成个人曲线。",80,330,20,T.MUTED)
		h.text_at("有效独立回忆 %d 次 · 跨 %d 天 · 间隔复习 %d 次" % [detail.independent,detail.recallDays,detail.spaced],64,451,13,T.GREEN)
	else:
		h.text_at("先学习，再绘制你的曲线。",64,224,30,T.TEXT)
		h.wrapped("先去学习中心完成一组单词。这里会显示每个词的复习时间，跟打不直接算记牢。",Rect2(64,280,700,72),18,T.MUTED)
	h.panel(Rect2(32,482,804,124),T.SURFACE)
	h.text_at("未来 7 天 / 当前排期",52,507,14,T.TEXT)
	h.text_at("曲线为估算，不是实测记忆率；排期随复习更新。",390,507,12,T.MUTED)
	for i in m.get("forecast",[]).size():
		var item:Dictionary=m.forecast[i]
		var x=60+i*108
		h.text_at("%02d" % int(item.count),x,552,25,T.GREEN if i==0 else T.TEXT,-1,true)
		h.text_at("今天" if i==0 else str(item.date).substr(5).replace("-","/"),x,581,12,T.MUTED)
