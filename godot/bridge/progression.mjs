// Account progression is separate from the equipped operator's R1–R3 skill rank.
export const LEVEL_COINS=12;
export const XP_MULTIPLIER=1.5;
export const WORSHIP_REWARD=10;
export function learningLevel(xp){
  let level=1,threshold=0,required=100;
  const total=Math.max(0,Math.floor(xp));
  while(total-threshold>=required){
    threshold+=required;level++;
    required=Math.ceil(required*XP_MULTIPLIER);
  }
  return {level,threshold,required,progress:total-threshold,remaining:required-(total-threshold)};
}
export function levelThreshold(level){
  let total=0,required=100;
  for(let i=1;i<level;i++){total+=required;required=Math.ceil(required*XP_MULTIPLIER);}
  return total;
}
const perks=level=>({shield:Math.min(40,level-1),energy:Math.min(100,level-1)});
export const MILESTONES=Object.freeze([
  {level:1,title:'见习干员'},
  {level:3,title:'前线学员'},
  {level:5,title:'战术专员'},
  {level:10,title:'精英干员'},
  {level:15,title:'行动教官'}
].map(m=>({...m,...perks(m.level)})));
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export const levelOf=p=>learningLevel(p.xp).level;
export function migrateProgression(p){
  if(!integer(Math.floor(p.xp)))throw Error('累计经验值无法识别，请保留原存档。');
  const v=p.growth.progression;
  if(v!==undefined){
    if(!v||![1,2].includes(v.version)||!integer(v.claimedLevel)||v.claimedLevel<1||v.claimedLevel>Math.floor(p.xp/100)+1||!integer(v.sequence)||!Array.isArray(v.ledger)||v.ledger.length>60||
      v.ledger.some(e=>!e||!integer(e.id)||e.id>v.sequence||typeof e.label!=='string'||e.label.length>100||!Number.isSafeInteger(e.amount)||!integer(e.balance)||!Number.isFinite(Date.parse(e.date)))||
      new Set(v.ledger.map(e=>e.id)).size!==v.ledger.length||!v.autoSupply||['armor','battery'].some(id=>typeof v.autoSupply[id]!=='boolean'))throw Error('成长与收支存档无法识别，请保留原存档。');
    return v.version===2?p:{...p,growth:{...p.growth,progression:{...v,version:2}}};
  }
  return {...p,growth:{...p.growth,progression:{version:2,claimedLevel:1,sequence:0,ledger:[],autoSupply:{armor:true,battery:true}}}};
}
export function progressionSummary(p){
  const status=learningLevel(p.xp),level=status.level,perk=[...MILESTONES].reverse().find(m=>level>=m.level);
  return {...status,multiplier:XP_MULTIPLIER,title:perk.title,...perks(level),
    pending:Math.max(0,level-p.growth.progression.claimedLevel)*LEVEL_COINS,
    claimedLevel:p.growth.progression.claimedLevel,nextRewardLevel:Math.max(level,p.growth.progression.claimedLevel)+1,perLevel:LEVEL_COINS,
    next:MILESTONES.find(m=>m.level>level)??null,milestones:MILESTONES,
    ledger:p.growth.progression.ledger,autoSupply:p.growth.progression.autoSupply};
}
export function claimLevels(p){
  const level=levelOf(p),g=p.growth,coins=(level-g.progression.claimedLevel)*LEVEL_COINS;
  if(coins<=0)return p;
  return {...p,growth:{...g,coins:g.coins+coins,earned:g.earned+coins,progression:{...g.progression,claimedLevel:level}}};
}
export function setSupplyEnabled(p,id,enabled){
  if(!['armor','battery'].includes(id)||typeof enabled!=='boolean')throw Error('请选择有效的补给使用设置。');
  const g=p.growth;
  return {...p,growth:{...g,progression:{...g.progression,autoSupply:{...g.progression.autoSupply,[id]:enabled}}}};
}
export function leaderboardWorshipStatus(profile, now=new Date()){
  const day=new Date(now.getTime()+8*60*60*1000).toISOString().slice(0,10);
  const previous=profile.growth.leaderboardWorship;
  const claimed=typeof previous?.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(previous.day)&&previous.day>=day;
  return {available:!claimed,day,rank:claimed?previous.rank:null,reward:WORSHIP_REWARD};
}
export function claimLeaderboardWorship(profile, rank, now=new Date()){
  if(!Number.isInteger(rank)||rank<1||rank>10)throw Error('请选择前十名中的一位玩家。');
  const {available,day}=leaderboardWorshipStatus(profile,now);
  if(!available)throw Error('今日已领取膜拜奖励，明天再来。');
  const growth=profile.growth;
  return {...profile,growth:{...growth,coins:growth.coins+WORSHIP_REWARD,earned:growth.earned+WORSHIP_REWARD,
    leaderboardWorship:{day,rank}}};
}
export function applyLevelPerks(p,state){
  const perk=progressionSummary(p);
  return {...state,shield:Math.min(40,state.shield+perk.shield),energy:Math.min(100,state.energy+perk.energy)};
}
export function recordWallet(before,next,label='行动奖励',date=new Date()){
  if(!before?.growth||!next.growth?.progression)return next;
  const amount=next.growth.coins-before.growth.coins;
  if(!amount)return next;
  if(!Number.isSafeInteger(amount)||!integer(next.growth.coins)||next.growth.coins!==next.growth.earned-next.growth.spent)throw Error('哈弗币收支校验失败。');
  const v=next.growth.progression,id=v.sequence+1;
  const entry={id,date:date.toISOString(),label:String(label).slice(0,100),amount,balance:next.growth.coins};
  return {...next,growth:{...next.growth,progression:{...v,sequence:id,ledger:[entry,...v.ledger].slice(0,60)}}};
}
