import manifest from './speech-manifest.json';
let audio=null,serial=0,current={active:false,started:false,id:0,error:''};
window.WordSpeech={
 speak(word,id){
  this.stop();serial++;const run=serial;
  const key=manifest[word.trim().toLowerCase()];
  current={active:!!key,started:false,id,error:key?'':'未找到这个词的读音。'};
  if(!key)return;
  audio=new Audio('speech/'+key+'.ogg');audio.volume=.9;
  audio.onplaying=()=>{if(run===serial)current.started=true;};
  audio.onended=()=>{if(run===serial)current.active=false;};
  audio.onerror=()=>{if(run===serial){current.active=false;current.error='读音加载失败，请检查网络。';}};
  audio.play().catch(()=>{if(run===serial){current.active=false;current.error='请点击游戏画面后开启单词声音。';}});
 },
 stop(){serial++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null;}current.active=false;},
 pause(value){if(!audio)return;if(value)audio.pause();else audio.play().catch(()=>{current.active=false;});},
 state(){return JSON.stringify(current);}
};
