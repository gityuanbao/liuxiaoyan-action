extends RefCounted
# Display names only. These do not modify original TypeScript IDs, rules, or saves.
const ENEMIES = {"crystal":"哈夫克突击兵", "thorn":"哈夫克重装兵", "tide":"哈夫克喷火兵", "gargoyle":"哈夫克盾兵"}
const SQUAD = {"moon":"哈夫克狙击兵", "leaf":"哈夫克喷火兵", "spark":"哈夫克机枪兵", "sun":"哈夫克盾兵"}
const PASSIVES = {"moon":"战术补给", "leaf":"战地急救", "spark":"火力支援", "sun":"装甲掩护"}
const ROLES = ["突击专长", "防御专长", "侦察专长", "情报专长", "支援专长", "爆破专长"]
const REGIONS = {"月光桥":"零号大坝", "风之森林":"长弓溪谷", "回声海港":"巴克什", "星文高塔":"航天基地"}
const STAGES = {
	"bridge-1":"外围警戒", "bridge-2":"坝下通道", "bridge-3":"行政楼突破",
	"forest-1":"山谷侦察", "forest-2":"林间伏击", "forest-3":"据点清剿",
	"harbor-1":"通信截获", "harbor-2":"旧城追踪", "harbor-3":"城区突围",
	"tower-1":"外围封锁", "tower-2":"中控推进", "tower-3":"核心区攻坚"
}
const RUNES = {"dawn":"强化弹药", "ward":"防护装甲", "insight":"战术电池"}
const COMMISSIONS = ["大坝行动", "溪谷行动", "词汇精通", "通信侦听", "综合训练", "全域通关"]

static func stage(value: Dictionary) -> String:
	if value.get("bookMode",false): return str(value.name)
	return STAGES.get(value.get("id", ""), "行动准备")

static func region(value: Dictionary) -> String:
	if value.get("bossMode",false): return "总监试炼"
	if value.get("studyMode",false): return "学习行动"
	if value.get("bookMode",false): return "词书训练"
	return REGIONS.get(value.get("region", ""), "前线基地")
