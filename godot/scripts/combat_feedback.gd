extends RefCounted
# A visual receipt for one confirmed answer. Never advances or mutates combat state.
const T=preload("res://scripts/design_tokens.gd")
var age=99.0
var damage=0
var combo=0
var energy=0
var hp_before=0.0
var hp_after=0.0
var hp_max=1.0
var burst=false
var boss=false
var reinforced=false
var triggers=0

func clear() -> void:age=99.0

func trigger(before:Dictionary,after:Dictionary,is_boss:bool) -> void:
	age=0;triggers+=1;boss=is_boss
	damage=maxi(0,int(after.get("dealt",0))-int(before.get("dealt",0)))
	combo=int(after.get("combo",0));burst=bool(after.get("last",{}).get("burst",false))
	energy=maxi(0,int(after.get("last",{}).get("energyGain",0)))
	hp_before=float(before.get("botHp",0));hp_after=float(after.get("botHp",0));hp_max=float(after.get("enemyMaxHp",1))
	reinforced=damage>=hp_before and hp_after>0 and not boss

func advance(delta:float,paused:bool) -> void:
	if not paused:age+=delta

func active() -> bool:return age<T.HIT_HOLD_SECONDS

func kick() -> float:
	return maxf(0,1-age/0.24)*sin(minf(1,age/0.045)*PI/2) if active() else 0.0

func ally_offset(reduced:bool) -> Vector2:return Vector2.ZERO if reduced else Vector2(-T.HIT_RECOIL*kick(),0)
func enemy_offset(reduced:bool) -> Vector2:return Vector2.ZERO if reduced else Vector2(T.HIT_KNOCKBACK*kick(),-2*kick())

func hp_trail(h,rect:Rect2) -> void:
	if not active() or hp_after>=hp_before or hp_max<=0:return
	var trailing=lerpf(hp_before,hp_after,clampf((age-0.14)/0.55,0,1))
	var a=clampf(hp_after/hp_max,0,1);var b=clampf(trailing/hp_max,0,1)
	h.draw_rect(Rect2(rect.position+Vector2(rect.size.x*a,0),Vector2(rect.size.x*(b-a),rect.size.y)),T.TEXT)

func draw(h,target:Vector2) -> void:
	if not active():return
	var alpha=clampf((T.HIT_HOLD_SECONDS-age)/0.28,0,1)
	var accent=T.ORANGE if burst else T.GREEN
	if age<0.48:
		var distance=17.0+(0 if h.slow_motion else 14*exp(-age*18))
		for direction in [Vector2(-1,-1),Vector2(1,-1),Vector2(-1,1),Vector2(1,1)]:
			var a=target+direction*distance;var b=target+direction*(distance+9)
			h.draw_line(a,b,Color(T.INK,0.8),6,true)
			h.draw_line(a,b,Color(accent,alpha),3,true)
	var rise=0.0 if h.slow_motion else minf(age,0.7)*28
	var size_px=(T.HIT_BURST_SIZE if burst else T.HIT_DAMAGE_SIZE)+int(6*maxf(0,1-age/0.16))
	var pos=Vector2(target.x+56,target.y-12-rise)
	var label="−%d" % damage
	h.draw_string_outline(h.mono,pos,label,HORIZONTAL_ALIGNMENT_LEFT,-1,size_px,5,Color(T.INK,alpha))
	h.text_at(label,pos.x,pos.y,size_px,Color(T.TEXT,alpha),-1,true)
	h.text_at("打断蓄力" if boss else "目标击破" if reinforced else "四连爆发" if burst else "确认命中",pos.x,pos.y+23,13,Color(accent,alpha))
	if combo>=2:
		h.text_at("%02d" % combo,884,348,32 if h.slow_motion else 32+int(6*maxf(0,1-age/0.2)),Color(accent,alpha),-1,true)
		h.text_at("连续命中",884,370,12,Color(T.TEXT,alpha))
	if energy>0:h.text_at("+%d 能量" % energy,814,540,11,Color(T.GREEN,alpha))
	if combo>=3:
		h.draw_rect(T.SKILL_ROW.grow(3),Color(accent,alpha*0.65),false,2)
