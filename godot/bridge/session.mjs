import './loader.mjs';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {BOOKS,requireBook,bookPool,bookCatalog,allBookWords,WORD_DIFFICULTIES,wordsAtDifficulty} from './wordbooks.mjs';
import {activeCustomWords,attachCustomBook,customBookEditor,CUSTOM_BOOK_ID,editCustomBook,getCustomBook,hasCustomBook} from './custom-book.mjs';
import {StudyPlanner} from './study.mjs';
import {StudyMission} from './study-mission.mjs';
import {migrateProgression,progressionSummary,claimLevels,setSupplyEnabled,applyLevelPerks,recordWallet,learningLevel} from './progression.mjs';
import {migrateRecruitment,recruitmentSummary,awardRecall,awardRecognition,isUnlocked,recruit,drawRecruit,buySupply,deploySupplies} from './recruitment.mjs';
import {createChoice,publicChoice,isChoice} from './choice-questions.mjs';
import {DIRECTOR_RULES,directorPool,createDirector,directorCast,advanceDirector,directorIntent,directorSnapshot} from './director-boss.mjs';
const root = '../legacy/packages/client/src/academy/';
const [duel, learning, expedition, data, words, growth, combat, notebook, audio, chars] = await Promise.all([
  'duel-engine', 'learning-core', 'expedition-core', 'expedition-data', 'words', 'growth-core',
  'combat-skills', 'notebook-data', 'audio-library-data', 'character-data'
].map(name => import(root + name + '.ts')));
const FAVORITES_PAGE_SIZE=6;
const favoriteBookWords=new Map(BOOKS.flatMap(book=>allBookWords(book.id).map(word=>[word.id,word])));
export class Session {
  constructor(savePath,{drawOnly=false}={}) {
    this.savePath = savePath;
    this.drawOnly = drawOnly;
    this.profile = savePath && existsSync(savePath) ? learning.parseBackup(readFileSync(savePath, 'utf8')) : learning.emptyProfile();
    this.customBookPath=savePath?savePath+'.custom-book.json':null;
    if(this.customBookPath&&existsSync(this.customBookPath)){
      const saved=JSON.parse(readFileSync(this.customBookPath,'utf8'));
      this.customBook={name:saved.name,words:saved.rows.map(([id,word,meaning,example='',translation=''])=>({id,word,meaning,example,translation,pack:CUSTOM_BOOK_ID}))};
    }else this.customBook=getCustomBook(this.profile);
    attachCustomBook(this.profile,this.customBook);
    const available=id=>BOOKS.some(b=>b.id===id)||(id===CUSTOM_BOOK_ID&&hasCustomBook(this.profile));
    this.bookSettings={selected:'cet4',recall:false};
    if(savePath&&existsSync(savePath+'.books.json')){
      const stored=JSON.parse(readFileSync(savePath+'.books.json','utf8'));
      if(available(stored.selected))this.bookSettings={selected:stored.selected,recall:!!stored.recall};
    }
    this.study=new StudyPlanner(savePath?savePath+'.study.json':null);
    if(available(this.study.data.settings.selectedBook))this.bookSettings.selected=this.study.data.settings.selectedBook;
    const migrated=migrateProgression(migrateRecruitment(this.profile,this.study));
    if(migrated!==this.profile)this.save(migrated);
    this.learningRewards={xp:0,coins:0,newWords:0,reviewWords:0};
    this.deployedSupplies=[];
    this.state = null; this.stage = null; this.pool = []; this.index = 0;
    this.attempts = []; this.result = null; this.peak = 0; this.lesson=null;
    this.lastAnswer=null;this.memoryWord='';this.memoryPage=0;this.favoritesPage=0;this.mission=null;
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
    this.profile = attachCustomBook(next,this.customBook);
  }
  get word() { return this.mission?.item(this.index).word??this.pool[this.index % this.pool.length]; }
  get recalling() { return this.mission?this.mission.item(this.index).mode!=='learn':!!this.stage?.recall; }
  get stopped() { return this.paused || (!this.choiceMode && this.stage?.lesson === 'listening' && (!this.heard || this.playing)); }
  get expected() { return this.chanting ? combat.CHARACTER_SKILLS[this.state.avatar].chant : this.stage?.lesson === 'sentence' ? this.word?.example : this.word?.word; }
  get phoneMode(){
    const {mobileAnswerMode,answerMode}=this.study.data.settings;
    return isChoice(mobileAnswerMode)?mobileAnswerMode:answerMode==='choose_word'?'choose_word':'choose_meaning';
  }
  get choiceMode(){return (this.stage?.bookMode||this.stage?.touchChoices)&&isChoice(this.stage.answerMode);}
  choice(){
    if(!this.choiceMode||this.chanting||!this.word)return null;
    const token=this.id+':'+this.index;
    if(this.choiceQuestion?.token!==token){
      const active=this.stage.bookMode?this.stage.pack:this.bookSettings.selected;
      const book=!this.stage.bookMode&&active===CUSTOM_BOOK_ID?'cet4':active;
      this.choiceQuestion=createChoice(this.word,book,this.stage.answerMode,token,undefined,{profile:this.profile,difficulty:this.stage.difficulty});
    }
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
    this.stage = this.phoneLayout?{...stage,lesson:'vocabulary',touchChoices:true,answerMode:this.phoneMode}:stage;
    this.pool = pool; this.index = 0; this.attempts = []; this.result = null; this.peak = 0; this.lesson=null;this.lastAnswer=null;this.mission=null;
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
    requireBook(id,this.profile);
    if(id!==this.bookSettings.selected)
      this.study.configure({selectedBook:id,chapter:0},this.profile);
    this.bookSettings={selected:id,recall:!!recall};
    if(this.savePath){
      mkdirSync(dirname(this.savePath),{recursive:true});
      writeFileSync(this.savePath+'.books.json.tmp',JSON.stringify(this.bookSettings));
      renameSync(this.savePath+'.books.json.tmp',this.savePath+'.books.json');
    }
  }
  saveBookPlan({id,batch,goal,difficulty}){
    requireBook(id,this.profile);
    if(![5,10,15].includes(batch)||![5,10,20,30].includes(goal))throw Error('请选择支持的每轮词数与每日目标。');
    // The study file is authoritative for the saved plan. The book file remains a legacy mirror.
    this.study.configure({selectedBook:id,batch,goal,difficulty,chapter:0,planMode:'daily'},this.profile);
    this.bookSettings={...this.bookSettings,selected:id};
    if(this.savePath){
      writeFileSync(this.savePath+'.books.json.tmp',JSON.stringify(this.bookSettings));
      renameSync(this.savePath+'.books.json.tmp',this.savePath+'.books.json');
    }
  }
  startBook(id,recall=false,keepPlan=false,difficulty=this.study.data.settings.difficulty){
    const book=requireBook(id,this.profile);
    if(!keepPlan)this.selectBook(id,recall);
    this.start('bridge-1');
    this.stage={...this.stage,id:'book:'+id,name:book.name,region:'词书训练',pack:id,bookMode:true,difficulty,recall:!!recall,reward:0,answerMode:this.phoneLayout?this.phoneMode:this.study.data.settings.answerMode??'spelling'};
    this.pool=bookPool(id,this.profile,60,difficulty);
    this.id='wordbook:'+id+':'+randomUUID();
  }
  startStudy(retry=false,planned=null){
    const selected=planned??(retry?{pool:this.pool.filter(w=>this.mission?.summary(this.index).weakWords.some(x=>x.id===w.id)),settings:{source:'session',recall:true},sourceLabel:'本局薄弱词'}:this.study.selection(this.bookSettings.selected,this.profile)),pool=[...selected.pool];
    if(!pool.length)throw Error('当前范围没有可练单词，请调整词汇难度、学习范围或词性。');
    const recall=selected.settings.recall,id=retry?this.stage.pack:this.bookSettings.selected;
    const difficulty=selected.settings.source==='saved'?'all':retry?this.stage.difficulty:selected.settings.difficulty;
    this.startBook(id,recall,selected.settings.source==='saved',difficulty);this.pool=pool;
    this.stage={...this.stage,studyMode:true,name:selected.settings.source==='saved'?selected.sourceLabel:requireBook(id,this.profile).name+' · '+selected.sourceLabel,region:'学习行动'};
    this.id='study:'+id+':'+randomUUID();
    this.mission=new StudyMission(pool,recall,this.stage.answerMode);
    this.lesson={total:this.mission.items.length,completed:0,wave:1,source:selected.settings.source,recall,words:pool.map(w=>w.id)};
  }
  favorites(){
    const ids=this.profile.notebook?.saved??[];
    if(this.favoriteCache?.profile!==this.profile){
      const legacyIds=new Set(ids.filter(id=>!favoriteBookWords.has(id)));
      const legacy=new Map(legacyIds.size?notebook.allStudyWords(this.profile).filter(word=>legacyIds.has(word.id)).map(word=>[word.id,word]):[]);
      const rows=[...ids].reverse().map(id=>favoriteBookWords.get(id)??legacy.get(id)).filter(Boolean);
      this.favoriteCache={profile:this.profile,rows};
    }
    const all=this.favoriteCache.rows,count=all.length,pages=Math.max(1,Math.ceil(count/FAVORITES_PAGE_SIZE));
    const page=Math.min(this.favoritesPage,pages-1);
    return {count,page,pages,rows:all.slice(page*FAVORITES_PAGE_SIZE,(page+1)*FAVORITES_PAGE_SIZE)};
  }
  startBoss({id=this.bookSettings.selected,recall=true,difficulty=this.study.data.settings.difficulty}={}){
    if(!Object.hasOwn(WORD_DIFFICULTIES,difficulty))throw Error('请选择有效的词汇难度。');
    const pool=directorPool(id,this.study,this.profile,undefined,difficulty);
    this.startBook(id,recall,false,difficulty);
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
    // The Toy host can report a mobile container after a mission has already started.
    if(this.phoneLayout&&this.stage&&!this.stage.touchChoices&&!this.state?.outcome){
      this.stage={...this.stage,touchChoices:true,answerMode:this.phoneMode,lesson:'vocabulary'};
      this.chanting=false;
      if(!this.choiceQuestion?.answered)this.choiceQuestion=null;
      if(this.mission&&!this.mission.choice){
        this.mission.choice=true;this.mission.answerMode=this.phoneMode;
      }
    }
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
    if (action === 'custom_book_save') {
      if(this.state&&!this.state.outcome)throw Error('请先完成当前行动，再编辑自定义词书。');
      const book=editCustomBook(this.customBook,p);
      if(this.customBookPath){
        mkdirSync(dirname(this.customBookPath),{recursive:true});
        const saved={name:book.name,rows:book.words.map(w=>w.example||w.translation?
          [w.id,w.word,w.meaning,w.example,w.translation]:[w.id,w.word,w.meaning])};
        writeFileSync(this.customBookPath+'.tmp',JSON.stringify(saved));
        renameSync(this.customBookPath+'.tmp',this.customBookPath);
      }
      this.customBook=book;
      const previous=this.profile.notebook??notebook.emptyNotebook();
      this.save({...this.profile,notebook:{...previous,customBookLocal:true}});
    }
    if (action === 'start_book') {
      const id=p.id??this.bookSettings.selected;
      if(!wordsAtDifficulty(id,this.profile,this.study.data.settings.difficulty).length)throw Error('当前难度没有词条，请调整筛选。');
      this.startBook(id,!!p.recall);
    }
    if (action === 'study_settings') this.study.configure(p,this.profile);
    if (action === 'study_start') this.startStudy(false,p.includeStudied?
      this.study.selection(this.bookSettings.selected,this.profile,{source:'all',pos:'all',chapter:0}):null);
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
    if (action === 'favorites_page') this.favoritesPage=Math.max(0,Math.floor(Number(p.page)||0));
    if (action === 'favorite_review') {
      if(this.state&&!this.state.outcome)throw Error('请先完成当前行动，再开始收藏复习。');
      const {rows}=this.favorites();
      if(!rows.length)throw Error('还没有可复习的收藏单词。');
      this.startStudy(false,{pool:rows,settings:{source:'saved',recall:true},sourceLabel:'收藏单词复习'});
    }
    if (action === 'check_in') {
      if(this.state&&!this.state.outcome)throw Error('请先完成当前行动，再完成今日打卡。');
      this.study.checkIn();
    }
    if (action==='tick' && this.state?.outcome && this.choiceMode && this.choiceQuestion?.answered && !this.paused){
      this.cooldown=Math.max(0,this.cooldown-Math.max(0,Math.min(Number(p.delta)||0,500)));
    }else if (action === 'tick' && this.state && !this.state.outcome) {
      const dt = Math.max(0,Math.min(Number(p.delta)||0,500));
      const choiceRecap=this.choiceMode&&this.choice()?.answered&&!this.chanting;
      const recap=(this.stage?.studyMode||choiceRecap)&&this.cooldownKind==='word'&&this.cooldown>0;
      if (!this.stopped) this.state = this.stage.bossMode
        ? advanceDirector(this.state,dt)
        : duel.advanceDuel(this.state,recap?Math.max(0,dt-this.cooldown):dt);
      const pauseFeedback=choiceRecap?this.paused:(this.stage?.studyMode||this.stage?.bossMode)&&this.stopped;
      if (this.cooldown > 0 && !pauseFeedback) {
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
      if(choiceAnswer){this.cooldown=success?350:700;this.cooldownKind='word';}
    }
    if (action === 'pause') this.paused = !!p.value;
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
      if(this.stage.touchChoices){
        const before=this.state;
        this.state=duel.castUltimate(before,combat.CHARACTER_SKILLS[before.avatar].chant);
        if(this.stage.bossMode)this.state=directorCast(before,this.state,true);
        this.peak=Math.max(this.peak,this.state.combo);
      }else{
        this.chanting=!this.chanting; this.state=duel.prepareSpell(this.state,null);
      }
    }
    if (action === 'companion') {
      const spirit=words.SPIRITS.find(s=>s.id===p.id);
      if (!spirit || learning.profileStats(this.profile).battles<spirit.threshold) throw Error('完成更多战斗后解锁。');
      this.save({...this.profile,companion:p.id});
    }
    if (action === 'avatar') {
      if (!chars.ALL_OPERATOR_IDS.includes(p.id)) throw Error('无效角色。');
      if(!isUnlocked(this.profile,p.id))throw Error('这位干员尚未解锁。');
      this.save({...this.profile,avatar:p.id});
    }
    if(action==='claim_levels')this.save(claimLevels(this.profile),'学习升级奖励');
    if(action==='supply_enabled')this.save(setSupplyEnabled(this.profile,p.id,p.enabled));
    if(action==='recruit_draw'){
      const next=drawRecruit(this.profile,p.expectedSerial,Math.random,this.drawOnly);
      if(next!==this.profile){
        const draw=next.growth.recruitment.gacha.lastDraw;
        this.save(next,draw.isNew?'招募新干员':draw.version===2?'招募返币':'招募重复干员 · 已返还哈弗币');
      }
    }
    if(action==='unlock_avatar'){
      if(this.drawOnly)throw Error('请前往干员招募进行抽卡。');
      this.save(recruit(this.profile,p.id),'永久招募干员');
    }
    if(action==='buy_supply')this.save(buySupply(this.profile,p.id),'购买'+(p.id==='armor'?'防护补给':'战术电池'));
    if (action === 'upgrade') {
      if(p.kind==='hero'&&!isUnlocked(this.profile,p.id))throw Error('请先解锁这位干员。');
      try{this.save(growth.upgradeBond(this.profile,p.kind,p.id),p.kind==='hero'?'干员进阶':'支援进阶');}
      catch(error){throw Error(error.message.replaceAll('星砂','哈弗币'));}
    }
    if (action === 'rune') this.save(expedition.improveRune(this.profile,p.id),'装备进阶');
    if (action === 'equip_rune') this.save(expedition.equipRune(this.profile,p.id));
    if (action === 'claim') this.save(expedition.claimCommission(this.profile,p.id),'行动委托奖励');
    if (action === 'bookmark') {
      const book=this.profile.notebook??notebook.emptyNotebook(), id=p.id??this.word?.id;
      const exists=book.saved.includes(id);
      if(id&&(id===this.word?.id||(exists&&p.saved===false))){
        const keep=p.saved??!exists;
        if(keep&&!exists&&book.saved.length>=1000)throw Error('已收藏 1000 个单词，请先移除部分收藏。');
        if(keep!==exists){
          const definition=keep&&this.word?.pack===CUSTOM_BOOK_ID&&!book.custom.some(w=>w.id===id)?this.word:null;
          const removeDefinition=!keep&&book.customBookLocal&&id.startsWith('custom:term-')&&!Object.hasOwn(book.notes,id);
          const custom=definition?[...book.custom,definition]:removeDefinition?book.custom.filter(w=>w.id!==id):book.custom;
          this.save({...this.profile,notebook:{...book,custom,
            saved:keep?[...book.saved,id]:book.saved.filter(wordId=>wordId!==id)}});
        }
      }
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
    // Commit the last word immediately, then keep its feedback on screen for the same short interval.
    const finalFeedback=!!s?.outcome&&this.choiceMode&&this.choiceQuestion?.answered&&this.cooldownKind==='word'&&this.cooldown>0;
    return {...derived,profile:this.profile,state:finalFeedback?{...s,outcome:null}:s,stage:this.stage?{...this.stage,recall:this.recalling}:null,word:this.word??null,
      learningRewards:this.learningRewards,bookSettings:this.bookSettings,deployedSupplies:this.deployedSupplies,
      study:this.study.summary(this.bookSettings.selected,this.profile),lesson:this.lesson,learningMission:this.mission?.summary(this.index)??null,
      memory:this.study.memorySummary(this.bookSettings.selected,this.profile,this.memoryWord,this.memoryPage),lastAnswer:this.lastAnswer,
      ...(this.drawOnly?{favorites:this.favorites(),wordSaved:(this.profile.notebook?.saved??[]).includes(this.word?.id)}:{}),
      boss:this.stage?.bossMode?directorSnapshot(s,this.attempts):null,
      answerFeedback:!!((this.stage?.studyMode||this.stage?.bossMode)&&this.cooldownKind==='word'&&this.cooldown>0&&this.lastAnswer?.correct&&!this.chanting),
      choice:publicChoice(this.choice()),
      prompt:this.chanting||this.hinted||(this.stage?.lesson!=='listening'&&!this.recalling)?this.expected??'':this.stage?.lesson==='sentence'?this.word?.translation:this.stage?.lesson==='listening'?'听音后拼写':this.word?.meaning,
      index:this.index, chanting:this.chanting, hinted:this.hinted, heard:this.heard, playing:this.playing, paused:this.paused, stopped:this.stopped, cooldown:this.cooldown,
      attempts:this.attempts, peak:this.peak, result:finalFeedback?null:this.result, intent:s?(this.stage?.bossMode?directorIntent(s):duel.enemyIntent(s)):null,
      audio:this.word?(this.stage?.pack==='human'?audio.humanClip(this.word.word)?.file:`/audio/${this.stage?.lesson==='sentence'?'sentence':'word'}-${this.word.id}.wav`):null,
      collection:this.collectionSnapshot()};
  }
  profileSnapshot(){
    const revision=this.study.revision,epoch=Math.floor(this.study.now().getTime()/60000);
    if(this.profileCache?.profile===this.profile&&this.profileCache.revision===revision&&this.profileCache.epoch===epoch)return this.profileCache.value;
    const stats=learning.profileStats(this.profile);
    const level=learningLevel(this.profile.xp);
    Object.assign(stats,{level:level.level,levelProgress:level.progress,levelRequired:level.required});
    const recruitment=recruitmentSummary(this.profile,this.drawOnly);
    const value={stats,progression:progressionSummary(this.profile),recruitment,books:bookCatalog(this.profile,this.study),customBook:customBookEditor(this.profile),
      stages:data.EXPEDITION.map(x=>({...x,unlocked:expedition.stageUnlocked(this.profile,x.id),stars:this.profile.expedition?.clears[x.id]?.stars??0})),
      spirits:words.SPIRITS.map(x=>({...x,unlocked:stats.battles>=x.threshold,bond:growth.spiritBond(this.profile,x.id),skill:combat.SPIRIT_SKILLS[x.id]})),
      avatars:chars.ALL_OPERATOR_IDS.filter(id=>this.drawOnly||id!=='wildfire'||isUnlocked(this.profile,id)).map(id=>({id,...chars.CHARACTERS[id],...combat.CHARACTER_SKILLS[id],bond:growth.heroBond(this.profile,id)})),
      runes:Object.entries(data.RUNES).map(([id,r])=>({id,...r,rank:this.profile.expedition?.runes[id]??0})),
      commissions:expedition.COMMISSIONS.map(c=>({id:c.id,name:c.name,detail:c.detail,reward:c.reward,progress:c.progress(this.profile),target:c.target,claimed:this.profile.expedition?.claims.includes(c.id)??false}))};
    this.profileCache={profile:this.profile,revision,epoch,value};return value;
  }
  collectionSnapshot(){
    const epoch=Math.floor(this.study.now().getTime()/1000),revision=this.study.revision;
    if(this.collectionCache?.profile===this.profile&&this.collectionCache.epoch===epoch&&this.collectionCache.revision===revision)return this.collectionCache.value;
    const saved=new Set(this.profile.notebook?.saved??[]);
    const seen=w=>this.profile.words[w.id]||this.study.data.cards[w.id]||saved.has(w.id);
    const wordsById=new Map([...notebook.allStudyWords(this.profile),...activeCustomWords(this.profile)]
      .filter(seen).map(w=>[w.id,w]));
    const value=[...wordsById.values()].map(w=>{
        const memory=this.study.wordStatus(w,this.profile);
        return {...w,attempts:0,correct:0,streak:0,...this.profile.words[w.id],memoryStatus:memory.status,reviewIn:memory.reviewIn,needsReview:!memory.stable};
      });
    this.collectionCache={profile:this.profile,epoch,revision,value};return value;
  }
}
