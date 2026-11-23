import {readFileSync} from 'node:fs';
import {WORDS,ARCHIVED_WORD_IDS} from '../legacy/packages/client/src/academy/words.ts';

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
export function requireBook(id){
  const book=BOOKS.find(x=>x.id===id);
  if(!book)throw Error('请选择四级、六级或考研词书。');
  return book;
}
export function allBookWords(id){requireBook(id);return pools.get(id);}
export function bookPool(id,profile,count=60){
  requireBook(id);
  return [...pools.get(id)].sort((a,b)=>(profile.words[a.id]?.due??0)-(profile.words[b.id]?.due??0)||a.frequency-b.frequency||a.word.localeCompare(b.word)).slice(0,count);
}
export function bookCatalog(profile,study=null){
  return BOOKS.map(book=>{
    const rows=pools.get(book.id),cards=study?.data.cards??{},now=study?.now()??new Date();
    const seen=w=>!!cards[w.id]||!!profile.words[w.id];
    return {...book,seen:rows.filter(seen).length,
      mastered:rows.filter(w=>(cards[w.id]?.stability??0)>=21||(profile.words[w.id]?.streak??0)>=3).length,
      due:rows.filter(w=>seen(w)&&new Date(cards[w.id]?.due??profile.words[w.id]?.due??0)<=now).length,
      preview:bookPool(book.id,profile,6).map(w=>({word:w.word,meaning:w.meaning,phonetic:w.phonetic}))};
  });
}
