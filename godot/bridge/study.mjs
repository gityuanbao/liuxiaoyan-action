import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {fsrs,createEmptyCard,Rating} from '../vendor/ts-fsrs/index.mjs';
import {allBookWords,requireBook} from './wordbooks.mjs';
import {ANSWER_MODES,isChoice} from './choice-questions.mjs';

const scheduler=fsrs({enable_fuzz:false,enable_short_term:true,request_retention:0.9,maximum_interval:365});
const DAY=86400000;
export const reviewDelay=(due,now)=>{
  const minutes=Math.ceil((new Date(due)-now)/60000);
  return minutes<=0?'现在复习':minutes<60?`${minutes} 分钟后`:minutes<1440?`${Math.ceil(minutes/60)} 小时后`:`${Math.ceil(minutes/1440)} 天后`;
};
const retention=(card,now)=>card?.stability>0&&card.last_review?scheduler.forgetting_curve(Math.max(0,(now-new Date(card.last_review))/DAY),card.stability):null;
export const SOURCES={new:'未学新词',due:'到期复习',wrong:'错词巩固',saved:'我的收藏',all:'全部词汇'};
export const localDay=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const validPos=new Set(['all','noun','verb','adjective']);
const matchesPos=(w,pos)=>pos==='all'||({noun:/(^|[\s;；])n\./i,verb:/(^|[\s;；])v[ti]?\./i,adjective:/(^|[\s;；])(?:a|adj)\./i}[pos]?.test(w.meaning));
const cleanCard=card=>({...card,due:new Date(card.due),...(card.last_review?{last_review:new Date(card.last_review)}:{})});

export class StudyPlanner {
  constructor(path=null,now=()=>new Date()){
    this.path=path;this.now=now;this.cache=null;this.memoryCache=null;this.dailyCache=null;
    this.revision=0;this.selectionCache=new Map();this.selectionEpoch='';this.selectionProfile=null;
    this.data={version:1,settings:{source:'new',pos:'all',chapter:0,batch:10,goal:20,recall:false,planMode:'daily',answerMode:'spelling'},cards:{},days:{},evidence:{}};
    if(path&&existsSync(path)){
      const stored=JSON.parse(readFileSync(path,'utf8'));
      if(stored.version!==1||!stored.cards||!stored.days)throw Error('学习计划文件无法识别，请保留备份后检查。');
      this.data={...this.data,...stored,settings:{...this.data.settings,...stored.settings}};
    }
  }
  save(){
    this.revision++;this.selectionCache.clear();
    this.cache=null;this.memoryCache=null;this.dailyCache=null;
    if(!this.path)return;
    mkdirSync(dirname(this.path),{recursive:true});
    writeFileSync(this.path+'.tmp',JSON.stringify(this.data));renameSync(this.path+'.tmp',this.path);
  }
  configure(p){
    const s={...this.data.settings};
    if(p.answerMode!==undefined){if(!Object.hasOwn(ANSWER_MODES,p.answerMode))throw Error('请选择拼写、选词义或选单词。');s.answerMode=p.answerMode;}
    if(p.mobileAnswerMode!==undefined){
      if(!['choose_meaning','choose_word'].includes(p.mobileAnswerMode))throw Error('请选择看词选意或看意选词。');
      s.mobileAnswerMode=p.mobileAnswerMode;
    }
    if(p.planMode!==undefined){if(!['daily','custom'].includes(p.planMode))throw Error('请选择今日计划或自主练习。');s.planMode=p.planMode;}
    if(p.selectedBook!==undefined){requireBook(p.selectedBook);s.selectedBook=p.selectedBook;}
    if(p.source!==undefined){if(!Object.hasOwn(SOURCES,p.source))throw Error('未知学习范围。');s.source=p.source;s.chapter=0;}
    if(p.pos!==undefined){if(!validPos.has(p.pos))throw Error('未知词性。');s.pos=p.pos;s.chapter=0;}
    if(p.chapter!==undefined)s.chapter=Math.max(0,Math.floor(Number(p.chapter)||0));
    for(const key of ['batch','goal'])if(p[key]!==undefined){
      if(!(key==='batch'?[5,10,15]:[5,10,20,30]).includes(p[key]))throw Error('请选择支持的学习数量。');s[key]=p[key];
    }
    if(p.recall!==undefined)s.recall=!!p.recall;
    this.data.settings=s;this.save();
  }
  day(date=this.now()){
    const key=localDay(date);
    return this.data.days[key]??{words:[],attempts:0,correct:0,checked:false,goal:this.data.settings.goal};
  }
  dayStatus(){
    const now=this.now(),today=localDay(now),d=this.day(now),goal=d.checked?d.goal:this.data.settings.goal;
    let streak=0,cursor=new Date(now);
    if(!d.checked)cursor.setDate(cursor.getDate()-1);
    for(let i=0;i<5000;i++){
      if(!this.data.days[localDay(cursor)]?.checked)break;
      streak++;cursor.setDate(cursor.getDate()-1);
    }
    const week=[];
    for(let i=6;i>=0;i--){const date=new Date(now);date.setDate(date.getDate()-i);const key=localDay(date);week.push({date:key,count:this.data.days[key]?.words.length??0,checked:!!this.data.days[key]?.checked});}
    return {date:today,count:d.words.length,practiceRecallCount:d.practiceRecalled?.length??0,recallCount:d.recalled?.length??0,reviewCount:d.reviewed?.length??0,goal,checked:d.checked,ready:d.words.length>=goal,streak,totalDays:Object.values(this.data.days).filter(x=>x.checked).length,accuracy:d.attempts?Math.round(d.correct/d.attempts*100):0,week};
  }
  checkIn(){
    const status=this.dayStatus();if(status.checked)return status;
    if(!status.ready)throw Error(`今天还需完成 ${status.goal-status.count} 个不同单词。`);
    const key=localDay(this.now());this.data.days[key]={...this.day(),checked:true,goal:status.goal};this.save();return this.dayStatus();
  }
  record(word,correct,assisted,context={}){
    const now=this.now(),key=localDay(now),d=this.day(now);
    d.attempts++;if(correct){d.correct++;if(!d.words.includes(word.id))d.words.push(word.id);}
    this.data.days[key]=d;
    const previous=this.data.cards[word.id];
    const evidence=this.data.evidence[word.id]??{independent:0,spaced:0,recallDays:[],history:[],unresolved:false};
    const sameAttempt=!!context.attempt&&evidence.attempt===context.attempt;
    const elapsed=previous?now-new Date(previous.last_review):Infinity;
    const due=!previous||new Date(previous.due)<=now;
    const choice=isChoice(context.answerMode),recognized=choice&&correct&&!assisted;
    const independent=correct&&!assisted&&!choice;
    if(independent){d.practiceRecalled??=[];if(!d.practiceRecalled.includes(word.id))d.practiceRecalled.push(word.id);}
    const rating=!correct||(assisted&&context.recall)?Rating.Again:choice||assisted?Rating.Hard:Rating.Good;
    // Copying cannot postpone a mature card; rapid corrections/retries are one review.
    const accepted=!sameAttempt&&(!previous||(rating===Rating.Again&&(previous.lastRating!==Rating.Again||elapsed>=60000))||((independent||recognized)&&due&&elapsed>=60000));
    if(accepted){
      const card=previous?cleanCard(previous):createEmptyCard(now);
      const next=scheduler.repeat(card,now)[rating].card;
      this.data.cards[word.id]={...next,lastRating:rating,word:word.word};
      evidence.history.push({at:now.toISOString(),rating,independent,before:retention(previous,now),due:next.due});
      evidence.history=evidence.history.slice(-64);
      if(recognized){evidence.recognized=(evidence.recognized??0)+1;evidence.lastRecognition=now.toISOString();}
      if(independent){
        evidence.independent++;
        if(previous){evidence.spaced++;d.reviewed??=[];if(!d.reviewed.includes(word.id))d.reviewed.push(word.id);}
        if(!evidence.recallDays.includes(key))evidence.recallDays.push(key);
        evidence.unresolved=false;
        d.recalled??=[];if(!d.recalled.includes(word.id))d.recalled.push(word.id);
      }
    }
    if(!correct||(assisted&&context.recall))evidence.unresolved=true;
    if(context.attempt)evidence.attempt=context.attempt;
    this.data.evidence[word.id]=evidence;
    this.save();
    const card=this.data.cards[word.id];
    return {wordId:word.id,word:word.word,meaning:word.meaning,phonetic:word.phonetic??'',correct,independent,recognized,accepted,
      kind:!correct?'wrong':recognized?'recognition':context.corrected?'corrected':independent?'recall':context.recall?'hinted':'copy',due:card.due,reviewIn:reviewDelay(card.due,now),
      message:choice?(correct?'辨认正确；还可用拼写检验记忆。':'看清正确答案，稍后再练这个词。'):!correct?'校对拼写后再试；稍后还会安排回忆。':!independent?'拼写正确；还需遮住答案独立回忆。':accepted?'独立回忆成功，复习时间已更新。':'本次拼写正确；原复习时间保留。'};
  }
  selection(book,profile,overrides={}){
    requireBook(book);const now=this.now(),s={...this.data.settings,...overrides};
    const epoch=Math.floor(now.getTime()/1000);
    if(this.selectionEpoch!==epoch||this.selectionProfile!==profile){this.selectionCache.clear();this.selectionEpoch=epoch;this.selectionProfile=profile;}
    const key=JSON.stringify([book,s]);
    if(this.selectionCache.has(key))return this.selectionCache.get(key);
    const saved=new Set(profile.notebook?.saved??[]),cards=this.data.cards;
    const base=allBookWords(book).filter(w=>matchesPos(w,s.pos));
    const seen=w=>!!cards[w.id]||!!profile.words[w.id];
    const due=w=>seen(w)&&new Date(cards[w.id]?.due??profile.words[w.id]?.due??0).getTime()<=now.getTime();
    const wrong=w=>this.data.evidence[w.id]?.unresolved||cards[w.id]?.lastRating===Rating.Again||(!cards[w.id]&&(profile.words[w.id]?.attempts??0)>(profile.words[w.id]?.correct??0)&&(profile.words[w.id]?.streak??0)<3);
    const rules={new:w=>!seen(w),due,wrong,saved:w=>saved.has(w.id),all:()=>true};
    const counts=Object.fromEntries(Object.entries(rules).map(([k,fn])=>[k,base.filter(fn).length]));
    const rows=base.filter(rules[s.source]).sort((a,b)=>s.source==='due'?(new Date(cards[a.id]?.due??profile.words[a.id]?.due??0)-new Date(cards[b.id]?.due??profile.words[b.id]?.due??0))||a.frequency-b.frequency:a.frequency-b.frequency||a.word.localeCompare(b.word));
    const chapters=Math.max(1,Math.ceil(rows.length/100)),chapter=Math.min(s.chapter,chapters-1);
    const range=rows.slice(chapter*100,chapter*100+100),pool=range.slice(0,s.batch);
    const recallRequired=['due','wrong'].includes(s.source);
    const value={settings:{...s,chapter,recall:recallRequired||s.recall},recallRequired,counts,chapters,available:rows.length,rangeCount:range.length,pool,preview:pool.map(w=>({id:w.id,word:w.word,meaning:w.meaning,phonetic:w.phonetic??''})),sourceLabel:SOURCES[s.source]};
    if(this.selectionCache.size>=24)this.selectionCache.clear();
    this.selectionCache.set(key,value);return value;
  }
  dailySelection(book,profile){
    const key=JSON.stringify([book,this.data.settings,Math.floor(this.now().getTime()/1000)]);
    if(this.dailyCache?.key===key&&this.dailyCache.profile===profile)return this.dailyCache.value;
    const today=this.dayStatus(),remaining=Math.max(0,today.goal-today.count);
    const due=this.selection(book,profile,{source:'due',pos:'all',chapter:0,recall:true});
    const fresh=this.selection(book,profile,{source:'new',pos:'all',chapter:0,recall:false});
    let action='done',pool=[],recall=false,title='今日计划已完成',detail='当前没有到期词。下次到期再来复习，也可以进入自主练习。';
    if(today.ready&&!today.checked){action='checkin';title='完成今日打卡';detail='今日总目标已达到。打卡后，仍可继续复习到期词。';}
    else if(due.available){action='review';pool=due.pool;recall=true;title='先复习到期词';detail='按到期时间从早到晚安排；根据中文独立拼写，提示后会穿插复测。';}
    else if(remaining&&fresh.available){action='learn';pool=fresh.pool.slice(0,remaining);title='学习一组新词';detail='先看词义、听读音并拼写，再遮住英文回忆同一组单词。';}
    else if(remaining){action='empty';title='本书暂无未学新词';detail='当前也没有到期词。可以换一本词书，或进入自主练习巩固已学内容。';}
    if(isChoice(this.data.settings.answerMode)&&pool.length)detail='四选一辨认词义，答后查看解析；错题会穿插重练，辨认不计入独立拼写掌握。';
    const value={action,title,detail,book,remaining,due:due.available,newAvailable:fresh.available,recall,pool,
      preview:pool.map(({id,word,meaning,phonetic=''})=>({id,word,meaning,phonetic})),
      count:pool.length,steps:pool.length*(recall||isChoice(this.data.settings.answerMode)?1:2),settings:{source:recall?'due':'new',recall,answerMode:this.data.settings.answerMode},sourceLabel:recall?'今日到期复习':'今日新词'};
    this.dailyCache={key,profile,value};return value;
  }
  summary(book,profile){const {pool,...value}=this.selection(book,profile);const {pool:dailyPool,...daily}=this.dailySelection(book,profile);return {...value,daily,today:this.dayStatus(),scheduler:'FSRS 6 / ts-fsrs 5.2.3'};}
  wordStatus(w,profile,now=this.now()){
    const card=this.data.cards[w.id],e=this.data.evidence[w.id],due=card?.due??profile.words[w.id]?.due??0;
    const stable=(e?.recallDays.length??0)>=3&&(card?.scheduled_days??0)>=7&&card?.lastRating===Rating.Good&&!e?.unresolved&&new Date(due)>now;
    const date=new Date(due),dueAt=card?`${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`:'待安排';
    return {id:w.id,word:w.word,meaning:w.meaning,phonetic:w.phonetic??'',due,dueAt,reviewIn:reviewDelay(due,now),overdue:new Date(due)<=now,stable,
      status:e?.unresolved?'需重学':stable?'较稳定':(e?.independent??0)>0?'巩固中':'待独立回忆'};
  }
  memorySummary(book,profile,selectedId='',page=0){
    const now=this.now(),key=JSON.stringify([book,selectedId,page,Math.floor(now.getTime()/1000)]);
    if(this.memoryCache?.key===key&&this.memoryCache.profile===profile)return this.memoryCache.value;
    const rows=allBookWords(book).filter(w=>this.data.cards[w.id]||profile.words[w.id]).map(w=>this.wordStatus(w,profile,now)).sort((a,b)=>new Date(a.due)-new Date(b.due)||a.word.localeCompare(b.word));
    const selected=rows.find(w=>w.id===selectedId)??rows[0]??null;
    const pages=Math.max(1,Math.ceil(rows.length/6));page=Math.max(0,Math.min(page,pages-1));
    const forecast=[];
    for(let i=0;i<7;i++){
      const day=new Date(now);day.setDate(day.getDate()+i);const date=localDay(day);
      forecast.push({date,count:rows.filter(w=>i===0?new Date(w.due)<=new Date(day.getFullYear(),day.getMonth(),day.getDate(),23,59,59,999):localDay(new Date(w.due))===date).length});
    }
    let detail=null;
    if(selected){
      const card=this.data.cards[selected.id],e=this.data.evidence[selected.id];
      const elapsed=card?.last_review?Math.max(0,(now-new Date(card.last_review))/DAY):0;
      const horizon=Math.min(3650,Math.max(7,Math.ceil(elapsed+1),Math.ceil((card?.scheduled_days??0)*1.3)));
      detail={...selected,independent:e?.independent??0,spaced:e?.spaced??0,recallDays:e?.recallDays.length??0,
        lastReview:card?.last_review??null,retention:(e?.independent??0)>0?retention(card,now):null,elapsed,horizon,
        curve:card?.stability>0&&(e?.independent??0)>0?Array.from({length:41},(_,i)=>({day:horizon*i/40,r:scheduler.forgetting_curve(horizon*i/40,card.stability)})):[],history:e?.history.slice(-4)??[]};
    }
    const value={book:requireBook(book).name,seen:rows.length,due:rows.filter(w=>w.overdue).length,stable:rows.filter(w=>w.stable).length,
      needsRecall:rows.filter(w=>w.status==='待独立回忆').length,rows:rows.slice(page*6,page*6+6),page,pages,forecast,detail,targetRetention:0.9};
    this.memoryCache={key,profile,value};return value;
  }
}
