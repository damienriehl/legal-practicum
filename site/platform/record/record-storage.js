(function(){
  'use strict';
  var R=window.PracticeRecord,KEY='sonsteng.practice-record.v1',memory={schema_version:1,entries:[]};
  function open(mode){
    var store=null,doc=memory,blocked=false,status='Memory only. Export before leaving this page.';
    if(mode!=='memory')try{
      store=mode==='persistent'?window.localStorage:window.sessionStorage;
      var raw=store.getItem(KEY),probe=KEY+'.probe';
      if(raw)try{doc=R.parseImport(raw);}catch(e){blocked=true;status='Saved data could not be read. It is preserved; clear it only after keeping a backup through browser site-data tools.';}
      store.setItem(probe,'1');store.removeItem(probe);
      if(!blocked)status=mode==='persistent'?'Saved on this device until cleared.':'Saved for this tab only.';
    }catch(e){store=null;status='Browser storage is unavailable. Export before leaving this page.';}
    return {get:function(){return doc;},status:function(){return status;},write:function(next){
      if(blocked)throw new Error('Unreadable saved data is preserved. Choose another storage option.');
      R.validate(next);var raw=JSON.stringify(next);if(new TextEncoder().encode(raw).length>1048576)throw new Error('Record exceeds the 1 MB limit. Export and clear before adding more.');
      if(store)try{store.setItem(KEY,raw);}catch(e){store=null;status='Storage became unavailable. This record remains in memory; export before leaving this page.';}
      doc=next;memory=next;
    },clear:function(){if(store)store.removeItem(KEY);blocked=false;doc={schema_version:1,entries:[]};memory=doc;status='Local practice record cleared.';}};
  }
  function el(tag,text){var n=document.createElement(tag);if(text)n.textContent=text;return n;}
  function choices(root,callback){['persistent','session','memory'].forEach(function(mode){var b=el('button',mode==='persistent'?'Use persistent storage':mode==='session'?'Use session only':'Use memory only');b.type='button';b.className='btn btn--ghost';b.dataset.recordMode=mode;b.addEventListener('click',function(){callback(open(mode));});root.appendChild(b);});}
  function attach(root,matter,title,activity,sc){
    var entry;try{entry=R.fromScorecard(matter,title,activity,sc);}catch(e){return;}
    var box=el('section'),save=el('button','Add to my practice record'),options=el('div'),status=el('p');
    box.className='practice-save';save.type='button';save.className='btn btn--ghost';save.dataset.recordSave='';status.setAttribute('role','status');options.hidden=true;
    options.appendChild(el('p','Only the date, matter, activity and summary scores are saved. Records stay on this device unless you export them. Persistent storage lasts until cleared; avoid it on shared devices. Session storage lasts for this tab. Memory lasts only on this page.'));
    choices(options,function(session){try{var doc=session.get();session.write({schema_version:1,entries:doc.entries.concat([entry])});status.textContent='Added to your practice record. '+session.status();save.disabled=true;options.hidden=true;
      var link=el('a','My practice record');link.href='../record/index.html';box.appendChild(link);link.focus();
      if(/memory/i.test(session.status())){var exportButton=el('button','Export this record as JSON');exportButton.type='button';exportButton.className='btn btn--ghost';exportButton.addEventListener('click',function(){download('practice-record.json',JSON.stringify(session.get(),null,2),'application/json');});box.appendChild(exportButton);}
    }catch(e){status.textContent=e.message;}});
    save.addEventListener('click',function(){options.hidden=false;options.querySelector('button').focus();});box.appendChild(save);box.appendChild(options);box.appendChild(status);root.appendChild(box);
  }
  function download(name,text,type){var a=el('a'),url=URL.createObjectURL(new Blob([text],{type:type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},0);}
  window.PracticeRecordStorage={open:open,choices:choices,attach:attach,download:download};
}());
