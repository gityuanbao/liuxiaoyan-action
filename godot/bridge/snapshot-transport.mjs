// Internal wire optimization. Session.command() still returns the complete public snapshot.
const immutableFields=new Set(['profile','stats','recruitment','books','collection','stages','spirits','avatars','runes','commissions','memory','bookSettings']);
export class SnapshotTransport {
  constructor(){this.previous=new Map();this.references=new Map();this.initialized=false;this.sequence=0;}
  encode(snapshot,acknowledged=this.sequence){
    // If a response was lost, send a complete snapshot before resuming patches.
    const patch=this.initialized&&acknowledged===this.sequence;
    const next=new Map(),fields=[],removed=[];
    for(const [key,value] of Object.entries(snapshot)){
      let encoded;
      if(immutableFields.has(key)&&this.references.get(key)===value&&this.previous.has(key))encoded=this.previous.get(key);
      else encoded=JSON.stringify(value);
      if(encoded===undefined)continue;
      next.set(key,encoded);
      if(!patch||this.previous.get(key)!==encoded)fields.push(JSON.stringify(key)+':'+encoded);
      if(immutableFields.has(key))this.references.set(key,value);
    }
    for(const key of this.previous.keys())if(!next.has(key))removed.push(key);
    const prefix='"ok":true,"__snapshot_patch":'+patch+',"__snapshot_sequence":'+(++this.sequence)+',"__snapshot_removed":'+JSON.stringify(removed);
    this.previous=next;this.initialized=true;
    return '{'+[prefix,...fields].join(',')+'}';
  }
}
