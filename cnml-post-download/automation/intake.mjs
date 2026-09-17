#!/usr/bin/env node
// Offline intake. Records configured upload scope; never calls connectors.
import {readFile,writeFile,mkdir,open,unlink,access} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {digest} from './proceeds-core.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const runs=join(root,'runs'),cli=join(root,'automation/proceeds.mjs');
const read=p=>readFile(p,'utf8').then(JSON.parse);
const hash=b=>createHash('sha256').update(b).digest('hex');
const assert=(v,m)=>{if(!v)throw new Error(m)};
const input=process.argv[2],previewOnly=process.argv.slice(3).includes('--preview');
if(!input){console.log('Usage: node /path/to/cnml-post-download/automation/intake.mjs /absolute/path/property_state.html');process.exit(0)}
const inputPath=resolve(input);
assert(inputPath.endsWith('_state.html'),'Use the original Download with State _state.html file; do not rename an initial export.');
const bytes=await readFile(inputPath),sha256=hash(bytes);
await mkdir(runs,{recursive:true,mode:0o700});
const lockPath=join(runs,'intake.lock');
const lock=await open(lockPath,'wx').catch(()=>{throw new Error('Another intake holds the lock. Inspect it before retrying; never remove a live lock.')});
try {
 let ledger;
 try{ledger=await read(join(runs,'proceeds-ledger.json'))}catch(e){if(e.code!=='ENOENT')throw e;ledger={completed:{},documents:{},active:null}}
 const report=async(status,path)=>{
  let s=await read(path);
  assert(s.version===2&&digest(s.property)===s.propertyDigest,'Checkpoint needs reconciliation: unsupported version or changed packet.');
  assert(s.property.sha256===sha256,'Checkpoint input differs; reconcile before proceeding.');
  assert(hash(await readFile(s.property.path))===sha256,'Preserved source changed or is unavailable; reconcile before proceeding.');
  assert(status!=='completed'||s.stage==='complete','Completed ledger and checkpoint disagree; reconcile before proceeding.');
  if(!s.pending&&status!=='completed'){
   execFileSync(process.execPath,[cli,previewOnly?'preview-only':'activate-upload',path],{encoding:'utf8',stdio:'pipe'});
   s=await read(path);
  }
  const responsePath=s.pending?join(dirname(path),`${s.property.token}-${s.pending.id}.response.json`):null;
  let responseSaved=false;
  if(responsePath)try{await access(responsePath);responseSaved=true}catch(e){if(e.code!=='ENOENT')throw e}
  console.log(JSON.stringify({status:s.pending?'pending':status,checkpoint:path,runner:cli,token:s.property.token,sha256,branch:s.property.branch,stage:s.stage,executionMode:previewOnly?'preview':'upload',pending:s.pending?{id:s.pending.id,kind:s.pending.kind,responsePath,responseSaved}:null,nextAction:s.pending?'Accept the saved response only if it matches the pending operation. If unavailable or uncertain, reconcile without replay.':status==='completed'?'Report the saved summary. Do not execute again.':previewOnly?'Preview/read-only preflight only. Do not authorize or execute mutations.':'Upload-trigger scope is recorded. Refresh the callable tool check in this chat, then continue the emitted operations without routine reconfirmation.'},null,2));
 };
 if(ledger.active){
  assert(ledger.active.sha256===sha256,`Resume or reconcile the unfinished property first: ${ledger.active.path}`);
  await report('resume',ledger.active.path);
 }else{
  const done=Object.values(ledger.completed).find(x=>x.sha256===sha256);
  if(done){assert(done.path,'Completed receipt has no checkpoint path; reconcile without replay.');await report('completed',done.path)}
  else{
   const folder=join(runs,sha256),savedInput=join(folder,'download_state.html'),state=join(folder,'downstream.json');
   await mkdir(folder,{recursive:true,mode:0o700});
   try{await writeFile(savedInput,bytes,{flag:'wx',mode:0o600})}catch(e){if(e.code!=='EEXIST')throw e;assert(hash(await readFile(savedInput))===sha256,'Preserved upload does not match its digest.');}
   const env={...process.env};
   if(!env.CNML_PYTHON){const local=join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');try{await access(local);env.CNML_PYTHON=local}catch(e){if(e.code!=='ENOENT')throw e}}
   execFileSync(process.execPath,[cli,'prepare',state,savedInput],{env,encoding:'utf8',stdio:'pipe'});
   await report('prepared',state);
  }
 }
}finally{await lock.close();await unlink(lockPath)}
