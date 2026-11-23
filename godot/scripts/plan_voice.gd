extends "res://scripts/voice_pack.gd"

var book_id="cet4"

func suitable(clips_for_event:Array,book:String) -> Array:
	if book not in ["zk","gk"]:return clips_for_event
	return clips_for_event.filter(func(clip):
		var caption=str(clip.get("caption",""))
		for exam in ["四六级","四级","六级","考研"]:
			if exam in caption:return false
		return true)

func page_candidates(key:String,book:String) -> Array:
	return suitable(super.page_candidates(key,book),book)

func event_clips(event:String) -> Array:
	return suitable(super.event_clips(event),book_id)
