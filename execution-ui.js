(function(){
'use strict';
const $=id=>document.getElementById(id);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('ko-KR')+'원';
let analysis=null,busy=false,revision=0;
let dependencies=null,downloadURL=null;
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('처리 파일을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.'));};document.head.appendChild(s);});}
function deps(){if(!dependencies)dependencies=(async()=>{if(!window.JSZip)await loadScript('vendor/jszip.min.js');if(!window.XLSX)await loadScript('vendor/xlsx.full.min.js');if(!window.ExecutionIndividualLayout)await loadScript('assets/execution-individual-layout.js?v=62');if(!window.ExecutionFormulaCache)await loadScript('execution-formulas.js?v=62');if(!window.ExecutionEngine)await loadScript('execution-engine.js?v=62');})().catch(e=>{dependencies=null;throw e;});return dependencies;}
function message(text,error=false){for(const id of ['executionStatus','executionBottomStatus']){const target=$(id);if(target){target.textContent=text;target.classList.toggle('execError',error);}}}
function clearDownload(){if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}const box=$('executionDownload');if(box)box.replaceChildren();}
function pending(){clearDownload();if(analysis)message('입력값이 변경되었습니다. 생성 버튼을 누르면 다시 검증합니다.');}
function setBusy(value){busy=value;$('executionAnalyze').disabled=value;$('executionGenerate').disabled=value||!analysis;$('executionFile').disabled=value;}
$('executionBtn').onclick=()=>{if(!state.staff)return;show('execution');};
$('executionBack').onclick=()=>{show('home');renderRecentList();};
$('executionFile').onchange=()=>{revision++;analysis=null;clearDownload();$('executionResults').replaceChildren();$('executionGenerate').disabled=true;message('ZIP을 선택했으면 자료 분석을 눌러주세요.');};
$('executionAnalyze').onclick=async()=>{
 if(busy)return;const file=$('executionFile').files[0];if(!file)return message('자재비·시공비·실행가 양식이 들어 있는 ZIP을 선택해주세요.',true);
 if(file.size>20*1024*1024)return message('ZIP 파일은 20MB 이하로 준비해주세요.',true);
 const current=++revision;analysis=null;clearDownload();$('executionResults').replaceChildren();setBusy(true);message('엑셀 파일과 제품 정보를 분석하고 있습니다…');
 try{await deps();const a=await ExecutionEngine.analyze(await file.arrayBuffer());if(current!==revision)return;analysis=a;render();message(a.issues.length?'원본 자료에서 '+a.issues.length+'개 문제가 발견됐습니다. 아래 내용을 확인하고 원본 ZIP을 수정해주세요.':a.groups.length+'개 평형을 읽었습니다. 시공비는 원본 순번대로 자동 연결했습니다. 요율은 비워둬도 됩니다. 할인율·부가시공비를 확인해주세요.',!!a.issues.length);}catch(e){message(e.message,true);}finally{setBusy(false);}
};
function render(){
 const root=$('executionResults');root.replaceChildren();
 if(analysis.issues.length){const box=document.createElement('div');box.className='execIssues';const h=document.createElement('h3');h.textContent='원본 자료 확인이 필요합니다';box.appendChild(h);for(const issue of analysis.issues){const p=document.createElement('p');p.textContent=[issue.flat,issue.file,issue.sheet,issue.row?issue.row+'행':'',issue.message].filter(Boolean).join(' · ');box.appendChild(p);}root.appendChild(box);}
 analysis.groups.forEach((g,gi)=>{
  const box=document.createElement('article');box.className='execGroup';box.dataset.flat=g.flat;
  const d=g.defaults;const names=['장비비','철거비','타일','실측','몰딩','보양비'];
  box.innerHTML=`<h3>${escape(g.flat)} <small>창 ${g.products.length}개</small></h3><p class="execSource">자재비: ${escape(g.materialFiles.join(', '))}<br>시공비: ${escape(g.installationFiles.join(', '))}</p>
  <p>${g.templateSheet==='○평'?'공통 빈 양식을 사용합니다. 부가시공비는 필요한 항목만 입력해주세요.':g.exactTemplate?'동일 평형의 원본 양식 값을 불러왔습니다.':'양식에 이 평형이 없어 '+escape(g.templateSheet)+'의 기본값을 불러왔습니다. 반드시 현장에 맞게 수정해주세요.'}</p>
  <div class="execSettings"><label>외창 할인율 (%)<input class="execSetting" data-key="outerDiscount" type="number" min="0" max="100" step="0.1" value="${d.outerDiscount===null?'':d.outerDiscount*100}"></label><label>내창 할인율 (%)<input class="execSetting" data-key="innerDiscount" type="number" min="0" max="100" step="0.1" value="${d.innerDiscount===null?'':d.innerDiscount*100}"></label><label>외창 인상률 (%)<input class="execSetting" data-key="outerIncrease" type="number" min="0" step="0.1" value="${d.outerIncrease===null?'':d.outerIncrease*100}"></label><label>내창 인상률 (%)<input class="execSetting" data-key="innerIncrease" type="number" min="0" step="0.1" value="${d.innerIncrease===null?'':d.innerIncrease*100}"></label></div>
  <details class="execCosts" open><summary>부가시공비 입력 · 부가세 별도</summary><p>비워둔 비용은 0원으로 계산하며 Excel에는 빈칸으로 저장합니다. 전체 금액에는 외창 금액이 포함됩니다. 외창·내창에 시공금액 비율로 배분하고, 최종 계산에는 부가세 10%를 더합니다.</p><div class="execScroll"><table><thead><tr><th>항목</th><th>외창만 교체</th><th>전체 교체</th></tr></thead><tbody>${d.costs.map((c,i)=>`<tr><th>${names[i]}</th><td><input aria-label="${escape(g.flat)} ${names[i]} 외창" class="execCost" data-index="${i}" data-kind="outer" type="number" min="0" step="1000" value="${c.outer??''}"></td><td><input aria-label="${escape(g.flat)} ${names[i]} 전체" class="execCost" data-index="${i}" data-kind="total" type="number" min="0" step="1000" value="${c.total??''}"></td></tr>`).join('')}</tbody></table></div></details>
  <div class="execRateAll"><label>이 평형의 전체 창 요율<input class="execAllRate" type="number" min="0.01" step="0.01" placeholder="예: 1.30"></label><button type="button" class="execApplyRate utilityBtn">전체 적용</button></div>
  <p>시공비는 본사 원본의 창 제품 순번대로 자동 연결했습니다. 요율은 비워두고 생성한 뒤 Excel에서 입력·수정할 수 있습니다.</p><div class="execProductList"></div>
  <label class="execConfirm"><input type="checkbox" class="execConfirmed"> 이 평형의 할인율·부가시공비를 확인했습니다.</label>`;
  const list=box.querySelector('.execProductList');
  g.products.forEach((p,pi)=>{const card=document.createElement('div');card.className='execProduct';card.dataset.id=p.id;card.dataset.installation=p.selected||'';const rateId='execRate'+gi+'_'+pi;
   card.innerHTML=`<h4>${pi+1}. ${escape(p.brand)} <small>${p.section==='outer'?'외창':'내창'} · 원본 순번 ${escape(p.sourceId)}</small></h4><p>${escape(p.location)} · ${escape(p.size)} · ${escape(p.shape)} · 수량 ${escape(p.qty)}<br>창 단가 ${p.unit===null?'누락':money(p.unit)} / 유리 단가 ${money(p.glassUnit)}</p><div class="execProductControls"><div class="execAutoInstall"><b>시공비 자동 반영</b><p>${p.selected?money(p.candidates.find(c=>c.id===p.selected).total)+' · 창·유리 시공 합계':'원본 자료 확인 필요'}</p></div><label for="${rateId}">요율 (선택)<input id="${rateId}" class="execRate" type="number" min="0.01" step="0.01" placeholder="엑셀에서 입력 가능"></label></div>`;list.appendChild(card);});
  box.querySelector('.execApplyRate').onclick=()=>{const value=box.querySelector('.execAllRate').value;if(!value||!Number.isFinite(Number(value))||Number(value)<=0)return message('전체 적용할 요율을 0보다 큰 숫자로 입력해주세요.',true);box.querySelectorAll('.execRate').forEach(x=>x.value=value);box.querySelector('.execConfirmed').checked=false;pending();};
  box.addEventListener('input',e=>{if(!e.target.classList.contains('execConfirmed'))box.querySelector('.execConfirmed').checked=false;pending();});root.appendChild(box);
 });
}
function settings(){const out={};document.querySelectorAll('.execGroup').forEach(box=>{const s={items:{},costs:Array.from({length:6},()=>({})),confirmed:box.querySelector('.execConfirmed').checked};box.querySelectorAll('.execSetting').forEach(i=>s[i.dataset.key]=i.value===''?null:Number(i.value)/100);box.querySelectorAll('.execCost').forEach(i=>s.costs[+i.dataset.index][i.dataset.kind]=i.value===''?null:Number(i.value));box.querySelectorAll('.execProduct').forEach(c=>s.items[c.dataset.id]={installation:c.dataset.installation,rate:c.querySelector('.execRate').value});out[box.dataset.flat]=s;});return out;}
$('executionGenerate').onclick=async()=>{
 if(busy)return;
 if(!analysis){message('먼저 자료 분석을 실행해주세요.',true);return;}
 try{
  const s=settings(),errors=ExecutionEngine.validate(analysis,s);
  if(errors.length){message('생성할 수 없습니다. 다음 항목을 확인해주세요.\n'+errors.slice(0,20).join('\n')+(errors.length>20?'\n외 '+(errors.length-20)+'개':''),true);return;}
  clearDownload();setBusy(true);message('제품 수에 맞춰 시트·수식·합계를 생성하고 있습니다…');
  const b=await ExecutionEngine.generate(analysis,s);
  const file=$('executionFile').files[0];
  if(!file)throw Error('입력 ZIP을 다시 선택하고 자료 분석을 실행해주세요.');
  const blob=new Blob([b],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  downloadURL=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=downloadURL;a.download=file.name.replace(/\.zip$/i,'')+'_실행가.xlsx';a.textContent='생성된 실행가 엑셀 다운로드';a.className='utilityBtn execDownloadLink';
  $('executionDownload').appendChild(a);
  message('실행가 엑셀을 생성했습니다. 다운로드가 시작되지 않으면 아래 다운로드 버튼을 눌러주세요.');
  a.click();
 }catch(e){console.error('실행가 생성 오류',e);message('실행가 생성 실패: '+(e?.message||String(e)||'알 수 없는 오류'),true);}
 finally{setBusy(false);}
};
})();
