import './loader.mjs';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {BOOKS,requireBook,bookPool,bookCatalog} from './wordbooks.mjs';
import {StudyPlanner} from './study.mjs';
import {StudyMission} from './study-mission.mjs';
import {migrateProgression,progressionSummary,claimLevels,setSupplyEnabled,applyLevelPerks,recordWallet,learningLevel} from './progression.mjs';
import {migrateRecruitment,recruitmentSummary,awardRecall,awardRecognition,isUnlocked,recruit,buySupply,deploySupplies} from './recruitment.mjs';
import {createChoice,publicChoice,isChoice} from './choice-questions.mjs';
import {DIRECTOR_RULES,directorPool,createDirector,directorCast,advanceDirector,directorIntent,directorSnapshot} from './director-boss.mjs';
const root = '../legacy/packages/client/src/academy/';
const [duel, learning, expedition, data, words, growth, combat, notebook, audio, chars] = await Promise.all([
  'duel-engine', 'learning-core', 'expedition-core', 'expedition-data', 'words', 'growth-core',
  'combat-skills', 'notebook-data', 'audio-library-data', 'character-data'
].map(name => import(root + name + '.ts')));
export class Session {
  constructor(savePath) {
    this.savePath = savePath;
    this.bookSettings={selected:'cet4',recall:false};
    if(savePath&&existsSync(savePath+'.books.json')){
      const stored=JSON.parse(readFileSync(savePath+'.books.json','utf8'));
      if(BOOKS.some(b=>b.id===stored.selected))this.bookSettings={selected:stored.selected,recall:!!stored.recall};
    }
    this.profile = savePath && existsSync(savePath) ? learning.parseBackup(readFileSync(savePath, 'utf8')) : learning.emptyProfile();
    this.study=new StudyPlanner(savePath?savePath+'.study.json':null);
    if(BOOKS.some(b=>b.id===this.study.data.settings.selectedBook))this.bookSettings.selected=this.study.data.settings.selectedBook;
    const migrated=migrateProgression(migrateRecruitment(this.profile,this.study));
    if(migrated!==this.profile)this.save(migrated);
    this.learningRewards={xp:0,coins:0,newWords:0,reviewWords:0};
    this.deployedSupplies=[];
    this.state = null; this.stage = null; this.pool = []; this.index = 0;
    this.attempts = []; this.result = null; this.peak = 0; this.lesson=null;
    this.lastAnswer=null;this.memoryWord='';this.memoryPage=0;this.mission=null;
    this.choiceQuestion=null;
    this.hinted = false; this.wrong = false; this.chanting = false;
    this.heard = false; this.playing = false; this.paused = false; this.cooldown = 0;
  }
  save(next,label='行动结算') {
    next=recordWallet(this.profile,next,label,this.study?.now()??new Date());
    if (this.savePath) {
      mkdirSync(dirname(this.savePath), {recursive:true});
      writeFileSync(this.savePath + '.tmp', JSON.stringify(next, null, 2));
      renameSync(this.savePath + '.tmp', this.savePath);
    }
    this.profile = next;
  }
  get word() { return this.mission?.item(this.index).word??this.pool[this.index % this.pool.length]; }
  get recalling() { return this.mission?this.mission.item(this.index).mode!=='learn':!!this.stage?.recall; }
  get stopped() { return this.paused || (this.stage?.lesson === 'listening' && (!this.heard || this.playing)); }
  get expected() { return this.chanting ? combat.CHARACTER_SKILLS[this.state.avatar].chant : this.stage?.lesson === 'sentence' ? this.word?.example : this.word?.word; }
  get choiceMode(){return this.stage?.bookMode&&isChoice(this.stage.answerMode);}
  choice(){
    if(!this.choiceMode||this.chanting||!this.word)return null;
    const token=this.id+':'+this.index;
    if(this.choiceQuestion?.token!==token)this.choiceQuestion=createChoice(this.word,this.stage.pack,this.stage.answerMode,token);
    return this.choiceQuestion;
  }
  start(id) {
    if(id.startsWith('boss:director:'))return this.startBoss({id:id.split(':')[2],recall:this.stage?.recall??true});
    if(id.startsWith('book:'))return this.startBook(id.slice(5),this.bookSettings.recall);
    const stage = data.EXPEDITION.find(s => s.id === id);
    if (!stage || !expedition.stageUnlocked(this.profile, id)) throw Error('请先完成前一段航路。');
    const listening = stage.lesson === 'listening';
    const pool = (stage.pack === 'human' ? words.WORDS.filter(w => audio.humanClip(w.word)) : learning.selectWords(this.profile, stage.pack, 60))
      .filter(w => (!stage.maxLength || w.word.length <= stage.maxLength) && (listening ? words.WORDS.some(o => o.id === w.id && o.pack !== 'beginner') : stage.lesson === 'sentence' ? !!w.example : true));
    if (!pool.length) throw Error('这个主题暂没有可练习的内容。');
    const avatar = this.profile.avatar ?? 'mage';
    const companion = words.SPIRITS.find(s => s.id === this.profile.companion && learning.profileStats(this.profile).battles >= s.threshold)?.id ?? 'moon';
    this.stage = stage; this.pool = pool; this.index = 0; this.attempts = []; this.result = null; this.peak = 0; this.lesson=null;this.lastAnswer=null;this.mission=null;
    this.hinted = false; this.wrong = false; this.chanting = false; this.heard = false; this.playing = false; this.paused = false; this.cooldown = 0;
    this.id = `expedition:${id}:${randomUUID()}`;
    this.choiceQuestion=null;
    this.learningRewards={xp:0,coins:0,newWords:0,reviewWords:0};
    this.state = duel.createDuel(stage.difficulty, avatar, companion, growth.heroBond(this.profile, avatar).rank,
      growth.spiritBond(this.profile, companion).rank, !!stage.seal,
      { monster: stage.monster, hp: stage.hp, elite: stage.boss, rune: expedition.activeRune(this.profile) });
    this.state=applyLevelPerks(this.profile,this.state);
    const deployment=deploySupplies(this.profile,this.state);
    this.state=deployment.state;this.deployedSupplies=deployment.used;
    if(deployment.profile!==this.profile)this.save(deployment.profile);
  }
  selectBook(id,recall=this.bookSettings.recall){
    requireBook(id);
    if(id!==this.bookSettings.selected)
      this.study.configure({selectedBook:id,chapter:id!==this.bookSettings.selected?0:this.study.data.settings.chapter});
    this.bookSettings={selected:id,recall:!!recall};
    if(this.savePath){
      mkdirSync(dirname(this.savePath),{recursive:true});
      writeFileSync(this.savePath+'.books.json.tmp',JSON.stringify(this.bookSettings));
      renameSync(this.savePath+'.books.json.tmp',this.savePath+'.books.json');
    }
  }
  saveBookPlan({id,batch,goal}){
    requireBook(id);
    if(![5,10,15].includes(batch)||![5,10,20,30].includes(goal))throw Error('请选择支持的每轮词数与每日目标。');
    // The study file is authoritative for the saved plan. The book file remains a legacy mirror.
    this.study.configure({selectedBook:id,batch,goal,chapter:0,planMode:'daily'});
    this.bookSettings={...this.bookSettings,selected:id};
    if(this.savePath){
      writeFileSync(this.savePath+'.books.json.tmp',JSON.stringify(this.bookSettings));
      renameSync(this.savePath+'.books.json.tmp',this.savePath+'.books.json');
    }
  }
  startBook(id,recall=false){
    const book=requireBook(id);this.selectBook(id,recall);
    this.start('bridge-1');
    this.stage={...this.stage,id:'book:'+id,name:book.name,region:'词书训练',pack:id,bookMode:true,recall:!!recall,reward:0,answerMode:this.study.data.settings.answerMode??'spelling'};
    this.pool=bookPool(id,this.profile,60);
    this.id='wordbook:'+id+':'+randomUUID();
  }
  startStudy(retry=false,planned=null){
    const selected=planned??(retry?{pool:this.pool.filter(w=>this.mission?.summary(this.index).weakWords.some(x=>x.id===w.id)),settings:{source:'session',recall:true},sourceLabel:'本局薄弱词'}:this.study.selection(this.bookSettings.selected,this.profile)),pool=[...selected.pool];
    if(!pool.length)throw Error('当前范围没有可练单词，请切换学习内容或词性。');
    const recall=selected.settings.recall,id=retry?this.stage.pack:this.bookSettings.selected;
    this.startBook(id,recall);this.pool=pool;
    this.stage={...this.stage,studyMode:true,name:requireBook(id).name+' · '+selected.sourceLabel,region:'学习行动'};
    this.id='study:'+id+':'+randomUUID();
    this.mission=new StudyMission(pool,recall,this.stage.answerMode);
    this.lesson={total:this.mission.items.length,completed:0,wave:1,source:selected.settings.source,recall,words:pool.map(w=>w.id)};
  }
  startBoss({id=this.bookSettings.selected,recall=true}={}){
    const pool=directorPool(id,this.study,this.profile);
    this.startBook(id,recall);
    this.pool=pool;
    this.stage={...this.stage,id:'boss:director:'+id,name:DIRECTOR_RULES.name+' · 百词挑战',region:'总监试炼',monster:'director',boss:true,bossMode:true,recall:!!recall,hp:DIRECTOR_RULES.hp};
    this.state=createDirector(this.state);
    this.id='director:'+id+':'+randomUUID();
    this.lesson={total:100,completed:0,wave:1,source:'director',recall:!!recall,words:pool.map(w=>w.id)};
  }
  settle() {
    const s = this.state;
    if (!s?.outcome || this.result) return;
    const sentence = this.stage.lesson === 'sentence';
    const record = { ...(this.stage.bookMode?{}:{expedition: {stage:this.stage.id, hp:s.playerHp}}), id:this.id, avatar:s.avatar, companion:s.companion,
      kind:this.stage.lesson, outcome:s.outcome, title:`${this.stage.region} · ${this.stage.name} · ${s.outcome === 'victory' ? '决斗胜利' : '决斗落败'}`,
      date:new Date().toISOString(), correct:s.hits, total:s.hits+s.mistakes, duration:Math.max(1,Math.round(s.elapsed/1000)),
      ultimates:s.ultimateUses, xp:(s.hits-s.ultimateUses)*(sentence?8:5)+s.ultimateUses*8+(s.outcome==='victory'?20:s.hits>0?5:0), words:[...this.attempts] };
    if(this.stage.bookMode){
      record.xp=this.learningRewards.xp;
      record.rewards={...this.learningRewards,credited:true};
      const before=this.profile;
      const next=learning.recordResult(before,record);
      // Word rewards are saved immediately; settlement records them without paying twice.
      this.save({...next,xp:before.xp,growth:{...before.growth,settled:next.growth.settled}});
    }else this.save(learning.recordResult(this.profile, record));
    this.result = record;
  }
  command(action, p = {}) {
    let choiceAnswer=null;
    if(action==='choose'){
      const q=this.choice();
      if(!q||q.token!==p.token)throw Error('题目已更新，请选择当前选项。');
      const selected=q.options.find(o=>o.id===p.option);
      if(!selected)throw Error('请选择当前题目的一个选项。');
      if(q.answered||this.stopped||this.state?.outcome||this.cooldown>0)return this.snapshot();
      q.answered=true;q.selected=selected.id;q.correct=selected.correct;
      choiceAnswer=selected;action='submit';p={text:selected.correct?this.expected:'__incorrect_choice__'};
    }else if(action==='submit'&&this.choiceMode&&!this.chanting)throw Error('当前为选择题，请点选答案。');
    if (action === 'start') this.start(p.id);
    if (action === 'book_select') this.selectBook(p.id,p.recall??this.bookSettings.recall);
    if (action === 'book_plan_save') this.saveBookPlan(p);
    if (action === 'start_book') this.startBook(p.id??this.bookSettings.selected,!!p.recall);
    if (action === 'study_settings') this.study.configure(p);
    if (action === 'study_start') this.startStudy();
    if (action === 'daily_start') {
      // Never replace a live mission when the user changes planning settings.
      if(this.state&&!this.state.outcome)throw Error('请先继续并完成当前行动，再开始新的计划。');
      const plan=this.study.dailySelection(this.bookSettings.selected,this.profile);
      if(!['learn','review'].includes(plan.action))throw Error(plan.detail);
      this.startStudy(false,plan);
    }
    if (action === 'boss_start') this.startBoss(p);
    if (action === 'retry_study') {
      if(!this.mission||!this.state?.outcome)throw Error('请先完成本轮学习，再复测薄弱词。');
      this.startStudy(true);
    }
    if (action === 'review_start') {this.study.configure({source:'due',pos:'all',chapter:0,recall:true});this.startStudy();}
    if (action === 'memory_select') this.memoryWord=String(p.id??'');
    if (action === 'memory_page') this.memoryPage=Math.max(0,Math.floor(Number(p.page)||0));
    if (action === 'check_in') {
      if(this.state&&!this.state.outcome)throw Error('请先完成当前行动，再完成今日打卡。');
      this.study.checkIn();
    }
    if (action === 'tick' && this.state && !this.state.outcome) {
      const dt = Math.max(0,Math.min(Number(p.delta)||0,500));
      const choiceRecap=this.choiceMode&&this.choice()?.answered&&!this.chanting;
      const recap=(this.stage?.studyMode||choiceRecap)&&this.cooldownKind==='word'&&this.cooldown>0;
      const waitForNext = choiceRecap && !this.stage.bossMode;
      if (!this.stopped) this.state = this.stage.bossMode
        ? advanceDirector(this.state,dt)
        : duel.advanceDuel(this.state,recap?Math.max(0,dt-this.cooldown):dt);
      if (this.cooldown > 0 && !waitForNext && (!(this.stage?.studyMode||this.stage?.bossMode)||!this.stopped)) {
        this.cooldown = Math.max(0,this.cooldown-dt);
        if (this.cooldown <= 0 && !this.state.outcome) {
          if (this.cooldownKind === 'ultimate') this.chanting=false;
          else { this.index++; this.heard=false; this.hinted=false; this.wrong=false; }
        }
      }
    }
    if (action === 'submit' && this.state && !this.state.outcome && !this.stopped && this.cooldown<=0 && p.text?.trim()) {
      const previous = this.state;
      const assisted = choiceAnswer?this.hinted:this.chanting || this.hinted || (this.stage.lesson !== 'listening' && !this.recalling);
      this.state = this.chanting ? duel.castUltimate(previous,p.text) : duel.castWord(previous,p.text,this.expected,this.stage.lesson==='sentence'?'sentence':'word');
      if(this.stage.bossMode)this.state=directorCast(previous,this.state,this.chanting);
      const success = this.state.hits > previous.hits;
      if (!this.chanting) {
        this.attempts.push({id:this.word.id, correct:success, hinted:!!choiceAnswer||assisted||this.wrong});
        this.lastAnswer=this.study.record(this.word,success,assisted||this.wrong,{attempt:`${this.id}:${this.index}`,recall:!choiceAnswer&&(this.recalling||this.stage.lesson==='listening'),corrected:this.wrong,answerMode:choiceAnswer?this.stage.answerMode:'spelling'});
        if(this.stage.bookMode){
          const credited=(choiceAnswer?awardRecognition:awardRecall)(this.profile,this.word,this.lastAnswer,this.study.now(),this.state.avatar);
          this.lastAnswer.reward=credited.reward;
          if(credited.profile!==this.profile){
            this.save(credited.profile,credited.reward.reason+' · '+this.word.word);
            this.learningRewards.xp+=credited.reward.xp;this.learningRewards.coins+=credited.reward.coins;
            this.learningRewards[credited.reward.kind==='new'?'newWords':'reviewWords']++;
          }
        }
        if(this.mission){
          this.mission.record(this.index,this.lastAnswer);
          this.lesson.total=this.mission.items.length;
          if(success&&!choiceAnswer)this.lastAnswer.message=this.lastAnswer.independent?(this.lastAnswer.accepted?'独立回忆成功 · 复习排期已更新':'本局回忆成功 · 长期复习排期保留'):this.recalling?(this.mission.items.slice(this.index+1).some(x=>x.word.id===this.word.id)?'已校正拼写 · 稍后再遮住答案复测':'本词仍需巩固 · 保留后续复习任务'):'建立印象完成 · 稍后进入独立回忆';
        }
        this.memoryWord=this.word.id;
        if((success||(choiceAnswer&&this.mission))&&this.lesson)this.lesson.completed++;
        if(choiceAnswer&&!success&&this.stage.bossMode)this.pool.push(this.word);
      }
      if (success) { this.peak=Math.max(this.peak,this.state.combo); this.cooldown=this.chanting?850:this.stage.bossMode?DIRECTOR_RULES.feedbackMs:this.stage.studyMode?1600:420; this.cooldownKind=this.chanting?'ultimate':'word'; }
      else if (!this.chanting) this.wrong=true;
      if(choiceAnswer){this.cooldown=2200;this.cooldownKind='word';}
    }
    if (action === 'pause') this.paused = !!p.value;
    if(action==='choice_next'&&this.choiceMode&&this.choice()?.answered&&!this.stopped&&!this.state?.outcome){
      if(p.token&&p.token!==this.choice().token)throw Error('题目已更新。');
      this.index++;this.cooldown=0;this.wrong=false;this.hinted=false;this.heard=false;
    }
    if (action === 'heard') { this.heard=true; this.playing=false; }
    if (action === 'audio') this.playing=true;
    if (action === 'audio_stop') this.playing=false;
    if (action === 'hint' && !this.stopped) this.hinted=true;
    if (action === 'hint' && this.stage?.lesson === 'listening' && !this.paused) this.hinted=true;
    const active = this.state && !this.state.outcome && !this.stopped && this.cooldown<=0;
    if (action === 'prepare' && active && !this.chanting) {
      if (![null,'surge','ward'].includes(p.spell)) throw Error('无效战技。');
      this.state=duel.prepareSpell(this.state,p.spell);
    }
    if (action === 'tactic' && active && !this.chanting) this.state=duel.castTactic(this.state);
    if (action === 'chant' && active && this.state.energy>=100) {
      this.chanting=!this.chanting; this.state=duel.prepareSpell(this.state,null);
    }
    if (action === 'companion') {
      const spirit=words.SPIRITS.find(s=>s.id===p.id);
      if (!spirit || learning.profileStats(this.profile).battles<spirit.threshold) throw Error('完成更多战斗后解锁。');
      this.save({...this.profile,companion:p.id});
    }
    if (action === 'avatar') {
      if (!chars.AVATAR_IDS.includes(p.id)) throw Error('无效角色。');
      if(!isUnlocked(this.profile,p.id))throw Error('这位干员尚未解锁，请先用哈弗币解锁。');
      this.save({...this.profile,avatar:p.id});
    }
    if(action==='claim_levels')this.save(claimLevels(this.profile),'学习升级奖励');
    if(action==='supply_enabled')this.save(setSupplyEnabled(this.profile,p.id,p.enabled));
    if(action==='unlock_avatar')this.save(recruit(this.profile,p.id),'永久招募干员');
    if(action==='buy_supply')this.save(buySupply(this.profile,p.id),'购买'+(p.id==='armor'?'防护补给':'战术电池'));
    if (action === 'upgrade') {
      if(p.kind==='hero'&&!isUnlocked(this.profile,p.id))throw Error('请先解锁这位干员。');
      try{this.save(growth.upgradeBond(this.profile,p.kind,p.id),p.kind==='hero'?'干员进阶':'支援进阶');}
      catch(error){throw Error(error.message.replaceAll('星砂','哈弗币'));}
    }
    if (action === 'rune') this.save(expedition.improveRune(this.profile,p.id),'装备进阶');
    if (action === 'equip_rune') this.save(expedition.equipRune(this.profile,p.id));
    if (action === 'claim') this.save(expedition.claimCommission(this.profile,p.id),'行动委托奖励');
    if (action === 'bookmark' && this.word) {
      const book=this.profile.notebook??notebook.emptyNotebook(), id=this.word.id;
      this.save({...this.profile,notebook:{...book,saved:book.saved.includes(id)?book.saved.filter(w=>w!==id):[...book.saved,id]}});
    }
    if(this.lesson&&!this.stage?.bossMode&&this.state?.outcome!=='defeat'){
      if(this.lesson.completed>=this.lesson.total)this.state={...this.state,outcome:'victory'};
      else if(this.state.outcome==='victory'){
        // A defeated enemy yields to reinforcements until the selected word list is complete.
        // Damage, energy, character skills and the original twelve stages remain unchanged.
        this.lesson.wave++;
        this.state={...this.state,outcome:null,botHp:this.state.enemyMaxHp};
      }
    }
    this.settle(); return this.snapshot();
  }
  snapshot() {
    const derived=this.profileSnapshot(), s=this.state;
    return {...derived,profile:this.profile,state:s,stage:this.stage?{...this.stage,recall:this.recalling}:null,word:this.word??null,
      learningRewards:this.learningRewards,bookSettings:this.bookSettings,deployedSupplies:this.deployedSupplies,
      study:this.study.summary(this.bookSettings.selected,this.profile),lesson:this.lesson,learningMission:this.mission?.summary(this.index)??null,
      memory:this.study.memorySummary(this.bookSettings.selected,this.profile,this.memoryWord,this.memoryPage),lastAnswer:this.lastAnswer,
      boss:this.stage?.bossMode?directorSnapshot(s,this.attempts):null,
      answerFeedback:!!((this.stage?.studyMode||this.stage?.bossMode)&&this.cooldownKind==='word'&&this.cooldown>0&&this.lastAnswer?.correct&&!this.chanting),
      choice:publicChoice(this.choice()),
      prompt:this.chanting||this.hinted||(this.stage?.lesson!=='listening'&&!this.recalling)?this.expected??'':this.stage?.lesson==='sentence'?this.word?.translation:this.stage?.lesson==='listening'?'听音后拼写':this.word?.meaning,
      index:this.index, chanting:this.chanting, hinted:this.hinted, heard:this.heard, playing:this.playing, paused:this.paused, stopped:this.stopped, cooldown:this.cooldown,
      attempts:this.attempts, peak:this.peak, result:this.result, intent:s?(this.stage?.bossMode?directorIntent(s):duel.enemyIntent(s)):null,
      audio:this.word?(this.stage?.pack==='human'?audio.humanClip(this.word.word)?.file:`/audio/${this.stage?.lesson==='sentence'?'sentence':'word'}-${this.word.id}.wav`):null,
      collection:this.collectionSnapshot()};
  }
  profileSnapshot(){
    const revision=this.study.revision,epoch=Math.floor(this.study.now().getTime()/60000);
    if(this.profileCache?.profile===this.profile&&this.profileCache.revision===revision&&this.profileCache.epoch===epoch)return this.profileCache.value;
    const stats=learning.profileStats(this.profile);
    const level=learningLevel(this.profile.xp);
    Object.assign(stats,{level:level.level,levelProgress:level.progress,levelRequired:level.required});
    const value={stats,progression:progressionSummary(this.profile),recruitment:recruitmentSummary(this.profile),books:bookCatalog(this.profile,this.study),
      stages:data.EXPEDITION.map(x=>({...x,unlocked:expedition.stageUnlocked(this.profile,x.id),stars:this.profile.expedition?.clears[x.id]?.stars??0})),
      spirits:words.SPIRITS.map(x=>({...x,unlocked:stats.battles>=x.threshold,bond:growth.spiritBond(this.profile,x.id),skill:combat.SPIRIT_SKILLS[x.id]})),
      avatars:chars.AVATAR_IDS.map(id=>({id,...chars.CHARACTERS[id],...combat.CHARACTER_SKILLS[id],bond:growth.heroBond(this.profile,id)})),
      runes:Object.entries(data.RUNES).map(([id,r])=>({id,...r,rank:this.profile.expedition?.runes[id]??0})),
      commissions:expedition.COMMISSIONS.map(c=>({id:c.id,name:c.name,detail:c.detail,reward:c.reward,progress:c.progress(this.profile),target:c.target,claimed:this.profile.expedition?.claims.includes(c.id)??false}))};
    this.profileCache={profile:this.profile,revision,epoch,value};return value;
  }
  collectionSnapshot(){
    const epoch=Math.floor(this.study.now().getTime()/1000),revision=this.study.revision;
    if(this.collectionCache?.profile===this.profile&&this.collectionCache.epoch===epoch&&this.collectionCache.revision===revision)return this.collectionCache.value;
    const saved=new Set(this.profile.notebook?.saved??[]);
    const value=notebook.allStudyWords(this.profile).filter(w=>this.profile.words[w.id]||this.study.data.cards[w.id]||saved.has(w.id)).map(w=>{
        const memory=this.study.wordStatus(w,this.profile);
        return {...w,attempts:0,correct:0,streak:0,...this.profile.words[w.id],memoryStatus:memory.status,reviewIn:memory.reviewIn,needsReview:!memory.stable};
      });
    this.collectionCache={profile:this.profile,epoch,revision,value};return value;
  }
}
