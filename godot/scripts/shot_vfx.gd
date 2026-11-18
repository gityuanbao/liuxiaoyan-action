extends RefCounted

# Texture forward is +X: bright nose on the right, fading tail on the left.
# Rotate that local frame once toward the target. No additional enemy mirroring.
const T=preload("res://scripts/design_tokens.gd")
var frames:Array[Texture2D]=[]
var anchors:Array[Vector2]=[]

func prepare() -> void:
	var contract=JSON.parse_string(FileAccess.get_file_as_string("res://assets/fx/direction-v27/direction-contract.json"))
	for item in contract.frames:
		var tex=CanvasTexture.new()
		tex.diffuse_texture=load(item.file);tex.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
		frames.append(tex);anchors.append(Vector2(item.nose[0],item.nose[1]))

func trajectory(muzzle:Vector2,target:Vector2,elapsed:float) -> Dictionary:
	var direction=(target-muzzle).normalized()
	var t=clampf(elapsed/T.SHOT_FLIGHT_SECONDS,0.0,1.0)
	return {"head":muzzle.lerp(target,t),"direction":direction,"angle":direction.angle(),"progress":t}

func draw(h,muzzle:Vector2,target:Vector2,elapsed:float) -> void:
	if elapsed<0 or elapsed>T.SHOT_FLIGHT_SECONDS+T.SHOT_IMPACT_SECONDS:return
	var frame=clampi(int(elapsed/0.06),0,frames.size()-1)
	var motion=trajectory(muzzle,target,elapsed)
	# A compact radial ignition stays at the barrel. It cannot read as a reversed arrow.
	if elapsed<T.SHOT_MUZZLE_SECONDS and not h.impact_frames.is_empty():
		var alpha=1.0-elapsed/T.SHOT_MUZZLE_SECONDS
		h.draw_texture_rect(h.impact_frames[1],Rect2(muzzle-Vector2.ONE*T.SHOT_MUZZLE_SIZE/2,Vector2.ONE*T.SHOT_MUZZLE_SIZE),false,Color(1,0.92,0.7,alpha))
	if elapsed<T.SHOT_FLIGHT_SECONDS and not h.slow_motion:
		var scale_px=T.SHOT_TRACER_SIZE/256.0
		var nose=anchors[frame]
		# Clip the trailing part until it has left the barrel. It never crosses behind the shooter.
		var visible_tail=minf(nose.x,muzzle.distance_to(motion.head)/scale_px)
		var source=Rect2(nose.x-visible_tail,0,visible_tail+256.0-nose.x,256)
		var destination=Rect2(-visible_tail*scale_px,-nose.y*scale_px,source.size.x*scale_px,T.SHOT_TRACER_SIZE)
		h.draw_set_transform(motion.head,float(motion.angle))
		h.draw_texture_rect_region(frames[frame],destination,source)
		h.draw_set_transform(Vector2.ZERO)
	# Hit sparks appear at arrival, not while the projectile is still at the muzzle.
	var impact_time=elapsed-T.SHOT_FLIGHT_SECONDS
	if impact_time>=0 and impact_time<T.SHOT_IMPACT_SECONDS and not h.impact_frames.is_empty():
		var index=mini(h.impact_frames.size()-1,int(impact_time/T.SHOT_IMPACT_SECONDS*h.impact_frames.size()))
		h.draw_texture_rect(h.impact_frames[index],Rect2(target-Vector2.ONE*T.SHOT_IMPACT_SIZE/2,Vector2.ONE*T.SHOT_IMPACT_SIZE),false,Color(1,1,1,0.55 if h.slow_motion else 1.0))
