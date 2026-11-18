import {allBookWords} from './wordbooks.mjs';

export const DIRECTOR_RULES=Object.freeze({name:'英语总监',words:100,hp:5000,armorPerWord:50,feedbackMs:650,staggerMs:800,chargeMs:1500});
export function directorPool(book,study,profile,rng=Math.random){
  const now=study.now().getTime(),seen=new Set();
  const rank=w=>study.data.evidence[w.id]?.unresolved?0:
    study.data.cards[w.id]&&new Date(study.data.cards[w.id].due).getTime()<=now?1:
    profile.words[w.id]&&new Date(profile.words[w.id].due).getTime()<=now?1:2;
  const pool=allBookWords(book).filter(w=>{
    const spelling=w.word.trim().toLowerCase();
    if(!spelling||seen.has(spelling))return false;
    seen.add(spelling);return true;
  }).sort((a,b)=>rank(a)-rank(b)||a.frequency-b.frequency||a.word.localeCompare(b.word)).slice(0,DIRECTOR_RULES.words);
  if(pool.length!==DIRECTOR_RULES.words)throw Error('当前词书不足 100 个不同单词。');
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool;
}
export function directorIntent(state){
  const phase=state.normalHits>=80?3:state.normalHits>=50?2:1;
  return {phase,damage:[9,12,15][phase-1],drain:0,interval:[4500,3800,3200][phase-1],
    name:['点名射击','火力追问','终极抽查'][phase-1],counter:'正确提交完整单词可打断攻击；错拼不打断。'};
}
export function createDirector(base){
  return {...base,botHp:DIRECTOR_RULES.hp,enemyMaxHp:DIRECTOR_RULES.hp,nextBotAt:4500,ultimateSeal:false,
    encounter:{...base.encounter,monster:'director',hp:DIRECTOR_RULES.hp,elite:true},
    director:{interrupts:0,lastInterruptAt:-10000,lastAttackAt:-10000,staggerUntil:0,suppression:0}};
}
export function directorCast(before,after,ultimate=false){
  if(after.hits===before.hits)return after;
  const interval=directorIntent(after).interval;
  // One word breaks one 50-HP plate. Offensive skill power becomes extra suppression.
  // Ultimates retain their heal/shield/energy effects but cannot skip the 100-word test.
  const bonus=ultimate?Math.min(3000,1500+(after.last?.damage??0)*20):Math.min(900,Math.max(0,(after.last?.damage??0)-12)*25);
  const damage=ultimate?0:DIRECTOR_RULES.armorPerWord;
  const hp=ultimate?before.botHp:Math.max(0,DIRECTOR_RULES.hp-after.normalHits*DIRECTOR_RULES.armorPerWord);
  const stagger=DIRECTOR_RULES.staggerMs+bonus;
  return {...after,botHp:hp,dealt:before.dealt+damage,outcome:hp===0?'victory':null,
    nextBotAt:Math.max(after.nextBotAt,before.elapsed+stagger+interval),
    director:{...before.director,interrupts:before.director.interrupts+1,lastInterruptAt:before.elapsed,staggerUntil:before.elapsed+stagger,suppression:stagger},
    last:{...after.last,damage,warded:false,skill:ultimate?'大招压制':after.last?.skill}};
}
export function advanceDirector(state,delta){
  if(state.outcome||!Number.isFinite(delta)||delta<=0)return state;
  let next={...state,elapsed:state.elapsed+delta};
  while(next.elapsed>=next.nextBotAt&&!next.outcome){
    const intent=directorIntent(next),absorbed=Math.min(next.shield,intent.damage),damage=Math.min(next.playerHp,intent.damage-absorbed);
    const burnDelay=next.burnTicks>0?500:0;
    const firedAt=next.nextBotAt;
    next={...next,playerHp:next.playerHp-damage,shield:next.shield-absorbed,botAttacks:next.botAttacks+1,
      burnTicks:Math.max(0,next.burnTicks-1),nextBotAt:firedAt+intent.interval+burnDelay,
      director:{...next.director,lastAttackAt:firedAt},
      last:{actor:'bot',damage,absorbed,burst:false,skill:intent.name,id:(next.last?.id??0)+1}};
    if(next.playerHp===0)next.outcome='defeat';
  }
  return next;
}
export function directorSnapshot(state,attempts=[]){
  const intent=directorIntent(state),remaining=Math.max(0,state.nextBotAt-state.elapsed);
  const interrupted=state.elapsed-state.director.lastInterruptAt<650;
  const firing=state.elapsed-state.director.lastAttackAt<500;
  const action=state.outcome==='victory'?'defeat':state.outcome==='defeat'?'taunt':interrupted?'hurt':firing?'shoot':remaining<=DIRECTOR_RULES.chargeMs?'charge':'idle';
  const origin=action==='hurt'?state.director.lastInterruptAt:action==='shoot'?state.director.lastAttackAt:action==='charge'?state.nextBotAt-DIRECTOR_RULES.chargeMs:0;
  return {...DIRECTOR_RULES,...intent,name:DIRECTOR_RULES.name,attackName:intent.name,completed:state.normalHits,remaining:100-state.normalHits,
    independent:new Set(attempts.filter(a=>a.correct&&!a.hinted).map(a=>a.id)).size,
    needsReview:new Set(attempts.filter(a=>!a.correct||a.hinted).map(a=>a.id)).size,
    interrupts:state.director.interrupts,attackIn:remaining,action,actionTime:Math.max(0,(state.elapsed-origin)/1000),
    staggered:state.elapsed<state.director.staggerUntil,suppression:state.director.suppression};
}
