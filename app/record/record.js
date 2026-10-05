(function(){
  'use strict';
  var R=window.PracticeRecord,S=window.PracticeRecordStorage,session=null,pending=null,importRead=0;
  function $(id){return document.getElementById(id);}
  function el(tag,text){var n=document.createElement(tag);n.textContent=text;return n;}
  var scoreNames={rapport_opening:'Rapport & opening',listening_t_funnel:'Listening (broad before narrow)',understanding_goals:'Understanding my goals',explanation_next_steps:'Explanation & next steps',overall_confidence:'Would I come back?',ethics:'Professional responsibility',total:'Total'};
  function scoreName(area){var criterion=/\.c(\d+)(?:\.s(\d+))?$/.exec(area);return scoreNames[area]||(criterion?'Criterion '+criterion[1]+(criterion[2]?'.'+criterion[2]:''):area);}
  function status(text){$('storage-status').textContent=text;}
  function render(){var doc=session.get();$('entries').textContent='';$('milestones').textContent='';$('empty').textContent=doc.entries.length?'':'No entries yet. Add a live interview debrief or written critique after reviewing its feedback.';
    var milestones=R.milestones(doc.entries);if(!milestones.length)$('milestones').appendChild(el('li','Your milestones will appear as you record practice.'));
    milestones.forEach(function(m){$('milestones').appendChild(el('li',m.text));});
    doc.entries.forEach(function(e){var a=el('article','');a.appendChild(el('h3',e.matter_title));a.appendChild(el('p',e.date+' · '+e.matter_id.toUpperCase()+' · '+e.activity));var scores=el('ul','');e.scores.forEach(function(s){scores.appendChild(el('li',scoreName(s.area) + ': '+s.earned+' / '+s.possible));});a.appendChild(scores);$('entries').appendChild(a);});status(session.status());
  }
  S.choices($('storage-choices'),function(chosen){session=chosen;$('disclosure').hidden=true;$('record').hidden=false;render();$('main').focus();});
  $('export-json').addEventListener('click',function(){S.download('practice-record.json',JSON.stringify(session.get(),null,2)+'\n','application/json');status('Practice record exported as JSON.');});
  $('export-csv').addEventListener('click',function(){S.download('practice-record.csv',R.toCSV(session.get()),'text/csv');status('Practice record exported as CSV.');});
  $('print').addEventListener('click',function(){window.print();});
  $('clear').addEventListener('click',function(){$('clear-confirmation').hidden=false;$('clear-cancel').focus();});
  $('clear-cancel').addEventListener('click',function(){$('clear-confirmation').hidden=true;$('clear').focus();});
  $('clear-yes').addEventListener('click',function(){try{session.clear();importRead++;pending=null;$('apply-import').hidden=true;$('import-preview').textContent='';$('import-file').value='';$('clear-confirmation').hidden=true;render();$('clear').focus();}catch(e){status('Clearing failed. Use browser site-data controls after exporting a backup.');}});
  $('preview-import').addEventListener('click',function(){var read=++importRead;pending=null;$('apply-import').hidden=true;var file=$('import-file').files[0];if(!file){$('import-preview').textContent='Choose a JSON file.';return;}if(file.size>1048576){$('import-preview').textContent='File exceeds the 1 MB limit.';return;}var reader=new FileReader();reader.onerror=function(){if(read!==importRead)return;$('import-preview').textContent='This file could not be read.';};reader.onload=function(){if(read!==importRead)return;try{pending=R.parseImport(String(reader.result));$('import-preview').textContent='Validated '+pending.entries.length+' entries. Replace the current '+session.get().entries.length+' entries?';$('apply-import').hidden=false;}catch(e){$('import-preview').textContent='Import rejected: '+e.message;}};reader.readAsText(file);});
  $('import-file').addEventListener('change',function(){importRead++;pending=null;$('apply-import').hidden=true;$('import-preview').textContent='';});
  $('apply-import').addEventListener('click',function(){if(!pending)return;try{session.write(pending);pending=null;$('apply-import').hidden=true;render();$('import-preview').textContent='Practice record restored.';}catch(e){status(e.message);}});
}());
