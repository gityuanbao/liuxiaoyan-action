import {Session} from '../godot/bridge/session.mjs';
import {exportSave,selectPlayer} from './storage.mjs';
import {startSavedPlan} from '../godot/bridge/plan-start.mjs';
import {isMobileLayout,stageMetrics} from './layout.mjs';
import './speech.mjs';

let session;
const ready=(async()=>{
  selectPlayer(null);
  session=new Session('/learning.json');
})();
ready.catch(error=>{window.WordGameError='无法读取学习存档：'+error.message;});

window.WordGame={
  ready,
  isMobileLayout,
  stageMetrics,
  command(json){
    try{
      if(!session)throw Error(window.WordGameError||'学习存档尚未载入。');
      const {action='state',payload={}}=JSON.parse(json);
      if(action==='mobile_plan_start'){
        const result=startSavedPlan(session,payload);
        return JSON.stringify({ok:true,...result,uiAction:'daily_start'});
      }
      return JSON.stringify({ok:true,...session.command(action,payload)});
    }catch(error){return JSON.stringify({ok:false,error:error.message});}
  },
  backup:exportSave,
  status(){return JSON.stringify({ready:!!session,error:window.WordGameError??'',storage:'browser-local'});}
};
