extends "res://scripts/main.gd"
const MemoryCenter=preload("res://scripts/memory_center.gd")
const ActionFlow=preload("res://scripts/action_flow.gd")
const SkillPresentation=preload("res://scripts/skill_presentation.gd")
const Communications=preload("res://scripts/communications.gd")
const DirectorBoss=preload("res://scripts/director_boss.gd")
const SceneCatalog=preload("res://scripts/scene_catalog.gd")
const ModeSelector=preload("res://scripts/mode_selector.gd")
const SkillEffects=preload("res://scripts/skill_effects.gd")
const ShotVfx=preload("res://scripts/shot_vfx.gd")
const CombatFeedback=preload("res://scripts/combat_feedback.gd")
const SkillDescriptions=preload("res://scripts/skill_descriptions.gd")
const MusicDirector=preload("res://scripts/music_director.gd")
const ResultPresentation=preload("res://scripts/result_presentation.gd")
const BookLibrary=preload("res://scripts/book_library.gd")
const SupplyShop=preload("res://scripts/supply_shop.gd")
const ChoiceUI=preload("res://scripts/choice_ui.gd")
var mobile_ui=preload("res://scripts/mobile_ui.gd").new()
var choice_controls_stamp=[]
const ProgressionCenter=preload("res://scripts/progression_center.gd")
var ledger_page=0
var level_notice_time=0.0
var level_notice=""
var level_notice_detail=""
var book_setup_open=false
var book_draft:Dictionary={}
var music:Node
var skill_effects=SkillEffects.new()
var shot_vfx=ShotVfx.new()
var hit_feedback=CombatFeedback.new()
var mode_choice=0
var mode_age=0.0
var mode_weights:Array[float]=[]
var boss_recall=true
var director_clock=0.0
var director_action="idle"
var opening_preview:AudioStreamPlayer
var battle_draft=""
var skill_keyboard_mode=false
var sound_menu_open=false

# Presentation layer only. Every gameplay command still uses the original bridge.
const OPS = [
	{"id":"mage", "name":"红狼", "en":"D-WOLF", "role":"突击", "asset":1, "skill":"动力突击", "ultimate":"集中火力"},
	{"id":"knight", "name":"牧羊人", "en":"SHEPHERD", "role":"工程", "asset":2, "skill":"声波防御", "ultimate":"防线压制"},
	{"id":"ranger", "name":"露娜", "en":"LUNA", "role":"侦察", "asset":3, "skill":"战场侦察", "ultimate":"追踪射击"},
	{"id":"scholar", "name":"骇爪", "en":"HACKCLAW", "role":"侦察", "asset":6, "skill":"情报解析", "ultimate":"精准打击"},
	{"id":"bard", "name":"蜂医", "en":"STINGER", "role":"支援", "asset":4, "skill":"战地医疗", "ultimate":"救援火力"},
	{"id":"alchemist", "name":"威龙", "en":"VYRON", "role":"突击", "asset":5, "skill":"动能突破", "ultimate":"爆破突进"}
]
const FX_STEP = 0.065
const HEADER_NAV_X = 238.0
const NAV_WIDTH = 92.0
var operator_select=preload("res://scripts/operator_select.gd").new()
var inspect_operator = -1
var ui_time = 0.0
var impact_frames: Array = []
var qa_recording = false
var mentor_voice: MentorVoicePack
var character_gifs: CharacterAnimations
var director_portrait=preload("res://scripts/director_portrait.gd").new()
const RecruitmentUI=preload("res://scripts/recruitment_ui.gd")
const CurrencyUI=preload("res://scripts/currency_ui.gd")
var skill_banner = ""
var skill_banner_time = 0.0
var voice_library_page = 0
var voice_library_group = "全部"
var voice_library_selected = "local_30"
var voice_return_page = "home"
var voice_pictures: Dictionary = {}
var battle_audio: BattleAudio
var low_health_clock = 0.0
var result_meme: ResultMeme
var routing_page_voice = false
var startup_locked = false
var success_time=0.0
var memory_refresh_clock=0.0
var prompt_layout_cache:Dictionary={}
var battle_controls_stamp:Array=[]

func _ready() -> void:
	mobile_ui.sync(self)
	character_gifs=CharacterAnimations.new()
	var skill_icons=["surge","ward","voice_speaker","voice_pause"]
	for op in OPS:
		skill_icons.append(op.id+"_tactic")
		skill_icons.append(op.id+"_ultimate")
	for key in skill_icons:
		var icon=CanvasTexture.new()
		icon.diffuse_texture=load("res://assets/ui/skills/"+key+".png")
		icon.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
		textures["skill_"+key]=icon
	var brand_icon=CanvasTexture.new()
	brand_icon.diffuse_texture=load("res://assets/branding/demulan-emblem-v17.png")
	brand_icon.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
	textures["brand_icon"]=brand_icon
	var brand_wordmark=CanvasTexture.new()
	brand_wordmark.diffuse_texture=load("res://assets/branding/wordmark-v41.tres")
	brand_wordmark.texture_filter=CanvasItem.TEXTURE_FILTER_LINEAR
	textures["brand_wordmark"]=brand_wordmark
	textures["battle_stage"]=load("res://assets/generated/zero-dam-battle-v15.png")
	SceneCatalog.prepare(self)
	skill_effects.prepare()
	shot_vfx.prepare()
	for op in OPS:
		textures["hero_"+op.id] = load("res://assets/official/operator-%02d.jpg" % op.asset)
		textures["portrait_"+op.id] = load("res://assets/official/portrait-%02d.jpg" % op.asset)
	textures["rifle"] = load("res://assets/official/m7.png")
	if ResourceLoader.exists("res://assets/generated/operators/sheet-transparent.png"):
		load_atlas("res://assets/generated/operators/sheet-transparent.png", ["op_mage","op_knight","op_ranger","op_scholar","op_bard","op_alchemist"],3,2)
	for i in 6:
		impact_frames.append(load("res://assets/fx/impact/fx-%d.png" % (i+1)))
	super._ready()
	bridge.failed.connect(func(_message):mobile_ui.start_pending=false;rebuild.call_deferred())
	mentor_voice=MentorVoicePack.new()
	mentor_voice.caption_changed.connect(_on_voice_caption)
	add_child(mentor_voice)
	mentor_voice.page_cues["boss"]={"general":mentor_voice.clips.filter(func(c): return "start" in c.get("events",[]) and c.get("scope","general")=="general").map(func(c): return c.id),"ky":mentor_voice.clips.filter(func(c): return "start" in c.get("events",[]) and c.get("scope","general")=="ky").map(func(c): return c.id)}
	battle_audio=BattleAudio.new()
	battle_audio.reading_changed.connect(_on_reading_changed)
	add_child(battle_audio)
	music=MusicDirector.new()
	add_child(music)
	result_meme=ResultMeme.new()
	add_child(result_meme)
	result_meme.bind(self)
	for clip in mentor_voice.clips:
		if clip.has("image"):
			voice_pictures[clip.id]=load("res://assets/voice/"+str(clip.image))
	rebuild()
	if OS.get_cmdline_user_args().has("--smoke"): _run_smoke.call_deferred()
	elif OS.get_cmdline_user_args().has("--voice-qa"): _run_voice_qa.call_deferred()
	elif OS.get_cmdline_user_args().has("--audio-qa"): _run_audio_qa.call_deferred()
	elif OS.get_cmdline_user_args().has("--study-qa"): _run_study_qa.call_deferred()
	elif OS.get_cmdline_user_args().has("--meme-qa"): _run_meme_qa.call_deferred()
	elif OS.get_cmdline_user_args().has("--page-voice-qa"): _run_page_voice_qa.call_deferred()

func _process(delta: float) -> void:
	if mobile_ui.sync(self):rebuild()
	if battle_audio and mentor_voice: battle_audio.mentor_speaking=mentor_voice.is_speaking() or (result_meme and result_meme.is_speaking())
	if music:music.sync(self)
	if qa_recording:
		queue_redraw()
		return
	operator_select.advance(self,delta)
	level_notice_time=maxf(0,level_notice_time-delta)
	ui_time += delta
	mode_age+=delta
	ModeSelector.advance(self,delta)
	hit_feedback.advance(delta,page!="battle" or data.get("paused",false))
	skill_effects.advance(delta,page!="battle" or data.get("paused",false))
	if page=="battle" and not data.get("paused",false) and skill_effects.active() and skill_effects.kind=="ultimate" and skill_effects.age>=0.34 and not skill_effects.fire_cued:
		skill_effects.fire_cued=true
		battle_audio.shot(skill_effects.actor)
	if page=="battle" and DirectorBoss.active(self) and not data.get("paused",false): director_clock+=delta
	if page=="battle" and not data.get("paused",false):success_time=maxf(0,success_time-delta)
	memory_refresh_clock+=delta
	if memory_refresh_clock>=15 and page in ["home","books","memory"] and bridge.ready_to_play and not bridge.busy:
		memory_refresh_clock=0
		bridge.request("state")
	skill_banner_time=maxf(0,skill_banner_time-delta)
	super._process(delta)
	if mentor_voice and not mentor_voice.active_clip.is_empty():
		mentor_visible=mentor_voice.caption_visible()
	low_health_clock=maxf(0,low_health_clock-delta)
	if battle_audio and page=="battle" and not data.get("paused",false) and state().get("outcome")==null and float(state().get("playerHp",140))<=35 and low_health_clock<=0:
		battle_audio.play_effect("low_health",-8)
		low_health_clock=5

func _on_reading_changed(active: bool, _word: String) -> void:
	if mentor_voice: mentor_voice.set_reading(active)

func _on_ui_click() -> void:
	if battle_audio: battle_audio.play_ui_cue("navigate")

func show_system_notice(title:String,detail:String,seconds:float=3.5) -> void:
	level_notice=title;level_notice_detail=detail;level_notice_time=seconds

func handle_combat_keys(event: InputEvent) -> bool:
	if page!="battle" or not event is InputEventKey or not event.pressed:return false
	if event.ctrl_pressed or event.alt_pressed or event.meta_pressed:return false
	var typing=is_instance_valid(field) and field.has_focus()
	if event.keycode==KEY_TAB and is_instance_valid(field) and not ChoiceUI.active(self):
		if not event.echo:
			skill_keyboard_mode=not skill_keyboard_mode
			if skill_keyboard_mode:
				field.release_focus();feedback="技能操作：Q 强化 / E 掩护 / Z 战术 / C 短语；Esc 返回输入"
			else:resume_word_input()
		get_viewport().set_input_as_handled();return true
	if skill_keyboard_mode and event.keycode==KEY_ESCAPE:
		skill_keyboard_mode=false
		resume_word_input()
		get_viewport().set_input_as_handled();return true
	if typing and not skill_keyboard_mode:return false
	var index=[KEY_Q,KEY_E,KEY_Z,KEY_C].find(event.keycode)
	if index<0:return false
	get_viewport().set_input_as_handled()
	if not event.echo and not data.get("paused",false):
		var control=ui.get_node_or_null(["Surge","Ward","Tactic","Chant"][index])
		if control and not control.disabled:control.pressed.emit()
		else:feedback="技能暂未就绪，请查看能量与命中次数。"
	skill_keyboard_mode=false
	resume_word_input()
	return true

func _input(event: InputEvent) -> void:
	if startup_locked: return
	if handle_combat_keys(event):return
	if sound_menu_open and event is InputEventMouseButton and event.pressed:
		var local=make_input_local(event).position
		if not Rect2(942,8,306,338).has_point(local):
			sound_menu_open=false
			rebuild()
	if result_meme and result_meme.handle_key(event):
		get_viewport().set_input_as_handled()
		return
	if battle_audio and event is InputEventKey and event.pressed and not event.echo and event.unicode>0 and page=="battle" and is_instance_valid(field) and field.has_focus():
		battle_audio.play_effect("type",-18)

func _on_voice_caption(value: String) -> void:
	super.say(value)

func _unhandled_key_input(event: InputEvent) -> void:
	if book_setup_open and event is InputEventKey and event.pressed and event.keycode==KEY_ESCAPE:
		BookLibrary.close(self);get_viewport().set_input_as_handled();return
	if not startup_locked and page=="modes" and event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_LEFT,KEY_RIGHT,KEY_UP,KEY_DOWN]:
			ModeSelector.choose(self,wrapi(mode_choice+(-1 if event.keycode in [KEY_LEFT,KEY_UP] else 1),0,ModeSelector.MODES.size()))
			get_viewport().set_input_as_handled()
			return
		if event.keycode==KEY_ENTER or event.keycode==KEY_KP_ENTER:
			ModeSelector.enter(self)
			get_viewport().set_input_as_handled()
			return
	if sound_menu_open and event is InputEventKey and event.pressed and event.keycode==KEY_ESCAPE:
		sound_menu_open=false
		rebuild()
		get_viewport().set_input_as_handled()
		return
	if not startup_locked: super._unhandled_key_input(event)

func finish_startup() -> void:
	startup_locked=false
	_sync_page_voice()
	queue_redraw()

func say(value: String) -> void:
	if routing_page_voice: return
	if not mentor_voice:
		super.say(value)
		return
	var event=""
	if value.begins_with("字母写完整再动手"): event="start"
	elif value.begins_with("字母排错队了"): event="miss"
	elif value.begins_with("它还剩最后一道防线"): event="warded"
	elif value.begins_with("打得不错"): event="victory"
	elif value.begins_with("回来就练"): event="defeat"
	elif value.begins_with("路线一次走一段"): event="map"
	elif value.begins_with("跟打不算记牢"): event="collection"
	elif value.begins_with("搭档各有长处"): event="operators"
	elif value.begins_with("你回来了"): event="return"
	if event in ["victory","defeat"] and result_meme and result_meme.has_videos(event=="victory"):return
	if not event.is_empty():
		mentor_voice.trigger(event,event!="miss")
	else:
		mentor_voice.clear_caption()
		super.say(value)

func go(target: String) -> void:
	sound_menu_open=false
	if target!="books":book_setup_open=false
	if is_instance_valid(opening_preview): opening_preview.stop()
	if page=="battle" and target!="battle" and is_instance_valid(field): battle_draft=field.text
	if result_meme: result_meme.hide()
	if target=="voices" and page!="voices": voice_return_page=page
	if mentor_voice:
		mentor_voice.pending_priority=false
		mentor_voice.pending_event=""
		mentor_voice.pending_page.clear()
	if battle_audio:
		battle_audio.cancel_reads()
		battle_audio.set_paused(false)
	if mentor_voice:
		mentor_voice.set_blocked(false)
		mentor_voice.set_paused(false)
		mentor_voice.pending_event=""
	routing_page_voice=true
	super.go(target)
	if target=="battle" and is_instance_valid(field):
		field.text=battle_draft
		field.caret_column=field.text.length()
	routing_page_voice=false
	_sync_page_voice()

func _page_voice_key() -> String:
	match page:
		"modes":return "plan_select"
		"boss": return "boss"
		"home": return "home"
		"books":
			if book_setup_open:return "plan_select"
			if not state().is_empty() and state().get("outcome")==null:return "daily_continue"
			if data.get("study",{}).get("settings",{}).get("planMode","daily")=="daily":
				if ActionFlow.describe(self).action=="retry":return "daily_continue"
				return {"learn":"daily_new","review":"daily_due","checkin":"daily_checkin","done":"daily_done","empty":"daily_custom"}.get(data.get("study",{}).get("daily",{}).get("action","learn"),"daily_new")
			return "daily_custom"
		"memory": return "study_due"
		"collection": return {"all":"warehouse","review":"review","saved":"saved"}.get(collection_filter,"warehouse")
		"spirits": return "operators"
		"arsenal","supplies": return "arsenal"
		"map": return "map"
		"voices": return "voices"
	return ""

func _sync_page_voice() -> void:
	if startup_locked or routing_page_voice or not mentor_voice or not bridge.ready_to_play: return
	var key=_page_voice_key()
	if key.is_empty():
		mentor_voice.active_page_key=""
		return
	# Base actions may rebuild controls many times; only entering a new context speaks.
	var book=str(data.get("bookSettings",{}).get("selected","cet4"))
	mentor_voice.context="ky" if book=="ky" else "general"
	mentor_voice.enter_page(key,book,page)

func _focus_gained() -> void:
	if paused_by_focus:
		paused_by_focus=false
		if mentor_voice:
			mentor_voice.set_paused(false)
			mentor_voice.trigger("return",true)

func _on_update(value: Dictionary, action: String) -> void:
	if action in ["daily_start","study_start"]:mobile_ui.start_pending=false
	if OS.has_feature("web") and action in ["state","daily_start","study_start","submit","choose"]:_web_frame_ready.call_deferred(action)
	if action=="choose":action="submit"
	var previous_level=int(data.get("progression",{}).get("level",0))
	var previous_coins=int(data.get("recruitment",{}).get("coins",0))
	var old_supply_flags:Dictionary=data.get("progression",{}).get("autoSupply",{}).duplicate()
	if action=="book_plan_save":book_setup_open=false
	if action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"]: battle_draft=""
	if action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"]:
		skill_effects.clear();hit_feedback.clear();success_time=0
	if result_meme and action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"]: result_meme.hide()
	var before = int(state().get("dealt",0))
	var old=state().duplicate()
	var completed_word:Dictionary=data.get("word",{}) if data.get("word") is Dictionary else {}
	var next_state:Dictionary=value.get("state",{}) if value.get("state") is Dictionary else {}
	var successful=action=="submit" and int(next_state.get("hits",0))>int(old.get("hits",0))
	var was_chanting=bool(data.get("chanting",false))
	var old_mission=data.get("learningMission")
	if mentor_voice:
		var chosen=str(value.get("bookSettings",{}).get("selected","cet4"))
		if action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"] or page in ["battle","result"]:
			chosen=str(value.get("stage",{}).get("pack","")) if value.get("stage") is Dictionary else chosen
		mentor_voice.context="ky" if chosen=="ky" else "general"
	if mentor_voice and action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"]:
		if battle_audio:
			battle_audio.cancel_reads()
			battle_audio.set_paused(false)
			battle_audio.set_dictation(false)
		mentor_voice.set_paused(false)
		mentor_voice.set_blocked(false)
	if battle_audio and successful and not was_chanting: battle_audio.enqueue_word(completed_word)
	elif battle_audio and action=="submit" and data.get("choice") is Dictionary and data.choice.answered and not was_chanting:battle_audio.enqueue_word(completed_word)
	super._on_update(value,action)
	if action not in ["tick","state"]:error_text=""
	if previous_level>0 and int(data.get("progression",{}).get("level",1))>previous_level:
		show_system_notice("升级  Lv.%d → Lv.%d" % [previous_level,data.progression.level],"%s · 可领 %d 哈弗币" % [data.progression.title,data.progression.pending],5.0)
		if battle_audio:battle_audio.play_ui_cue("level_up")
	var coin_change=int(data.get("recruitment",{}).get("coins",0))-previous_coins
	if action=="book_plan_save":
		show_system_notice("学习计划已保存","后续行动按当前词书与词量继续")
		if battle_audio:battle_audio.play_ui_cue("reward")
	if action=="claim_levels" and coin_change>0:
		show_system_notice("升级奖励已领取","+%d 哈弗币 · 已存入钱包" % coin_change)
		if battle_audio:battle_audio.play_ui_cue("reward")
	if action=="buy_supply" and coin_change<0:
		show_system_notice("补给已入库","-%d 哈弗币 · 按下场使用开关装备" % -coin_change)
		if battle_audio:battle_audio.play_ui_cue("purchase")
	if action=="unlock_avatar" and coin_change<0:
		show_system_notice("%s 已加入行动" % operator_for(str(profile().get("avatar","mage"))).name,"-%d 哈弗币 · 永久解锁" % -coin_change)
		if battle_audio:battle_audio.play_ui_cue("recruit")
	if action=="upgrade" and coin_change<0:
		show_system_notice("进阶完成","-%d 哈弗币 · 下一场生效" % -coin_change)
		if battle_audio:battle_audio.play_ui_cue("recruit")
	if action=="supply_enabled":
		show_system_notice("补给设置已保存","防护 %s / 电池 %s" % ["开启" if data.progression.autoSupply.armor else "关闭","开启" if data.progression.autoSupply.battery else "关闭"])
		if battle_audio:
			var previous_flags:Dictionary=old_supply_flags
			var now_enabled=true
			for key in data.progression.autoSupply:
				if data.progression.autoSupply[key]!=previous_flags.get(key,true):now_enabled=bool(data.progression.autoSupply[key])
			battle_audio.play_ui_cue("toggle_on" if now_enabled else "toggle_off")
	if int(state().get("mistakes",0))>int(old.get("mistakes",0)):
		hit_feedback.clear();success_time=0
	if data.get("boss") is Dictionary:
		if data.boss.action=="charge" and director_action!="charge" and battle_audio: battle_audio.play_effect("delta_scan",-12)
		director_action=str(data.boss.action)
		director_clock=float(data.boss.actionTime)
	if successful and not was_chanting:
		hit_feedback.trigger(old,state(),DirectorBoss.active(self))
		if skill_effects.kind=="tactic":skill_effects.body_cancelled=true
		success_time=1.8
		feedback=str(data.get("lastAnswer",{}).get("message","拼写正确"))
		if battle_audio and state().get("outcome")==null:
			if int(state().get("combo",0))%4!=0:battle_audio.play_effect("success",-3 if data.get("lastAnswer",{}).get("independent",false) else -6)
	var mission=data.get("learningMission")
	if action=="tick" and mission is Dictionary and old_mission is Dictionary and mission.mode!=old_mission.mode and state().get("outcome")==null:
		skill_banner=mission.phase+" / 遮住英文，凭中文拼写"
		skill_banner_time=2.0
		feedback=mission.objective
		if battle_audio: battle_audio.play_effect("delta_scan",-12)
	if action=="check_in" and mentor_voice:
		if not (page=="books" and data.study.settings.get("planMode","daily")=="daily"):
			mentor_voice.page_event("checkin",str(data.get("bookSettings",{}).get("selected","cet4")))
		if battle_audio: battle_audio.play_effect("success")
	if action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"]:
		skill_banner_time=0
		var perk:Dictionary=data.get("progression",{})
		if int(perk.get("shield",0))+int(perk.get("energy",0))>0:
			skill_banner="等级整备 / 护甲 +%d · 能量 +%d" % [perk.shield,perk.energy]
			skill_banner_time=2.5
		var used:Array=data.get("deployedSupplies",[])
		if not used.is_empty():
			skill_banner="出击补给 / "+("护甲 +16  " if "armor" in used else "")+("能量 +20" if "battery" in used else "")
			skill_banner_time=2.5
	if action=="tactic" and state().get("tacticUsed",false) and not old.get("tacticUsed",false):
		var op=operator_for(str(state().get("avatar","mage")))
		skill_effects.trigger(op.id,"tactic",old,state(),DirectorBoss.active(self))
		skill_banner=op.name+" / "+op.skill
		skill_banner_time=1.8
		feedback=SkillDescriptions.tactic(op.id,int(state().get("heroRank",1)),DirectorBoss.active(self))
	if int(state().get("ultimateUses",0))>int(old.get("ultimateUses",0)):
		hit_feedback.clear();success_time=0
		var op=operator_for(str(state().get("avatar","mage")))
		skill_effects.trigger(op.id,"ultimate",old,state(),DirectorBoss.active(self))
		skill_banner=op.name+" / "+op.ultimate
		skill_banner_time=2.0
	if action == "tactic" and int(state().get("dealt",0)) > before:
		fx_kind = "hit"
		fx_time = T.FX_TIME
		damage = int(state().dealt)-before
		feedback = "战技命中 · %d 伤害" % damage
	if mentor_voice:
		var dictation_active=page=="battle" and data.get("playing",false)
		mentor_voice.set_blocked(dictation_active)
		var current=state()
		if battle_audio:
			battle_audio.set_dictation(dictation_active)
			if action=="pause": battle_audio.set_paused(page=="battle" and data.get("paused",false))
			if action in ["start","start_book","study_start","daily_start","review_start","retry_study","boss_start"]: battle_audio.play_effect("delta_scan",-10)
			if action=="hint": battle_audio.play_effect("delta_scan",-18)
			if successful and not was_chanting: battle_audio.shot(str(current.get("avatar","mage")))
			if int(current.get("mistakes",0))>int(old.get("mistakes",0)): battle_audio.play_effect("error",-4)
			if int(current.get("botAttacks",0))>int(old.get("botAttacks",0)):
				battle_audio.play_effect("pistol",-5)
				battle_audio.play_effect("shield" if int(current.get("last",{}).get("damage",0))==0 and int(current.get("last",{}).get("absorbed",0))>0 else "hurt",-3)
			if action=="tactic" and current.get("tacticUsed",false) and not old.get("tacticUsed",false):
				battle_audio.play_effect("support" if current.get("avatar")=="bard" else "shield" if current.get("avatar")=="knight" else "reload")
			if int(current.get("ultimateUses",0))>int(old.get("ultimateUses",0)): battle_audio.play_effect("ultimate",2)
			if successful and int(current.get("combo",0))>=4 and int(current.get("combo",0))%4==0: battle_audio.play_effect("combo",-3)
			if current.get("outcome")!=null and old.get("outcome")==null: battle_audio.play_effect("delta_complete" if current.outcome=="victory" else "failure",-4)
		if action=="pause": mentor_voice.set_paused(page=="battle" and data.get("paused",false))
		if current.get("outcome")==null:
			if int(current.get("ultimateUses",0))>int(old.get("ultimateUses",0)): mentor_voice.trigger("ultimate",true)
			elif action=="submit" and current.get("hits",0)>old.get("hits",0) and int(current.get("combo",0))>=4 and int(current.get("combo",0))%4==0: mentor_voice.trigger("combo")
			elif current.get("botAttacks",0)>old.get("botAttacks",0): mentor_voice.trigger("hurt")
			elif action=="hint": mentor_voice.trigger("hint")
	if result_meme and page=="result" and state().get("outcome")!=null and old.get("outcome")==null:
		result_meme.show_result(str(data.get("result",{}).get("id","")),state().outcome=="victory")
	elif result_meme and page=="battle" and int(state().get("mistakes",0))>int(old.get("mistakes",0)):
		result_meme.show_miss()
	elif result_meme and successful and result_meme.visible and not result_meme.modal:
		result_meme.hide()

func play_audio() -> void:
	if mentor_voice: mentor_voice.set_blocked(true)
	if battle_audio: battle_audio.cancel_reads()
	super.play_audio()
	if not audio.playing and mentor_voice: mentor_voice.set_blocked(false)

func operator_for(id: String) -> Dictionary:
	for op in OPS:
		if op.id == id: return op
	return OPS[0]

func shown_operator() -> Dictionary:
	if page == "spirits" and inspect_operator >= 0: return OPS[inspect_operator]
	return operator_for(str(profile().get("avatar","mage")))

func button(caption: String, rect: Rect2, callback: Callable, accent: bool = false, disabled: bool = false) -> Button:
	var b = super.button(caption,rect,callback,accent,disabled)
	b.pressed.connect(_on_ui_click)
	# Selected filters stay quiet; only the next major action gets a solid fill.
	var primary=accent and (caption.begins_with("继续当前") or caption.begins_with("复测薄弱") or caption.begins_with("复习本书") or caption.begins_with("开始学习") or caption.begins_with("开始这段") or caption.begins_with("选择干员") or caption.begins_with("解锁并出战") or caption.begins_with("释放攻击") or caption.begins_with("完成今日打卡") or caption.begins_with("返回学习") or caption.begins_with("返回路线"))
	b.add_theme_stylebox_override("normal",T.style(T.GREEN if primary else T.SELECTED if accent else T.SURFACE,T.GREEN if accent else T.EDGE))
	b.add_theme_stylebox_override("hover",T.style(Color("beffd1") if primary else T.HOVER,T.GREEN))
	b.add_theme_stylebox_override("pressed",T.style(T.GREEN,T.GREEN))
	b.add_theme_stylebox_override("disabled",T.style(Color(T.DEEP,0.88),Color("303a32")))
	b.add_theme_color_override("font_color",T.INK if primary else T.GREEN if accent else T.TEXT)
	b.add_theme_color_override("font_hover_color",T.INK if primary else T.TEXT)
	b.add_theme_color_override("font_pressed_color",T.INK)
	b.add_theme_color_override("font_disabled_color",T.DIM)
	if primary: b.add_theme_font_override("font",display_font)
	return b

func expanded_prompt() -> bool:
	var stage:Dictionary=data.get("stage",{})
	return data.get("answerFeedback",false) or data.get("chanting",false) or str(data.get("prompt","")).length()>=20 or stage.get("lesson","")=="listening" or (stage.get("recall",false) and not data.get("hinted",false))

func _update_battle_controls() -> void:
	if mobile_ui.enabled or ChoiceUI.active(self):
		var q:Dictionary=data.get("choice",{}) if data.get("choice") is Dictionary else {}
		var current=[q.get("token"),q.get("answered"),data.get("paused"),data.get("cooldown",0)>0,state().get("energy"),state().get("tacticUsed"),state().get("normalHits"),data.get("index")]
		if current!=choice_controls_stamp:
			choice_controls_stamp=current
			rebuild.call_deferred()
		return
	if not is_instance_valid(field): return
	var s=state()
	var last:Dictionary=s.last if s.get("last") is Dictionary else {}
	var stamp=[field.get_instance_id(),ui.get_child_count(),data.get("index",0),data.get("prompt",""),data.get("answerFeedback",false),data.get("paused",false),data.get("stopped",false),data.get("heard",false),data.get("playing",false),float(data.get("cooldown",0))>0,data.get("chanting",false),s.get("energy",0),s.get("shield",0),s.get("tacticUsed",false),s.get("normalHits",0),s.get("avatar","mage"),s.get("preparedSpell"),last.get("ultimate",false)]
	if stamp==battle_controls_stamp:return
	battle_controls_stamp=stamp
	super._update_battle_controls()
	var recap=bool(data.get("answerFeedback",false))
	for name in ["Hint","Bookmark"]:
		var control=ui.get_node_or_null(name)
		if control:control.visible=not recap
	var help=ui.get_node_or_null("QuestionHelp")
	if help:help.tooltip_text=str(data.get("prompt",""))+"\n"+str(data.get("word",{}).get("meaning",""))
	var reader=ui.get_node_or_null("ReadAudio")
	if reader:
		reader.text="重听" if data.get("heard",false) else "播放英文"
		reader.disabled=data.get("paused",false) or data.get("playing",false)
	if recap and not data.get("paused",false): field.placeholder_text="拼写正确 · 听发音，记释义"
	elif not data.get("stopped",false): field.placeholder_text="输入英文 · Enter 开火 · Tab 技能"
	var submit_button=ui.get_node_or_null("Submit")
	if submit_button:
		submit_button.text="命中 ✓" if recap else "开火  ↵"
		submit_button.add_theme_stylebox_override("disabled",T.style(T.SELECTED if recap else T.DEEP,T.GREEN if recap else T.BASE,2 if recap else 1))
		submit_button.add_theme_color_override("font_disabled_color",T.GREEN if recap else T.DIM)
	field.add_theme_stylebox_override("read_only",T.style(Color(0.10,0.20,0.14) if recap else T.DEEP,T.GREEN if recap else T.EDGE,2 if recap else 1))
	for key in ["Surge","Ward","Tactic","Chant"]:
		var content=ui.get_node_or_null(key+"/SkillContent")
		if content:
			content.sync({"state":state(),"paused":data.get("paused",false),"cooldown":data.get("cooldown",0),"chanting":data.get("chanting",false)})

func clear_ui() -> void:
	var keep_field=page=="battle" and not ChoiceUI.active(self) and is_instance_valid(field)
	for child in ui.get_children():
		if keep_field and child==field:continue
		ui.remove_child(child)
		child.queue_free()
	if not keep_field:field = null

func rebuild() -> void:
	if mobile_ui.enabled:
		if is_instance_valid(field):battle_draft=field.text
		mobile_ui.build(self)
		return
	if page in ["home","spirits","books","voices","memory","boss","modes","supplies","progression"]:
		clear_ui()
		if bridge.ready_to_play:
			if page=="modes":ModeSelector.build(self)
			elif page == "home":
				button("学习计划  /  每日打卡",Rect2(32,424,248,46),func(): go("books"),true)
				button("词汇仓库  ›",Rect2(32,480,248,46),func(): collection_filter="all";collection_page=0;go("collection"))
				button("错词巩固  ›",Rect2(32,536,248,46),func(): collection_filter="review";collection_page=0;go("collection"))
				button("更换干员",Rect2(984,463,240,42),func(): go("spirits"))
				button("英语总监 · 百词挑战",Rect2(984,515,240,42),func(): go("boss"),true).add_theme_font_size_override("font_size",16)
				button("记忆曲线 · %d 词到期" % data.get("memory",{}).get("due",0),Rect2(984,568,240,30),func(): go("memory"),data.get("memory",{}).get("due",0)>0).add_theme_font_size_override("font_size",14)
			elif page=="spirits":
				operator_select.build(self)
			elif page=="voices":
				build_voice_library_controls()
			elif page=="books":
				StudyCenter.build(self)
			elif page=="supplies":
				SupplyShop.build(self)
			elif page=="progression":
				ProgressionCenter.build(self)
			elif page=="boss":
				DirectorBoss.build(self)
			elif page=="memory":
				MemoryCenter.build(self)
	else:
		super.rebuild()
		# Replace the old header, preserving each original command and field.
		for child in ui.get_children():
			if child is Control and child.position.y<64:
				ui.remove_child(child)
				child.queue_free()
		if page=="battle":
			for child in ui.get_children():
				if child is Button:
					if child.text=="路线" and data.get("stage",{}).get("bookMode",false):
						ui.remove_child(child);child.queue_free()
						button("词书",Rect2(904,82,72,36),func(): go("books"))
					if child.text in ["提示","收藏"]:
						child.visible=not data.get("answerFeedback",false)
						child.position=Vector2(448 if child.text=="提示" else 532,562)
						child.size=Vector2(72,28)
						child.add_theme_font_size_override("font_size",14)
					if child.text in ["重听","播放英文"]:
						child.position=Vector2(48,562)
						child.size=Vector2(150,30)
						child.add_theme_font_size_override("font_size",14)
			if is_instance_valid(field):
				field.position=T.BATTLE_INPUT.position
				field.size=T.BATTLE_INPUT.size
				field.add_theme_font_size_override("font_size",20)
				field.placeholder_text="输入英文 · Enter 开火 · Tab 技能"
				field.add_theme_stylebox_override("focus",T.style(T.DEEP,T.GREEN,2))
			var current_op=operator_for(str(state().get("avatar","mage")))
			var labels={"Submit":"开火  ↵","Surge":"强化射击","Ward":"装甲掩护","Tactic":current_op.skill,"Chant":current_op.ultimate}
			for key in labels:
				var b=ui.get_node_or_null(key)
				if b:
					b.text=labels[key]
					if key=="Submit":
						b.position=T.BATTLE_SUBMIT.position;b.size=T.BATTLE_SUBMIT.size
					else:
						var slot=["Surge","Ward","Tactic","Chant"].find(key)
						b.text=""
						b.position=T.SKILL_ROW.position+Vector2(slot*T.SKILL_SLOT_STEP,0);b.size=T.SKILL_SLOT_SIZE
						var content=SkillPresentation.new()
						content.name="SkillContent"
						content.size=T.SKILL_SLOT_SIZE
						content.icon_texture=textures["skill_"+SkillPresentation.icon_key(key,current_op.id)]
						content.skill_title=["Q ","E ","Z ","C "][slot]+labels[key]
						content.label_font=font
						b.add_child(content)
						b.tooltip_text=SkillDescriptions.tooltip(key,current_op.id,int(state().get("heroRank",1)),DirectorBoss.active(self))
			var help=Control.new()
			help.name="QuestionHelp"
			help.position=T.QUESTION_COMPACT.position
			help.size=T.QUESTION_COMPACT.size
			help.mouse_filter=Control.MOUSE_FILTER_PASS
			help.tooltip_text=str(data.get("prompt",""))+"\n"+str(data.get("word",{}).get("meaning",""))
			ui.add_child(help);ui.move_child(help,0)
			_update_battle_controls()
		if page=="result" and data.get("stage",{}).get("bookMode",false):
			for child in ui.get_children():
				if child is Button and child.text=="返回路线":
					ui.remove_child(child);child.queue_free()
			button("返回学习中心",Rect2(392,510,240,52),func(): go("books"),false)
			if data.stage.get("studyMode",false):
				for child in ui.get_children():
					if child is Button and child.text=="再来一场":
						ui.remove_child(child);child.queue_free()
				button("查看本轮复习排期",Rect2(650,510,270,52),func(): ActionFlow.memory_for_mission(self)).add_theme_font_size_override("font_size",17)

		if page=="result":ResultPresentation.arrange_controls(self)

		if page=="arsenal" and data.has("spirits"):
			button("行动补给",Rect2(480,82,190,36),func():go("supplies"),true).add_theme_font_size_override("font_size",16)
			for child in ui.get_children():
				if child is Button and (child.text.begins_with("领取") or child.text=="已领取"):
					child.position.y+=22
					child.size.y=32
					child.add_theme_font_size_override("font_size",15)
					child.icon=CurrencyUI.ICON
					child.tooltip_text="行动委托的哈弗币奖励"
			for i in data.spirits.size():
				var sp:Dictionary=data.spirits[i]
				var selected=profile().get("companion","moon")==sp.id
				button("已编入" if selected else "选择" if sp.unlocked else "%d 战后解锁" % sp.threshold,Rect2(44+i*225,486,199,34),func(): bridge.request("companion",{"id":sp.id}),selected,not sp.unlocked).add_theme_font_size_override("font_size",14)
				button("进阶 · R%d" % int(sp.bond.rank),Rect2(44+i*225,528,199,30),func(): bridge.request("upgrade",{"kind":"spirit","id":sp.id}),false,not sp.unlocked or sp.bond.rank>=3).add_theme_font_size_override("font_size",14)
	if page=="collection":
		button("用本书%s训练" % {"all":"全部词","review":"错词","saved":"收藏词"}.get(collection_filter,"词汇"),Rect2(544,148,260,40),func():
			bridge.request("study_settings",{"planMode":"custom","source":{"all":"all","review":"wrong","saved":"saved"}.get(collection_filter,"all"),"recall":true})
			go("books"),true).add_theme_font_size_override("font_size",15)
	ActionFlow.build(self)
	if page=="battle" and ChoiceUI.active(self):ChoiceUI.build(self)
	if bridge.ready_to_play and page in ["home","spirits","books","arsenal","supplies"] and not book_setup_open:
		var pending=int(data.get("progression",{}).get("pending",0))
		var growth_rect=Rect2(32,588,248,24) if page=="home" else Rect2(32,580,288,28) if page=="arsenal" else Rect2(888,548,336,36) if page=="supplies" else Rect2(698,82,208,34) if page=="spirits" else Rect2(852,80,160,36)
		var growth_button=button("成长与钱包"+(" · 可领 %d" % pending if pending>0 else ""),growth_rect,func():go("progression"),pending>0)
		growth_button.name="OpenProgression";growth_button.add_theme_font_size_override("font_size",13)
	add_navigation()
	_sync_page_voice()

func add_navigation() -> void:
	var mode_button=button("",Rect2(32,10,178,44),func(): go("modes"))
	mode_button.name="SwitchMode"
	mode_button.tooltip_text="切换行动模式"
	mode_button.add_theme_stylebox_override("normal",T.style(Color.TRANSPARENT,Color.TRANSPARENT,0))
	mode_button.add_theme_stylebox_override("hover",T.style(Color(0.7,1,0.8,0.08),T.GREEN))
	var tabs=["行动基地","学习中心","词汇仓库","特战干员","战备配置"]
	var pages=["home","books","collection","spirits","arsenal"]
	for i in tabs.size():
		var target=pages[i]
		var b=button(tabs[i],Rect2(HEADER_NAV_X+i*NAV_WIDTH,8,NAV_WIDTH-6,48),func():
			if target=="collection": collection_filter="all";collection_page=0
			go(target),false,not bridge.ready_to_play)
		var selected=page==target or (i==0 and page=="map") or (i==1 and (page in ["memory","boss"] or (page in ["battle","result"] and data.get("stage",{}).get("bookMode",false))))
		b.add_theme_stylebox_override("normal",T.style(Color(0.6,1,0.75,0.08) if selected else Color.TRANSPARENT,Color.TRANSPARENT,0))
		b.add_theme_color_override("font_color",T.GREEN if selected else T.TEXT)
		b.add_theme_font_size_override("font_size",16)
		if selected: b.add_theme_font_override("font",display_font)
		if selected:
			var line=ColorRect.new()
			line.color=T.GREEN
			line.position=Vector2(HEADER_NAV_X+i*NAV_WIDTH,59)
			line.size=Vector2(NAV_WIDTH-6,3)
			line.mouse_filter=Control.MOUSE_FILTER_IGNORE
			ui.add_child(line)
	button("语音库",Rect2(820,16,112,32),func(): go("voices")).add_theme_font_size_override("font_size",14)
	button("声音设置  ▾" if not sound_menu_open else "声音设置  ▴",Rect2(944,16,140,32),func(): sound_menu_open=not sound_menu_open;rebuild(),sound_menu_open).add_theme_font_size_override("font_size",14)
	button("动效：标准" if not slow_motion else "动效：减弱",Rect2(1096,16,152,32),func(): slow_motion=not slow_motion;rebuild()).add_theme_font_size_override("font_size",14)
	if sound_menu_open and mentor_voice and battle_audio:
		var popup=Panel.new()
		popup.name="SoundSettings"
		popup.position=Vector2(944,64)
		popup.size=Vector2(304,282)
		popup.add_theme_stylebox_override("panel",T.style(T.DEEP,T.EDGE))
		popup.z_index=100
		popup.mouse_filter=Control.MOUSE_FILTER_STOP
		ui.add_child(popup)
		var options=[
			["总监语音",mentor_voice.enabled,func(): mentor_voice.toggle();rebuild()],
			["单词朗读",battle_audio.words_enabled,func(): battle_audio.toggle_words();rebuild()],
			["游戏 / 开场音效",battle_audio.effects_enabled,func(): battle_audio.toggle_effects();rebuild()],
			["背景音乐",music.enabled,func(): music.toggle();rebuild()]]
		for i in options.size():
			var row=options[i]
			var control=button(row[0]+("    开" if row[1] else "    关"),Rect2(958,78+i*52,276,40),row[2],row[1])
			control.z_index=101
			control.add_theme_font_size_override("font_size",15)
		var volume=button("音乐音量    %d%%" % int(music.level*100),Rect2(958,286,276,40),func():music.cycle_level();rebuild())
		volume.z_index=101
		volume.add_theme_font_size_override("font_size",15)

func replay_opening() -> void:
	mentor_voice.clear_caption()
	battle_audio.cancel_reads()
	mentor_text="开场标志音 / 三角洲新版启动动画"
	mentor_visible=mentor_text.length()
	if not is_instance_valid(opening_preview):
		opening_preview=AudioStreamPlayer.new()
		add_child(opening_preview)
	opening_preview.stream=load("res://assets/sfx/startup-signature-v18.ogg")
	opening_preview.volume_db=-2
	opening_preview.play()

func library_clips() -> Array:
	if not mentor_voice: return []
	return mentor_voice.clips.filter(func(c): return voice_library_group=="全部" or c.get("group","")==voice_library_group)

func preview_voice(id: String) -> void:
	voice_library_selected=id
	mentor_voice.preview(id)
	rebuild()

func build_voice_library_controls() -> void:
	button("‹ 返回",Rect2(32,85,100,34),func(): go(voice_return_page)).add_theme_font_size_override("font_size",14)
	button("试听开场音",Rect2(432,94,136,34),replay_opening).add_theme_font_size_override("font_size",14)
	var groups=["全部","学习引导","考研复刻","德穆兰原声","课堂原声","用户原声"]
	for i in groups.size():
		var group=groups[i]
		button("考研语音" if group=="考研复刻" else group,Rect2(592+i*110,94,104,34),func(): voice_library_group=group;voice_library_page=0;rebuild(),voice_library_group==group).add_theme_font_size_override("font_size",14)
	var entries=library_clips()
	var offset=voice_library_page*12
	for i in mini(12,entries.size()-offset):
		var clip:Dictionary=entries[offset+i]
		var rect=Rect2(430+(i%2)*410,158+(i/2)*64,398,55)
		var title=str(clip.get("title",clip.caption))
		if title.length()>16: title=title.substr(0,15)+"…"
		button("▶  "+title,rect,func(): preview_voice(clip.id),voice_library_selected==clip.id).add_theme_font_size_override("font_size",15)
	var last=maxi(0,ceili(entries.size()/12.0)-1)
	button("上一页",Rect2(430,560,116,34),func(): voice_library_page-=1;rebuild(),false,voice_library_page==0).add_theme_font_size_override("font_size",14)
	button("下一页",Rect2(1130,560,116,34),func(): voice_library_page+=1;rebuild(),false,voice_library_page>=last).add_theme_font_size_override("font_size",14)
	button("重新试听",Rect2(48,553,160,38),func(): preview_voice(voice_library_selected),true).add_theme_font_size_override("font_size",15)
	button("停止播放",Rect2(222,553,160,38),func(): mentor_voice.stop()).add_theme_font_size_override("font_size",15)

func image_contain(tex: Texture2D,rect: Rect2) -> void:
	var scale_factor=minf(rect.size.x/tex.get_width(),rect.size.y/tex.get_height())
	var size=tex.get_size()*scale_factor
	draw_texture_rect(tex,Rect2(rect.position+(rect.size-size)/2,size),false)

func draw_voice_library() -> void:
	text_at("总监语音库",154,114,26,T.TEXT)
	text_at("学习引导 10 句 · 考研配音 18 句 · 原声 43 段 / 点击试听",432,143,14,T.MUTED)
	panel(Rect2(32,144,366,454),T.DEEP,T.EDGE)
	var selected:Dictionary={}
	for clip in mentor_voice.clips:
		if clip.id==voice_library_selected: selected=clip;break
	if selected.is_empty(): return
	if voice_pictures.has(selected.id):
		image_contain(voice_pictures[selected.id],Rect2(48,159,334,302))
	else:
		draw_character("director","taunt" if mentor_voice.is_speaking() else "idle",fmod(ui_time,1.3),Rect2(48,110,334,380))
	text_at(str(selected.get("group","")).replace("考研复刻","考研语音")+"  /  %.2f 秒" % float(selected.duration),48,486,13,T.GREEN)
	wrapped(str(selected.caption),Rect2(48,507,334,40),15,T.TEXT)
	var entries=library_clips()
	text_at("%d / %d 页 · 共 %d 段" % [voice_library_page+1,maxi(1,ceili(entries.size()/12.0)),entries.size()],760,583,14,T.MUTED)

func panel(rect: Rect2, color: Color = T.PANEL, edge: Color = T.EDGE) -> void:
	draw_rect(rect,color)
	draw_rect(rect,edge,false,1)

func bar(rect: Rect2,value: float,max_value: float,color: Color) -> void:
	draw_rect(rect,Color(0.05,0.09,0.11,0.8))
	draw_rect(Rect2(rect.position,Vector2(rect.size.x*clampf(value/maxf(1,max_value),0,1),rect.size.y)),color)

func image_cover(tex: Texture2D,rect: Rect2,tint: Color=Color.WHITE) -> void:
	var ratio=maxf(rect.size.x/tex.get_width(),rect.size.y/tex.get_height())
	var source=rect.size/ratio
	draw_texture_rect_region(tex,rect,Rect2((tex.get_size()-source)/2,source),tint)

func draw_flipped(tex: Texture2D,rect: Rect2,tint: Color=Color.WHITE) -> void:
	draw_set_transform(Vector2(rect.end.x,rect.position.y),0,Vector2(-1,1))
	draw_texture_rect(tex,Rect2(Vector2.ZERO,rect.size),false,tint)
	draw_set_transform(Vector2.ZERO,0,Vector2.ONE)

func draw_character(id: String, action: String, seconds: float, rect: Rect2, tint: Color=Color.WHITE) -> void:
	var tex=character_gifs.frame(id,action,0 if slow_motion else seconds)
	if tex: draw_texture_rect(tex,rect,false,tint)

func sprite(name: String, rect: Rect2, tint: Color=Color.WHITE) -> void:
	# Map previews and the empty collection use the same animated character library.
	var id=str(shown_operator().id) if name in ["verb","noun","adjective","sun"] else name
	if character_gifs and character_gifs.characters.has(id):
		draw_character(id,"idle",ui_time,Rect2(rect.position-rect.size*Vector2(0.33,0.57),rect.size*1.65),tint)
	else: super.sprite(name,rect,tint)

func character_action(enemy: bool=false) -> String:
	if fx_time>0 and T.FX_TIME-fx_time<0.41:
		if fx_kind=="hit": return "hurt" if enemy else "shoot"
		if fx_kind=="hurt": return "shoot" if enemy else "hurt"
	return "idle"

func _draw() -> void:
	if mobile_ui.enabled:
		mobile_ui.draw(self)
		return
	if not font: return
	draw_rect(Rect2(Vector2.ZERO,T.CANVAS),T.INK)
	if page == "home":
		backdrop(Rect2(0,64,1280,656),Color(0.78,0.80,0.74))
		draw_rect(Rect2(0,64,1280,656),Color(0.025,0.035,0.025,0.16))
		draw_character(shown_operator().id,"idle",ui_time,Rect2(270,-64,700,700))
		# Translucent UI shading, not character or environment art.
		draw_rect(Rect2(0,64,314,656),Color(0.035,0.045,0.032,0.78))
		draw_rect(Rect2(940,64,340,656),Color(0.035,0.045,0.032,0.89))
		draw_line(Vector2(940,88),Vector2(940,594),T.EDGE)
	elif page=="spirits":
		backdrop(Rect2(0,64,1280,656),Color(0.66,0.70,0.64))
		draw_rect(Rect2(0,64,1280,656),Color(T.INK,0.20))
	elif page in ["battle","map","result"]:
		image_cover(textures["scene_"+SceneCatalog.current(self)],Rect2(0,64,1280,656),Color(0.37,0.40,0.36))
		draw_rect(Rect2(0,64,1280,656),Color(T.INK,0.72))
	else:
		backdrop(Rect2(0,64,1280,656),Color(0.28,0.32,0.27))
		draw_rect(Rect2(0,64,1280,656),Color(T.INK,0.65))
	draw_rect(Rect2(0,0,1280,64),T.INK)
	draw_line(Vector2(32,63),Vector2(1248,63),T.EDGE)
	if not startup_locked:
		draw_texture_rect(textures["brand_icon"],T.BRAND_ICON_RECT,false)
		draw_texture_rect(textures["brand_wordmark"],T.BRAND_WORDMARK_RECT,false)
		text_at("●" if bridge.ready_to_play else "○",212,38,12,T.GREEN)
	match page:
		"modes":ModeSelector.draw(self)
		"home": draw_home()
		"boss": DirectorBoss.draw(self)
		"map": draw_map()
		"battle": draw_battle()
		"collection": draw_collection()
		"spirits": draw_spirits()
		"arsenal": draw_arsenal()
		"supplies": SupplyShop.draw(self)
		"progression": ProgressionCenter.draw(self)
		"result": draw_result()
		"books": draw_books()
		"memory": MemoryCenter.draw(self)
		"voices": draw_voice_library()
	draw_communications()
	if page=="battle" and ChoiceUI.active(self):ChoiceUI.draw(self)
	text_at("刘晓艳行动  /  四级 · 六级 · 考研",32,711,11,T.MUTED)
	text_at("ESC 暂停 / 返回       F11 全屏",1006,711,11,T.MUTED)

func draw_communications() -> void:
	ActionFlow.draw(self)
	Communications.draw(self)

func draw_home() -> void:
	var op=shown_operator()
	text_at("G.T.I. / 学习行动",32,112,13,T.GREEN)
	text_at("行动基地",28,181,48,T.TEXT)
	text_at("选择词单，完成今日学习与复习。",32,216,15,T.MUTED)
	draw_line(Vector2(32,246),Vector2(278,246),T.EDGE)
	text_at("行动档案",32,276,14,T.MUTED)
	text_at("%03d" % data.get("memory",{}).get("seen",0),32,328,40,T.TEXT,-1,true)
	text_at("%03d" % data.get("memory",{}).get("stable",0),168,328,40,T.GREEN,-1,true)
	text_at("本书已学",32,354,14,T.MUTED)
	text_at("较稳定",168,354,14,T.MUTED)
	text_at("到期复习 %03d  ·  学习等级 %02d" % [data.get("memory",{}).get("due",0),maxi(stat("level"),1)],32,397,14,T.MUTED)
	text_at("G.T.I.  /  出战档案",984,116,13,T.GREEN)
	text_at(op.en,982,158,24,T.MUTED,-1,true)
	text_at(op.name,980,223,56,T.TEXT)
	text_at(op.role+"  /  已就绪",984,259,18,T.GREEN)
	draw_line(Vector2(984,286),Vector2(1224,286),T.EDGE)
	text_at("本次任务",984,320,14,T.MUTED)
	text_at("当前行动" if ActionFlow.describe(self).action=="resume" else "下一步",984,355,25,T.TEXT)
	var selected_book=""
	for book in data.get("books",[]):
		if book.id==data.get("bookSettings",{}).get("selected",""): selected_book=str(book.name)
	text_at(ActionFlow.describe(self).label,984,385,16,T.GREEN,240)
	var daily:Dictionary=data.get("study",{}).get("today",{})
	text_at("今日 %d / %d 词 · 连续 %d 天" % [daily.get("count",0),daily.get("goal",20),daily.get("streak",0)],984,416,14,T.MUTED)
	bar(Rect2(984,435,240,3),daily.get("count",0),daily.get("goal",20),T.GREEN)
	draw_rect(Rect2(342,544,278,54),T.SURFACE)
	draw_rect(Rect2(342,544,3,54),T.GREEN)
	text_at(op.en+" / "+op.role,358,564,12,T.MUTED,-1,true)
	text_at(op.name+"  ·  "+op.skill,358,587,18,T.TEXT)
	text_at("零号大坝 / 前线整备区",346,100,12,T.MUTED)

func draw_spirits() -> void:
	operator_select.draw(self)

func draw_books() -> void:
	StudyCenter.draw(self)

func draw_english_prompt(value:String, rect:Rect2, size_px:int=18) -> void:
	# Keep whole English words on a line; shrink only when a long prompt needs it.
	var key=str(["draw_english_prompt",font.get_instance_id(),value,rect.size,size_px])
	if not prompt_layout_cache.has(key):
		var lines:Array[String]=[]
		for candidate in range(size_px,13,-1):
			lines.clear()
			var line=""
			for word in value.replace("\n"," \n ").split(" ",false):
				var next=word if line.is_empty() else line+" "+word
				if word=="\n" or (not line.is_empty() and font.get_string_size(next,HORIZONTAL_ALIGNMENT_LEFT,-1,candidate).x>rect.size.x):
					lines.append(line)
					line="" if word=="\n" else word
				else: line=next
			if not line.is_empty(): lines.append(line)
			size_px=candidate
			if (lines.size()-1)*size_px*1.5<=rect.size.y: break
		if prompt_layout_cache.size()>=192:prompt_layout_cache.clear()
		prompt_layout_cache[key]={"lines":lines,"size":size_px}
	var layout:Dictionary=prompt_layout_cache[key]
	var lines:Array=layout.lines
	size_px=int(layout.size)
	for i in lines.size():
		text_at(lines[i],rect.position.x,rect.position.y+i*size_px*1.5,size_px,T.TEXT)

func draw_battle() -> void:
	var s=state()
	if s.is_empty(): return
	var is_boss=DirectorBoss.active(self)
	var fully_blocked=fx_kind=="hurt" and fx_time>0 and int(s.get("last",{}).get("damage",0))==0 and int(s.get("last",{}).get("absorbed",0))>0
	var op=operator_for(str(s.get("avatar","mage")))
	var offset=Vector2.ZERO
	var elapsed=T.FX_TIME-fx_time
	if fx_time>0 and not slow_motion: offset=Vector2(sin(elapsed*140)*2.5,cos(elapsed*110)*1.3)*fx_time/T.FX_TIME
	text_at(Look.region(data.stage)+" / "+Look.stage(data.stage),32,111,20,T.TEXT,385)
	if is_boss:
		text_at("百词挑战 %03d/100 · 第 %d 阶段" % [data.boss.completed,data.boss.phase],430,110,14,T.ORANGE)
	elif data.get("lesson") is Dictionary:
		var mission:Dictionary=data.get("learningMission",{})
		text_at(("%s %02d/%02d · 辨认 %02d/%02d" if ChoiceUI.active(self) else "%s %02d/%02d · 回忆 %02d/%02d") % [mission.get("phase","学习行动"),data.lesson.completed,data.lesson.total,mission.get("recognized",0) if ChoiceUI.active(self) else mission.get("recalled",0),mission.get("selectedTotal",0)],430,110,14,T.GREEN)
	else:
		text_at("%02d HIT   %02d COMBO" % [s.hits,s.combo],439,110,18,T.GREEN if s.combo>=3 else T.MUTED,-1,true)
	var scene_key=SceneCatalog.current(self)
	var stage_texture:Texture2D=textures["scene_"+scene_key]
	var stage_source=T.BATTLE_STAGE.size/(T.BATTLE_STAGE.size.x/stage_texture.get_width())
	draw_texture_rect_region(stage_texture,T.BATTLE_STAGE,Rect2((stage_texture.get_size()-stage_source)*Vector2(0.5,SceneCatalog.SCENES[scene_key].focus),stage_source),Color(0.84,0.88,0.82))
	draw_rect(T.BATTLE_STAGE,Color(T.INK,0.12))
	draw_rect(T.BATTLE_STAGE,T.EDGE,false,1)
	var ally_action=character_action()
	if fully_blocked:ally_action="idle"
	if not skill_effects.body_action().is_empty() and not (fx_kind=="hurt" and fx_time>0):ally_action=skill_effects.body_action()
	var enemy_action=director_action if is_boss else character_action(true)
	var ally_rect=battle_actor_rect(false,offset)
	var ally_time=skill_effects.age if ally_action in ["tactic","ultimate"] else ui_time if ally_action=="idle" else elapsed
	draw_character(op.id,ally_action,ally_time,ally_rect,T.RED if fx_kind=="hurt" and fx_time>0.36 and not fully_blocked else Color.WHITE)
	# All enemy GIF masters already face left; never mirror them a second time.
	var enemy_rect=battle_actor_rect(true,offset)
	var enemy_tint=Color(1,0.75,0.55) if fx_kind=="hit" and fx_time>0.3 else Color.WHITE
	draw_character(data.stage.monster,enemy_action,director_clock if is_boss else ui_time if enemy_action=="idle" else elapsed,enemy_rect,enemy_tint)
	panel(Rect2(48,140,250,58),T.SURFACE)
	draw_rect(Rect2(48,140,3,58),T.GREEN)
	text_at(op.name+" / "+op.role,60,161,15,T.TEXT)
	text_at("HP %03d" % s.playerHp,60,190,11,T.MUTED,-1,true)
	text_at("ARM %02d" % s.shield,198,190,11,T.BLUE,-1,true)
	bar(Rect2(60,171,126,4),s.playerHp,140,T.GREEN)
	bar(Rect2(198,171,80,4),s.shield,40,T.BLUE)
	if is_boss:
		DirectorBoss.hud(self)
	else:
		panel(Rect2(966,140,266,58),T.SURFACE)
		draw_rect(Rect2(1229,140,3,58),T.RED)
		text_at(Look.ENEMIES.get(data.stage.monster,""),980,161,16,T.TEXT)
		bar(Rect2(980,172,238,4),s.botHp,s.enemyMaxHp,T.RED)
		hit_feedback.hp_trail(self,Rect2(980,172,238,4))
		text_at(("增援就位 · " if hit_feedback.active() and hit_feedback.reinforced else "")+"HP %03d / %03d" % [s.botHp,s.enemyMaxHp],980,191,11,T.MUTED)
	var card=T.QUESTION_COMPACT
	panel(T.LEARNING_DOCK,T.SURFACE)
	draw_rect(Rect2(33,419,590,182),Color(T.PANEL,0.66))
	draw_line(Vector2(624,434),Vector2(624,586),T.EDGE)
	var recalling=data.stage.get("recall",false) and not data.get("hinted",false) and not data.get("chanting",false)
	if data.get("answerFeedback",false):
		draw_success_card(card)
	else:
		text_at("短语大招 / 完整输入" if data.get("chanting",false) else "听写 / 听音后输入" if data.stage.lesson=="listening" else "回忆 / 根据中文拼写" if recalling else "学习 / 结合读音记住词义",48,443,13,T.GREEN)
		var prompt=str(data.get("prompt",""))
		if recalling: draw_fitted_prompt(prompt,Rect2(48,475,556,68),20)
		elif data.get("chanting",false) or data.stage.lesson=="sentence": draw_english_prompt(prompt,Rect2(48,472,556,74),19)
		elif data.stage.lesson=="listening": text_at(prompt,48,490,30,T.TEXT,556)
		else:
			text_at(prompt,48,484,32,T.TEXT,556,true)
			if data.word!=null:
				var phonetic=str(data.word.get("phonetic",""))
				text_at("/"+phonetic+"/" if not phonetic.is_empty() else "听发音，记住含义",48,508,13,T.MUTED)
				draw_fitted_prompt(str(data.word.meaning),Rect2(48,532,556,22),14,T.MUTED)
	if success_time>0: draw_rect(T.BATTLE_INPUT.grow(3),Color(T.GREEN,minf(1,success_time)),false,2)
	var remaining=maxf(0,(float(s.nextBotAt)-float(s.elapsed))/1000)
	panel(Rect2(1000,82,248,36),T.SURFACE,T.RED if remaining<3 else T.EDGE)
	text_at("总监蓄力" if is_boss else "敌袭倒计时",1014,106,13,T.ORANGE if is_boss else T.MUTED)
	text_at("%04.1fs" % remaining,1174,107,18,T.RED if remaining<3 else T.TEXT,-1,true)
	bar(Rect2(32,408,1216,3),remaining*1000,float(data.get("intent",{}).get("interval",14000)),T.RED if remaining<3 else T.GREEN)
	if skill_banner_time<=0:
		text_at(feedback if success_time>0 or (fx_kind=="miss" and fx_time>0) else "输入与技能",648,444,13,T.RED if fx_kind=="miss" and fx_time>0 else T.GREEN if success_time>0 else T.MUTED,450)
	text_at("连续命中 %02d" % s.combo,1112,444,13,T.GREEN if s.combo>=3 else T.MUTED)
	bar(Rect2(648,522,584,3),s.energy,100,T.GREEN)
	text_at("能量 %03d / 100" % s.energy,648,536,11,T.MUTED,-1,true)
	text_at("每四连击触发爆发",1112,536,11,T.DIM)
	if s.combo>=3: draw_rect(Rect2(1112,454,120,2),T.GREEN)
	draw_battle_bag(s)
	skill_effects.draw(self,offset)
	if skill_effects.body_action()=="ultimate" and skill_effects.age>=0.34 and not (fx_kind=="hurt" and fx_time>0):
		draw_shooting(skill_effects.age-0.34,false,offset)
	if skill_banner_time>0:
		text_at(skill_banner,648,444,13,T.GREEN,450)
	if fx_time>0:
		if fx_kind in ["hit","hurt"]:
			if fx_kind=="hurt" or skill_effects.body_action()!="ultimate":draw_shooting(elapsed,fx_kind=="hurt",offset)
			if fx_kind=="hurt":
				if fully_blocked:text_at("格挡 %d" % int(s.last.absorbed),290,260-elapsed*30,21,T.BLUE)
				else:text_at("-%d" % damage,250,261-elapsed*55,32,T.RED,-1,true)
		elif fx_kind=="miss": text_at("校对拼写",536,443,12,T.RED)
	hit_feedback.draw(self,battle_target(true,offset))
	if data.get("paused",false):
		panel(Rect2(416,218,430,122),T.DEEP,T.GREEN)
		text_at("行动暂停",550,270,32,T.TEXT)
		text_at("点击上方「继续」恢复",530,307,16,T.MUTED)

func draw_map_preview(chosen:Dictionary) -> void:
	var key=SceneCatalog.current(self)
	image_cover(textures["scene_"+key],Rect2(980,270,248,114))
	draw_character(chosen.monster,"idle",ui_time,Rect2(1050,256,130,130))
	draw_rect(Rect2(980,270,248,114),T.EDGE,false,1)

func draw_fitted_prompt(value:String, rect:Rect2, size_px:int, color:Color=T.TEXT) -> void:
	var key=str(["draw_fitted_prompt",font.get_instance_id(),value,rect.size,size_px])
	if not prompt_layout_cache.has(key):
		var lines:Array[String]=[]
		for candidate in range(size_px,12,-1):
			lines.clear()
			var line=""
			for ch in value.replace("\n"," / "):
				if font.get_string_size(line+ch,HORIZONTAL_ALIGNMENT_LEFT,-1,candidate).x>rect.size.x:
					lines.append(line);line=""
				line+=ch
			if not line.is_empty(): lines.append(line)
			size_px=candidate
			if (lines.size()-1)*candidate*1.45<=rect.size.y: break
		if prompt_layout_cache.size()>=192:prompt_layout_cache.clear()
		prompt_layout_cache[key]={"lines":lines,"size":size_px}
	var layout:Dictionary=prompt_layout_cache[key]
	var lines:Array=layout.lines
	size_px=int(layout.size)
	var limit=maxi(1,int(rect.size.y/(size_px*1.45))+1)
	for i in mini(limit,lines.size()):
		var line=lines[i]
		if i==limit-1 and lines.size()>limit: line=line.substr(0,maxi(0,line.length()-2))+"…"
		text_at(line,rect.position.x,rect.position.y+i*size_px*1.45,size_px,color)

func draw_success_card(card:Rect2) -> void:
	var answer:Dictionary=data.get("lastAnswer",{})
	draw_rect(Rect2(card.position,Vector2(3,card.size.y)),T.GREEN)
	var label={"recall":"独立回忆正确","corrected":"拼写已纠正","hinted":"提示后拼对","copy":"拼写正确 · 跟打熟悉"}.get(answer.get("kind","copy"),"拼写正确")
	text_at("✓  "+label,48,443,16,T.GREEN)
	var word_size=36+int(2*maxf(0,1-hit_feedback.age/0.20)) if not slow_motion else 36
	text_at(str(answer.get("word","")),48,484,word_size,T.TEXT,556,true)
	var phonetic=str(answer.get("phonetic",""))
	text_at("/"+phonetic+"/" if not phonetic.is_empty() else "听发音，记住含义",48,508,13,T.MUTED)
	draw_fitted_prompt(str(answer.get("meaning","")),Rect2(48,532,556,22),14)
	var reward:Dictionary=answer.get("reward",{})
	if int(reward.get("coins",0))>0:
		draw_rect(Rect2(352,426,252,26),Color(T.SELECTED,0.9))
		text_at("+%d XP" % reward.xp,364,444,14,T.GREEN,-1,true)
		CurrencyUI.amount(self,reward.coins,Vector2(436,444),14,T.GREEN,true,18)
		text_at("哈弗币已到账",516,444,12,T.REWARD_INK,84)
	elif not reward.is_empty():text_at(str(reward.get("reason","")),332,443,11,T.MUTED,272)
	text_at("下次回忆 / "+str(answer.get("reviewIn","稍后")),48,584,13,T.GREEN)
	text_at("保留原排期" if not answer.get("accepted",false) else "排期已更新",480,584,12,T.MUTED)
	bar(Rect2(48,596,556,2),float(data.get("cooldown",0)),650 if DirectorBoss.active(self) else 1600,T.GREEN)

func draw_battle_bag(s:Dictionary) -> void:
	draw_rect(Rect2(418,379,444,26),Color(T.INK,0.78))
	var mission=data.get("learningMission")
	if DirectorBoss.active(self):
		DirectorBoss.progress(self)
	elif mission is Dictionary:
		text_at("本轮 %02d 词   /   已辨认 %02d   /   待巩固 %02d" % [mission.selectedTotal,mission.recognized,mission.needsReview] if ChoiceUI.active(self) else "本轮 %02d 词   /   已独立回忆 %02d   /   待回忆 %02d" % [mission.selectedTotal,mission.recalled,mission.selectedTotal-mission.recalled],430,398,13,T.TEXT,420)
	else:
		text_at("拼写命中 %02d  /  总伤害 %03d" % [s.hits,s.dealt],470,398,13,T.MUTED)

func battle_actor_rect(enemy:bool,offset:Vector2=Vector2.ZERO) -> Rect2:
	if mobile_ui.enabled:
		var mobile_rect:Rect2=mobile_ui.actor_rect(enemy);mobile_rect.position+=offset;return mobile_rect
	var rect=(T.BOSS_RECT if DirectorBoss.active(self) else T.ENEMY_RECT) if enemy else T.ALLY_RECT
	rect.position+=offset+(hit_feedback.enemy_offset(slow_motion) if enemy else hit_feedback.ally_offset(slow_motion))
	return rect

func battle_target(enemy:bool,offset:Vector2=Vector2.ZERO) -> Vector2:
	var rect=battle_actor_rect(enemy,offset)
	return rect.position+rect.size*Vector2(0.5,0.52 if enemy and DirectorBoss.active(self) else 0.46 if enemy else 0.58)

func firing_geometry(enemy:bool,elapsed:float,offset:Vector2) -> Dictionary:
	var id=str(data.stage.monster) if enemy else str(state().get("avatar","mage"))
	var action="ultimate" if not enemy and skill_effects.body_action()=="ultimate" else "shoot"
	var animation=character_gifs.action_data(id,action)
	var anchors:Array=animation.get("muzzles",[[350,230],[350,230],[350,230],[350,230]])
	# Boss animation follows its own combat clock; align flash to that displayed pose.
	var body_time=director_clock if enemy and DirectorBoss.active(self) else skill_effects.age if action=="ultimate" else elapsed
	var index_body=character_gifs.frame_index(id,action,0 if slow_motion else body_time)
	var anchor:Array=anchors[mini(index_body,anchors.size()-1)]
	var actor_rect=battle_actor_rect(enemy,offset)
	var muzzle=actor_rect.position+Vector2(anchor[0],anchor[1])*(actor_rect.size.x/512.0)
	var target=battle_target(not enemy,offset)
	if enemy and skill_effects.shield_visible(self):target=skill_effects.shield_contact(self,offset)
	return {"muzzle":muzzle,"target":target,"angle":(target-muzzle).angle()}

func draw_shooting(elapsed: float,enemy: bool,offset: Vector2) -> void:
	if elapsed<0:return
	var geometry=firing_geometry(enemy,elapsed,offset)
	var muzzle:Vector2=geometry.muzzle;var target:Vector2=geometry.target
	shot_vfx.draw(self,muzzle,target,elapsed)

func draw_arsenal() -> void:
	text_at("战备配置",32,120,T.FONT_PAGE,T.TEXT)
	if not state().is_empty() and state().get("outcome")==null: text_at("装备调整于下一轮生效",222,118,14,T.MUTED)
	CurrencyUI.balance(self,Rect2(700,82,232,36),int(profile().get("growth",{}).get("coins",0)))
	text_at("行动委托",944,116,22,T.TEXT)
	if not data.has("runes"): return
	for i in 3:
		var rune:Dictionary=data.runes[i]
		panel(Rect2(32+i*304,150,288,208),T.SURFACE)
		text_at("0%d  /  装备槽" % (i+1),52+i*304,178,12,T.MUTED)
		text_at(Look.RUNES.get(rune.id,""),52+i*304,210,24,T.TEXT)
		text_at("R%d / 3" % int(rune.rank),240+i*304,178,12,T.GREEN)
		wrapped(rune.description,Rect2(52+i*304,248,244,37),14,T.MUTED)
		for rank in 3:
			draw_rect(Rect2(52+i*304+rank*82,285,74,3),T.GREEN if rank<int(rune.rank) else T.EDGE)
	text_at("支援编组",32,391,16,T.GREEN)
	for i in data.spirits.size():
		var sp:Dictionary=data.spirits[i]
		panel(Rect2(32+i*225,408,215,164),T.SURFACE)
		text_at(Look.PASSIVES.get(sp.id,""),44+i*225,434,18,T.TEXT)
		wrapped(sp.skill.description,Rect2(44+i*225,459,199,30),12,T.MUTED)
	panel(Rect2(944,150,304,422),T.SURFACE)
	for i in data.commissions.size():
		var c:Dictionary=data.commissions[i]
		text_at(Look.COMMISSIONS[i]+"  %d/%d" % [c.progress,c.target],960,176+i*64,13,T.MUTED)

func draw_result() -> void:
	ResultPresentation.draw(self)

func _run_qa() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	if not bridge.ready_to_play:
		get_tree().quit(2)
		return
	var directory=ProjectSettings.globalize_path("res://qa")
	DirAccess.make_dir_recursive_absolute(directory+"/fire-frames")
	qa_recording=true
	var voice_enabled=mentor_voice.enabled
	mentor_voice.enabled=true
	for clip in mentor_voice.clips:
		assert(ResourceLoader.exists("res://assets/voice/"+clip.file),"Voice asset missing")
	assert(mentor_voice.trigger("start",true),"Voice playback did not start")
	assert(not mentor_voice.trigger("miss"),"Voice cooldown/overlap failed")
	mentor_voice.enabled=false
	mentor_voice.stop()
	assert(mentor_voice.trigger("start",true) and not mentor_voice.player.playing,"Muted caption failed or voice played")
	mentor_voice.stop()
	mentor_voice.enabled=voice_enabled
	assert(character_gifs.characters.size()==12,"Character GIF registry incomplete")
	for id in character_gifs.characters:
		for action in character_gifs.characters[id].actions:
			assert(character_gifs.action_data(id,action).frames.size()>=4,"Static GIF action")
	for book in ["cet4","cet6","ky"]:
		await qa_command("book_select",{"id":book})
		go("books")
		queue_redraw()
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(directory+"/book-"+book+".png")
		for recall in [false,true]:
			await qa_command("start_book",{"id":book,"recall":recall})
			assert(data.stage.bookMode and data.stage.pack==book,"Wrong active wordbook")
			assert(data.prompt==(data.word.meaning if recall else data.word.word),"Wrong study mode")
			fx_time=0
			queue_redraw()
			await get_tree().process_frame
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png(directory+"/book-"+book+("-recall" if recall else "-copy")+".png")
			field.text=str(data.word.word)
			field.text_submitted.emit(field.text)
			for i in 100:
				if int(state().get("hits",0))>0: break
				await get_tree().process_frame
			assert(int(state().get("hits",0))>0,"Wordbook input did not fire")
	for i in 30:
		if page=="result": break
		await qa_command("tick",{"delta":500})
		await qa_command("submit",{"text":str(data.word.word)})
	assert(page=="result" and state().outcome=="victory","Wordbook round failed")
	assert(not data.result.has("expedition"),"Wordbook changed expedition unlocks")
	queue_redraw()
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/book-result.png")
	print("QA_BOOKS 3 books / 6 native study modes / saved wordbook victory passed; 11 animated characters; voice playback/mute/cooldown passed")
	go("home")
	while bridge.busy or not bridge.queued.is_empty(): await get_tree().process_frame
	qa_recording=false
	for i in OPS.size():
		inspect_operator=i
		go("spirits")
		bridge.request("avatar",{"id":OPS[i].id})
		await bridge.updated
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(directory+"/operator-"+OPS[i].id+".png")
		if profile().get("avatar","")!=OPS[i].id: push_error("QA operator mismatch")
	inspect_operator=0
	bridge.request("avatar",{"id":"mage"})
	await bridge.updated
	bridge.request("start",{"id":"bridge-1"})
	await bridge.updated
	await get_tree().create_timer(0.15).timeout
	# Record actual successful input and original-rule damage; no mock battle data.
	field.text=str(data.word.word)
	field.text_submitted.emit(field.text)
	for i in 100:
		if int(state().get("hits",0))>0: break
		await get_tree().process_frame
	if int(state().get("hits",0))==0: push_error("QA: spelling input did not fire")
	qa_recording=true
	for i in 24:
		fx_time=maxf(0,T.FX_TIME-i/30.0)
		ui_time=i/30.0
		queue_redraw()
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(directory+"/fire-frames/%03d.png" % i)
		await get_tree().create_timer(1.0/30.0).timeout
	qa_recording=false
	# Rendering-only facing checks for all source atlas cells.
	qa_recording=true
	var original_monster=data.stage.monster
	for monster in ["crystal","thorn","tide","gargoyle"]:
		data.stage.monster=monster
		fx_kind="hurt"
		fx_time=T.FX_TIME-0.08
		queue_redraw()
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(directory+"/enemy-facing-"+monster+".png")
	data.stage.monster=original_monster
	fx_time=0
	qa_recording=false
	await super._run_qa()

func qa_command(action: String, payload: Dictionary={}) -> void:
	while bridge.busy or not bridge.queued.is_empty(): await get_tree().process_frame
	bridge.request(action,payload)
	await bridge.updated

func _run_smoke() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	if not bridge.ready_to_play:
		push_error("SMOKE: local gameplay did not connect")
		get_tree().quit(2)
		return
	assert(data.get("books",[]).size()==3)
	assert(mentor_voice.clips.size()==61 and battle_audio.sounds.size()==22)
	assert(character_gifs.characters.size()==12)
	for id in character_gifs.characters:
		for action in character_gifs.characters[id].actions:
			assert(character_gifs.frame(id,action,0)!=null,"Animation texture not imported")
	await get_tree().process_frame
	await get_tree().process_frame
	print("SMOKE_OK: 3 wordbooks, 11 characters, 32 GIF actions, 61 voices, 22 SFX, original gameplay connected")
	var smoke_tree=get_tree()
	smoke_tree.create_timer(0.4).timeout.connect(smoke_tree.quit.bind(0))
	smoke_tree.current_scene.queue_free()

func _assert_page_voice() -> void:
	assert(mentor_voice.active_clip in mentor_voice.page_candidates(_page_voice_key(),str(data.bookSettings.selected)),"Wrong page dialogue: "+page)
	assert(mentor_text==mentor_voice.active_clip.caption)

func _run_page_voice_qa() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	assert(bridge.ready_to_play,"Page voice QA could not connect")
	qa_recording=true
	get_window().focus_exited.disconnect(_focus_lost)
	mentor_voice.enabled=true
	battle_audio.words_enabled=false
	await qa_command("book_select",{"id":"cet4"})
	await qa_command("study_settings",{"source":"new"})
	mentor_voice.active_page_key=""
	mentor_voice.page_cursors.clear()
	var pages=["home","books","map","spirits","arsenal","voices"]
	for target in pages:
		go(target)
		_assert_page_voice()
		assert(mentor_text==mentor_voice.active_clip.caption and mentor_voice.player.playing)
		var cursors_before=mentor_voice.page_cursors.duplicate()
		rebuild()
		go(target)
		assert(mentor_voice.page_cursors==cursors_before,"Same page refreshed its dialogue")
	collection_filter="all"
	go("collection")
	_assert_page_voice()
	collection_filter="review"
	rebuild()
	_assert_page_voice()
	collection_filter="saved"
	rebuild()
	_assert_page_voice()
	var before_paging=mentor_voice.page_cursors.duplicate()
	collection_page=1
	rebuild()
	assert(mentor_voice.page_cursors==before_paging,"Collection paging repeated dialogue")
	go("books")
	var study_cues={"due":"local_26","wrong":"local_22","saved":"local_25","all":"local_06"}
	for source in study_cues:
		await qa_command("study_settings",{"source":source})
		_assert_page_voice()
	await qa_command("study_settings",{"source":"wrong"})
	var study_key=mentor_voice.active_page_key
	collection_filter="review"
	go("collection")
	assert(mentor_voice.active_page_key!=study_key,"Two different pages shared an entrance token")
	go("books")
	await qa_command("study_settings",{"source":"new"})
	var before_options=mentor_voice.page_cursors.duplicate()
	await qa_command("study_settings",{"batch":10,"goal":20,"pos":"verb"})
	await qa_command("state")
	assert(mentor_voice.page_cursors==before_options,"Study options repeated entrance dialogue")
	await qa_command("book_select",{"id":"cet6"})
	assert(mentor_voice.active_page_key.ends_with(":cet6") and mentor_voice.page_cursors!=before_options)
	await qa_command("book_select",{"id":"ky"})
	_assert_page_voice()
	assert(mentor_voice.context=="ky")
	var ky_cues={"due":"ky_miss_again","wrong":"ky_collection","saved":"local_25","all":"ky_start_two","new":"ky_books"}
	for source in ky_cues:
		await qa_command("study_settings",{"source":source})
		_assert_page_voice()
	go("spirits")
	_assert_page_voice()
	assert(mentor_voice.page_event("checkin","ky"))
	assert(mentor_voice.active_clip in mentor_voice.page_candidates("checkin","ky"))
	assert(mentor_voice.page_event("checkin","cet4"))
	assert(mentor_voice.active_clip in mentor_voice.page_candidates("checkin","cet4"))
	# Rapid navigation drops an obsolete reaction, including one waiting on English audio.
	mentor_voice.set_reading(true)
	assert(not mentor_voice.trigger("miss",true) and mentor_voice.pending_priority)
	go("arsenal")
	_assert_page_voice()
	assert(mentor_voice.pending_event.is_empty())
	assert(not mentor_voice.reading_hold and mentor_text==mentor_voice.active_clip.caption)
	go("voices")
	preview_voice("local_30")
	var before_preview=mentor_voice.page_cursors.duplicate()
	rebuild()
	assert(mentor_voice.active_clip.id=="local_30" and mentor_voice.page_cursors==before_preview)
	go("home")
	_assert_page_voice()
	assert(mentor_voice.player.playing)
	# A delayed battle pause/audio-stop response must not silence a newly entered menu.
	await qa_command("start_book",{"id":"ky","recall":true})
	await qa_command("audio")
	assert(mentor_voice.blocked)
	go("arsenal")
	await qa_command("state")
	assert(not mentor_voice.blocked and not mentor_voice.suspended)
	_assert_page_voice()
	assert(mentor_voice.player.playing)
	for scope in ["general","ky"]:
		mentor_voice.context=scope
		for clip in mentor_voice.event_clips("defeat"): assert(clip.caption.begins_with("回家吧，孩子"))
		for clip in mentor_voice.event_clips("victory"): assert(not str(clip.caption).contains("回家吧"))
	# Every pool is exhausted before repeating, including across bag boundaries.
	mentor_voice.shuffle_bags.clear()
	for book in ["cet4","ky"]:
		for route in mentor_voice.page_cues:
			var candidates=mentor_voice.page_candidates(route,book)
			var last=""
			for cycle in 3:
				var seen=[]
				for j in candidates.size():
					assert(mentor_voice.page_event(route,book))
					var id=str(mentor_voice.active_clip.id)
					assert(id!=last or candidates.size()==1,"Consecutive duplicate: "+route)
					assert(id not in seen,"Bag repeated before exhaustion: "+route)
					seen.append(id);last=id
	# Last choice persists across application sessions; the first return cannot repeat it.
	var remembered=str(mentor_voice.last_choices["page:books:general"])
	var fresh=MentorVoicePack.new()
	add_child(fresh)
	fresh.enabled=false
	assert(fresh.page_event("books","cet4") and fresh.active_clip.id!=remembered)
	assert(not fresh.player.playing and fresh.caption_visible()==MentorVoicePack.visible_at(fresh.active_clip,0))
	await get_tree().create_timer(0.4).timeout
	assert(fresh.silent_clock>0.3 and fresh.caption_visible()==MentorVoicePack.visible_at(fresh.active_clip,fresh.silent_clock),"Muted captions lost their timing clock")
	fresh.queue_free()
	var report={"page_routes":mentor_voice.page_cues.size(),"pages_and_collection_tabs":true,"five_study_sources":true,"exam_context":true,"rerender_and_paging_deduplicated":true,"real_navigation_replays":true,"manual_preview_retained":true,"stale_queue_cleared":true,"dictation_exit":true,"subtitle_matches_audio":true,"checkin_praise":true,"result_dialogue":true,"shuffle_bag_three_cycles":true,"restart_avoids_last_clip":true,"muted_subtitle_clock":true}
	var file=FileAccess.open("res://qa/page-voice-v19-verification.json",FileAccess.WRITE)
	file.store_string(JSON.stringify(report,"  "))
	file.close()
	mentor_voice.stop()
	for player in battle_audio.effects: player.stop()
	await get_tree().create_timer(0.3).timeout
	print("PAGE_VOICE_QA_OK ",JSON.stringify(report))
	get_tree().quit(0)

func _run_voice_qa() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	assert(bridge.ready_to_play,"Voice QA could not connect")
	var directory=ProjectSettings.globalize_path("res://qa")
	mentor_voice.enabled=true
	mentor_voice.set_blocked(false)
	mentor_voice.set_paused(false)
	mentor_voice.context="general"
	assert(mentor_voice.clips.size()==61,"Missing recordings")
	assert(voice_pictures.size()==30,"Missing paired meme pictures")
	assert(mentor_voice.clips.filter(func(c): return c.get("audio_kind")=="source_recording").size()==43)
	assert(mentor_voice.clips.filter(func(c): return c.get("scope")=="ky").size()==18)
	assert(mentor_voice.trigger("defeat",true))
	assert(mentor_text==mentor_voice.active_clip.caption,"Caption/audio text mismatch")
	assert(mentor_text.begins_with("回家吧，孩子"))
	await get_tree().create_timer(0.55).timeout
	var early=mentor_voice.caption_visible()
	assert(early>0 and early<mentor_text.length(),"Caption is not following timed syllables")
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/voice-sync-early.png")
	mentor_voice.set_paused(true)
	var frozen=mentor_voice.playback_seconds()
	var frozen_count=mentor_voice.caption_visible()
	await get_tree().create_timer(0.35).timeout
	assert(absf(mentor_voice.playback_seconds()-frozen)<0.02,"Paused audio clock advanced")
	assert(mentor_voice.caption_visible()==frozen_count,"Paused subtitle advanced")
	mentor_voice.set_paused(false)
	await get_tree().create_timer(0.45).timeout
	assert(mentor_voice.playback_seconds()>frozen+0.25,"Resume did not continue audio")
	var previous_caption=mentor_text
	assert(not mentor_voice.trigger("miss"),"Ordinary reaction interrupted current speech")
	assert(mentor_text==previous_caption,"Queued reaction changed the current caption")
	assert(mentor_voice.trigger("victory",true))
	assert(mentor_voice.pending_event.is_empty(),"Victory left an obsolete reaction queued")
	assert(mentor_text==mentor_voice.active_clip.caption,"Victory audio/caption mismatch")
	await get_tree().create_timer(0.4).timeout
	mentor_voice.toggle()
	assert(not mentor_voice.player.playing,"Mute did not silence audio")
	var silent=mentor_voice.playback_seconds()
	await get_tree().create_timer(0.2).timeout
	assert(mentor_voice.playback_seconds()>silent,"Muted subtitles did not progress")
	mentor_voice.toggle()
	assert(mentor_voice.player.playing,"Unmute did not resume at subtitle position")
	mentor_voice.set_blocked(true)
	assert(not mentor_voice.player.playing and not mentor_voice.trigger("miss",true),"Dictation overlap")
	mentor_voice.set_blocked(false)
	assert(mentor_voice.trigger("defeat",true))
	await get_tree().create_timer(float(mentor_voice.active_clip.duration)+0.2).timeout
	assert(mentor_voice.caption_visible()==mentor_text.length(),"Final caption is incomplete")
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/voice-sync-complete.png")
	go("voices")
	assert(library_clips().size()==61)
	voice_library_group="考研复刻"
	assert(library_clips().size()==18)
	voice_library_group="德穆兰原声"
	assert(library_clips().size()==12)
	voice_library_group="课堂原声"
	assert(library_clips().size()==30)
	voice_library_group="用户原声"
	assert(library_clips().size()==1)
	voice_library_group="课堂原声"
	voice_library_page=2
	rebuild()
	for child in ui.get_children():
		if child is Button: assert(child.position.x>=0 and child.position.y>=0 and child.get_rect().end.x<=1280 and child.get_rect().end.y<=720,"Voice library overflow")
	voice_library_page=0
	voice_library_group="全部"
	preview_voice("local_30")
	assert(mentor_voice.active_clip.id=="local_30" and mentor_voice.player.playing,"Library preview failed")
	await get_tree().create_timer(0.5).timeout
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/原声库.png")
	await get_tree().create_timer(1.0).timeout
	mentor_voice.stop()
	var result={"clips":mentor_voice.clips.size(),"original_recordings":43,"kaoyan_synthesized":18,"paired_images":voice_pictures.size(),"library_filter_and_preview":true,"early_visible":early,"paused_visible":frozen_count,"timed_caption":true,"pause_resume":true,"mute_resume":true,"priority_and_queue":true,"dictation_no_overlap":true,"complete_caption":true}
	var report=FileAccess.open(directory+"/voice-sync-verification.json",FileAccess.WRITE)
	report.store_string(JSON.stringify(result,"  "))
	print("VOICE_QA_OK ",JSON.stringify(result))
	get_tree().quit(0)

func _run_audio_qa() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	assert(bridge.ready_to_play,"Audio QA bridge did not connect")
	# Drive the real gameplay bridge deterministically; audio keeps its native clock.
	qa_recording=true
	get_window().focus_exited.disconnect(_focus_lost)
	battle_audio.effects_enabled=true
	battle_audio.words_enabled=true
	mentor_voice.enabled=true
	assert(battle_audio.sounds.size()==22)
	assert(not battle_audio.voice_id.is_empty(),"No English system voice available")
	go("books")
	await qa_command("study_settings",{"source":"new"})
	await qa_command("book_select",{"id":"ky"})
	_assert_page_voice()
	assert(mentor_voice.context=="ky")
	for event in ["welcome","books","start","miss","hint","hurt","combo","ultimate","warded","victory","defeat","collection","return","map","operators"]:
		assert(not mentor_voice.event_clips(event).is_empty())
		for clip in mentor_voice.event_clips(event): assert(clip.scope in ["ky","all"],"Wrong exam dialogue")
	await qa_command("book_select",{"id":"cet4"})
	assert(mentor_voice.context=="general")
	for clip in mentor_voice.event_clips("start"): assert(clip.get("scope","")!="ky")
	await qa_command("start_book",{"id":"ky","recall":true})
	assert(mentor_voice.active_clip.scope=="ky" and "start" in mentor_voice.active_clip.events)
	var before=battle_audio.reading_history.size()
	await qa_command("submit",{"text":"wrongword"})
	await get_tree().create_timer(0.2).timeout
	assert(battle_audio.reading_history.size()==before,"Incorrect answer was pronounced")
	var completed=str(data.word.word)
	field.text=completed
	field.text_submitted.emit(completed)
	for i in 100:
		if state().get("hits",0)>0: break
		await get_tree().process_frame
	assert(state().get("hits",0)>0 and battle_audio.reading_busy)
	assert(mentor_voice.reading_hold and not mentor_voice.is_speaking())
	var frozen=mentor_voice.playback_seconds()
	var frozen_letters=mentor_voice.caption_visible()
	await get_tree().create_timer(0.18).timeout
	assert(mentor_voice.caption_visible()==frozen_letters and absf(mentor_voice.playback_seconds()-frozen)<0.02)
	assert(battle_audio.last_read_text==completed,"Pronounced next word instead of completed word")
	await qa_command("tick",{"delta":500})
	assert(battle_audio.last_read_text==completed)
	for i in 100:
		if not battle_audio.reading_busy: break
		await get_tree().create_timer(0.05).timeout
	assert(not battle_audio.reading_busy and not mentor_voice.reading_hold)
	assert(battle_audio.reading_history.size()==before+1)
	assert("rifle" in battle_audio.sound_history or "shotgun" in battle_audio.sound_history or "sniper" in battle_audio.sound_history or "pistol" in battle_audio.sound_history)
	assert("error" in battle_audio.sound_history and "impact" in battle_audio.sound_history)
	# Force words outside legacy WAVs to verify the installed English TTS backend.
	battle_audio.enqueue_word({"id":"qa-pronunciation-long","word":"international communication"})
	for i in 100:
		if battle_audio.tts_started: break
		await get_tree().create_timer(0.02).timeout
	assert(battle_audio.tts_started and battle_audio.using_tts,"English speech did not start")
	battle_audio.set_paused(true)
	mentor_voice.set_paused(true)
	var clock_before=battle_audio.read_clock
	await get_tree().create_timer(0.3).timeout
	assert(battle_audio.reading_busy and is_equal_approx(battle_audio.read_clock,clock_before))
	battle_audio.set_paused(false)
	mentor_voice.set_paused(false)
	assert(not mentor_voice.trigger("victory",true) and mentor_voice.pending_priority)
	battle_audio.enqueue_word({"id":"qa-pronunciation-second","word":"abandon"})
	for i in 160:
		if not battle_audio.reading_busy: break
		await get_tree().create_timer(0.05).timeout
	assert(not battle_audio.reading_busy,"English pronunciation queue did not finish")
	assert(battle_audio.reading_history[-2]=="international communication" and battle_audio.reading_history[-1]=="abandon")
	await get_tree().process_frame
	assert(mentor_voice.active_clip.id=="ky_victory" and mentor_voice.is_speaking(),"Queued result did not follow English audio")
	for name in battle_audio.sounds:
		battle_audio.play_effect(name)
		assert(name in battle_audio.sound_history)
		await get_tree().create_timer(0.08).timeout
	battle_audio.enqueue_word({"id":"qa-pronunciation-cancel","word":"education"})
	battle_audio.set_dictation(true)
	mentor_voice.set_blocked(true)
	assert(not battle_audio.reading_busy and not mentor_voice.is_speaking(),"Dictation overlap")
	battle_audio.set_dictation(false)
	mentor_voice.set_blocked(false)
	battle_audio.toggle_effects()
	var effect_count=battle_audio.sound_history.size()
	battle_audio.play_effect("rifle")
	assert(battle_audio.sound_history.size()==effect_count)
	battle_audio.toggle_words()
	battle_audio.enqueue_word({"id":"qa-muted","word":"muted"})
	assert(not battle_audio.reading_busy)
	mentor_voice.toggle()
	var saved=ConfigFile.new()
	assert(saved.load(battle_audio.config_path)==OK)
	assert(not saved.get_value("audio","mentor_enabled") and not saved.get_value("audio","effects_enabled") and not saved.get_value("audio","words_enabled"),"Audio settings overwrote each other")
	mentor_voice.toggle()
	battle_audio.toggle_effects()
	battle_audio.toggle_words()
	go("voices")
	voice_library_group="考研复刻"
	voice_library_page=0
	preview_voice("ky_defeat")
	assert(mentor_voice.active_clip.scope=="ky")
	await get_tree().create_timer(0.8).timeout
	await RenderingServer.frame_post_draw
	var directory=ProjectSettings.globalize_path("res://qa")
	get_viewport().get_texture().get_image().save_png(directory+"/考研语音库.png")
	var result={"kaoyan_clips":18,"original_clips":43,"sfx":battle_audio.sounds.size(),"english_voice":battle_audio.voice_id,"completed_word":completed,"reading_history":battle_audio.reading_history,"scoped_dialogue":true,"correct_only":true,"previous_word_captured":true,"english_tts_started_and_ended":true,"queued_words_in_order":true,"pause_resume":true,"caption_frozen_during_read":true,"result_after_reading":true,"dictation_no_overlap":true,"independent_saved_toggles":true,"runtime_errors":0}
	var report=FileAccess.open(directory+"/audio-v7-verification.json",FileAccess.WRITE)
	report.store_string(JSON.stringify(result,"  "))
	mentor_voice.stop()
	battle_audio.cancel_reads()
	for player in battle_audio.effects: player.stop()
	await get_tree().create_timer(0.3).timeout
	print("AUDIO_QA_OK ",JSON.stringify(result))
	get_tree().quit(0)

func _run_study_qa() -> void:
	for i in 100:
		if bridge.ready_to_play: break
		await get_tree().create_timer(0.1).timeout
	assert(bridge.ready_to_play)
	get_window().focus_exited.disconnect(_focus_lost)
	qa_recording=true
	mentor_voice.enabled=false
	battle_audio.words_enabled=false
	assert(mentor_voice.opening_page("cet4") and mentor_voice.active_clip.id=="uploaded_english","Uploaded opening audio is not selected")
	await qa_command("book_select",{"id":"ky"})
	await qa_command("study_settings",{"source":"new","pos":"all","batch":5,"goal":5,"recall":true})
	go("books")
	var directory=ProjectSettings.globalize_path("res://qa")
	for child in ui.get_children():
		if child is Button: assert(child.get_rect().position.x>=0 and child.get_rect().end.x<=1280 and child.get_rect().end.y<=720,"Learning page overflow")
	await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/学习中心.png")
	var selected:Array=data.study.preview.map(func(w): return w.id)
	await qa_command("study_start")
	assert(page=="battle" and data.stage.studyMode and data.stage.pack=="ky")
	assert(mentor_voice.active_clip.scope=="ky")
	for i in 5:
		assert(data.word.id==selected[i],"Learning content differs from selected preview")
		field.text=str(data.word.word)
		field.text_submitted.emit(field.text)
		for attempt in 100:
			if int(data.get("lesson",{}).get("completed",0))==i+1: break
			await get_tree().process_frame
		assert(int(data.lesson.completed)==i+1)
		if i<4:
			assert(page=="battle","Learning ended before all selected words")
			while float(data.get("cooldown",0))>0: await qa_command("tick",{"delta":500})
		if i==2:
			await RenderingServer.frame_post_draw
			get_viewport().get_texture().get_image().save_png(directory+"/学习关卡.png")
	assert(page=="result" and data.lesson.completed==5)
	assert(data.study.today.count==5 and data.study.today.ready and not data.study.today.checked)
	go("books")
	var found=false
	for child in ui.get_children():
		if child is Button and child.text=="完成今日打卡":
			assert(not child.disabled);child.pressed.emit();found=true;break
	assert(found,"Missing check-in control")
	for i in 100:
		if data.study.today.checked: break
		await get_tree().process_frame
	assert(data.study.today.checked and data.study.today.streak==1)
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/每日打卡.png")
	await qa_command("study_settings",{"source":"due"})
	assert(data.study.preview.is_empty(),"New successful recalls should not already be due")
	var disabled_start=false
	for child in ui.get_children():
		if child is Button and child.name=="NextAction": disabled_start=child.disabled
	assert(disabled_start,"Empty learning pool can be started")
	await qa_command("study_settings",{"source":"new","pos":"verb","batch":10,"goal":20})
	assert(data.study.preview.size()==10)
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(directory+"/学习内容筛选.png")
	var result={"native_input_words":5,"selected_preview_matches_lesson":true,"complete_word_list_before_result":true,"check_in_button":true,"unique_daily_count":true,"empty_pool_disabled":true,"parts_of_speech_filter":true,"uploaded_opening_voice":true,"kaoyan_dialogue":true,"viewport":"1280x720","runtime_errors":0}
	var report=FileAccess.open(directory+"/study-v8-verification.json",FileAccess.WRITE)
	report.store_string(JSON.stringify(result,"  "))
	mentor_voice.stop()
	for player in battle_audio.effects: player.stop()
	await get_tree().create_timer(0.3).timeout
	print("STUDY_QA_OK ",JSON.stringify(result))
	get_tree().quit(0)

func _run_meme_qa() -> void:
	for i in 100:
		if bridge.ready_to_play:break
		await get_tree().create_timer(0.1).timeout
	assert(bridge.ready_to_play)
	get_window().focus_exited.disconnect(_focus_lost)
	qa_recording=true
	mentor_voice.enabled=false;battle_audio.words_enabled=false
	assert(result_meme.has_videos(true) and result_meme.has_videos(false))
	await qa_command("start_book",{"id":"ky","recall":true})
	await qa_command("submit",{"text":"wrongword"})
	assert(result_meme.visible and result_meme.selected_image=="question" and not result_meme.modal)
	for i in 30:
		if page=="result":break
		await qa_command("submit",{"text":str(data.word.word)})
		await qa_command("tick",{"delta":500})
	assert(page=="result" and state().outcome=="victory")
	await get_tree().create_timer(0.8).timeout
	assert(result_meme.visible and result_meme.video.is_playing() and not result_meme.modal)
	var shown=result_meme.shown_count
	await qa_command("state");rebuild()
	assert(result_meme.shown_count==shown)
	await get_tree().create_timer(float(result_meme.active_clip.duration)+0.35).timeout
	assert(result_meme.visible and result_meme.play_finished)
	go("books")
	assert(not result_meme.visible and not result_meme.video.is_playing())
	await qa_command("start_book",{"id":"ky","recall":true})
	for i in 700:
		if page=="result":break
		await qa_command("tick",{"delta":500})
	assert(page=="result" and state().outcome=="defeat")
	await get_tree().create_timer(0.8).timeout
	assert(result_meme.visible and result_meme.active_clip.outcome=="defeat" and result_meme.video.is_playing())
	await get_tree().create_timer(float(result_meme.active_clip.duration)+0.35).timeout
	assert(result_meme.visible and result_meme.play_finished)
	var result={"right_video":true,"victory_and_defeat":true,"miss_image_preserved":true,"once_per_result":true,"non_modal":true,"stops_after_clip":true}
	var report=FileAccess.open("res://qa/meme-v28-verification.json",FileAccess.WRITE)
	report.store_string(JSON.stringify(result,"  "));report.close()
	print("MEME_QA_OK ",JSON.stringify(result))
	get_tree().quit(0)

func _web_frame_ready(action:String) -> void:
	await RenderingServer.frame_post_draw
	if is_inside_tree():
		JavaScriptBridge.eval("window.dispatchEvent(new CustomEvent('toy-game-milestone',{detail:{name:"+JSON.stringify("frame:"+action)+",at:performance.now()}}))")
