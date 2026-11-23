import {readFileSync} from 'node:fs';
import {WORDS,ARCHIVED_WORD_IDS} from '../legacy/packages/client/src/academy/words.ts';
import {activeCustomWords,CUSTOM_BOOK_ID,getCustomBook,hasCustomBook} from './custom-book.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../data/books/'+name,import.meta.url),'utf8'));
for(const id of read('archived-words.json'))ARCHIVED_WORD_IDS.add(id);
export const BOOKS=read('catalog.json');
const pools=new Map(BOOKS.map(book=>[book.id,read(book.id+'.json')]));
// The original engine intentionally reads its extensible StudyWord array at runtime.
// Extend its contents without changing any source file, function or record schema.
const known=new Set(WORDS.map(word=>word.id));
for(const pool of pools.values())for(const word of pool){
  if(known.has(word.id))continue;
  const {id,meaning,example,translation,pack}=word;
  WORDS.push({id,word:word.word,meaning,example,translation,pack});known.add(id);
}
const basicWords=new Set([...pools.values()].flatMap(rows=>rows.filter(w=>w.frequency>0&&w.frequency<=2000).map(w=>w.word.toLowerCase())));
export const WORD_DIFFICULTIES=Object.freeze({all:'全部词汇',basic:'只练基础',skip_basic:'跳过基础'});
export const matchesDifficulty=(word,difficulty)=>{
  if(difficulty==='all')return true;
  const basic=basicWords.has(word.word.toLowerCase());
  return difficulty==='basic'?basic:!basic;
};
export function requireBook(id,profile){
  if(id===CUSTOM_BOOK_ID){
    const book=getCustomBook(profile);
    if(book)return {id,name:book.name,count:book.words.length};
  }
  const book=BOOKS.find(x=>x.id===id);
  if(!book)throw Error('请选择可用的词书，或先保存自定义词书。');
  return book;
}
export function allBookWords(id,profile){
  requireBook(id,profile);
  return id===CUSTOM_BOOK_ID?activeCustomWords(profile):pools.get(id);
}
export function wordsAtDifficulty(id,profile,difficulty='all'){
  const rows=allBookWords(id,profile);
  return difficulty==='all'?rows:rows.filter(w=>matchesDifficulty(w,difficulty));
}
export function bookPool(id,profile,count=60,difficulty='all'){
  return [...wordsAtDifficulty(id,profile,difficulty)].sort((a,b)=>(profile.words[a.id]?.due??0)-(profile.words[b.id]?.due??0)||a.frequency-b.frequency||a.word.localeCompare(b.word)).slice(0,count);
}
export function bookCatalog(profile,study=null){
  const books=hasCustomBook(profile)?[...BOOKS,requireBook(CUSTOM_BOOK_ID,profile)]:BOOKS;
  return books.map(book=>{
    const rows=allBookWords(book.id,profile),cards=study?.data.cards??{},now=study?.now()??new Date();
    const seen=w=>!!cards[w.id]||!!profile.words[w.id];
    return {...book,basicCount:rows.filter(w=>matchesDifficulty(w,'basic')).length,seen:rows.filter(seen).length,
      mastered:rows.filter(w=>(cards[w.id]?.stability??0)>=21||(profile.words[w.id]?.streak??0)>=3).length,
      due:rows.filter(w=>seen(w)&&new Date(cards[w.id]?.due??profile.words[w.id]?.due??0)<=now).length,
      preview:bookPool(book.id,profile,6).map(w=>({word:w.word,meaning:w.meaning,phonetic:w.phonetic}))};
  });
}
