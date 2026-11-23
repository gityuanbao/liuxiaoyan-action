// The existing growth wallet remains the single source of spendable coins.
import {learningLevel} from './progression.mjs';
export const RECRUITS=Object.freeze({mage:0,knight:60,ranger:180,bard:240,scholar:300,alchemist:360});
const NAMES=Object.freeze({mage:'红狼',knight:'牧羊人',ranger:'露娜',bard:'蜂医',scholar:'骇爪',alchemist:'威龙',wildfire:'野火'});
const featured='wildfire',ordinary=Object.keys(RECRUITS);
export const DRAW_RULES=Object.freeze({cost:60,limit:40,featuredRate:0.02,duplicateReward:15});
export const TOY_DRAW_RULES=Object.freeze({cost:30,limit:40,jackpotRate:0.05,jackpot:300,coinRewards:Object.freeze([3,6,9])});
const freshDraws=()=>({serial:0,pity:0,lastDraw:null});
const integer=n=>Number.isSafeInteger(n)&&n>=0;

function validDraws(g){
  if(!g||!integer(g.serial)||!integer(g.pity)||g.pity>=DRAW_RULES.limit||g.pity>g.serial)return false;
  if(g.serial===0)return g.lastDraw===null;
  const d=g.lastDraw;
  if(d?.version===2){
    const {id,coinReward}=d;
    const hasOperator=id!==null;
    return d.serial===g.serial&&d.pity===g.pity
      &&(coinReward===TOY_DRAW_RULES.jackpot||TOY_DRAW_RULES.coinRewards.includes(coinReward))
      &&d.isNew===hasOperator&&d.guaranteed===hasOperator
      &&(!hasOperator||(Object.hasOwn(NAMES,id)&&g.pity===0));
  }
  return !!d&&Object.hasOwn(NAMES,d.id)&&d.serial===g.serial&&d.pity===g.pity&&d.featured===(d.id===featured)
    &&typeof d.isNew==='boolean'&&typeof d.guaranteed==='boolean'&&(!d.guaranteed||d.featured)
    &&d.duplicateReward===(d.isNew?0:DRAW_RULES.duplicateReward)&&(d.featured?g.pity===0:g.pity>0);
}

export function drawRecruit(profile,expectedSerial,random=Math.random,drawOnly=false){
  const g=profile.growth,r=g.recruitment,draws=r.gacha??freshDraws();
  if(!integer(expectedSerial))throw Error('招募序号无效，请重新进入招募页面。');
  if(draws.serial>0&&expectedSerial===draws.serial-1)return profile;
  if(expectedSerial!==draws.serial)throw Error('招募进度已更新，请重新进入招募页面。');
  if(drawOnly)return drawToyRecruit(profile,draws,random);
  if(g.coins<DRAW_RULES.cost)throw Error('哈弗币不足，还差 '+(DRAW_RULES.cost-g.coins)+' 哈弗币。');
  const guaranteed=draws.pity+1===DRAW_RULES.limit;
  const roll=guaranteed?0:random();
  const selected=roll<DRAW_RULES.featuredRate?featured:ordinary[Math.floor((roll-DRAW_RULES.featuredRate)*ordinary.length/(1-DRAW_RULES.featuredRate))];
  const isNew=!r.unlocked.includes(selected),duplicateReward=isNew?0:DRAW_RULES.duplicateReward;
  const pity=selected===featured?0:draws.pity+1,serial=draws.serial+1;
  const lastDraw={id:selected,name:NAMES[selected],featured:selected===featured,isNew,duplicateReward,pity,guaranteed,serial};
  return {...profile,growth:{...g,coins:g.coins-DRAW_RULES.cost+duplicateReward,spent:g.spent+DRAW_RULES.cost,earned:g.earned+duplicateReward,
    recruitment:{...r,unlocked:isNew?[...r.unlocked,selected]:r.unlocked,gacha:{pity,serial,lastDraw}}}};
}

function drawToyRecruit(profile,draws,random){
  const growth=profile.growth,recruitment=growth.recruitment;
  const {cost,limit,jackpotRate,jackpot,coinRewards}=TOY_DRAW_RULES;
  if(growth.coins<cost)throw Error('哈弗币不足，还差 '+(cost-growth.coins)+' 哈弗币。');
  const roll=random();
  const ordinaryIndex=Math.min(coinRewards.length-1,Math.floor((roll-jackpotRate)*coinRewards.length/(1-jackpotRate)));
  const coinReward=roll<jackpotRate?jackpot:coinRewards[ordinaryIndex];
  const available=Object.keys(NAMES).filter(id=>!recruitment.unlocked.includes(id));
  const count=available.length?draws.pity+1:0;
  const guaranteed=count===limit;
  const id=guaranteed?available[Math.floor(random()*available.length)]:null;
  const pity=guaranteed?0:count,serial=draws.serial+1;
  const lastDraw={version:2,id,name:id?NAMES[id]:'',coinReward,pity,guaranteed,isNew:guaranteed,serial};
  return {...profile,growth:{...growth,coins:growth.coins-cost+coinReward,spent:growth.spent+cost,earned:growth.earned+coinReward,
    recruitment:{...recruitment,unlocked:id?[...recruitment.unlocked,id]:recruitment.unlocked,gacha:{pity,serial,lastDraw}}}};
}
export const LEARNING_REWARDS=Object.freeze({new:{xp:12,coins:6},review:{xp:8,coins:4}});
export const SUPPLIES=Object.freeze({armor:{cost:36,max:3,shield:16,energy:0,name:'防护补给'},battery:{cost:48,max:3,shield:0,energy:20,name:'战术电池'}});
const emptySupplies=()=>({armor:0,battery:0});
const keyOf=word=>String(word).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const dayOf=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function migrateRecruitment(profile,study){
  if(profile.growth?.recruitment){
    const r=profile.growth.recruitment;
    if(r.version!==1||!Array.isArray(r.unlocked)||!r.unlocked.includes('mage')||r.unlocked.some(id=>!Object.hasOwn(NAMES,id))||!r.words||typeof r.words!=='object'||Array.isArray(r.words))throw Error('干员解锁存档无法识别，请保留原存档。');
    if(r.gacha!==undefined&&(!validDraws(r.gacha)||(r.gacha.lastDraw?.id&&!r.unlocked.includes(r.gacha.lastDraw.id))))throw Error('招募进度无法识别，请保留原存档。');
    const supplies=r.supplies===undefined?emptySupplies():r.supplies;
    if(!supplies||typeof supplies!=='object'||Array.isArray(supplies)||Object.entries(supplies).some(([id,count])=>!Object.hasOwn(SUPPLIES,id)||!Number.isSafeInteger(count)||count<0||count>SUPPLIES[id].max))throw Error('补给存档无法识别，请保留原存档。');
    if(r.gacha===undefined||r.supplies===undefined)return {...profile,growth:{...profile.growth,recruitment:{...r,supplies,gacha:r.gacha??freshDraws()}}};
    return profile;
  }
  const g=profile.growth??{coins:0,earned:0,spent:0,settled:profile.records.map(r=>r.id),heroes:{},spirits:{}};
  const unlocked=new Set(['mage']);
  for(const id of [profile.avatar,...profile.records.map(r=>r.avatar),...Object.keys(g.heroes).filter(id=>g.heroes[id].xp>0||g.heroes[id].rank>1)])if(Object.hasOwn(NAMES,id))unlocked.add(id);
  const words={};
  for(const [id,e] of Object.entries(study.data.evidence))if(e.independent>0&&study.data.cards[id]?.word)words[keyOf(study.data.cards[id].word)]={first:true,lastDay:'',xp:0,coins:0};
  return {...profile,growth:{...g,recruitment:{version:1,unlocked:[...unlocked],words,supplies:emptySupplies(),gacha:freshDraws()}}};
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

export function recruitmentSummary(profile,drawOnly=false){
  const g=profile.growth;
  const progress=g.recruitment.gacha??freshDraws();
  const pool=Object.entries(NAMES).map(([id,name])=>({id,name,owned:isUnlocked(profile,id),featured:!drawOnly&&id===featured}));
  const gacha={...(drawOnly?TOY_DRAW_RULES:DRAW_RULES),...progress,pool,remainingOperators:pool.filter(o=>!o.owned).length};
  const operators=drawOnly
    ?pool.map(o=>({id:o.id,name:o.name,unlocked:o.owned,featured:o.featured}))
    :Object.entries(RECRUITS).map(([id,cost])=>({id,cost,unlocked:isUnlocked(profile,id),affordable:g.coins>=cost,remaining:Math.max(0,cost-g.coins)}));
  const next=drawOnly?null:operators.filter(o=>!o.unlocked).sort((a,b)=>a.cost-b.cost)[0]??null;
  if(!drawOnly&&isUnlocked(profile,featured))operators.push({id:featured,unlocked:true});
  const supplies=Object.entries(SUPPLIES).map(([id,item])=>({id,...item,owned:g.recruitment.supplies?.[id]??0,affordable:g.coins>=item.cost}));
  const level=learningLevel(profile.xp);
  return {coins:g.coins,earned:g.earned,spent:g.spent,xp:profile.xp,level:level.level,levelProgress:level.progress,levelRequired:level.required,operators,next,rewards:LEARNING_REWARDS,supplies,gacha};
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
