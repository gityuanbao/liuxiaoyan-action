// 刘晓燕行动 · Git源宝团队制作
// Copyright (c) 2026 Git源宝团队。详见 ../COPYRIGHT.md。
import { createServer } from 'node:http';
import {startSavedPlan} from './plan-start.mjs';
import { Session } from './session.mjs';
import {SnapshotTransport} from './snapshot-transport.mjs';
const [port, token, savePath, parent] = process.argv.slice(2);
const session = new Session(savePath);
const transport=new SnapshotTransport();
const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(403);res.end('{}');return;}
  try {
    let body=''; for await(const part of req){body+=part;if(body.length>65536)throw Error('请求过长');}
    const {action='state',payload={},transport:format,snapshot_sequence=0}=JSON.parse(body||'{}');
    const snapshot=action==='mobile_plan_start'?startSavedPlan(session,payload):session.command(action,payload);
    res.end(format==='delta-v1'?transport.encode(snapshot,snapshot_sequence):JSON.stringify({ok:true,...snapshot}));
  } catch(e){res.end(JSON.stringify({ok:false,error:e.message}));}
});
server.listen(Number(port),'127.0.0.1');
const timer=setInterval(()=>{try{process.kill(Number(parent),0)}catch{server.close();clearInterval(timer)}},3000);
