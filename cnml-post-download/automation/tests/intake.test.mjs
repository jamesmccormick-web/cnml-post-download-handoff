import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {requiredTools} from '../proceeds-core.mjs';
const source=fileURLToPath(new URL('../',import.meta.url));
const html=(token='TEST123')=>{
 const rows=Array.from({length:15},(_,i)=>`<tr data-row-id="r${i}"><td></td><td>Subject ${i}</td><td data-col="credit">$5.00</td><td data-col="debit">$20.00</td><td class="ap">$0.00</td></tr>`).join('');
 const field=(k,v)=>`<tr><td>${k}</td><td class="editable">${v}</td></tr>`;
 return `<h1>123 Test Ln</h1><div>Flip Token: ${token} · CP Version: v45</div><table id="upside"><tbody>${rows}</tbody><tfoot><tr><td id="up-net" class="net-neg">-$10.00</td></tr></tfoot></table><table><tr><th>Field</th></tr>${field('Seller Full Name','Test Seller')}${field('Seller Email','seller@example.com')}${field('Estimated Upside Proceeds','$1.00')}</table>`;
};
async function setup(fn){
 const dir=await mkdtemp(join(tmpdir(),'cnml-intake-'));
 try{
  const skill=join(dir,'installed skill'),a=join(dir,'chat A'),b=join(dir,'chat B');
  await Promise.all([mkdir(join(skill,'automation'),{recursive:true}),mkdir(a),mkdir(b)]);
  for(const file of ['tool-bindings.mjs','intake.mjs','proceeds.mjs','proceeds-core.mjs','extract_proceeds.py'])await copyFile(join(source,file),join(skill,'automation',file));
  const input=join(a,'property_state.html');await writeFile(input,html());
  const intake=(p=input,cwd=a,...flags)=>JSON.parse(execFileSync(process.execPath,[join(skill,'automation/intake.mjs'),p,...flags],{cwd,encoding:'utf8',stdio:'pipe'}));
  const cli=(...args)=>JSON.parse(execFileSync(process.execPath,[join(skill,'automation/proceeds.mjs'),...args],{cwd:b,encoding:'utf8',stdio:'pipe'}));
  await fn({dir,skill,a,b,input,intake,cli});
 }finally{await rm(dir,{recursive:true,force:true})}
}
test('new chats resume one shared checkpoint and preserve bytes after original upload disappears',()=>setup(async({input,b,intake})=>{
 const first=intake();assert.equal(first.status,'prepared');
 const state=JSON.parse(await readFile(first.checkpoint));assert.equal(state.authorization.sheets,true);assert.equal(state.authorization.email,true);assert.equal(state.authorization.letter,false);assert.equal(state.approval.basis,'configured_upload_trigger');assert.equal(state.approval.sha256,first.sha256);
 assert.equal(await readFile(state.property.path,'utf8'),html());
 const secondInput=join(b,'same_state.html');await writeFile(secondInput,html());await rm(input);
 const second=intake(secondInput,b);assert.equal(second.status,'resume');assert.equal(second.checkpoint,first.checkpoint);
}));
test('different upload cannot replace an unfinished property',()=>setup(async({b,intake})=>{
 const first=intake(),different=join(b,'different_state.html');await writeFile(different,html('OTHER'));
 assert.throws(()=>intake(different,b),/unfinished property/);
 assert.equal(intake().checkpoint,first.checkpoint);
}));
test('pending intent resumes only through its saved receipt, with absolute follow-up command',()=>setup(async({intake,cli,b})=>{
 const first=intake(),state=JSON.parse(await readFile(first.checkpoint));state.toolCheck={available:requiredTools(state.property)};
 await writeFile(first.checkpoint,JSON.stringify(state));const op=cli('next',first.checkpoint);
 assert.ok(op.next.includes(first.runner));
 const result=intake(undefined,b);assert.equal(result.status,'pending');assert.equal(result.pending.responseSaved,false);
 await writeFile(result.pending.responsePath,JSON.stringify({operationId:result.pending.id,result:{}}));
 assert.equal(intake().pending.responseSaved,true);
 assert.throws(()=>cli('next',first.checkpoint),/Pending operation/);
}));
test('completed same-file intake reports saved checkpoint without replay',()=>setup(async({intake,skill})=>{
 const first=intake(),state=JSON.parse(await readFile(first.checkpoint));state.stage='complete';await writeFile(first.checkpoint,JSON.stringify(state));
 await writeFile(join(skill,'runs/proceeds-ledger.json'),JSON.stringify({active:null,documents:{},completed:{TEST123:{sha256:first.sha256,path:first.checkpoint}}}));
 assert.equal(intake().status,'completed');
}));
test('changed completed token is blocked by existing runner ledger',()=>setup(async({intake,skill,input})=>{
 const first=intake();await writeFile(join(skill,'runs/proceeds-ledger.json'),JSON.stringify({active:null,documents:{},completed:{TEST123:{sha256:first.sha256,path:first.checkpoint}}}));
 await writeFile(input,html()+'<!-- changed -->');assert.throws(()=>intake(),/already completed/);
}));
test('changed preserved source and competing intake lock both fail closed',()=>setup(async({intake,skill})=>{
 const first=intake(),state=JSON.parse(await readFile(first.checkpoint));await writeFile(state.property.path,'changed');
 assert.throws(()=>intake(),/Preserved source changed/);
 await writeFile(join(skill,'runs/intake.lock'),'');assert.throws(()=>intake(),/Another intake holds the lock/);
}));
test('initial export suffix is rejected before any checkpoint is created',()=>setup(async({b,intake})=>{
 const input=join(b,'initial.html');await writeFile(input,html());assert.throws(()=>intake(input),/original Download with State/);
}));

test('explicit preview prevents mutations even when the same upload previously activated the workflow',()=>setup(async({intake,cli,a})=>{
 const live=intake();const preview=intake(undefined,a,'--preview');assert.equal(preview.checkpoint,live.checkpoint);
 const s=JSON.parse(await readFile(preview.checkpoint));assert.deepEqual(s.authorization,{});assert.equal(s.executionMode,'preview');
 const again=intake();const active=JSON.parse(await readFile(again.checkpoint));assert.equal(active.authorization.sheets,true);
}));
test('positive upload activates sheets and letter only, without a second request',()=>setup(async({intake,input})=>{
 await writeFile(input,html().replace('net-neg','net-pos').replace('-$10.00','$10.00'));
 const first=intake();const s=JSON.parse(await readFile(first.checkpoint));assert.deepEqual(s.authorization,{sheets:true,letter:true,email:false});
}));

for (const profile of ['direct','runlayer-catalog']) test(`emitted ${profile} check and call execute unchanged and preserve receipts`,()=>setup(async({intake,cli})=>{
 const first=intake();
 const emitted=cli('tools',first.checkpoint,...(profile==='direct'?[]:['--runlayer-catalog']));
 const writes=[]; const calls=[];
 const names=profile==='direct'?['mcp__google_sheets__get_metadata','mcp__google_sheets__fetch','mcp__google_sheets__update','mcp__google_sheets__append','mcp__gmail__send_email']:['google_she_get_metadata','google_she_fetch','update','append','send_email'];
 const tools=Object.fromEntries(names.map(n=>[n,async args=>{calls.push({n,args});return {structuredContent:{sentinel:'full response'}};}]));
 tools.apply_patch=async patch=>{
  assert.ok(patch.startsWith('*** Begin Patch\n*** Add File: '));
  const lines=patch.split('\n'); const path=lines[1].slice(14);
  const body=lines.slice(2,-1).map(l=>{assert.ok(l.startsWith('+'));return l.slice(1);}).join('\n');
  await writeFile(path,body); writes.push(JSON.parse(body));
 };
 const execute=code=>new Function('tools','text',`return (async()=>{${code}})()`)(tools,()=>{});
 await execute(emitted.toolCall.code);
 assert.equal(writes[0].missing.length,0);
 execFileSync(process.execPath,[first.runner,'accept-tools',first.checkpoint,join(first.checkpoint,'../tool-check.json')]);
 const operation=cli('next',first.checkpoint); await execute(operation.toolCall.code);
 assert.equal(calls.length,1); assert.equal(calls[0].n,names[0]);
 assert.equal(calls[0].args.spreadsheet_id,'1ox5xlhexTMMWVSi24rm76MxTRf6iSUsPG0P2zAGBe8M');
 assert.deepEqual(writes[1].result,{structuredContent:{sentinel:'full response'}});
 assert.throws(()=>cli('next',first.checkpoint),/Pending operation/);
}));
