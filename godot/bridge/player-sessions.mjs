import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {Session} from './session.mjs';

// For a future approved hosted backend. Identity must be verified server-side;
// never use a UID supplied in a command payload or expose the desktop bridge.
export class PlayerSessions {
  constructor({rootDir,verifyIdentity}) {
    if(!rootDir||typeof verifyIdentity!=='function')throw Error('需要存档目录和可信身份验证器。');
    this.root=resolve(rootDir);this.verifyIdentity=verifyIdentity;this.entries=new Map();
  }
  async perform(credential,action='state',payload={}) {
    const principal=await this.verifyIdentity(credential);
    if(!principal||!['bilibili','site'].includes(principal.provider)||typeof principal.id!=='string'||!/^\w{1,64}$/.test(principal.id))throw Error('登录身份无效，不能读写存档。');
    const key=createHash('sha256').update(principal.provider+':'+principal.id).digest('hex');
    if(!this.entries.has(key))this.entries.set(key,{session:new Session(join(this.root,key.slice(0,2),key+'.json')),tail:Promise.resolve()});
    const entry=this.entries.get(key);
    const result=entry.tail.then(()=>entry.session.command(action,payload));
    entry.tail=result.then(()=>{},()=>{});
    return result;
  }
}
