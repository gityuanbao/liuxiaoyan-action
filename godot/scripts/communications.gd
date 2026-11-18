extends RefCounted

const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")
const SYSTEM_WIDTH=280.0
const SYSTEM_GAP=12.0
static var caption_cache:Dictionary={}
const IDLE_HINTS={"battle":"看词义，记读音；完整拼写后开火。","books":"选择学习内容，确认本轮词单。","memory":"先复习到期词，再学习新词。","spirits":"查看干员战技，选择出战搭档。","collection":"回看词义与读音，把薄弱词加入复习。","result":"查看本轮表现，继续巩固薄弱词。"}

static func presentation(h) -> Dictionary:
	var v=h.mentor_voice
	var a=h.battle_audio
	var result={"mode":"guide","speaker":"行动提示","status":"待命","caption":IDLE_HINTS.get(h.page,"选择学习计划，开始今日行动。"),"visible":999,"progress":0.0}
	if a and (a.dictation or (h.page=="battle" and h.data.get("playing",false))):
		result.merge({"mode":"dictation","speaker":"英语听写","status":"已暂停" if a.paused else "听写播放中","caption":"请先听完英文，再输入答案。"},true)
	elif a and a.reading_busy:
		result.merge({"mode":"word","speaker":"英语发音","status":"已暂停" if a.paused else "正在朗读","caption":a.display_word()},true)
	elif h.page=="result" and h.result_meme and h.result_meme.is_result:
		result.caption="本轮记录已保存。按复习排期，巩固这次学过的词。" if h.state().get("outcome")=="victory" else "学习记录已保存。先回顾薄弱词，再开始下一次行动。"
	elif v and v.caption_is_visible():
		result.merge({"mode":"voice","speaker":"英语总监","status":"已暂停" if v.suspended else "静音 · 字幕" if not v.enabled else "播报结束" if v.active_finished else "正在播报","caption":str(v.active_clip.get("caption","")),"visible":v.caption_visible(),"progress":clampf(v.playback_seconds()/maxf(0.01,float(v.active_clip.get("duration",1))),0,1)},true)
	elif not v or v.active_clip.is_empty():
		if not h.mentor_text.is_empty():
			result.caption=h.mentor_text
			result.visible=int(h.mentor_visible)
	return result

static func regions(h) -> Dictionary:
	var total=1216.0 if h.page=="battle" else 896.0
	var voice=Rect2(32,T.DIALOG_Y,total-SYSTEM_WIDTH-SYSTEM_GAP,T.DIALOG_H)
	return {"voice":voice,"system":Rect2(voice.end.x+SYSTEM_GAP,T.DIALOG_Y,SYSTEM_WIDTH,T.DIALOG_H),"action":Rect2(960,614,288,78)}

static func lines_for(face:Font,value:String,width:float,size_px:int) -> Array:
	var lines=[];var line="";var start=0
	for i in value.length():
		var ch=value[i]
		if ch=="\n" or (not line.is_empty() and face.get_string_size(line+ch,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px).x>width):
			lines.append({"text":line,"start":start});line="";start=i+(1 if ch=="\n" else 0)
		if ch!="\n":line+=ch
	lines.append({"text":line,"start":start})
	return lines

static func caption_layout(h,p:Dictionary,width:float) -> Dictionary:
	var full=str(p.caption);var mono=p.mode=="word"
	var face=h.mono if mono else h.font
	var key=str([face.get_instance_id(),full,width,mono])
	if caption_cache.has(key):return caption_cache[key]
	var size_px=24 if mono else 20
	var lines=lines_for(face,full,width,size_px)
	if lines.size()>1:
		size_px=16;lines=lines_for(face,full,width,size_px)
		if lines.size()>2:size_px=14;lines=lines_for(face,full,width,size_px)
	var layout={"lines":lines,"size":size_px,"mono":mono}
	if caption_cache.size()>96:caption_cache.clear()
	caption_cache[key]=layout;return layout

static func draw_system(h,rect:Rect2) -> void:
	var p:Dictionary=h.data.get("progression",{})
	var notice=h.level_notice_time>0
	var error=not h.error_text.is_empty()
	var tint=T.RED if error else T.GREEN
	h.panel(rect,T.SURFACE,tint if notice or error else T.EDGE)
	h.draw_rect(Rect2(rect.position,Vector2(3,rect.size.y)),tint if notice or error else T.EDGE)
	var x=rect.position.x+16
	if notice or error:
		h.text_at("操作未完成" if error else h.level_notice,x,rect.position.y+26,16,tint,248)
		var detail=h.error_text if error else h.level_notice_detail
		h.wrapped(detail,Rect2(x,rect.position.y+48,248,24),12,T.MUTED)
	else:
		h.text_at("学习等级 Lv.%02d" % p.get("level",1),x,rect.position.y+25,14,T.GREEN)
		C.amount(h,int(h.data.get("recruitment",{}).get("coins",0)),Vector2(x+166,rect.position.y+25),14,T.TEXT,false,16)
		h.text_at("可领取 %d 哈弗币升级奖励" % p.pending if int(p.get("pending",0))>0 else "%d / %d XP" % [p.get("progress",0),p.get("required",100)],x,rect.position.y+53,13,T.MUTED)
		h.bar(Rect2(x,rect.position.y+63,248,2),p.get("progress",0),p.get("required",100),T.GREEN)

static func draw(h) -> void:
	var rects=regions(h)
	var rect:Rect2=rects.voice
	var w=rect.size.x
	var p=presentation(h)
	h.panel(rect,T.SURFACE,T.EDGE)
	h.draw_rect(T.COMMS_PORTRAIT,T.PANEL)
	var talking=h.mentor_voice and h.mentor_voice.is_speaking() and p.mode=="voice"
	var tex=h.director_portrait.sample(h,p)
	if tex: h.draw_texture_rect(tex,T.COMMS_PORTRAIT,false,Color.WHITE if p.mode=="voice" else Color(0.84,0.88,0.85))
	h.draw_rect(T.COMMS_PORTRAIT,T.EDGE,false,1)
	h.text_at(p.speaker,T.COMMS_TEXT_X,T.COMMS_TITLE_Y,12,T.GREEN)
	var badge_x=32+w-148
	var icon="voice_pause" if p.status=="已暂停" else "voice_speaker"
	h.draw_texture_rect(h.textures["skill_"+icon],Rect2(badge_x,623,18,18),false,T.MUTED)
	h.text_at(p.status,badge_x+26,T.COMMS_TITLE_Y,11,T.MUTED,106)
	var width=rect.end.x-T.COMMS_TEXT_X-16
	var layout=caption_layout(h,p,width)
	var current=0
	for i in layout.lines.size():
		if int(p.visible)>int(layout.lines[i].start):current=i
	var first=maxi(0,current-1)
	for i in mini(2,layout.lines.size()-first):
		var line:Dictionary=layout.lines[first+i]
		var revealed=str(line.text).substr(0,maxi(0,int(p.visible)-int(line.start)))
		h.text_at(revealed,T.COMMS_TEXT_X,668 if layout.lines.size()==1 else 658+i*22,layout.size,T.TEXT if p.mode in ["voice","word"] else T.MUTED,width,layout.mono)
	if p.mode=="voice": h.bar(Rect2(T.COMMS_TEXT_X,687,width,2),p.progress,1,T.GREEN if talking else T.EDGE)
	draw_system(h,rects.system)
