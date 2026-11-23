extends RefCounted

const T=preload("res://scripts/design_tokens.gd")

static func bookmark(h,rect:Rect2,phone:bool=false) -> void:
	var word=h.data.get("word")
	if not word is Dictionary or h.data.get("chanting",false):return
	var saved:bool=h.data.get("wordSaved",false)
	var b=h.button("已收藏" if saved else "收藏单词",rect,func():
		var current=h.data.get("word")
		if current is Dictionary:
			h.bridge.request("bookmark",{"id":current.id,"saved":not h.data.get("wordSaved",false)}),saved)
	b.name="BookmarkWord"
	b.focus_mode=Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size",14 if phone else 15)
	b.tooltip_text="取消收藏" if saved else "加入收藏单词"

static func layout(h) -> Dictionary:
	var phone:bool=h.mobile_ui.enabled
	var width:float=h.mobile_ui.canvas.x if phone else 1280
	var margin:=16 if phone else 40
	return {"phone":phone,"width":width,"margin":margin,"top":104 if phone else 171,
		"row":36 if phone else 53,"bottom":341 if phone else 521}

static func build(h) -> void:
	var r=layout(h)
	var m:Dictionary=h.data.get("favorites",{})
	var x:int=r.margin
	var w:float=r.width
	var ht:=36 if r.phone else 46
	h.button("返回学习中心",Rect2(w-x-142,56 if r.phone else 92,142,36),func():
		h.go("books")).add_theme_font_size_override("font_size",15)
	for i in m.get("rows",[]).size():
		var word:Dictionary=m.rows[i]
		var y:int=r.top+i*r.row
		h.button("移除",Rect2(w-x-68,y+3,60,r.row-7),func():
			h.bridge.request("bookmark",{"id":word.id,"saved":false})).add_theme_font_size_override("font_size",14)
	var page:int=m.get("page",0)
	var pages:int=m.get("pages",1)
	h.button("上一页",Rect2(x,r.bottom,85,ht),func():
		h.bridge.request("favorites_page",{"page":page-1}),false,page==0).add_theme_font_size_override("font_size",15)
	h.button("下一页",Rect2(x+142,r.bottom,85,ht),func():
		h.bridge.request("favorites_page",{"page":page+1}),false,page>=pages-1).add_theme_font_size_override("font_size",15)
	var active:bool=not h.state().is_empty() and h.state().get("outcome")==null
	var action=h.button("先完成当前行动" if active else "复习本页收藏",Rect2(w-x-198,r.bottom,198,ht),func():
		h.bridge.request("favorite_review"),true,active or m.get("count",0)==0)
	action.name="ReviewFavorites"
	action.add_theme_font_size_override("font_size",17)

static func draw(h) -> void:
	var r=layout(h)
	var m:Dictionary=h.data.get("favorites",{})
	var x:int=r.margin
	var w:float=r.width
	var heading:=82 if r.phone else 123
	h.text_at("收藏单词",x,heading,24 if r.phone else 34,T.TEXT)
	h.text_at("共 %d 词" % m.get("count",0),x+(118 if r.phone else 180),heading,14 if r.phone else 18,T.GREEN)
	for i in m.get("rows",[]).size():
		var word:Dictionary=m.rows[i]
		var y:int=r.top+i*r.row
		var shift:=clampi(roundi(w*0.27),175,330)
		var baseline:=y+(23 if r.phone else 34)
		h.panel(Rect2(x,y,w-x*2,r.row-3),Color(T.SURFACE,0.96),T.EDGE)
		h.text_at(word.word,x+12,baseline,18 if r.phone else 24,T.TEXT,shift-24)
		h.text_at(str(word.meaning).replace("\n","  "),x+shift,baseline,15 if r.phone else 18,T.MUTED,w-x*2-shift-77)
	if m.get("count",0)==0:
		h.text_at("答题时点「收藏单词」，就能在这里单独复习。",x+12,r.top+84,18 if r.phone else 23,T.MUTED,w-x*2-24)
	h.text_at("%d / %d" % [m.get("page",0)+1,m.get("pages",1)],x+95,r.bottom+(23 if r.phone else 29),14,T.MUTED)
