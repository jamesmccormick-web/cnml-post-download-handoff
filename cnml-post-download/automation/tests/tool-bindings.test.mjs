import test from 'node:test';
import assert from 'node:assert/strict';
import {bindings,checkedBindings,invocation,wrapperTool} from '../tool-bindings.mjs';
import {requiredTools} from '../proceeds-core.mjs';
test('catalog maps only approved Sheets and Gmail names and retains positive requirements',()=>{
 const names=requiredTools({branch:'positive'});const map=bindings(names,'runlayer-catalog');
 assert.equal(map.mcp__google_sheets__update,'update');
 assert.equal(map.mcp__google_drive__copy_file,'mcp__google_drive__copy_file');
 assert.equal(map.apply_patch,'apply_patch');
 assert.throws(()=>bindings(names,'guess'));
});
test('reject arbitrary bindings and missing tools; old direct checks still work',()=>{
 const names=requiredTools({branch:'negative'});
 assert.deepEqual(checkedBindings(names,{available:names}),bindings(names));
 const check={available:names,missing:[],profile:'runlayer-catalog',bindings:bindings(names,'runlayer-catalog')};
 assert.equal(checkedBindings(names,check).mcp__gmail__send_email,'send_email');
 assert.throws(()=>checkedBindings(names,{...check,missing:['send_email']}));
 assert.throws(()=>checkedBindings(names,{...check,bindings:{...check.bindings,mcp__gmail__send_email:'create_draft'}}));
 assert.throws(()=>checkedBindings(names,{...check,bindings:null}));
});

test('wrapper preserves exact operation payloads and never guesses unverified routes',()=>{
 for(const [canonical,alias,args] of [
 ['mcp__google_sheets__get_metadata','google_she_get_metadata',{spreadsheet_id:'hub'}],
 ['mcp__google_sheets__fetch','google_she_fetch',{spreadsheet_id:'hub',range:'A1:A20000'}],
 ['mcp__google_sheets__update','update',{spreadsheet_id:'hub',range:'V1',values:[['']]}],
 ['mcp__google_sheets__append','append',{spreadsheet_id:'hub',range:'A:R',values:[['token',null]]}],
 ['mcp__gmail__send_email','send_email',{to:'seller@example.com',from:'executive.experience@opendoor.com',cc:'executive.experience@opendoor.com',subject:'subject',body:'body',html:false}]
 ]) assert.deepEqual(invocation(canonical,args,'runlayer-wrapper'),{tool:wrapperTool,args:{tool_name:alias,arguments:args}});
 assert.equal(invocation('mcp__google_docs__fetch',{},'runlayer-wrapper').tool,'mcp__google_docs__fetch');
 const names=requiredTools({branch:'negative'});
 assert.throws(()=>checkedBindings(names,{profile:'runlayer-wrapper',available:names,bindings:{}}));
});
