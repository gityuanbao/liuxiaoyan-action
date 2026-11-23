import {Session} from './session.mjs';
import {requireBook} from './wordbooks.mjs';
import {migrateRecruitment} from './recruitment.mjs';
import {migrateProgression} from './progression.mjs';
import {ANSWER_MODES} from './choice-questions.mjs';
import {parseBackup} from '../legacy/packages/client/src/academy/learning-core.ts';

export const CLOUD_SCHEMA='liuxiaoyan-action/save';
// SDK-neutral payload; it is not an implementation of the Toy SDK.
export function exportCloudSave(session){
  return structuredClone({schema:CLOUD_SCHEMA,version:1,profile:session.profile,study:session.study.data,bookSettings:session.bookSettings});
}
export function restoreCloudSave(bundle,options){
  if(!bundle||bundle.schema!==CLOUD_SCHEMA||bundle.version!==1)throw Error('不支持的云存档格式。');
  const profile=parseBackup(JSON.stringify(bundle.profile)),study=bundle.study;
  if(study?.version!==1||!study.settings||!study.cards||!study.days||!study.evidence||[study.cards,study.days,study.evidence].some(v=>typeof v!=='object'||Array.isArray(v)))throw Error('学习存档不完整，保留云端原数据。');
  const id=study.settings.selectedBook??bundle.bookSettings?.selected??'cet4';requireBook(id);
  if(![5,10,15].includes(study.settings.batch)||![5,10,20,30].includes(study.settings.goal))throw Error('学习计划无法识别。');
  if(study.settings.answerMode!==undefined&&!Object.hasOwn(ANSWER_MODES,study.settings.answerMode))throw Error('答题方式无法识别。');
  const session=new Session(undefined,options);
  session.study.data=structuredClone(study);
  session.study.data.settings.answerMode??='spelling';
  session.study.data.settings.selectedBook=id;
  session.bookSettings={selected:id,recall:!!bundle.bookSettings?.recall};
  session.profile=migrateProgression(migrateRecruitment(profile,session.study));
  return session;
}
