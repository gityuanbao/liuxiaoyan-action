import {allBookWords} from './wordbooks.mjs';
export const ANSWER_MODES=Object.freeze({spelling:'拼写单词',choose_meaning:'看单词选意思',choose_word:'看意思选单词'});
export const isChoice=mode=>mode==='choose_meaning'||mode==='choose_word';
const normal=value=>String(value??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const meanings=w=>new Set(normal(w.meaning).replace(/\b(?:n|v|vt|vi|adj|adv|a|prep|pron|conj|int)\./g,'').split(/[;；,，、\/\n]/).map(x=>x.trim()).filter(x=>x.length>=2));
const overlaps=(a,b)=>{const x=meanings(a),y=meanings(b);return [...x].some(k=>y.has(k));};
const shuffle=(rows,rng)=>{for(let i=rows.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]];}return rows;};
export const shortMeaning=w=>String(w.meaning).split(/[;；]/)[0].split(/[,，、]/).slice(0,3).join("，").trim();
export function createChoice(word,book,mode,token,rng=Math.random){
  if(!isChoice(mode))throw Error('请选择有效的选择题型。');
  const label=w=>normal(mode==='choose_meaning'?shortMeaning(w):w.word);
  const used=new Set([label(word)]),spellings=new Set([normal(word.word)]);
  const candidates=shuffle([...allBookWords(book)],rng),wrong=[];
  for(const candidate of candidates){
    if(candidate.id===word.id||spellings.has(normal(candidate.word))||used.has(label(candidate))||!label(candidate)||overlaps(word,candidate)||wrong.some(w=>overlaps(w,candidate)))continue;
    used.add(label(candidate));spellings.add(normal(candidate.word));wrong.push(candidate);
    if(wrong.length===3)break;
  }
  if(wrong.length!==3)throw Error('当前词书没有足够的不同选项，请换一本词书。');
  const choices=shuffle([word,...wrong],rng).map((w,index)=>({id:token+':'+index,label:mode==='choose_meaning'?shortMeaning(w):w.word,correct:w.id===word.id}));
  return {token,mode,prompt:mode==='choose_meaning'?word.word:shortMeaning(word),phonetic:mode==='choose_meaning'?word.phonetic??'':'',options:choices,
    answered:false,selected:null,correctId:choices.find(o=>o.correct).id};
}
export function publicChoice(question){
  if(!question)return null;
  const {correctId,...rest}=question;
  return {...rest,options:question.options.map(({correct,...option})=>option),...(question.answered?{correctId}:{} )};
}
