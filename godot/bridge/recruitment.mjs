// The existing growth wallet remains the single source of spendable coins.
import {learningLevel} from './progression.mjs';
export const RECRUITS=Object.freeze({mage:0,knight:60,ranger:180,bard:240,scholar:300,alchemist:360});
export const LEARNING_REWARDS=Object.freeze({new:{xp:12,coins:6},review:{xp:8,coins:4}});
export const SUPPLIES=Object.freeze({armor:{cost:36,max:3,shield:16,energy:0,name:'防护补给'},battery:{cost:48,max:3,shield:0,energy:20,name:'战术电池'}});
const emptySupplies=()=>({armor:0,battery:0});
const keyOf=word=>String(word).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const dayOf=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function migrateRecruitment(profile,study){
  if(profile.growth?.recruitment){
    const r=profile.growth.recruitment;
    if(r.version!==1||!Array.isArray(r.unlocked)||!r.unlocked.includes('mage')||r.unlocked.some(id=>!Object.hasOwn(RECRUITS,id))||!r.words||typeof r.words!=='object'||Array.isArray(r.words))throw Error('干员解锁存档无法识别，请保留原存档。');
    if(r.supplies===undefined)return {...profile,growth:{...profile.growth,recruitment:{...r,supplies:emptySupplies()}}};
    if(!r.supplies||typeof r.supplies!=='object'||Array.isArray(r.supplies)||Object.entries(r.supplies).some(([id,count])=>!Object.hasOwn(SUPPLIES,id)||!Number.isSafeInteger(count)||count<0||count>SUPPLIES[id].max))throw Error('补给存档无法识别，请保留原存档。');
    return profile;
  }
  const g=profile.growth??{coins:0,earned:0,spent:0,settled:profile.records.map(r=>r.id),heroes:{},spirits:{}};
  const unlocked=new Set(['mage']);
  for(const id of [profile.avatar,...profile.records.map(r=>r.avatar),...Object.keys(g.heroes).filter(id=>g.heroes[id].xp>0||g.heroes[id].rank>1)])if(Object.hasOwn(RECRUITS,id))unlocked.add(id);
  const words={};
  for(const [id,e] of Object.entries(study.data.evidence))if(e.independent>0&&study.data.cards[id]?.word)words[keyOf(study.data.cards[id].word)]={first:true,lastDay:'',xp:0,coins:0};
  return {...profile,growth:{...g,recruitment:{version:1,unlocked:[...unlocked],words,supplies:emptySupplies()}}};
}

export function isUnlocked(profile,id){return !!profile.growth?.recruitment?.unlocked.includes(id);}
export function recruit(profile,id){
  if(!Object.hasOwn(RECRUITS,id))throw Error('无效干员。');
  if(isUnlocked(profile,id))return profile;
  const g=profile.growth,cost=RECRUITS[id];
  if(g.coins<cost)throw Error(`哈弗币不足，还差 ${cost-g.coins} 哈弗币。独立回忆单词可以获得哈弗币。`);
  return {...profile,avatar:id,growth:{...g,coins:g.coins-cost,spent:g.spent+cost,recruitment:{...g.recruitment,unlocked:[...g.recruitment.unlocked,id]}}};
}

export function buySupply(profile,id){
  if(!Object.hasOwn(SUPPLIES,id))throw Error('未知补给。');
  const item=SUPPLIES[id];
  const g=profile.growth,owned=g.recruitment.supplies?.[id]??0;
  if(owned>=item.max)throw Error('这类补给最多储备 3 份。');
  if(g.coins<item.cost)throw Error(`哈弗币不足，还差 ${item.cost-g.coins} 哈弗币。`);
  return {...profile,growth:{...g,coins:g.coins-item.cost,spent:g.spent+item.cost,
    recruitment:{...g.recruitment,supplies:{...g.recruitment.supplies,[id]:owned+1}}}};
}

export function deploySupplies(profile,state){
  const inventory=profile.growth.recruitment.supplies??emptySupplies();
  const used=Object.keys(SUPPLIES).filter(id=>inventory[id]>0&&profile.growth.progression?.autoSupply?.[id]!==false);
  if(!used.length)return {profile,state,used};
  const supplies={...inventory};let shield=state.shield,energy=state.energy;
  for(const id of used){supplies[id]--;shield+=SUPPLIES[id].shield;energy+=SUPPLIES[id].energy;}
  return {profile:{...profile,growth:{...profile.growth,recruitment:{...profile.growth.recruitment,supplies}}},
    state:{...state,shield:Math.min(40,shield),energy:Math.min(100,energy)},used};
}

export function awardRecall(profile,word,answer,date=new Date(),avatar=profile.avatar??'mage'){
  const no=reason=>({profile,reward:{xp:0,coins:0,kind:'none',reason}});
  if(!answer.correct)return no('答对并独立回忆后领取');
  if(!answer.independent)return no('遮住答案独立回忆后领取');
  const g=profile.growth,r=g.recruitment,key=keyOf(word.word),old=r.words[key],day=dayOf(date);
  if(old?.lastDay&&day<=old.lastDay)return no('这个词今日已领过奖励');
  if(old?.first&&!answer.accepted)return no('按到期排期复习再领取');
  const kind=old?.first?'review':'new',base=LEARNING_REWARDS[kind],paid=r.choiceWords?.[key];
  const amount=paid?.lastDay===day?{xp:Math.max(0,base.xp-paid.xp),coins:Math.max(0,base.coins-paid.coins)}:base;
  const bond=g.heroes[avatar]??{rank:1,xp:0};
  const next={...profile,xp:profile.xp+amount.xp,growth:{...g,coins:g.coins+amount.coins,earned:g.earned+amount.coins,
    heroes:{...g.heroes,[avatar]:{...bond,xp:bond.xp+1}},recruitment:{...r,words:{...r.words,[key]:{first:true,lastDay:day,...amount}}}}};
  return {profile:next,reward:{...amount,kind,reason:kind==='new'?'首次独立回忆':'到期复习',credited:true}};
}

export function recruitmentSummary(profile){
  const g=profile.growth;
  const operators=Object.entries(RECRUITS).map(([id,cost])=>({id,cost,unlocked:isUnlocked(profile,id),affordable:g.coins>=cost,remaining:Math.max(0,cost-g.coins)}));
  const next=operators.filter(o=>!o.unlocked).sort((a,b)=>a.cost-b.cost)[0]??null;
  const supplies=Object.entries(SUPPLIES).map(([id,item])=>({id,...item,owned:g.recruitment.supplies?.[id]??0,affordable:g.coins>=item.cost}));
  const level=learningLevel(profile.xp);
  return {coins:g.coins,earned:g.earned,spent:g.spent,xp:profile.xp,level:level.level,levelProgress:level.progress,levelRequired:level.required,operators,next,rewards:LEARNING_REWARDS,supplies};
}

export function awardRecognition(profile,word,answer,date=new Date(),avatar=profile.avatar??'mage'){
  const no=reason=>({profile,reward:{xp:0,coins:0,kind:'none',reason}});
  if(!answer.recognized)return no('这次没有辨认正确，稍后再练');
  const g=profile.growth,r=g.recruitment,key=keyOf(word.word),day=dayOf(date);
  const old=r.choiceWords?.[key],recall=r.words[key];
  if(recall?.first)return no('已获独立回忆奖励，选择练习不重复发放');
  if(old?.lastDay&&day<=old.lastDay)return no('这个词今日已领过辨认奖励');
  if(old&&!answer.accepted)return no('到期复习再领取辨认奖励');
  const amount=old?{xp:4,coins:2}:{xp:6,coins:3};
  const bond=g.heroes[avatar]??{rank:1,xp:0};
  return {profile:{...profile,xp:profile.xp+amount.xp,growth:{...g,coins:g.coins+amount.coins,earned:g.earned+amount.coins,
    heroes:{...g.heroes,[avatar]:{...bond,xp:bond.xp+1}},recruitment:{...r,choiceWords:{...r.choiceWords,[key]:{first:true,lastDay:day,...amount}}}}},
    reward:{...amount,kind:old?'review':'new',reason:old?'到期辨认复习':'首次辨认正确',credited:true}};
}
