// In-session retrieval practice. Long-term review scheduling remains in StudyPlanner.
export class StudyMission {
  constructor(words, recall, answerMode='spelling') {
    this.answerMode=answerMode;this.choice=answerMode!=='spelling';
    this.words=[...words];this.completed=0;this.independentAttempts=0;this.updatedWords=new Set();
    this.items=words.map(word=>({word,mode:this.choice?'choice':recall?'recall':'learn'}));
    if(!recall&&!this.choice)this.items.push(...words.map(word=>({word,mode:'recall'})));
    this.progress=Object.fromEntries(words.map(word=>[word.id,{seen:false,copied:false,recalled:false,recognized:false,retries:0}]));
  }
  item(index){return this.items[index]??this.items.at(-1);}
  record(index,answer){
    const item=this.item(index),p=this.progress[item.word.id];p.seen=true;
    if(this.choice){
      this.completed++;p.recognized=!!answer.recognized;
      if(answer.accepted)this.updatedWords.add(item.word.id);
      if(!p.recognized&&p.retries===0&&item.mode!=='choice_fill'){
        p.retries++;
        const following=new Set(this.items.slice(index+1).filter(x=>x.word.id!==item.word.id).map(x=>x.word.id));
        for(const other of this.words){
          if(following.size>=Math.min(2,this.words.length-1))break;
          if(other.id!==item.word.id&&!following.has(other.id)){this.items.push({word:other,mode:'choice_fill'});following.add(other.id);}
        }
        this.items.push({word:item.word,mode:'choice_retry'});
      }
      return;
    }
    if(!answer.correct){p.recalled=false;return;}
    this.completed++;
    if(item.mode==='learn')p.copied=true;
    else {
      p.recalled=!!answer.independent;
      if(answer.independent)this.independentAttempts++;
      if(answer.independent&&answer.accepted)this.updatedWords.add(item.word.id);
      if(!answer.independent&&p.retries===0&&item.mode!=='reinforce'){
        p.retries++;
        // Two different intervening words where available; never grow an unbounded retry loop.
        const intervening=new Set(this.items.slice(index+1).filter(x=>x.word.id!==item.word.id).map(x=>x.word.id));
        for(const other of this.words){
          if(intervening.size>=Math.min(2,this.words.length-1))break;
          if(other.id!==item.word.id&&!intervening.has(other.id)){
            this.items.push({word:other,mode:'reinforce'});intervening.add(other.id);
          }
        }
        this.items.push({word:item.word,mode:'retest'});
      }
    }
  }
  summary(index){
    const item=this.item(index),mode=item.mode;
    const rows=this.words.map(w=>({...w,...this.progress[w.id]}));
    const weak=rows.filter(w=>w.seen&&!(this.choice?w.recognized:w.recalled));
    return {mode,answerMode:this.answerMode,recognized:rows.filter(w=>w.recognized).length,
      phase:this.choice?(mode==='choice_retry'?'错题再练':'四选一辨认'):mode==='learn'?'建立印象':mode==='retest'?'薄弱词复测':mode==='reinforce'?'穿插回忆':'独立回忆',
      objective:this.choice?'点选一个答案，答后听读音、看解析；辨认与独立拼写分开记录。':mode==='learn'?'读音、词义一起记；本轮稍后会遮住英文。':mode==='retest'||mode==='reinforce'?'根据中文写英文；仍不熟悉的词留在后续复习中。':'根据中文写英文；提示或改对后会再安排一次复测。',
      selectedTotal:rows.length,totalSteps:this.items.length,completedSteps:this.completed,
      copied:rows.filter(w=>w.copied).length,recalled:rows.filter(w=>w.recalled).length,
      copyOnly:rows.filter(w=>w.copied&&!w.recalled).length,needsReview:weak.length,unseen:rows.filter(w=>!w.seen).length,
      independentAttempts:this.independentAttempts,scheduleUpdated:this.updatedWords.size,
      weakWords:weak.map(({id,word,meaning})=>({id,word,meaning})),
      rows:rows.map(({id,word,recalled,copied,seen,recognized})=>({id,word,status:recognized?'已辨认':recalled?'已回忆':copied?'待回忆':seen?'需巩固':'待学习'}))};
  }
}
