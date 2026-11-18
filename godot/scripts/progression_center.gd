extends RefCounted
const T=preload("res://scripts/design_tokens.gd")
const C=preload("res://scripts/currency_ui.gd")
const ROWS=4

static func build(h) -> void:
	var p:Dictionary=h.data.progression
	var count=maxi(1,ceili(p.ledger.size()/float(ROWS)))
	h.ledger_page=clampi(h.ledger_page,0,count-1)
	var claim=h.button("领取 %d 哈弗币" % p.pending if p.pending>0 else "升到 Lv.%d 再领奖" % p.nextRewardLevel,Rect2(56,337,310,42),func():h.bridge.request("claim_levels"),true,p.pending<=0)
	claim.name="ClaimLevels";claim.add_theme_font_size_override("font_size",17)
	for i in 3:
		var target=["spirits","arsenal","supplies"][i]
		var b=h.button(["招募干员","进阶装备","行动补给"][i],Rect2(788+i*156,82,148,36),func():h.go(target))
		b.name="GrowthLink_"+target;b.add_theme_font_size_override("font_size",14)
	h.button("‹",Rect2(1120,460,34,28),func():h.ledger_page-=1;h.rebuild(),false,h.ledger_page==0).name="LedgerPrev"
	h.button("›",Rect2(1214,460,34,28),func():h.ledger_page+=1;h.rebuild(),false,h.ledger_page>=count-1).name="LedgerNext"
	h.button("学习计划  /  继续积累经验",Rect2(56,556,310,40),func():h.go("books")).add_theme_font_size_override("font_size",15)

static func draw(h) -> void:
	var p:Dictionary=h.data.progression
	var wallet:Dictionary=h.data.recruitment
	h.text_at("成长与钱包",32,115,30,T.TEXT)
	h.text_at("学会单词，让每一次出击更有底气。",244,111,14,T.MUTED)
	h.panel(Rect2(32,142,358,466),T.SURFACE)
	h.text_at("学习等级 / "+p.title,56,176,15,T.GREEN)
	h.text_at("Lv.%02d" % p.level,52,239,54,T.TEXT,-1,true)
	h.text_at("%d / %d XP" % [p.progress,p.required],56,277,15,T.MUTED,310,true)
	h.bar(Rect2(56,291,310,5),p.progress,p.required,T.GREEN)
	h.text_at("再获得 %d XP 升级 · 每级奖励 %d 哈弗币" % [p.remaining,p.perLevel],56,319,12,T.MUTED)
	h.text_at("已解锁 · 每场开局自动生效",56,411,14,T.GREEN)
	h.text_at("护甲 +%d     能量 +%d" % [p.shield,p.energy],56,446,25,T.TEXT)
	var next=p.get("next")
	h.text_at("Lv.%d 称号：%s" % [next.level,next.title] if next is Dictionary else "最高称号已获得，升级仍可成长领奖",56,476,13,T.MUTED,310)
	h.text_at("升级需求逐级 ×1.5，向上取整；溢出经验保留",56,510,12,T.MUTED)
	h.text_at("干员熟练度：出战回忆积累，用于技能进阶",56,534,12,T.MUTED)
	h.panel(Rect2(412,142,260,128),T.SURFACE)
	h.text_at("哈弗币 / 可用余额",428,174,16,T.TEXT)
	C.amount(h,wallet.coins,Vector2(428,217),30,T.TEXT,false,30)
	h.text_at("累计获得 %d / 已使用 %d" % [wallet.earned,wallet.spent],428,252,12,T.MUTED)
	for i in 2:
		var x=688+i*288
		h.panel(Rect2(x,142,272,128),T.SURFACE)
		h.text_at("首次独立回忆" if i==0 else "到期独立复习",x+16,174,16,T.TEXT)
		h.text_at("+12 XP  /  +6 哈弗币" if i==0 else "+8 XP  /  +4 哈弗币",x+16,211,21,T.GREEN)
		h.text_at("同词每日一次 · 看答案不计奖" if i==0 else "到期后可再领 · 不扣已获得奖励",x+16,251,11,T.MUTED)
	h.text_at("称号与成长",412,303,18,T.TEXT)
	h.text_at("每级护甲 +1 / 能量 +1；战斗上限 40 / 100，不跳过学习任务。",558,301,12,T.MUTED)
	for i in p.milestones.size():
		var m:Dictionary=p.milestones[i]
		var unlocked=p.level>=m.level
		var x=412+i*170
		h.panel(Rect2(x,319,156,122),T.SURFACE,T.GREEN if unlocked else T.EDGE)
		h.text_at("Lv.%02d" % m.level,x+12,347,18,T.GREEN if unlocked else T.MUTED,-1,true)
		h.text_at(m.title,x+12,375,17,T.TEXT if unlocked else T.MUTED)
		h.text_at("护甲 +%d / 能量 +%d" % [m.shield,m.energy],x+12,401,11,T.MUTED)
		h.text_at("已解锁" if unlocked else "继续学习解锁",x+12,426,11,T.GREEN if unlocked else T.DIM)
	h.text_at("哈弗币收支",412,483,18,T.TEXT)
	h.text_at("最近 60 笔收入与消费 · 余额实时保存",554,480,12,T.MUTED)
	h.text_at("%d / %d" % [h.ledger_page+1,maxi(1,ceili(p.ledger.size()/float(ROWS)))],1161,480,12,T.MUTED)
	h.draw_line(Vector2(412,497),Vector2(1248,497),T.EDGE)
	if p.ledger.is_empty():
		h.text_at("暂无新收支，独立回忆一个单词即可记录第一笔奖励。",428,547,15,T.MUTED)
	for i in ROWS:
		var index=h.ledger_page*ROWS+i
		if index>=p.ledger.size():break
		var row:Dictionary=p.ledger[index]
		var y=520+i*24
		h.text_at(row.date.substr(0,10),424,y,11,T.DIM)
		h.text_at(row.label,532,y,13,T.TEXT,444)
		h.text_at(("+" if row.amount>0 else "")+str(int(row.amount)),1000,y,14,T.GREEN if row.amount>0 else T.ORANGE,-1,true)
		h.text_at("余额 %d" % row.balance,1120,y,12,T.MUTED)
