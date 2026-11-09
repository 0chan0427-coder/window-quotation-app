(function(){
'use strict';
const $=id=>document.getElementById(id),core=DevelopmentImport,host=DevelopmentImportHost;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let records=[],saving=false,analyzing=false,revision=0;
function status(text,error=false){$('devImportStatus').textContent=text;$('devImportStatus').classList.toggle('dev-error',error);}
function count(){const n=records.filter(r=>r.selected).length;$('devImportCount').textContent=records.length?n+'개 선택':'';$('devImportSave').disabled=saving||analyzing||!n;}
function controls(){for(const id of ['devImportText','devImportFile','devImportAnalyze','devImportClose','devImportNew','devImportNone'])$(id).disabled=saving||analyzing||(['devImportNew','devImportNone'].includes(id)&&!records.length);$('devImportPreview').querySelectorAll('input').forEach(x=>{x.disabled=saving||analyzing||['duplicate','error'].includes(records[Number(x.dataset.row)]?.status);});count();}
function invalidate(){revision++;records=[];$('devImportPreview').replaceChildren();controls();status('자료 분석을 눌러 등록할 단지를 확인해주세요.');}
function render(){
 $('devImportPreview').innerHTML=records.map((r,i)=>{const s=r.site;return `<article class="dev-import-row ${r.status}"><label class="dev-import-choice"><input type="checkbox" data-row="${i}" ${r.selected?'checked':''} ${['duplicate','error'].includes(r.status)?'disabled':''}><strong>${i+1}. ${esc(s.name||'단지명 미입력')}</strong><span class="dev-badge">${esc({new:'신규',duplicate:'중복 제외',review:'확인 필요',error:'입력 확인'}[r.status])}</span></label><p>${esc(s.address||'주소 미입력')}</p><p class="dev-meta">${esc([s.city,s.district,s.dong].filter(Boolean).join(' '))} · ${s.build_year===null?'연도 미입력':s.build_year+'년'} · ${s.households===null?'세대수 미입력':Number(s.households).toLocaleString('ko-KR')+'세대'}</p>${s.site_note?`<details><summary>단지 메모</summary><p class="dev-content">${esc(s.site_note)}</p></details>`:''}<p class="dev-import-reason">${esc(r.reason)}</p></article>`;}).join('');
 $('devImportPreview').querySelectorAll('[data-row]').forEach(el=>el.onchange=()=>{records[Number(el.dataset.row)].selected=el.checked;count();});controls();
}
$('devImportOpen').onclick=()=>{if(!host.ready())return;$('devImportBox').classList.remove('hidden');$('devImportText').focus();$('devImportBox').scrollIntoView({block:'start',behavior:'smooth'});};
$('devImportClose').onclick=()=>{if(!saving&&!analyzing)$('devImportBox').classList.add('hidden');};
$('devImportText').oninput=invalidate;
$('devImportFile').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;const token=++revision;
 try{if(file.size>2*1024*1024)throw Error('텍스트파일은 2MB 이내로 나눠서 올려주세요.');const bytes=new Uint8Array(await file.arrayBuffer());let text;
  if(bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le',{fatal:true}).decode(bytes);
  else if(bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be',{fatal:true}).decode(bytes);
  else{try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('euc-kr',{fatal:true}).decode(bytes);}}
  if(token!==revision)return;if(text.length>1000000)throw Error('자료는 100만 글자 이내로 나눠서 넣어주세요.');$('devImportText').value=text;invalidate();status(file.name+' 파일을 불러왔습니다. 자료 분석을 눌러주세요.');
 }catch(err){if(token===revision)status('파일 불러오기 실패: '+err.message,true);}finally{e.target.value='';}
};
$('devImportAnalyze').onclick=async()=>{
 if(saving||analyzing)return;analyzing=true;records=[];$('devImportPreview').replaceChildren();controls();
 try{const parsed=core.parse($('devImportText').value);if(parsed.unread.length)throw Error('인식하지 못한 줄이 있습니다. 원문을 확인해주세요. '+parsed.unread.slice(0,4).map(x=>x.line+'행: '+x.text).join(' / '));if(!parsed.rows.length)throw Error('단지 목록을 확인해주세요. 번호·단지명 다음 줄에 주소를 넣어주세요.');
  if(!await host.refresh())throw Error('기존 단지를 확인하지 못했습니다. 새로고침 후 다시 시도해주세요.');
  records=core.classify(parsed.rows,host.snapshot()).map(x=>({...x,selected:x.status==='new'}));render();const n=k=>records.filter(x=>x.status===k).length;
  status('총 '+records.length+'개 · 신규 '+n('new')+'개 · 중복 제외 '+n('duplicate')+'개 · 확인 필요 '+n('review')+'개 · 입력 확인 '+n('error')+'개. 확인 필요 항목은 별도 단지가 맞을 때만 선택해주세요.');
 }catch(e){status(e.message,true);}finally{analyzing=false;controls();}
};
$('devImportNew').onclick=()=>{records.forEach(r=>r.selected=r.status==='new');render();};
$('devImportNone').onclick=()=>{records.forEach(r=>r.selected=false);render();};
$('devImportSave').onclick=async()=>{
 if(saving||analyzing)return;const selected=records.filter(x=>x.selected);if(!selected.length)return;
 saving=true;controls();status('선택한 단지를 등록하고 있습니다…');
 try{const result=await host.register(selected.map(x=>x.site),selected.filter(x=>x.status==='review').map(x=>core.key(x.site)));
  records=core.classify(records.map(x=>x.site),host.snapshot()).map(x=>({...x,selected:false}));render();status(result.added+'개 등록 완료'+(result.skipped?' · 이미 등록된 '+result.skipped+'개 제외':'')+(result.refreshed?'':' · 저장은 완료됐지만 목록을 새로고침하지 못했습니다. 새로고침을 눌러주세요.'));
 }catch(e){records.forEach(x=>x.selected=false);render();status('등록 결과를 다시 확인해주세요: '+e.message+' 다시 자료 분석을 누르면 중복 등록을 확인할 수 있습니다.',true);}finally{saving=false;controls();}
};
})();
