extends RefCounted
# Presentation copy mirrors duel-engine.ts; the engine remains the authority.
static func tactic(id:String,rank:int=1,boss:bool=false) -> String:
	var r=clampi(rank,1,3)-1
	match id:
		"mage":return "补充 40 能量，上限 100；满能量时不可用。"
		"knight":return "获得 22 护甲，上限 40；敌袭延后 1.2 秒。"
		"ranger":return "下一次拼写命中 +6 伤害；敌袭延后 4 秒。" if not boss else "标记下一次拼写，增强压制；敌袭延后 4 秒。"
		"scholar":return "下一次命中：单词 +4、句子 +16 伤害。" if not boss else "强化下一次拼写压制；句子的压制更强。"
		"bard":return "恢复 26 生命，上限 140；不会攻击敌人。"
		"alchemist":return "下一次命中 +%d 伤害；接下来两次敌袭前各灼烧 %d。" % [6+r*4,10+r*3] if not boss else "强化下一次拼写压制；接下来两次敌袭后的间隔各增加 0.5 秒。"
	return ""

static func passive(id:String,rank:int=1) -> String:
	var r=clampi(rank,1,3)-1
	return {"mage":"被动：每次普通命中额外 +%d 能量。" % (4+r*4),"knight":"被动：每次普通命中 +%d 护甲，上限 40。" % (3+r*2),"ranger":"被动：从三连击起，每次普通命中 +%d 伤害。" % (3+r*2),"scholar":"被动：普通句子命中 +%d 伤害，单词不触发。" % (4+r*4),"bard":"被动：每三次普通命中恢复 %d 生命，上限 140。" % (6+r*4),"alchemist":"被动：错拼后下一次普通命中 +%d 伤害，不叠加。" % (6+r*4)}.get(id,"")

static func ultimate(id:String,rank:int=1,boss:bool=false) -> String:
	if boss:
		return {"mage":"延长压制；不扣词汇护甲，不替代必答单词。","knight":"延长压制，并获得 24 护甲，上限 40。","ranger":"延长压制，敌袭额外延后 5 秒。","scholar":"延长压制，返还 20 能量。","bard":"延长压制，恢复 24 生命，上限 140。","alchemist":"延长压制；接下来两次敌袭后的间隔各增加 0.5 秒。"}.get(id,"")
	return {"mage":"造成 60 伤害。","knight":"造成 42 伤害，获得 24 护甲，上限 40。","ranger":"造成 48 伤害，敌袭延后 5 秒。","scholar":"造成 46 伤害，返还 20 能量。","bard":"造成 40 伤害，恢复 24 生命，上限 140。","alchemist":"造成 52 伤害；随后两次敌袭前各灼烧 %d。" % (10+(clampi(rank,1,3)-1)*3)}.get(id,"")

static func tooltip(command:String,id:String,rank:int,boss:bool) -> String:
	match command:
		"Surge":return "预装强化射击：下次普通拼写命中才消耗 30 能量，额外 +12 伤害。再次点击取消。" if not boss else "预装强化射击：下次普通拼写命中才消耗 30 能量，额外攻击威力转为压制。再次点击取消。"
		"Ward":return "预装装甲掩护：下次普通拼写命中才消耗 20 能量，获得 14 护甲，上限 40。再次点击取消。"
		"Tactic":return tactic(id,rank,boss)+"\n累计三次普通命中后解锁，每轮一次，不消耗能量。"
		"Chant":return ultimate(id,rank,boss)+"\n满 100 能量后输入完整短语发动，错拼不扣能量；再次点击取消。"
	return ""
