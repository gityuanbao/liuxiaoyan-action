// 刘晓燕行动 · Git源宝团队制作
// Copyright (c) 2026 Git源宝团队。详见 ../COPYRIGHT.md。
import { createServer } from 'node:http';
import {startSavedPlan} from './plan-start.mjs';
import { Session } from './session.mjs';
import {SnapshotTransport} from './snapshot-transport.mjs';
const [port, token, savePath, parent] = process.argv.slice(2);
const session = new Session(savePath,{drawOnly:true});
const transport=new SnapshotTransport();
const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(403);res.end('{}');return;}
  try {
    const chunks=[];
    let bytes=0;
    for await(const part of req){
      bytes+=part.length;
      // Tabs, line breaks, and quotation marks grow when encoded in the request JSON.
      if(bytes>4_100_000)throw Error('词书文件过大，请导入不超过 2 MB 的词表。');
      chunks.push(part);
    }
    const body=Buffer.concat(chunks).toString('utf8');
    const {action='state',payload={},transport:format,snapshot_sequence=0}=JSON.parse(body||'{}');
    let snapshot;
    if(action==='mobile_plan_start') snapshot=startSavedPlan(session,payload);
    else if(action==='mobile_boss_start'){
      if(session.state&&!session.state.outcome)throw Error('请先完成当前行动。');
      session.phoneLayout=true;
      session.study.configure({mobileAnswerMode:payload.answerMode});
      snapshot=session.command('boss_start',{id:payload.id,difficulty:payload.difficulty});
    }else snapshot=session.command(action,payload);
    res.end(format==='delta-v1'?transport.encode(snapshot,snapshot_sequence):JSON.stringify({ok:true,...snapshot}));
  } catch(e){res.end(JSON.stringify({ok:false,error:e.message}));}
});
server.listen(Number(port),'127.0.0.1');
const timer=setInterval(()=>{try{process.kill(Number(parent),0)}catch{server.close();clearInterval(timer)}},3000);
