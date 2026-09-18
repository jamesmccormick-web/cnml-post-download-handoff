import {createHash} from 'node:crypto';
export const HUB='1ox5xlhexTMMWVSi24rm76MxTRf6iSUsPG0P2zAGBe8M';
export const TEMPLATE='18wJdU5wuzdXO3FH5M_vvw3_WHZC0t0zV8saM-2yeSqM';
export const FOLDER='1qLc4Vcg-OgOJKjw0XUkRex1maSMJrNf3';
export const SHEETS=[{name:'Manual Data Raw',key:'B',max:22},{name:'Manual Audit Notes from Screenshots',key:'A',max:4},{name:'Accounting Audit',key:'A',max:20}];
const assert=(v,m)=>{if(!v)throw new Error(m)};
export const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const range=(i,r)=>`'${SHEETS[i].name}'!${r}`;
const transport=v=>v===null?'':v;
export function unwrap(result,kind){
 assert(result&&!result.isError,'Connector reported an error; reconcile the pending operation before proceeding');
 if(result.structuredContent)return result.structuredContent;
 for(const c of result.content??[])if(c.type==='text'){try{const p=JSON.parse(c.text);if(p&&typeof p==='object')return p}catch{}}
 if(kind==='email'&&result.content?.length===1&&result.content[0].type==='text'){
  const sent=/^Email sent successfully!\nMessage ID: ([a-f0-9]+)\nThread ID: ([a-f0-9]+)\s*$/.exec(result.content[0].text);
  if(sent)return {success:true,messageId:sent[1],threadId:sent[2]};
 }
 throw new Error('Unrecognized connector result; preserve response and reconcile, do not assume success');
}
// TSV is parsed locally from the complete connector response, never retyped by the agent.
export function parseTSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&(quoted||cell==='')){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c==='\t'&&!quoted){row.push(cell);cell=''}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}else cell+=c}
 assert(!quoted,'Incomplete quoted TSV response');if(cell!==''||row.length){row.push(cell);rows.push(row)}return rows;
}
export function cells(result,expectedRange,gridRange){
 assert(result.range===expectedRange,`Unexpected response range: ${result.range}`);
 assert(result.truncated!==true&&result.hasMore!==true&&!result.nextPageToken,'Incomplete range response');
 assert(!/\btruncated\b|\brows? omitted\b|\.\.\.|…/i.test(result.content??''),'Incomplete or summarized range response');
 if(Array.isArray(result.values))return result.values;
 assert(typeof result.content==='string','Missing fetched content');
 const prefix=`Spreadsheet: '${expectedRange.match(/^'(.+)'!/)[1]}'\nRange: ${expectedRange}\n\n`;
 const gridPrefix=gridRange?`Spreadsheet: '${expectedRange.match(/^'(.+)'!/)[1]}'\nRange: ${gridRange}\n\n`:null;
 const matched=result.content.startsWith(prefix)?prefix:gridPrefix&&result.content.startsWith(gridPrefix)?gridPrefix:null;
 assert(matched,'Unrecognized fetch framing; do not guess row numbers');
 const body=result.content.slice(matched.length);
 // The connector reports an empty single cell using this exact sentinel.
 // Keep full-column scans strict: this must not become proof of token absence.
 if(/^'[^']+'![A-Z]+[1-9]\d*$/.test(expectedRange)&&body==='No data found in the specified range.')return [];
 return parseTSV(body);
}
export function matchingRows(result,i,token,gridRows){
 const gridRange=Number.isInteger(gridRows)&&gridRows>0&&gridRows<=20000?range(i,`${SHEETS[i].key}1:${SHEETS[i].key}${gridRows}`):undefined;
 const data=cells(result,range(i,`${SHEETS[i].key}1:${SHEETS[i].key}20000`),gridRange);
 assert(data.length<=20000&&data.every(r=>r.length<=1),'Token scan must be a complete single column');
 return data.flatMap((r,j)=>String(r[0]??'').trim()===token.trim()?[j+1]:[]);
}
export function sellers(value){
 const result=value.replace(/\s*\r?\n\s*(?=a\/k\/a\b)/gi,' ').split(/\s+(?:&|and)\s+/i).map(x=>x.trim()).filter(Boolean);
 assert(result.length>=1&&result.length<=2&&result.every(x=>!/[\n\r\[\]]/.test(x)),'Ambiguous seller names');
 return result;
}
export function communication(p,date){
 const names=sellers(p.seller);
 assert(/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(p.email),'Missing or ambiguous seller email');
 assert(!/[\r\n]/.test(p.address),'Invalid address');
 const amount=(p.netCents/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 const replacements=[['Hello [Seller],',`Hello ${names[0]},`],['[Property]',p.address],['Property Address',p.address],['[Seller(s)]',names.join(' & ')],['in the amount of $____,',`in the amount of $${amount},`],['[SELLER]',names[0]],['[EMAIL]',p.email],['[SELLER 2, if applicable]',names[1]??''],['[Identifier]',p.token]];
 return {names,amount,date,replacements,requests:replacements.map(([text,replaceText])=>({replaceAllText:{containsText:{text,matchCase:false},replaceText}})),
 email:{from:'executive.experience@opendoor.com',to:p.email,cc:'executive.experience@opendoor.com',subject:`Cash Now, More Later - ${p.address}`,html:false,
 body:`Hello ${names[0]},\n\nThis is the Executive Experience Specialist at Opendoor, following up regarding the Cash Now, More Later Program Agreement.\n\nThis message is to inform you that after reselling your home, there are no additional proceeds to disburse to you after accounting for resale costs. While understanding this may not be the outcome we all were hoping for, please refer to your Cash Now, More Later Program Agreement and contact us if you have any questions.\n\nThank you,\n\nOpendoor`}};
}
const op=(kind,tool,args,mutation=false,scope='sheets',context={})=>({kind,tool:`mcp__${tool}`,args,mutation,scope,...context});
const fetchOp=(kind,i,r,extra={})=>op(kind,'google_sheets__fetch',{spreadsheet_id:HUB,range:range(i,r),include_hidden_rows:true},false,'sheets',{i,...extra});
const updateOp=(kind,i,r,values,extra={})=>op(kind,'google_sheets__update',{spreadsheet_id:HUB,range:range(i,r),values:values.map(row=>row.map(transport))},true,'sheets',{i,...extra});
const fullScan=(i,purpose)=>fetchOp('scan-result',i,`${SHEETS[i].key}1:${SHEETS[i].key}20000`,{purpose});
function scan(s,i,purpose){
 const grid=s.grids[i];
 if(s.formulaDisabled||grid.scratchUnavailable||grid.columnCount<=SHEETS[i].max)return fullScan(i,purpose);
 return fetchOp('scratch-probe',i,grid.scratch,{purpose});
}
function found(s,i,purpose,rows){
 assert(rows.length<=1,`Duplicate token ${s.property.token} on ${SHEETS[i].name}: rows ${rows.join(', ')}`);
 if(purpose==='upfront'){s.rows[i]=rows[0]??null;return i<2?[fullScan(i+1,'upfront')]:[preflightStart(s)]}
 assert(rows.length===1,`Post-write token missing on ${SHEETS[i].name}`);
 assert(rows[0]===s.rows[i],`Row moved during write on ${SHEETS[i].name}: expected ${s.rows[i]}, actual ${rows[0]}`);
 if(purpose==='raw')return [fetchOp('verify-written',0,`A${s.rows[0]}:R${s.rows[0]}`)];
 if(purpose==='notes')return [fetchOp('verify-written',1,`A${s.rows[1]}:D${s.rows[1]}`)];
 if(purpose==='accounting')return [fetchOp('verify-written',2,`D${s.rows[2]}`)];
 if(purpose==='final'){s.stage='complete';return []}
 throw new Error('Unknown scan purpose');
}
function preflightStart(s){
 return s.rows[2]?fetchOp('prior-output',2,`P${s.rows[2]}:T${s.rows[2]}`):destinationPreflight(s);
}
function destinationPreflight(s){return s.property.branch==='positive'?op('folder-preflight','google_drive__get_metadata',{file_id:FOLDER},false,'letter'):startWrite(s,0)}
function startWrite(s,i){
 return s.rows[i]?fetchOp('identity',i,`${SHEETS[i].key}${s.rows[i]}`,{purpose:'write'}):fullScan(i,'preappend');
}
function rowValues(s,i){const p=s.property;return i===0?p.manual:i===1?p.notes:[p.token,'','',p.estimatedCents===null?null:p.estimatedCents/100]}
function write(s,i){
 const r=s.rows[i],end=['R','D','D'][i];
 return updateOp('write',i,i===2?`D${r}`:`A${r}:${end}${r}`,[i===2?[rowValues(s,i)[3]]:rowValues(s,i)]);
}
function branchStart(s){
 if(s.property.branch==='positive')return op('copy','google_drive__copy_file',{file_id:TEMPLATE,new_name:`Cash Now More Later - ${s.property.address}`,parentFolderId:FOLDER},true,'letter');
 assert(s.property.branch==='negative','Unsupported sign requires review');
 return op('email','gmail__send_email',s.communication.email,true,'email');
}
const finalIdentity=s=>fetchOp('identity',2,`A${s.rows[2]}`,{purpose:'final'});
const columnLetter=n=>{let out='';for(;n;n=Math.floor((n-1)/26))out=String.fromCharCode(65+(n-1)%26)+out;return out};

function assertCellValues(actual,expected){
 const equal=(a,b)=>b===''?(a===undefined||a===null||a===''):typeof b==='number'?(typeof a==='number'?a===b:typeof a==='string'&&a.trim()!==''&&Number(a.replace(/[$,]/g,''))===b):a===b;
 assert(actual.length<=expected.length&&expected.every((row,i)=>row.every((v,j)=>equal(actual[i]?.[j],v))),'Written values do not match the extracted packet');
}
export function assertOperation(s,o){
 const p=s.property,r=s.rows[o.i],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const fail=()=>{throw new Error('Operation outside the v60 write contract; stop rather than improvise')};
 if(!o.mutation){
  assert(['mcp__google_sheets__fetch','mcp__google_sheets__get_metadata','mcp__google_drive__get_metadata','mcp__google_docs__fetch'].includes(o.tool),'Mutation cannot be disguised as a read');
  if(o.tool.startsWith('mcp__google_sheets__'))assert(o.args.spreadsheet_id===HUB,'Wrong spreadsheet');
  return;
 }
 let expected,tool,scope='sheets';
 const sheet=(i,cell,values)=>({spreadsheet_id:HUB,range:range(i,cell),values:values.map(row=>row.map(transport))});
 if(['write','subsidy','final-write'].includes(o.kind)){
  assert(Number.isInteger(r)&&r>1,'Unverified target row');
  tool='mcp__google_sheets__update';
  if(o.kind==='write')expected=o.i===0?sheet(0,`A${r}:R${r}`,[p.manual]):o.i===1?sheet(1,`A${r}:D${r}`,[p.notes]):o.i===2?sheet(2,`D${r}`,[[p.estimatedCents===null?null:p.estimatedCents/100]]):fail();
  if(o.kind==='subsidy'){assert(o.i===0,'Wrong subsidy sheet');expected=sheet(0,`V${r}`,[[p.subsidy]])}
  if(o.kind==='final-write'){
   assert(o.i===2,'Wrong final sheet');
   if(p.branch==='positive'){assert(s.document?.token===p.token&&s.document?.sha256===p.sha256,'Foreign draft');expected=sheet(2,`T${r}`,[[`https://docs.google.com/document/d/${s.document.id}/edit`]])}
   else {assert(s.emailReceipt?.token===p.token,'Confirmed email required');expected=sheet(2,`P${r}:Q${r}`,[['Automation','Zero Proceeds']])}
  }
 }else if(o.kind==='append'){
  const proof=s.scanEvidence?.[o.i];
  assert(proof?.purpose==='preappend'&&proof.rows.length===0&&proof.responseDigest,'Full fresh absence proof required before append');
  tool='mcp__google_sheets__append';expected=sheet(o.i,`A:${o.i===0?'R':'D'}`,[rowValues(s,o.i)]);
 }else if(o.kind==='scratch-write'||o.kind==='scratch-clear'){
  const g=s.grids[o.i];assert(g&&g.columnCount>SHEETS[o.i].max,'Unsafe scratch column');
  const key=SHEETS[o.i].key,ref=`${key}1:${key}20000`,tok=p.token.replaceAll('"','""');
  const match=`ARRAYFORMULA(EXACT(TRIM(${ref}),"${tok}"))`;
  const formula=`="COUNT:"&SUMPRODUCT(--${match})&";ROW:"&IFERROR(MATCH(TRUE,${match},0),0)`;
  tool='mcp__google_sheets__update';expected=sheet(o.i,`${columnLetter(g.columnCount)}1`,[[o.kind==='scratch-write'?formula:'']]);
 }else if(o.kind==='copy'){
  assert(p.branch==='positive','No letter for zero/negative');assert(s.destinationVerified?.folder===FOLDER&&s.destinationVerified?.template===TEMPLATE,'Destination preflight required');scope='letter';tool='mcp__google_drive__copy_file';expected={file_id:TEMPLATE,new_name:`Cash Now More Later - ${p.address}`,parentFolderId:FOLDER};
 }else if(o.kind==='share'){
  assert(p.branch==='positive'&&s.document?.token===p.token&&s.document?.sha256===p.sha256,'Foreign draft');
  scope='letter';tool='mcp__google_drive__share_file';expected={file_id:s.document?.id,type:'domain',domain:'opendoor.com',role:'reader'};
 }else if(o.kind==='replace'||o.kind==='replace-single'||o.kind==='date'){
  scope='letter';const c=communication(p,s.communication.date);assert(s.document?.token===p.token&&s.document?.sha256===p.sha256,'Foreign draft');
  if(o.kind==='replace'){tool='mcp__google_docs__apply_doc_updates';expected={document_id:s.document.id,requests:c.requests}}
  else {tool='mcp__google_docs__replace_text';if(o.kind==='date')expected={document_id:s.document.id,find:'Date:\nRe:',replace:`Date: ${c.date}\nRe:`};else{assert(Number.isInteger(o.replacementIndex)&&o.replacementIndex>=0&&o.replacementIndex<9,'Invalid replacement');const [find,replace]=c.replacements[o.replacementIndex];expected={document_id:s.document.id,find,replace,matchCase:false}}}
 }else if(o.kind==='email'){
  assert(p.branch==='negative'&&p.netCents<=0,'No seller email on positive branch');scope='email';tool='mcp__gmail__send_email';expected=communication(p,s.communication.date).email;
 }else fail();
 assert(o.tool===tool&&o.scope===scope&&same(o.args,expected),'Operation outside the v60 write contract; stop rather than improvise');
}

export function requiredTools(p){return ['mcp__google_sheets__get_metadata','mcp__google_sheets__fetch','mcp__google_sheets__update','mcp__google_sheets__append',...(p.branch==='positive'?['mcp__google_drive__get_metadata','mcp__google_drive__copy_file','mcp__google_drive__share_file','mcp__google_docs__apply_doc_updates','mcp__google_docs__replace_text','mcp__google_docs__fetch']:['mcp__gmail__send_email']),'apply_patch']}
export function createState(property,{date,authorization={}}={}){
 assert(property.version===60&&property.manual.length===18&&property.notes.length===4,'Invalid v60 extraction');
 assert(property.branch!=='blocked','Unsupported sign: review required before deployment');
 assert(Number.isSafeInteger(property.netCents)&&property.branch===(property.netCents<=0?'negative':'positive'),'Inconsistent proceeds branch');
 const comm=communication(property,date??new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',month:'long',day:'numeric',year:'numeric'}).format(new Date()));
 return {version:2,stage:'ready',property,propertyDigest:digest(property),communication:comm,authorization,rows:[null,null,null],grids:[],scanEvidence:{},history:[],warnings:[...property.warnings],queue:[op('metadata','google_sheets__get_metadata',{spreadsheet_id:HUB})]};
}
export function nextOperation(s){
 assert(digest(s.property)===s.propertyDigest,'Property packet changed');
 assert(!s.pending,'Pending operation exists; accept its captured result. Never replay an uncertain mutation.');
 assert(s.stage!=='complete','Property already complete');
 assert(s.queue.length,'No next operation');
 const next=s.queue[0];
 assertOperation(s,next);
 if(next.mutation)assert(s.authorization?.[next.scope]===true,`Preview stop: missing deployment authorization for ${next.scope}`);
 return next;
}
export function begin(s){
 const next=nextOperation(s);
 if(next.kind==='copy')s.communication.date=new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',month:'long',day:'numeric',year:'numeric'}).format(new Date());
 s.pending={...next,id:digest({index:s.history.length,next,token:s.property.token,sha:s.property.sha256})};return s.pending;
}
export function accept(s,envelope){
 assert(s.pending&&envelope.operationId===s.pending.id,'Response is not for this pending operation');
 const o=s.pending,p=s.property;let added=[];
 assertOperation(s,o);
 // A documented atomic API rejection is safe to fall back from; a timeout is not.
 if(o.kind==='replace'&&envelope.result?.isError===true&&/\b(400|INVALID_ARGUMENT|not available|unknown tool)\b/i.test(JSON.stringify(envelope.result))&&!/timeout|timed out/i.test(JSON.stringify(envelope.result))){
  const [find,replace]=s.communication.replacements[0];
  s.queue.shift();s.queue.unshift(op('replace-single','google_docs__replace_text',{document_id:s.document.id,find,replace,matchCase:false},true,'letter',{replacementIndex:0}));
  s.warnings.push('Atomic batch rejected; using the same nine replacements sequentially.');
  s.history.push({operationId:o.id,kind:o.kind,rejected:true,resultDigest:digest(envelope.result)});delete s.pending;return s;
 }
 const r=unwrap(envelope.result,o.kind);
 if(o.tool.startsWith('mcp__google_sheets__')&&r.spreadsheetId)assert(r.spreadsheetId===HUB,'Wrong spreadsheet response');
 if(o.tool==='mcp__google_sheets__update')assert(r.updatedRange?.replaceAll("'",'')===o.args.range.replaceAll("'",''),'Update affected a different range');
 if(o.kind==='metadata'){
  s.grids=SHEETS.map(sh=>{const matches=r.sheets.filter(x=>x.title===sh.name);assert(matches.length===1,'Missing or duplicate sheet title');const g=matches[0].gridProperties;assert(Number.isInteger(g?.rowCount)&&g.rowCount>0&&Number.isInteger(g?.columnCount)&&g.columnCount>=sh.max,'Invalid sheet grid metadata');assert(g.rowCount<=20000,'Sheet exceeds scan ceiling; widen protocol before proceeding');if(g.rowCount>=18000)s.warnings.push(`${sh.name} is approaching the 20,000-row scan ceiling.`);return {...g,scratch:`${columnLetter(g.columnCount)}1`}});
  added=[fullScan(0,'upfront')];
 }else if(o.kind==='scratch-probe'){
  const value=String(cells(r,o.args.range)[0]?.[0]??'');
  if(value!==''){
   // Keep using read-only scans for this sheet throughout this property run.
   s.grids[o.i].scratchUnavailable=true;
   added=[fullScan(o.i,o.purpose)];
  }
  else {
   const key=SHEETS[o.i].key,ref=`${key}1:${key}20000`,tok=p.token.replaceAll('"','""');
   const match=`ARRAYFORMULA(EXACT(TRIM(${ref}),"${tok}"))`;
   const formula=`="COUNT:"&SUMPRODUCT(--${match})&";ROW:"&IFERROR(MATCH(TRUE,${match},0),0)`;
   added=[updateOp('scratch-write',o.i,s.grids[o.i].scratch,[[formula]],{purpose:o.purpose,formula})];
  }
 }else if(o.kind==='scratch-write'){
  assert(r.updatedCells===1,'Scratch write not confirmed');
  added=[fetchOp('scratch-result',o.i,s.grids[o.i].scratch,{purpose:o.purpose,formula:o.formula})];
 }else if(o.kind==='scratch-result'){
  const value=String(cells(r,o.args.range)[0]?.[0]??'');
  const m=/^COUNT:(\d+);ROW:(\d+)$/.exec(value);
  // Only clear our own literal formula or its exact evaluated format. Never clear other content.
  assert(value===o.formula||m||/^#(?:REF!|ERROR!|VALUE!|N\/A|NAME\?)$/.test(value),'Scratch result changed; inspect and clean the owned scratch formula before continuing');
  if(!m)s.formulaDisabled=true;
  added=[updateOp('scratch-clear',o.i,s.grids[o.i].scratch,[['']],{purpose:o.purpose,match:m?[+m[1],+m[2]]:null})];
 }else if(o.kind==='scratch-clear'){
  assert(r.updatedCells===1,'Scratch cleanup not confirmed');
  // Count>1 needs the full scan so we can name all duplicate rows.
  if(!o.match||o.match[0]>1)added=[fullScan(o.i,o.purpose)];
  else {assert((o.match[0]===0&&o.match[1]===0)||(o.match[0]===1&&o.match[1]>0&&o.match[1]<=20000),'Invalid count/row pair');added=found(s,o.i,o.purpose,o.match[0]?[o.match[1]]:[])}
 }else if(o.kind==='scan-result'){
  const rows=matchingRows(r,o.i,p.token,s.grids[o.i].rowCount);
  s.scanEvidence??={};s.scanEvidence[o.i]={rows,purpose:o.purpose,responseDigest:digest(envelope.result),range:o.args.range};
  if(o.purpose==='preappend'){
   assert(rows.length<=1,`Duplicate token before append: ${rows}`);
   if(rows.length){s.rows[o.i]=rows[0];added=[startWrite(s,o.i)]}
   else added=[op('append','google_sheets__append',{spreadsheet_id:HUB,range:range(o.i,`A:${['R','D','D'][o.i]}`),values:[rowValues(s,o.i).map(transport)]},true,'sheets',{i:o.i})];
  }else added=found(s,o.i,o.purpose,rows);
 }else if(o.kind==='prior-output'){
  const values=cells(r,o.args.range)[0]??[];
  assert(!String(values[1]??'').trim()&&!String(values[4]??'').trim(),'Existing Accounting Audit proceeds status or letter link; reconcile prior work before any new business-data writes or communication');
  added=[destinationPreflight(s)];
 }else if(o.kind==='folder-preflight'){
  assert(r.id===FOLDER&&r.mimeType==='application/vnd.google-apps.folder'&&r.trashed!==true,'Designated release-letter output folder is unavailable; never substitute another folder');
  added=[op('template-preflight','google_drive__get_metadata',{file_id:TEMPLATE},false,'letter')];
 }else if(o.kind==='template-preflight'){
  assert(r.id===TEMPLATE&&r.mimeType==='application/vnd.google-apps.document'&&r.trashed!==true&&r.capabilities?.canCopy!==false,'Designated v60 template is unavailable or cannot be copied');
  s.destinationVerified={folder:FOLDER,template:TEMPLATE};
  added=[startWrite(s,0)];
 }else if(o.kind==='verify-written'){
  const expected=o.i===2?[[p.estimatedCents===null?'':p.estimatedCents/100]]:[rowValues(s,o.i).map(transport)];
  // Text-only connector readback flattens line breaks inside notes cells.
  // Compare that exact presentation only for notes; structured values stay exact.
  const displayed=o.i===1&&!Array.isArray(r.values)?expected.map(row=>row.map(v=>typeof v==='string'?v.replace(/\r?\n/g,' '):v)):expected;
  assertCellValues(cells(r,o.args.range),displayed);
  added=o.i===0?[fetchOp('verify-subsidy',0,`V${s.rows[0]}`)]:o.i===1?[startWrite(s,2)]:[branchStart(s)];
  if(o.i===2)s.sheetTransfer={verified:true,at:new Date().toISOString(),completionManagedBySheet:true};
 }else if(o.kind==='verify-subsidy'){
  assertCellValues(cells(r,o.args.range),[[transport(p.subsidy)]]);added=[startWrite(s,1)];
 }else if(o.kind==='identity'){
  assert(String(cells(r,o.args.range)[0]?.[0]??'').trim()===p.token,`Token moved at ${o.args.range}; stop before writing`);
  if(o.purpose==='write')added=[write(s,o.i)];
  else if(p.branch==='positive'){
   assert(s.document?.token===p.token&&s.document?.sha256===p.sha256,'Document belongs to another property');
   added=[updateOp('final-write',2,`T${s.rows[2]}`,[[`https://docs.google.com/document/d/${s.document.id}/edit`]])];
  }else {assert(s.emailReceipt,'Email not confirmed');added=[updateOp('final-write',2,`P${s.rows[2]}:Q${s.rows[2]}`,[['Automation','Zero Proceeds']])]}
 }else if(o.kind==='write'||o.kind==='append'){
  if(o.kind==='append'){
   const match=new RegExp(`^'?${SHEETS[o.i].name}'?!A(\\d+):[A-Z]+\\1$`).exec(r.updatedRange??'');
   assert(match&&r.updatedRows===1,'Append row not confirmed');s.rows[o.i]=+match[1];s.grids[o.i].rowCount=Math.max(s.grids[o.i].rowCount,s.rows[o.i]);
  }else assert(r.updatedCells===o.args.values[0].length,'Sheet update count mismatch');
  // A:R and V are intentionally adjacent operations, as required by v60.
  added=o.i===0?[updateOp('subsidy',0,`V${s.rows[0]}`,[[p.subsidy]])]:[scan(s,o.i,o.i===1?'notes':'accounting')];
 }else if(o.kind==='subsidy'){assert(r.updatedCells===1,'Subsidy write not confirmed');added=[scan(s,0,'raw')]}
 else if(o.kind==='copy'){
  assert(r.id&&r.id!==TEMPLATE&&r.originalFileId===TEMPLATE,'Copy ID not confirmed');
  s.document={id:r.id,token:p.token,sha256:p.sha256};
  added=[op('document-location','google_drive__get_metadata',{file_id:r.id},false,'letter')];
 }else if(o.kind==='document-location'){
  assert(r.id===s.document.id&&r.parents?.includes(FOLDER),'Copied letter is not in the designated output folder');
  added=[op('share','google_drive__share_file',{file_id:s.document.id,type:'domain',domain:'opendoor.com',role:'reader'},true,'letter')];
 }else if(o.kind==='share'){
  const retainedWriter=r.role==='writer'&&s.destinationVerified?.folder===FOLDER&&s.document?.token===p.token&&s.document?.sha256===p.sha256;
  assert(r.fileId===s.document.id&&r.domain==='opendoor.com'&&(r.role==='reader'||retainedWriter),'Domain sharing not confirmed');
  if(retainedWriter)s.warnings.push('Existing Opendoor Editor access retained in the verified designated folder; parent folder unchanged.');
  added=[op('replace','google_docs__apply_doc_updates',{document_id:s.document.id,requests:s.communication.requests},true,'letter')];
 }else if(o.kind==='replace-single'){
  const j=o.replacementIndex;
  assert(r.documentId===s.document.id&&r.occurrencesChanged===[1,1,1,1,1,2,1,1,1][j],'Sequential replacement count differs from template');
  if(j<8){const [find,replace]=s.communication.replacements[j+1];added=[op('replace-single','google_docs__replace_text',{document_id:s.document.id,find,replace,matchCase:false},true,'letter',{replacementIndex:j+1})]}
  else added=[op('date','google_docs__replace_text',{document_id:s.document.id,find:'Date:\nRe:',replace:`Date: ${s.communication.date}\nRe:`},true,'letter')];
 }else if(o.kind==='replace'){
  assert(r.documentId===s.document.id&&r.replies?.length===9,'Replacement batch response incomplete');
  const expected=[1,1,1,1,1,2,1,1,1];
  assert(r.replies.every((reply,j)=>reply.replaceAllText?.occurrencesChanged===expected[j]),'Template placeholders differ from v60; inspect copy before continuing');
  added=[op('date','google_docs__replace_text',{document_id:s.document.id,find:'Date:\nRe:',replace:`Date: ${s.communication.date}\nRe:`},true,'letter')];
 }else if(o.kind==='date'){
  assert(r.documentId===s.document.id&&r.occurrencesChanged===1,'Letter date was not uniquely replaced; do not replace bare signature Date labels');
  added=[op('document-check','google_docs__fetch',{document_id:s.document.id},false,'letter')];
 }else if(o.kind==='document-check'){
  assert(r.documentId===s.document.id&&typeof r.textContent==='string','Wrong document verification response');
  const t=r.textContent;
  assert(!/\[(Seller(?:\(s\)| 2, if applicable)?|Property|EMAIL|Identifier)\]|in the amount of \$____,/i.test(t),'Unfilled letter placeholders');
  for(const value of [p.token,p.address,p.email,...s.communication.names,`in the amount of $${s.communication.amount},`,`Date: ${s.communication.date}`])assert(t.includes(value),`Letter verification missing: ${value}`);
  s.warnings.push('Grey paragraph/table shading cannot be verified from the text response. Operator must inspect the draft and clear any shading to white in paragraph/table properties.');
  added=[finalIdentity(s)];
 }else if(o.kind==='email'){
  assert((r.id||r.messageId)&&r.success!==false&&!r.error,'Email send is not positively confirmed; do not retry or write P/Q');
  s.emailReceipt={id:r.id??r.messageId,token:p.token};added=[finalIdentity(s)];
 }else if(o.kind==='final-write'){
  assert(r.updatedCells===o.args.values[0].length,'Final Accounting Audit write not confirmed');
  added=[fetchOp('final-values',2,p.branch==='positive'?`T${s.rows[2]}`:`P${s.rows[2]}:Q${s.rows[2]}`)];
 }else if(o.kind==='final-values'){
  const expected=p.branch==='positive'?[`https://docs.google.com/document/d/${s.document.id}/edit`]:['Automation','Zero Proceeds'];
  assert(JSON.stringify(cells(r,o.args.range)[0])===JSON.stringify(expected),'Final Accounting Audit values mismatch');
  added=[fullScan(2,'final')];
 }else throw new Error(`Unsupported operation ${o.kind}`);
 s.history.push({operationId:o.id,kind:o.kind,tool:o.tool,args:o.args,resultDigest:digest(envelope.result),at:new Date().toISOString()});
 s.queue.shift();s.queue.unshift(...added);delete s.pending;return s;
}
export function confirmation(s){
 assert(s.stage==='complete','Cannot report success before verification completes');
 const p=s.property,c=s.communication;
 const branch=p.branch==='positive'?`✓ Cash Now More Later letter generated:\nhttps://docs.google.com/document/d/${s.document.id}/edit\nThis link has been saved to Accounting Audit col T, row ${s.rows[2]}, and the file lives in the release-letter output folder.\n\nSellers: ${c.names.join(' & ')} · Proceeds: $${c.amount} · Email: ${p.email}\n\nPlease see the attached release letter supporting your final proceeds. Once signed by all parties this will be forwarded to accounts payable for processing. Thank you for participating in the Cash Now More Later program.`:`✓ Zero-proceeds notification sent:\nSent to ${p.email} · Cc: executive.experience@opendoor.com\nSubject: ${c.email.subject}\nAccounting Audit col P updated to "Automation" · col Q updated to "Zero Proceeds."`;
 return `${branch}\n\nManual Data Raw row ${s.rows[0]}; audit notes row ${s.rows[1]}; Accounting Audit row ${s.rows[2]}.\nManual Data Raw col V: ${p.subsidy===null?'null':p.subsidy}\n${s.warnings.join('\n')}`;
}
