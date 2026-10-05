'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const R = require('../../app/record/record-core.js');
const entry = (matter='m01', activity='interview', score=5, date='2026-10-05') => ({date,matter_id:matter,matter_title:'Synthetic matter',activity,scores:[{area:'rapport_opening',earned:score,possible:10}]});
test('save projection drops all narrative, draft and token fields', () => {
  const sc={axis_b:{rapport_opening:{score:7,comment:'PRIVATE'}},ethics_score:0,narrative:'PRIVATE',session_token:'SECRET'};
  const saved=R.fromScorecard('m01','Synthetic matter','interview',sc,'2026-10-05');
  assert.deepEqual(saved.scores,[{area:'rapport_opening',earned:7,possible:10},{area:'ethics',earned:0,possible:2}]);
  assert.equal(JSON.stringify(saved).includes('PRIVATE'),false);
  assert.equal(JSON.stringify(saved).includes('SECRET'),false);
});
test('milestones recognize revisions, improvement and breadth', () => {
  assert.deepEqual(R.milestones([]),[]);
  const entries=[entry(),entry('m01','interview',7),entry('m02','written critique'),entry('m03','interview')];
  entries[2].scores=[{area:'total',earned:6,possible:10},{area:'m02.rub.c01',earned:6,possible:10},{area:'m02.rub.c02',earned:5,possible:10}];
  assert.deepEqual(R.milestones(entries).map(x=>x.id),['interview','critique','revision','improvement','matters','skills']);
  assert.equal(R.milestones([entry(),entry('m01','interview',4)]).some(x=>x.id==='improvement'),false);
});
test('strict bounded imports and formula-safe CSV', () => {
  const doc={schema_version:1,entries:[entry()]};
  assert.deepEqual(R.parseImport(JSON.stringify(doc)),doc);
  assert.throws(()=>R.parseImport(JSON.stringify({...doc,transcript:'private'})));
  assert.throws(()=>R.parseImport(JSON.stringify({schema_version:99,entries:[]})));
  assert.throws(()=>R.parseImport(JSON.stringify({schema_version:1,entries:[{...entry(),draft:'private'}]})));
  assert.throws(()=>R.parseImport(JSON.stringify({schema_version:1,entries:[{...entry(),date:'2026-02-30'}]})));
  doc.entries[0].matter_title='=formula,"quoted"';
  assert.match(R.toCSV(doc), /'\=formula,""quoted""/);
});
test('blocked storage, write fallback, and preservation of invalid saved bytes', () => {
  const vm=require('node:vm'),fs=require('node:fs');
  const values=new Map();let fail=false;
  const backing={getItem:k=>values.get(k)||null,setItem(k,v){if(fail)throw Error('blocked');values.set(k,v);},removeItem:k=>values.delete(k)};
  const window={PracticeRecord:R,localStorage:backing,sessionStorage:backing};
  vm.runInNewContext(fs.readFileSync(require.resolve('../../app/record/record-storage.js'),'utf8'),{window,TextEncoder});
  const S=window.PracticeRecordStorage,session=S.open('session');
  assert.equal(values.has('sonsteng.practice-record.v1'),false);
  session.write({schema_version:1,entries:[entry()]});
  assert.equal(JSON.parse(values.get('sonsteng.practice-record.v1')).entries.length,1);
  fail=true;session.write({schema_version:1,entries:[entry(),entry()]});
  assert.equal(session.get().entries.length,2);assert.match(session.status(),/memory/);
  fail=false;values.set('sonsteng.practice-record.v1','{"schema_version":99}');
  const invalid=S.open('persistent');assert.throws(()=>invalid.write({schema_version:1,entries:[]}));
  assert.equal(values.get('sonsteng.practice-record.v1'),'{"schema_version":99}');
  invalid.clear();assert.equal(values.has('sonsteng.practice-record.v1'),false);
});
test('feedback save is explicit, saves scores only, and disables duplicate clicks', () => {
  const vm=require('node:vm'),fs=require('node:fs');
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.dataset={};this.disabled=false;}
    appendChild(e){this.children.push(e);return e;}
    addEventListener(name,fn){this.listeners[name]=fn;}
    setAttribute(){}
    focus(){}
    querySelector(){return this.children.find(e=>e.tag==='button');}
    click(){if(!this.disabled&&this.listeners.click)this.listeners.click();}
  }
  const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)};
  const window={PracticeRecord:R,sessionStorage:storage,localStorage:storage};
  const document={createElement:tag=>new Element(tag)};
  vm.runInNewContext(fs.readFileSync(require.resolve('../../app/record/record-storage.js'),'utf8'),{window,document,TextEncoder});
  const root=new Element('div');
  window.PracticeRecordStorage.attach(root,'m01','Synthetic matter','written critique',{total:{earned:8,possible:10},criteria:[{criterion_id:'m01.rub.c01',score:8,weight_points:10,evidence:'PRIVATE',suggestions:'PRIVATE'}],narrative:'PRIVATE',session_token:'SECRET'});
  assert.equal(saved.size,0);
  const [save,options,status]=root.children[0].children;
  save.click();assert.equal(options.hidden,false);assert.equal(saved.size,0);
  options.children.find(e=>e.dataset.recordMode==='session').click();
  const bytes=saved.get('sonsteng.practice-record.v1'),doc=JSON.parse(bytes);
  assert.equal(doc.entries.length,1);assert.equal(doc.entries[0].scores.length,2);
  assert.equal(/PRIVATE|SECRET/.test(bytes),false);assert.equal(save.disabled,true);
  save.click();assert.equal(JSON.parse(saved.get('sonsteng.practice-record.v1')).entries.length,1);
  assert.match(status.textContent,/Added/);
  assert.equal(root.children[0].children.find(e=>e.tag==='a').href,'../record/index.html');
});
test('choose file, preview and apply restores records; stale reads cannot be applied', () => {
  const vm=require('node:vm'),fs=require('node:fs');
  class Element {
    constructor(){this.listeners={};this.children=[];this.files=[];this.hidden=true;}
    addEventListener(name,fn){this.listeners[name]=fn;}
    appendChild(child){this.children.push(child);}
    focus(){}
    click(){this.listeners.click();}
  }
  const nodes=new Map(),readers=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  let saved={schema_version:1,entries:[]},writes=0;
  const session={get:()=>saved,status:()=>'',clear(){saved={schema_version:1,entries:[]};},write(doc){saved=doc;writes++;}};
  const window={PracticeRecord:R,PracticeRecordStorage:{choices(root,fn){fn(session);}}};
  class Reader {constructor(){readers.push(this);}readAsText(){} }
  vm.runInNewContext(fs.readFileSync(require.resolve('../../app/record/record.js'),'utf8'),{window,document:{getElementById:node,createElement:()=>new Element()},FileReader:Reader});
  const doc=JSON.stringify({schema_version:1,entries:[entry()]});
  node('import-file').files=[{size:doc.length}];
  node('preview-import').click();
  node('import-file').listeners.change();
  readers[0].result=doc;readers[0].onload();
  assert.equal(node('apply-import').hidden,true);
  node('apply-import').click();assert.equal(writes,0);
  node('preview-import').click();
  node('clear-yes').click();
  readers[1].result=doc;readers[1].onload();
  assert.equal(node('apply-import').hidden,true);
  node('apply-import').click();assert.equal(writes,0);
  node('import-file').files=[{size:doc.length}];
  node('import-file').listeners.change();
  node('preview-import').click();
  readers[2].result=doc;readers[2].onload();
  assert.match(node('import-preview').textContent,/Validated 1 entries/);
  assert.equal(node('apply-import').hidden,false);
  assert.equal(writes,0);
  node('apply-import').click();
  assert.deepEqual(saved,JSON.parse(doc));assert.equal(writes,1);
  assert.equal(node('apply-import').hidden,true);
  assert.equal(node('import-preview').textContent,'Practice record restored.');
});
test('milestones follow dates, compare matching scales and keep breadth independent', () => {
  const early=entry('m01','interview',7,'2026-10-04');
  const later=entry('m01','interview',5,'2026-10-05');
  assert.equal(R.milestones([later,early]).some(x=>x.id==='improvement'),false);
  const critique=(matter,earned,possible,date)=>({...entry(matter,'written critique',0,date),scores:[{area:matter+'.rub.c01',earned,possible}]});
  const changedScale=[critique('m01',4,5,'2026-10-04'),critique('m01',6,10,'2026-10-05')];
  assert.equal(R.milestones(changedScale).some(x=>x.id==='improvement'),false);
  const breadth=R.milestones(['m01','m02','m03'].map(m=>critique(m,6,10,'2026-10-05'))).map(x=>x.id);
  assert.ok(breadth.includes('matters'));
  assert.equal(breadth.includes('skills'),false);
  const totalOnly=critique('m01',6,10,'2026-10-05');totalOnly.scores=[{area:'total',earned:6,possible:10}];
  assert.equal(R.milestones([totalOnly]).some(x=>x.id==='skills'),false);
});
