import {Session} from '../godot/bridge/session.mjs';
import {exportSave,selectPlayer} from './storage.mjs';
import {startSavedPlan} from '../godot/bridge/plan-start.mjs';
import {isMobileLayout,stageMetrics} from './layout.mjs';
import './speech.mjs';

let session;
const ready=Promise.resolve().then(()=>{
  selectPlayer(null);
  session=new Session('/learning.json',{drawOnly:true});
});
ready.catch(error=>{window.WordGameError='无法读取学习存档：'+error.message;});

window.WordGame={
  ready,
  connect:()=>ready,
  isMobileLayout,
  stageMetrics,
  command(json){
    try{
      if(!session)throw Error(window.WordGameError||'学习存档尚未载入。');
      const {action='state',payload={}}=JSON.parse(json);
      session.phoneLayout=Boolean(window.WordToyMobile);
      if(action==='mobile_plan_start'){
        const result=startSavedPlan(session,payload);
        return JSON.stringify({ok:true,...result,uiAction:'daily_start'});
      }
      if(action==='mobile_boss_start'){
        if(session.state&&!session.state.outcome)throw Error('请先完成当前行动。');
        session.study.configure({mobileAnswerMode:payload.answerMode});
        const result=session.command('boss_start',{id:payload.id});
        return JSON.stringify({ok:true,...result,uiAction:'boss_start'});
      }
      const result=session.command(action,payload);
      return JSON.stringify({ok:true,...result,...(action==='favorite_review'?{uiAction:'study_start'}:{})});
    }catch(error){return JSON.stringify({ok:false,error:error.message});}
  },
  backup:exportSave,
  status(){return JSON.stringify({ready:!!session,error:window.WordGameError??'',storage:'browser-local'});}
};
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&session)session.command('pause',{value:true});
});
