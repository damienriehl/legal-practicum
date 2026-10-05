(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.PracticeRecord=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var axes=['rapport_opening','listening_t_funnel','understanding_goals','explanation_next_steps','overall_confidence'];
  function keys(o,expected){return o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===expected.slice().sort().join('|');}
  function text(s,max){return typeof s==='string'&&s.trim().length>0&&s.length<=max;}
  function validate(doc){
    if(!keys(doc,['schema_version','entries'])||doc.schema_version!==1||!Array.isArray(doc.entries)||doc.entries.length>1000)throw new Error('Unsupported or invalid record.');
    doc.entries.forEach(function(e){
      if(!keys(e,['date','matter_id','matter_title','activity','scores'])||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(Date.parse(e.date))||new Date(e.date).toISOString().slice(0,10)!==e.date||!/^m\d{2}$/.test(e.matter_id)||!text(e.matter_title,500)||!['interview','written critique'].includes(e.activity)||!Array.isArray(e.scores)||!e.scores.length||e.scores.length>100)throw new Error('Invalid practice entry.');
      var seen=new Set();
      e.scores.forEach(function(s){
        var area=e.activity==='interview'?axes.concat(['ethics']).includes(s.area):s.area==='total'||new RegExp('^'+e.matter_id+'\\.rub\\.c\\d+(?:\\.s\\d+)?$').test(s.area);
        if(!keys(s,['area','earned','possible'])||!area||seen.has(s.area)||!Number.isFinite(s.earned)||!Number.isFinite(s.possible)||s.possible<0||s.possible>10000||s.earned>(s.possible)||s.earned<(s.area==='ethics'?-2:0)||(e.activity==='interview'&&s.possible!==(s.area==='ethics'?2:10)))throw new Error('Invalid summary score.');
        seen.add(s.area);
      });
    });return doc;
  }
  function parseImport(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>1048576)throw new Error('File exceeds the 1 MB limit.');return validate(JSON.parse(raw));}
  function fromScorecard(matter,title,activity,sc,date){
    var scores=[];
    if(activity==='interview'){
      axes.forEach(function(k){if(sc.axis_b&&sc.axis_b[k])scores.push({area:k,earned:sc.axis_b[k].score,possible:10});});
      if(typeof sc.ethics_score==='number')scores.push({area:'ethics',earned:sc.ethics_score,possible:2});
    }else{
      if(sc.total)scores.push({area:'total',earned:sc.total.earned,possible:sc.total.possible});
      (sc.criteria||[]).forEach(function(c){scores.push({area:c.criterion_id,earned:c.score,possible:c.weight_points});});
    }
    var e={date:date||new Date().toISOString().slice(0,10),matter_id:matter,matter_title:title,activity:activity,scores:scores};validate({schema_version:1,entries:[e]});return e;
  }
  function milestones(entries){
    var found={},matters=new Set(),skills=new Set(),previous=new Map();
    entries.map(function(e,i){return {e:e,i:i};}).sort(function(a,b){return a.e.date.localeCompare(b.e.date)||a.i-b.i;}).forEach(function(item){
      var e=item.e;found[e.activity==='interview'?'interview':'critique']=true;matters.add(e.matter_id);
      // Criterion identifiers are matter-specific; skill breadth counts feedback
      // dimensions within each activity, never different matters as new skills.
      e.scores.forEach(function(s){if(s.area!=='total')skills.add(e.activity+':'+s.area.replace(/^m\d{2}\.rub\./,''));});
      var key=e.matter_id+':'+e.activity,prev=previous.get(key);
      if(prev){found.revision=true;if(e.scores.some(function(s){return prev.scores.some(function(p){return p.area===s.area&&p.possible===s.possible&&s.earned>p.earned;});}))found.improvement=true;}
      previous.set(key,e);
    });
    found.matters=matters.size>=3;found.skills=skills.size>=3;
    return [['interview','You recorded your first interview.'],['critique','You recorded your first written critique.'],['revision','You returned to a matter and activity for another pass.'],['improvement','A summary score increased on a later pass using the same scale.'],['matters','You practiced across at least three matters.'],['skills','You practiced at least three feedback skill areas.']].filter(function(x){return found[x[0]];}).map(function(x){return {id:x[0],text:x[1]};});
  }
  function toCSV(doc){validate(doc);var rows=[['date','matter_id','matter_title','activity','skill_area','earned','possible']];doc.entries.forEach(function(e){e.scores.forEach(function(s){rows.push([e.date,e.matter_id,e.matter_title,e.activity,s.area,s.earned,s.possible]);});});return rows.map(function(row){return row.map(function(v){var s=String(v);if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',');}).join('\r\n')+'\r\n';}
  return {validate:validate,parseImport:parseImport,fromScorecard:fromScorecard,milestones:milestones,toCSV:toCSV};
}));
