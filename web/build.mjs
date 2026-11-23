import * as esbuild from 'esbuild';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(here,'../godot');
mkdirSync(path.join(here,'../docs'),{recursive:true});
const shims={
  'node:fs':path.join(here,'./storage.mjs'),
  'node:path':path.join(here,'./path-shim.mjs'),
  'node:crypto':path.join(here,'./crypto-shim.mjs'),
};
await esbuild.build({entryPoints:[path.join(here,'entry.mjs')],bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,outfile:path.join(here,'../docs/learning.js'),plugins:[{
 name:'native-to-browser-storage',setup(build){
  build.onResolve({filter:/^node:/},args=>({path:shims[args.path]??args.path}));
  build.onLoad({filter:/[\\/]bridge[\\/]session\.mjs$/},args=>{
    let code=readFileSync(args.path,'utf8').replace("import './loader.mjs';",'');
    const names=['duel','learning','expedition','data','words','growth','combat','notebook','audio','chars'];
    const files=['duel-engine','learning-core','expedition-core','expedition-data','words','growth-core','combat-skills','notebook-data','audio-library-data','character-data'];
    code=code.replace(/const root = [\s\S]*?\.map\(name => import\(root \+ name \+ '\.ts'\)\)\);/,names.map((n,i)=>`import * as ${n} from '../legacy/packages/client/src/academy/${files[i]}.ts';`).join('\n'));
    return {contents:code,loader:'js',resolveDir:path.dirname(args.path)};
  });
  build.onLoad({filter:/[\\/]bridge[\\/]wordbooks\.mjs$/},args=>{
    let code=readFileSync(args.path,'utf8').replace("import {readFileSync} from 'node:fs';",'');
    const catalog=JSON.parse(readFileSync(path.join(game,'data/books/catalog.json'),'utf8'));
    const imports=[
      "import catalog from '../data/books/catalog.json';",
      "import archivedWords from '../data/books/archived-words.json';",
      ...catalog.map((book,i)=>`import pool${i} from '../data/books/${book.id}.json';`),
    ];
    code=code.replace(/const read=name=>[^\n]+/,`const bundled={'catalog.json':catalog,'archived-words.json':archivedWords,${catalog.map((book,i)=>`'${book.id}.json':pool${i}`).join(',')}};\nconst read=name=>bundled[name];`);
    return {contents:imports.join('\n')+'\n'+code,loader:'js',resolveDir:path.dirname(args.path)};
  });
 }}]});
const docs=path.resolve(here,'../docs');
const htmlFile=path.join(docs,'index.html');
if(existsSync(htmlFile)&&existsSync(path.join(docs,'index.js'))){
  const html=readFileSync(htmlFile,'utf8');
  const versioned=name=>`${name}?v=${createHash('sha256').update(readFileSync(path.join(docs,name))).digest('hex').slice(0,16)}`;
  const updated=html.replace(/const learningFile='learning\.js(?:\?v=[a-f0-9]+)?',engineFile='index\.js(?:\?v=[a-f0-9]+)?';/,
    () => `const learningFile='${versioned('learning.js')}',engineFile='${versioned('index.js')}';`);
  if(updated!==html)writeFileSync(htmlFile,updated);
}
console.log('GitHub browser bundle built from latest Godot gameplay source.');
