from pathlib import Path
p=Path('/mnt/data/v50work/app.js')
s=p.read_text(encoding='utf-8')
# state
s=s.replace("const state={items:[],editingId:null,detailRecord:null,detailItems:[],prices:null,staff:null,estimates:[],hasEstimateNo:false};", "const state={items:[],editingId:null,detailRecord:null,detailItems:[],prices:null,staff:null,estimates:[],hasEstimateNo:false,history:[]};")
# greeting
s=s.replace("$('homeStaffName').textContent=state.staff.name;", "$('homeStaffName').textContent=state.staff.name+'님';")
# search filter
old="""function filteredEstimates(inputId){
  const q=(($(inputId)?.value)||'').trim().toLowerCase();
  return state.estimates.filter((r,i)=>{
    const hay=[r.project_name,r.customer_name,r.address,r.estimate_no,estimateNumber(r,i),r.status,r.staff_name].filter(Boolean).join(' ').toLowerCase();
    return !q||hay.includes(q);
  });
}"""
new="""function filteredEstimates(inputId){
  const q=(($(inputId)?.value)||'').trim().toLowerCase();
  const status=($(inputId==='savedSearch'?'savedStatus':null)?.value)||'';
  return state.estimates.filter((r,i)=>{
    const hay=[r.project_name,r.customer_name,r.customer_phone,r.address,r.estimate_no,estimateNumber(r,i),r.status,r.staff_name].filter(Boolean).join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!status||String(r.status||'작성중')===status);
  });
}"""
s=s.replace(old,new)
# insert utility functions before renderRecentList
marker="function renderRecentList(){"
insert=r'''function downloadBlob(filename,content,type='text/plain;charset=utf-8'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvCell(v){const x=String(v??'').replace(/"/g,'""');return `"${x}"`;}
function exportEstimatesCsv(){const rows=filteredEstimates('savedSearch');if(!rows.length)return alert('내보낼 견적이 없습니다.');const header=['견적번호','작성일','현장명','고객명','연락처','현장주소','담당자','상태','총 견적금액'];const lines=[header.map(csvCell).join(',')];rows.forEach((r,i)=>lines.push([estimateNumber(r,i),new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR'),r.project_name||'',r.customer_name||'',r.customer_phone||recordCustomerPhone(r)||'',r.address||'',r.staff_name||'',r.status||'작성중',Number(r.total_amount||0)].map(csvCell).join(',')));downloadBlob(`DODO_견적목록_${new Date().toISOString().slice(0,10)}.csv`,'\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');}
async function backupAllData(){const [er,ir]=await Promise.all([db.from('estimates').select('*').order('created_at',{ascending:true}),db.from('estimate_items').select('*')]);if(er.error)return alert(er.error.message);if(ir.error)return alert(ir.error.message);const payload={format:'DODO_QUOTE_BACKUP_V50',exported_at:new Date().toISOString(),estimates:er.data||[],estimate_items:ir.data||[]};downloadBlob(`DODO_견적백업_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2),'application/json;charset=utf-8');}
async function restoreBackup(file){if(!file)return;try{const text=await file.text(),backup=JSON.parse(text);if(backup?.format!=='DODO_QUOTE_BACKUP_V50')throw new Error('지원하지 않는 백업 파일입니다.');const estimates=Array.isArray(backup.estimates)?backup.estimates:[],items=Array.isArray(backup.estimate_items)?backup.estimate_items:[];if(!estimates.length)return alert('백업 파일에 견적 데이터가 없습니다.');if(!confirm(`${estimates.length}건의 견적을 복원합니다. 기존 데이터는 유지되고 백업 데이터가 새 견적으로 추가됩니다. 계속할까요?`))return;const map=new Map();for(const src of estimates){const row={...src};delete row.id;delete row.estimate_no;const ins=await db.from('estimates').insert(row).select().single();if(ins.error)throw ins.error;map.set(src.id,ins.data.id);}for(const src of items){const newId=map.get(src.estimate_id);if(!newId)continue;const row={...src,estimate_id:newId};delete row.id;const ins=await insertItemCompatible(row);if(ins.error)throw ins.error;}alert(`${map.size}건의 견적을 복원했습니다.`);await load();show('saved');renderEstimateList();}catch(err){console.error(err);alert('백업 복원 실패: '+(err?.message||err));}}
async function copyEstimate(r){const q=await fetchEstimateItems(r.id);if(q.error)return alert(q.error.message);const data=(q.data||[]).slice();const ex=recordExtras(r);$('projectName').value=r.project_name||'';$('customerName').value=r.customer_name||'';$('customerPhone').value=recordCustomerPhone(r);$('address').value=r.address||'';$('status').value=r.status||'작성중';$('memo').value=cleanMemo(r.memo);if($('estimateColor'))$('estimateColor').value=estimateColor(r);if(ex?.conditions){$('sizeBand').value=ex.conditions.size||$('sizeBand').value;$('oldFrame').value=ex.conditions.old||$('oldFrame').value;$('equipment').value=ex.conditions.equip||$('equipment').value;$('protection').value=ex.conditions.protection||$('protection').value;}$('items').innerHTML='';state.items=[];loadAdditionalProducts(ex.additionalProducts||[]);state.editingId=null;state.detailRecord=null;$('formTitle').textContent='견적 복사';$('formEyebrow').textContent='COPY ESTIMATE';$('saveBtn').textContent='새 견적 저장';const rates=Array.isArray(ex.windowRates)?ex.windowRates:[];for(let i=0;i<data.length;i++){const x=data[i];addItem({...x,kind:itemKind(x),pricing_rate:x.pricing_rate??(Number(rates[i])||'')});}if(!data.length)addItem();show('form');renderExtraSummary();}
async function recordHistory(estimateId,action,previousSnapshot,nextSnapshot){try{const staff=state.staff||recordStaff(state.detailRecord)||{};const result=await db.from('estimate_history').insert({estimate_id:estimateId,action,staff_id:staff.id||null,staff_name:staff.name||'',previous_snapshot:previousSnapshot||null,next_snapshot:nextSnapshot||null});if(result.error)console.warn('estimate_history 저장 실패:',result.error.message);}catch(err){console.warn('estimate_history 저장 예외:',err);}}
async function loadHistory(estimateId){const box=$('historyList');if(!box)return;box.innerHTML='불러오는 중...';const result=await db.from('estimate_history').select('*').eq('estimate_id',estimateId).order('changed_at',{ascending:false});if(result.error){box.innerHTML='<p class="muted">변경 이력 기능을 사용하려면 V50 DB 마이그레이션을 먼저 적용해주세요.</p>';return;}state.history=result.data||[];box.innerHTML=state.history.length?state.history.map(h=>{const a=h.action==='create'?'최초 저장':h.action==='delete'?'삭제':'수정';const before=h.previous_snapshot?.estimate?.total_amount;const after=h.next_snapshot?.estimate?.total_amount;const moneyText=(v)=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR')+'원':'-';return `<div class="historyRow"><div><b>${a}</b><span>${new Date(h.changed_at).toLocaleString('ko-KR')}</span></div><div>${h.staff_name||'담당자 미지정'}</div><div>${before!==undefined?moneyText(before)+' → ':''}${after!==undefined?moneyText(after):''}</div></div>`;}).join(''):'<p class="muted">아직 변경 이력이 없습니다.</p>';}
function snapshotEstimate(r,items){return {estimate:{...r},items:(items||[]).map(x=>({...x}))};}
'''
s=s.replace(marker,insert+marker)
# saved page filters/list hooks later in index, no change here
# detail load history
s=s.replace("$('dTotal').textContent=priceError?'가격표 확인 필요':money(detailDiscount.finalTotal);}", "$('dTotal').textContent=priceError?'가격표 확인 필요':money(detailDiscount.finalTotal);loadHistory(r.id);}")
# add copy button and history in HTML later
# edit handler: leave
# delete history before deletion
s=s.replace("$('deleteBtn').onclick=async()=>{const r=state.detailRecord;if(!confirm(`“${r.project_name}” 견적을 삭제할까요?`))return;await db.from('estimate_items').delete().eq('estimate_id',r.id);", "$('deleteBtn').onclick=async()=>{const r=state.detailRecord;if(!confirm(`“${r.project_name}” 견적을 삭제할까요?`))return;const before=snapshotEstimate(r,state.detailItems);await recordHistory(r.id,'delete',before,null);await db.from('estimate_items').delete().eq('estimate_id',r.id);")
# event bindings
s=s.replace("$('savedSearch')?.addEventListener('input',renderEstimateList);", "$('savedSearch')?.addEventListener('input',renderEstimateList);$('savedStatus')?.addEventListener('change',renderEstimateList);$('exportExcelBtn')?.addEventListener('click',exportEstimatesCsv);$('backupBtn')?.addEventListener('click',backupAllData);$('restoreInput')?.addEventListener('change',e=>{restoreBackup(e.target.files?.[0]);e.target.value='';});$('copyBtn')?.addEventListener('click',()=>state.detailRecord&&copyEstimate(state.detailRecord));")
# submit: capture before snapshot and after
s=s.replace("const extras=getExtras(),ap=readAdditionalProducts();", "const historyBefore=state.editingId&&state.detailRecord?snapshotEstimate(state.detailRecord,state.detailItems):null;const extras=getExtras(),ap=readAdditionalProducts();")
s=s.replace("let id=state.editingId;\n  if(id){", "let id=state.editingId;\n  if(id){")
# after item inserts, record history. Need insert after item loop and before message
needle="  if(itemError)throw itemError;\n  $('message').textContent=ratesChanged?"
replacement="  if(itemError)throw itemError;\n  const savedRecord={...payload,id,created_at:state.editingId?(state.detailRecord?.created_at||new Date().toISOString()):new Date().toISOString()};\n  await recordHistory(id,state.editingId?'update':'create',historyBefore,snapshotEstimate(savedRecord,rows));\n  $('message').textContent=ratesChanged?"
s=s.replace(needle,replacement)
p.write_text(s,encoding='utf-8')
