import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir,copyFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createState,begin,accept,confirmation,matchingRows,range,SHEETS,HUB,TEMPLATE,FOLDER,communication,parseTSV} from '../proceeds-core.mjs';
test('full-column response may clamp header only to independently verified grid extent',()=>{
 const r={range:range(0,'B1:B20000'),content:"Spreadsheet: 'Manual Data Raw'\nRange: 'Manual Data Raw'!B1:B3\n\nToken\n\nTEST123"};
 assert.deepEqual(matchingRows(r,0,'TEST123',3),[3]);
 assert.throws(()=>matchingRows(r,0,'TEST123',4));
 assert.throws(()=>matchingRows(r,0,'TEST123'));
});
test('wrapped legal alias stays with second seller while unrelated multiline names block',()=>{
 const p={seller:'Alex Smith and\nJordan Smith, Jr.\na/k/a Jordan Smith',email:'test@example.com',address:'123 Test Ln',netCents:-100,token:'TEST123'};
 assert.deepEqual(communication(p,'September 16, 2026').names,['Alex Smith','Jordan Smith, Jr. a/k/a Jordan Smith']);
 assert.throws(()=>communication({...p,seller:'Alex Smith\nJordan Smith'},'September 16, 2026'));
});
const packet=(branch='negative')=>({version:60,path:'/fixture_state.html',sha256:'a'.repeat(64),address:'123 Test Ln',token:'AbC123',cpVersion:'v45',manual:['123 Test Ln','AbC123','v45',100,-80,10,null,5,-1,-2,-3,-4,-5,-6,-7,-8,-9,branch==='positive'?100:-100],subsidy:null,notes:['AbC123','123 Test Ln','• Closing — verified','Footer note'],netCents:branch==='positive'?10000:-10000,estimatedCents:15000,seller:'Alex Smith & Jordan Smith',email:'seller@example.com',branch,warnings:[]});
const state=branch=>createState(packet(branch),{date:'September 16, 2026',authorization:{sheets:true,letter:true,email:true}});
const response=(s,r)=>({operationId:s.pending.id,result:{structuredContent:r}});
function simulator(s,{missing=false,formula='evaluated',duplicate=false,batchRejected=false}={}){
 const data=SHEETS.map(()=>new Map(missing?[]:[[1439,s.property.token]]));
 if(duplicate)data[0].set(19001,s.property.token);
 const scalars=new Map(),calls=[];
 function respond(o){
  calls.push(o);
  if(o.kind==='metadata')return {sheets:SHEETS.map((x,i)=>({title:x.name,gridProperties:{rowCount:19500,columnCount:[45,26,36][i]}}))};
  if(o.tool==='mcp__google_sheets__fetch'){
   let values=[];
   if(o.kind==='scan-result'){
    const last=Math.max(0,...data[o.i].keys());values=Array.from({length:last},(_,j)=>[data[o.i].get(j+1)??'']);
   }else if(o.kind==='identity')values=[[data[o.i].get(s.rows[o.i])??'']];
   else if(o.kind==='scratch-probe')values=[[formula==='occupied'?'Reserved header':'']];
   else if(o.kind==='scratch-result'){
    const matches=[...data[o.i]].filter(([,v])=>v===s.property.token).map(([row])=>row);
    values=[[formula==='literal'?o.formula:formula==='error'?'#REF!':`COUNT:${matches.length};ROW:${matches[0]??0}`]];
   }else values=scalars.get(o.args.range)??[];
   return {range:o.args.range,values,spreadsheetId:HUB};
  }
  if(o.tool==='mcp__google_sheets__update'){
   scalars.set(o.args.range,o.args.values);return {updatedCells:o.args.values[0].length,updatedRange:o.args.range,spreadsheetId:HUB};
  }
  if(o.kind==='append'){
   const row=1478;data[o.i].set(row,s.property.token);return {updatedRows:1,updatedRange:range(o.i,`A${row}:${o.i===0?'R':'D'}${row}`),spreadsheetId:HUB};
  }
  if(o.kind==='copy')return {id:'new-property-doc',originalFileId:TEMPLATE};
  if(o.kind==='document-location')return {id:'new-property-doc',parents:[FOLDER]};
  if(o.kind==='share')return {fileId:'new-property-doc',domain:'opendoor.com',role:'reader'};
  if(o.kind==='replace')return {documentId:s.document.id,replies:[1,1,1,1,1,2,1,1,1].map(occurrencesChanged=>({replaceAllText:{occurrencesChanged}}))};
  if(o.kind==='replace-single')return {documentId:s.document.id,occurrencesChanged:[1,1,1,1,1,2,1,1,1][o.replacementIndex]};
  if(o.kind==='date')return {documentId:s.document.id,occurrencesChanged:1};
  if(o.kind==='document-check')return {documentId:s.document.id,textContent:[s.property.token,s.property.address,s.property.email,...s.communication.names,`in the amount of $${s.communication.amount},`,`Date: ${s.communication.date}`].join('\n')};
  if(o.kind==='email')return {id:'sent-message-123'};
  throw new Error('Unhandled simulation '+o.kind);
 }
 return {calls,data,respond,run(until){for(let n=0;n<150&&s.stage!=='complete';n++){const o=begin(s);if(o.kind===until)return o;if(o.kind==='replace'&&batchRejected)accept(s,{operationId:o.id,result:{isError:true,content:[{type:'text',text:'400 INVALID_ARGUMENT'}]}});else accept(s,response(s,respond(o)))}return s}};
}
test('negative completes serial writes, sends once, and never creates a letter',()=>{
 const s=state('negative'),sim=simulator(s);sim.run();assert.equal(s.stage,'complete');
 assert.equal(sim.calls.filter(o=>o.kind==='email').length,1);assert.ok(!sim.calls.some(o=>o.kind==='copy'));
 const raw=sim.calls.findIndex(o=>o.kind==='write'&&o.i===0);assert.equal(sim.calls[raw+1].kind,'subsidy');
 assert.deepEqual(sim.calls.find(o=>o.kind==='subsidy').args.values,[['']]);
 assert.ok(confirmation(s).includes('Zero-proceeds notification sent'));
});
test('Gmail explicit text success receipt confirms once; ambiguous text cannot advance',()=>{
 const s=state(),sim=simulator(s);sim.run('email');
 const receipt=text=>({operationId:s.pending.id,result:{isError:false,content:[{type:'text',text}]}});
 assert.throws(()=>accept(structuredClone(s),receipt('Email request received')));
 accept(s,receipt('Email sent successfully!\nMessage ID: abc123\nThread ID: abc123'));
 assert.equal(s.emailReceipt.id,'abc123');assert.equal(s.queue[0].kind,'identity');
 assert.equal(sim.calls.filter(o=>o.kind==='email').length,0);
});
test('exact zero follows unchanged truthful email branch and sheet transfer precedes final completion',()=>{
 const p={...packet(),netCents:0};p.manual[17]=0;
 const s=createState(p,{authorization:{sheets:true,email:true}}),sim=simulator(s);
 sim.run('email');assert.equal(s.sheetTransfer.verified,true);assert.notEqual(s.stage,'complete');assert.equal(s.emailReceipt,undefined);
 assert.match(s.communication.email.body,/there are no additional proceeds to disburse/);assert.ok(!/loss|negative/.test(s.communication.email.body));
 accept(s,response(s,{id:'zero-email'}));sim.run();assert.equal(s.stage,'complete');assert.ok(!sim.calls.some(o=>o.kind==='copy'));
});
test('positive two-seller copy uses current token and verifies T; no email or P/Q',()=>{
 const s=state('positive'),sim=simulator(s);sim.run();assert.equal(s.stage,'complete');
 assert.equal(s.communication.replacements[8][1],s.property.token);assert.equal(s.document.token,s.property.token);
 assert.ok(!sim.calls.some(o=>o.kind==='email'));assert.match(sim.calls.find(o=>o.kind==='final-write').args.range,/!T1439$/);
 assert.ok(confirmation(s).includes('Please see the attached release letter'));assert.ok(!confirmation(s).includes('col P'));
});
test('inherited writer access needs explicit approval tied to this document and token',()=>{
 const s=state('positive'),sim=simulator(s);sim.run('share');
 const r=response(s,{fileId:s.document.id,domain:'opendoor.com',role:'writer'});
 assert.throws(()=>accept(structuredClone(s),r),/sharing not confirmed/);
 s.inheritedSharingApproval={documentId:s.document.id,token:'OTHER',userInstruction:'Keep existing access'};
 assert.throws(()=>accept(structuredClone(s),r),/sharing not confirmed/);
 s.inheritedSharingApproval.token=s.property.token;accept(s,r);
 assert.equal(s.queue[0].kind,'replace');assert.match(s.warnings.at(-1),/inherited/);
});
test('missing rows append once with response-derived row and fresh duplicate checks',()=>{
 const s=state('negative'),sim=simulator(s,{missing:true,formula:'occupied'});sim.run();
 assert.equal(s.stage,'complete');assert.deepEqual(s.rows,[1478,1478,1478]);assert.equal(sim.calls.filter(o=>o.kind==='append').length,3);
 assert.ok(sim.calls.filter(o=>o.kind==='scan-result').every(o=>o.args.range.endsWith('20000')));
});
for(const formula of ['literal','error','occupied'])test(`${formula} scratch fallback keeps complete scans and clears only owned scratch`,()=>{
 const s=state(),sim=simulator(s,{formula});sim.run();assert.equal(s.stage,'complete');
 assert.equal(sim.calls.filter(o=>o.kind==='scratch-write').length,formula==='occupied'?0:1);
 assert.equal(sim.calls.filter(o=>o.kind==='scratch-clear').length,formula==='occupied'?0:1);
 if(formula==='occupied'){
  for(let i=0;i<3;i++)assert.equal(sim.calls.filter(o=>o.kind==='scratch-probe'&&o.i===i).length,1);
  assert.ok(s.grids.every(g=>g.scratchUnavailable));
  assert.ok(sim.calls.filter(o=>o.kind==='scan-result').length>=6);
 }
});
test('duplicate beyond old row ceiling blocks with both row numbers',()=>{
 const s=state(),sim=simulator(s,{duplicate:true});assert.throws(()=>sim.run(),/1439, 19001/);assert.ok(!sim.calls.some(o=>o.kind==='write'||o.kind==='append'||o.kind==='email'));
});
test('changed token stops immediately before write',()=>{
 const s=state(),sim=simulator(s);const o=sim.run('identity');assert.throws(()=>accept(s,response(s,{range:o.args.range,values:[['OTHER']]})),/Token moved/);
});
test('uncertain email cannot replay or write completion fields',()=>{
 const s=state(),sim=simulator(s);sim.run('email');assert.throws(()=>accept(s,response(s,{message:'request received'})),/not positively confirmed/);assert.throws(()=>begin(s),/Pending operation/);assert.ok(!s.emailReceipt);
});
test('uncertain copy cannot replay and old template ID is rejected',()=>{
 const s=state('positive'),sim=simulator(s);sim.run('copy');assert.throws(()=>accept(s,response(s,{id:TEMPLATE,originalFileId:TEMPLATE})),/Copy ID/);assert.throws(()=>begin(s),/Pending operation/);
});
test('atomic batch rejection runs nine ordered single replacements',()=>{
 const s=state('positive'),sim=simulator(s,{batchRejected:true});sim.run();assert.equal(s.stage,'complete');assert.equal(sim.calls.filter(o=>o.kind==='replace-single').length,9);
});
test('unsupported sign, ambiguous names, invalid email, preview writes and foreign responses are blocked',()=>{
 assert.throws(()=>createState({...packet(),branch:'blocked',netCents:0}),/review/);
 assert.throws(()=>communication({...packet(),seller:'A and B and C'},'x'),/Ambiguous/);
 assert.throws(()=>communication({...packet(),email:'a@example.com,b@example.com'},'x'),/email/);
 const s=createState(packet());const sim=simulator(s);assert.throws(()=>sim.run(),/Preview stop/);
 assert.throws(()=>accept(s,{operationId:'wrong',result:{}}),/not for this pending/);
});
test('case-sensitive full TSV scan preserves blank row offsets and quoted fields',()=>{
 const expected=range(0,'B1:B20000');const result={range:expected,content:`Spreadsheet: 'Manual Data Raw'\nRange: ${expected}\n\nToken\nabc123\n\n AbC123 \n`};
 assert.deepEqual(matchingRows(result,0,'AbC123'),[4]);assert.deepEqual(parseTSV('"one\ntwo"\tthree\n'),[['one\ntwo','three']]);
 assert.throws(()=>matchingRows({...result,truncated:true},0,'AbC123'),/Incomplete/);
});
test('single seller leaves second signer placeholder empty',()=>{
 const c=communication({...packet('positive'),seller:'Alex Smith Jr.'},'date');assert.equal(c.replacements[7][1],'');assert.equal(c.replacements[5][1],'Alex Smith Jr.');
});
test('wrong T readback and zero-match date cannot report success',()=>{
 const s=state('positive'),sim=simulator(s);const o=sim.run('final-values');assert.throws(()=>accept(s,response(s,{range:o.args.range,values:[['https://docs.google.com/document/d/wrong/edit']]})),/values mismatch/);assert.throws(()=>confirmation(s),/before verification/);
 const d=state('positive'),sim2=simulator(d);sim2.run('date');assert.throws(()=>accept(d,response(d,{documentId:d.document.id,occurrencesChanged:0})),/date was not uniquely/);
});
test('CLI emits a runnable direct connector call and captures an untranscribed response',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cnml-entry-'));
 try{
  await mkdir(join(dir,'automation'));await mkdir(join(dir,'runs'));
  for(const name of ['proceeds.mjs','proceeds-core.mjs'])await copyFile(resolve('automation',name),join(dir,'automation',name));
  const file=join(dir,'fixture_state.html');await writeFile(file,'fixture');
  const s=createState({...packet(),path:file,sha256:createHash('sha256').update('fixture').digest('hex')});const path=join(dir,'runs','state.json');
  await writeFile(path,JSON.stringify(s));await writeFile(join(dir,'runs','proceeds-ledger.json'),JSON.stringify({completed:{},documents:{},active:{path,token:s.property.token}}));
  const cli=join(dir,'automation','proceeds.mjs');const output=JSON.parse(execFileSync(process.execPath,[cli,'next',path],{encoding:'utf8'}));
  let captured='';const result={structuredContent:{sheets:SHEETS.map(sh=>({title:sh.name,gridProperties:{rowCount:2000,columnCount:45}}))}};
  await vm.runInNewContext(`(async()=>{${output.toolCall.code}})()`,{tools:{mcp__google_sheets__get_metadata:async args=>{assert.equal(args.spreadsheet_id,HUB);return result},apply_patch:async patch=>{captured=patch;return {ok:true}}},text:()=>{}});
  const body=captured.split('\n').slice(2,-1).map(line=>line.slice(1)).join('\n');const envelope=JSON.parse(body);assert.deepEqual(envelope.result,result);
  assert.throws(()=>execFileSync(process.execPath,[cli,'next',path],{stdio:'pipe'}),/Pending operation/);
  const responsePath=join(dir,'response.json');await writeFile(responsePath,body);execFileSync(process.execPath,[cli,'accept',path,responsePath],{stdio:'pipe'});
  assert.equal(JSON.parse(await readFile(path,'utf8')).queue[0].kind,'scratch-probe');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('extractor selects locked data-col values, 15 rows, reordered Table2, blank null and independent SF',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cnml-v60-'));
 try{
  const rows=Array.from({length:15},(_,i)=>`<tr data-row-id="row${i}"><td class="cb"></td><td>Subject ${i} [source]</td><td data-col="credit">${i===0?'$1,000.00':'$5.00'}</td><td data-col="debit">${i===4||i===5?'enter amount':'$20.00'}</td><td class="ap">$33.00</td><td><span class="adj-text">${i===14?'fee checked':''}</span><table><tbody><tr><td>nested</td></tr></tbody></table></td></tr>`).join('');
  const field=(label,value)=>`<tr><td class="cb"></td><td>${label}</td><td class="src"></td><td class="editable">${value}</td></tr>`;
  const html=`<h1>123 Test Ln</h1><div>Seller · Flip Token: AbC123 · CP Version: v45</div><div class="flagbox">Warning</div><table id="upside"><tbody>${rows}</tbody><tfoot><tr><td id="up-net" class="net-neg">−$100.00</td><td class="ap">−$99.00</td><td id="delta-net">−$1.00</td></tr></tfoot></table><table><thead><tr><th>Field</th></tr></thead><tbody>${field('Estimated Upside Proceeds','$150.00')}${field('Seller Email','[HS suggest] seller@example.com')}${field('Seller Full Name','Alex Smith')}</tbody></table>`;
  const file=join(dir,'fixture_state.html');await writeFile(file,html);
  const p=JSON.parse(execFileSync((process.env.CNML_PYTHON || 'python3'),[resolve('automation/extract_proceeds.py'),file],{encoding:'utf8'}));
  assert.equal(p.rows.length,15);assert.equal(p.manual[3],1000);assert.equal(p.manual[4],-20);assert.equal(p.manual[6],null);assert.equal(p.subsidy,null);assert.equal(p.sfReferenceCents.X,3300);assert.equal(p.estimatedCents,15000);assert.equal(p.email,'seller@example.com');assert.equal(p.netCents,-10000);assert.match(p.notes[3],/^Warning\nFooter:/);assert.equal(p.notes[2],'• Subject 14 — fee checked');
  const bad=join(dir,'original.html');await writeFile(bad,html);assert.throws(()=>execFileSync((process.env.CNML_PYTHON || 'python3'),[resolve('automation/extract_proceeds.py'),bad],{stdio:'pipe'}),/Download with State/);
  await writeFile(file,html.replace('−$100.00','$0.00').replace('class="net-neg"','class="net-pos"'));
  const zero=JSON.parse(execFileSync((process.env.CNML_PYTHON || 'python3'),[resolve('automation/extract_proceeds.py'),file],{encoding:'utf8'}));assert.equal(zero.netCents,0);assert.equal(zero.branch,'negative');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('portable fresh ledger checks existing sheet status or letter before new writes',()=>{
 for(const existing of [['','Zero Proceeds','','',''],['','','','','https://docs.google.com/document/d/existing/edit']]){
  const s=state(),sim=simulator(s,{formula:'occupied'});const o=sim.run('prior-output');
  assert.equal(o.kind,'prior-output');
  assert.throws(()=>accept(s,response(s,{range:o.args.range,values:[existing]})),/Existing Accounting Audit/);
  assert.ok(!sim.calls.some(x=>['write','append','copy','email'].includes(x.kind)));
 }
});
test('standalone intake accepts uploaded HTML without browser state and preserves local ledger guards',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cnml-upload-'));
 try{
  await mkdir(join(dir,'automation'));
  for(const name of ['proceeds.mjs','proceeds-core.mjs','extract_proceeds.py'])await copyFile(resolve('automation',name),join(dir,'automation',name));
  const rows=Array.from({length:15},(_,i)=>`<tr data-row-id="row${i}"><td></td><td>Subject ${i}</td><td data-col="credit">$5.00</td><td data-col="debit">$20.00</td><td class="ap">$0.00</td></tr>`).join('');
  const field=(k,v)=>`<tr><td>${k}</td><td class="editable">${v}</td></tr>`;
  const html=`<h1>123 Test Ln</h1><div>Flip Token: UPLOAD123 · CP Version: v45</div><table id="upside"><tbody>${rows}</tbody><tfoot><tr><td id="up-net" class="net-neg">-$10.00</td></tr></tfoot></table><table><tr><th>Field</th></tr>${field('Seller Full Name','Test Seller')}${field('Seller Email','seller@example.com')}${field('Estimated Upside Proceeds','$1.00')}</table>`;
  const input=join(dir,'input_state.html');await writeFile(input,html);
  const cli=join(dir,'automation','proceeds.mjs'),path=join(dir,'runs','case','state.json');
  const run=(...args)=>execFileSync(process.execPath,[cli,...args],{encoding:'utf8',stdio:'pipe'});
  assert.equal(JSON.parse(run('prepare',path,input)).stage,'ready');
  const saved=JSON.parse(await readFile(path,'utf8'));assert.equal(saved.inputOrigin.kind,'uploaded_download_with_state');assert.equal(saved.upstream,undefined);assert.equal(saved.pending,undefined);
  assert.equal(JSON.parse(run('preview',path)).token,'UPLOAD123');
  assert.throws(()=>run('prepare',path,input),/State already exists/);
  assert.throws(()=>run('prepare',join(dir,'runs','second.json'),input),/Finish or reconcile active property/);
  const approval=join(dir,'approval.json');
  const scope={userInstruction:'Process this reviewed file',token:saved.property.token,sha256:saved.property.sha256,sheets:true,email:true,letter:false};
  await writeFile(approval,JSON.stringify(scope));assert.throws(()=>run('authorize',path,approval),/Operator must confirm/);
  await writeFile(approval,JSON.stringify({...scope,sourceReviewComplete:true,sellerEmailFromProgramAgreement:true,exclusiveProcessingConfirmed:true}));run('authorize',path,approval);
  await writeFile(input,html+'changed');assert.throws(()=>run('next',path),/Source file changed/);
  await writeFile(input,html);
  const ledger=join(dir,'runs','proceeds-ledger.json');await writeFile(ledger,JSON.stringify({active:null,documents:{},completed:{UPLOAD123:{sha256:saved.property.sha256}}}));
  assert.throws(()=>run('prepare',join(dir,'runs','repeat.json'),input),/already completed/);
  const original=join(dir,'original.html');await writeFile(original,html);assert.throws(()=>run('prepare',join(dir,'runs','bad.json'),original),/Download with State/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
