// A single localStorage transaction commits each original atomic save. No shared server profile.
// Existing anonymous browser saves stay in their original namespace.
// Authenticated accounts never inherit that anonymous save implicitly.
let PREFIX='liuxiaoyan-action:pages:'+new URL('.',location.href).pathname+':';
let owner=null,locked=false;
const temp=new Map();
export function selectPlayer(principal){
 if(locked)throw Error('切换账号需要重新加载游戏，避免旧行动写入新账号。');
 if(principal!==null){
  if(!principal||!['bilibili','site'].includes(principal.provider)||typeof principal.id!=='string'||!/^\w{1,64}$/.test(principal.id))throw Error('无法确认玩家身份，存档未打开。');
  owner={provider:principal.provider,id:principal.id};PREFIX=`liuxiaoyan-action:v41:${owner.provider}:${owner.id}:`;
 }
 locked=true;temp.clear();
}
export const dirname=()=>'/';
export const mkdirSync=()=>{};
export function existsSync(name){return temp.has(String(name))||localStorage.getItem(PREFIX+name)!==null;}
export function readFileSync(name){
 const value=temp.get(String(name))??localStorage.getItem(PREFIX+name);
 if(value===null||value===undefined)throw Error('存档不存在');
 return value;
}
export function writeFileSync(name,value){
 if(String(name).endsWith('.tmp'))temp.set(String(name),String(value));
 else localStorage.setItem(PREFIX+name,String(value));
}
export function renameSync(from,to){
 const value=readFileSync(from);
 try {localStorage.setItem(PREFIX+to,value);}
 catch(e){throw Error('浏览器存储空间不足，进度未保存。请导出存档后释放空间。');}
 temp.delete(String(from));
}
export function exportSave(){
 const files={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(PREFIX))files[k.slice(PREFIX.length)]=localStorage.getItem(k);}
 return JSON.stringify({game:'liuxiaoyan-action',version:41,owner,storage:'browser-local',files},null,2);
}
