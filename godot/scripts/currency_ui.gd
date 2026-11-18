extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const NAME="哈弗币"
const ICON=preload("res://assets/ui/currency/haf_coin.png")

static func number(value:int) -> String:
	var digits=str(absi(value));var result=""
	for i in digits.length():
		if i>0 and (digits.length()-i)%3==0:result+=","
		result+=digits[i]
	return ("-" if value<0 else "")+result

# Baseline-aligned sourced bitmap and tabular amount.
static func amount(h,value:int,baseline:Vector2,size_px:int=18,color:Color=T.TEXT,positive:bool=false,icon_size:float=20) -> void:
	h.draw_texture_rect(ICON,Rect2(baseline+Vector2(0,-icon_size+3),Vector2.ONE*icon_size),false)
	h.text_at(("+" if positive and value>=0 else "")+number(value),baseline.x+icon_size+6,baseline.y,size_px,color,-1,true)

static func balance(h,rect:Rect2,value:int) -> void:
	h.draw_rect(rect,Color(T.DEEP,0.88))
	h.draw_rect(rect,T.EDGE,false,1)
	h.text_at(NAME,rect.position.x+12,rect.position.y+23,12,T.MUTED)
	amount(h,value,rect.position+Vector2(70,24),18,T.TEXT)
