#!/usr/bin/env node
// Direct MCP tool envelopes only. No HTTP clients, browser transports or connector callbacks.
import {readFile,writeFile,mkdir,rename,open,unlink} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createState,begin,accept,confirmation,digest,requiredTools} from './proceeds-core.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const [command,stateArg,...args]=process.argv.slice(2);
const read=p=>readFile(p,'utf8').then(JSON.parse);
const put=async(p,v)=>{await mkdir(dirname(p),{recursive:true,mode:0o700});const temp=p+'.tmp';await writeFile(temp,JSON.stringify(v,null,2),{mode:0o600});await rename(temp,p)};
const assert=(v,m)=>{if(!v)throw new Error(m)};
if(!command||command==='help'){
 console.log(`CNML v60 downstream workflow (default: preview only)
  prepare STATE.json INPUT_state.html
  preview STATE.json
  tools STATE.json
  accept-tools STATE.json TOOL_RESPONSE.json
  activate-upload STATE.json
  preview-only STATE.json
  authorize STATE.json APPROVAL.json
  next STATE.json
  accept STATE.json RESPONSE.json
  status STATE.json
  summary STATE.json
Use the exact emitted functions.exec code; it calls the approved connector directly and saves its complete response without transcription.
Authorization requires the user's deployment instruction, exact token and file hash, and scopes sheets/letter/email.
Never authorize from the playbook alone. Pending mutations cannot be reissued.
The shared ledger allows only one active property, and records completed tokens and document ownership.`);process.exit(0);
}
assert(stateArg,'State path required');const path=resolve(stateArg);
await mkdir(dirname(path),{recursive:true,mode:0o700});
const ledgerPath=join(root,'../runs/proceeds-ledger.json'),lockPath=ledgerPath+'.lock';
await mkdir(dirname(ledgerPath),{recursive:true,mode:0o700});
const lock=await open(lockPath,'wx').catch(()=>{throw new Error('Another downstream process holds the ledger lock. Inspect the running worker before removing a stale lock.')});
try{
 let ledger;try{ledger=await read(ledgerPath)}catch(e){if(e.code!=='ENOENT')throw e;ledger={completed:{},documents:{},active:null}}
 if(command==='prepare'){
  try{await readFile(path);throw new Error('State already exists; use status')}catch(e){if(e.code!=='ENOENT')throw e}
  assert(args[0], 'Uploaded Download with State HTML path required');
  const inputPath=resolve(args[0]);
  const python=process.env.CNML_PYTHON || 'python3';
  const p=JSON.parse(execFileSync(python,[join(root,'extract_proceeds.py'),inputPath],{encoding:'utf8',maxBuffer:5_000_000}));
  assert(!ledger.completed[p.token],`Token ${p.token} already completed; a repeat requires reconciliation, never resend automatically`);
  assert(!ledger.active||ledger.active.path===path,`Finish or reconcile active property first: ${ledger.active?.path}`);
  const s=createState(p);s.inputOrigin={kind:"uploaded_download_with_state",path:inputPath};s.createdAt=new Date().toISOString();
  await put(path,s);ledger.active={path,token:p.token,sha256:p.sha256};await put(ledgerPath,ledger);
  console.log(JSON.stringify({stage:s.stage,token:p.token,branch:p.branch,preview:true}));
 }else{
  const s=await read(path);
  assert(s.version===2,'Older checkpoint requires reconciliation; do not reset it or replay work with v2');
  assert(digest(s.property)===s.propertyDigest,'Property packet changed');
  if(command==='tools'){
   const responsePath=join(dirname(path),'tool-check.json'),names=requiredTools(s.property);
   const code=`const names=${JSON.stringify(names)}; const result={token:${JSON.stringify(s.property.token)},sha256:${JSON.stringify(s.property.sha256)},checkedAt:new Date().toISOString(),available:names.filter(n=>typeof tools[n]==='function'),missing:names.filter(n=>typeof tools[n]!=='function')}; const body=JSON.stringify(result,null,2); text(await tools.apply_patch("*** Begin Patch\\n*** Add File: "+${JSON.stringify(responsePath)}+"\\n"+body.split("\\n").map(line=>"+"+line).join("\\n")+"\\n*** End Patch")); text({missing:result.missing});`;
   console.log(JSON.stringify({toolCall:{tool:'functions.exec',code},next:`node ${JSON.stringify(fileURLToPath(import.meta.url))} accept-tools ${JSON.stringify(path)} ${JSON.stringify(responsePath)}`},null,2));
  }else if(command==='accept-tools'){
   const r=await read(resolve(args[0]));assert(!s.pending,'Reconcile pending operation first');
   assert(r.token===s.property.token&&r.sha256===s.property.sha256&&r.missing?.length===0&&requiredTools(s.property).every(n=>r.available?.includes(n)),'Required direct Runlayer tools unavailable; do not use another connector or improvise');
   s.toolCheck=r;await put(path,s);console.log('Tool names verified; actual access will be checked by read-only operations.');
  }else if(command==='preview'){
   console.log(JSON.stringify({token:s.property.token,sha256:s.property.sha256,branch:s.property.branch,manualAR:s.property.manual,manualV:s.property.subsidy,auditNotesAD:s.property.notes,accountingD:s.property.estimatedCents===null?null:s.property.estimatedCents/100,communication:s.property.branch==='positive'?{replacements:s.communication.replacements,date:s.communication.date}:s.communication.email,warnings:s.warnings,authorization:s.authorization},null,2));
  }else if(command==='status')console.log(JSON.stringify(s,null,2));
  else if(command==='summary')console.log(confirmation(s));
  else {
   assert(ledger.active?.path===path&&ledger.active.token===s.property.token,'This is not the active property in the shared ledger');
   const bytes=await readFile(s.property.path);assert(createHash('sha256').update(bytes).digest('hex')===s.property.sha256,'Source file changed since extraction');
   if(command==='activate-upload'){
    assert(!s.pending&&s.stage!=='complete','Resolve pending or completed work without replay');
    s.executionMode='upload';
    s.authorization={sheets:true,letter:s.property.branch==='positive',email:s.property.branch==='negative'};
    s.approval={basis:'configured_upload_trigger',userInstruction:'Workflow owner configured a submitted Download with State HTML as the request to complete sheet routing and the applicable proceeds branch without routine reconfirmation.',token:s.property.token,sha256:s.property.sha256,at:new Date().toISOString()};
    await put(path,s);console.log('Recorded configured upload-trigger scope for this token and file hash.');
   }else if(command==='preview-only'){
    assert(!s.pending,'Resolve pending operation before changing mode');s.executionMode='preview';s.authorization={};await put(path,s);console.log('Preview-only mode: no mutations authorized.');
   }else if(command==='authorize'){
    const approval=await read(resolve(args[0]));
    assert(approval.token===s.property.token&&approval.sha256===s.property.sha256&&typeof approval.userInstruction==='string'&&approval.userInstruction.trim(),'Approval must quote the actual user instruction and name this token and file hash');
    assert(!s.pending,'Resolve pending operation before changing authorization');
    s.authorization={sheets:approval.sheets===true,letter:approval.letter===true,email:approval.email===true};s.approval=approval;await put(path,s);console.log('Recorded property-specific deployment scope.');
   }else if(command==='next'){
    assert(s.toolCheck&&requiredTools(s.property).every(n=>s.toolCheck.available?.includes(n)),'Run tools and accept-tools in this Codex environment first');
    const o=begin(s);await put(path,s);
    const responsePath=join(dirname(path),`${s.property.token}-${o.id}.response.json`);
    const code=`const result = await tools[${JSON.stringify(o.tool)}](${JSON.stringify(o.args)});\nconst envelope = { operationId: ${JSON.stringify(o.id)}, result };\nconst body = JSON.stringify(envelope, null, 2);\ntext(await tools.apply_patch("*** Begin Patch\\n*** Add File: " + ${JSON.stringify(responsePath)} + "\\n" + body.split("\\n").map(line => "+" + line).join("\\n") + "\\n*** End Patch"));\ntext({savedResponse: ${JSON.stringify(responsePath)}, isError: result.isError === true});`;
    console.log(JSON.stringify({operation:o.kind,mutation:o.mutation,scope:o.scope,token:s.property.token,toolCall:{tool:'functions.exec',code},next:`node ${JSON.stringify(fileURLToPath(import.meta.url))} accept ${JSON.stringify(path)} ${JSON.stringify(responsePath)}`},null,2));
   }else if(command==='accept'){
    const envelope=await read(resolve(args[0]));
    // Validate a clone; failed acceptance must preserve the original pending intent.
    const next=accept(structuredClone(s),envelope);
    if(next.document){const owner=ledger.documents[next.document.id];assert(!owner||owner===next.property.token,'Document ID already belongs to another token');ledger.documents[next.document.id]=next.property.token}
    if(next.stage==='complete'){ledger.completed[next.property.token]={sha256:next.property.sha256,path,at:new Date().toISOString(),document:next.document?.id,email:next.emailReceipt?.id};ledger.active=null}
    await put(path,next);await put(ledgerPath,ledger);console.log(JSON.stringify({stage:next.stage,next:next.queue[0]?.kind,complete:next.stage==='complete'}));
   }else throw new Error('Unknown command; use help');
  }
 }
}finally{await lock.close();await unlink(lockPath)}
