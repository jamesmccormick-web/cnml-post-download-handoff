import test from 'node:test';
import assert from 'node:assert/strict';
import {bindings,checkedBindings} from '../tool-bindings.mjs';
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
