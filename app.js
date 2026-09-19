const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const state = { items: [], editingId: null, detailRecord: null };
const locations = {
  '발코니창': ['입구방 발코니','입구방(2) 발코니','거실 발코니','안방 발코니','건너방 발코니','건너방(2) 발코니'],
  '분합창': ['입구방 분합','거실 분합','안방 분합','건너방 분합'],
  '내창': ['입구방 내창','안방 내창','건너방 내창'],
  '주방창': ['주방창'],
  '복도창': ['복도형 아파트 복도창']
};
const products = ['F-140','F-130I','F-230W','F-230WF','F-250','F-250I'];
const priceProduct = {'F-130I':'F-140','F-250I':'F-250'};
function show(id){ ['home','form','detail'].forEach(x => $(x).classList.toggle('hidden', x !== id)); }
function resetForm(){ $('estimateForm').reset(); $('items').innerHTML=''; state.items=[]; state.editingId=null; $('formTitle').textContent='새 견적 작성'; $('formEyebrow').textContent='NEW ESTIMATE'; $('saveBtn').textContent='견적 저장'; $('message').textContent=''; }
function inferKind(name){ if(!name)return ''; for(const [kind,names] of Object.entries(locations)){ if(names.includes(name))return kind; } return '직접입력'; }
function fillLocations(el, kind, selected=''){
  const loc=el.querySelector('.location');
  const list=locations[kind] || [];
  loc.innerHTML=list.length ? list.map(x=>`<option ${x===selected?'selected':''}>${x}</option>`).join('') : '<option value="">직접 입력</option>';
}
function addItem(itemData={}){
  const n=state.items.length+1;
  const el=document.createElement('div'); el.className='item card';
  el.innerHTML=`<div class="itemhead"><b class="itemNo">창 ${n}</b><button type="button" class="textBtn remove">삭제</button></div>
  <label>창 종류<select class="kind"><option value="">선택하세요</option>${Object.keys(locations).map(k=>`<option>${k}</option>`).join('')}<option>직접입력</option></select></label>
  <label>위치<select class="location"><option>창 종류를 먼저 선택</option></select></label>
  <label class="custom hidden">직접 입력<input class="customName"></label>
  <label>제품<select class="product">${products.map(p=>`<option>${p}</option>`).join('')}</select></label>
  <button type="button" class="secondary change">제품 변경</button>
  <div class="dims"><label>실측 가로(mm)<input type="number" class="w" inputmode="numeric" min="1" required></label><label>실측 세로(mm)<input type="number" class="h" inputmode="numeric" min="1" required></label></div>
  <div class="result">가격 조회는 저장 후 처리됩니다.</div>`;
  $('items').append(el); bindItem(el); state.items.push(el);
  if(itemData.kind){ el.querySelector('.kind').value=itemData.kind; fillLocations(el,itemData.kind,itemData.window_name); el.querySelector('.custom').classList.toggle('hidden',itemData.kind!=='직접입력'); }
  if(itemData.kind==='직접입력') el.querySelector('.customName').value=itemData.window_name||'';
  el.querySelector('.product').value=itemData.product_code||'F-140';
  el.querySelector('.w').value=itemData.actual_width||''; el.querySelector('.h').value=itemData.actual_height||'';
  el.dataset.itemId=itemData.id||'';
}
function renumber(){ state.items.forEach((el,i)=>el.querySelector('.itemNo').textContent=`창 ${i+1}`); }
function bindItem(el){
  const kind=el.querySelector('.kind'), prod=el.querySelector('.product');
  kind.onchange=()=>{ fillLocations(el,kind.value); el.querySelector('.custom').classList.toggle('hidden',kind.value!=='직접입력'); if(kind.value==='분합창')prod.value='F-230WF'; if(kind.value==='내창')prod.value='F-230W'; if(kind.value==='주방창')prod.value='F-130I'; if(kind.value==='복도창')prod.value='F-250I'; };
  el.querySelector('.remove').onclick=()=>{el.remove(); state.items=state.items.filter(x=>x!==el); renumber();};
  el.querySelector('.change').onclick=()=>prod.focus();
}
async function load(){
  const {data,error}=await db.from('estimates').select('*').order('created_at',{ascending:false});
  if(error){$('list').innerHTML=`<div class="empty">${error.message}</div>`;return;}
  $('list').innerHTML=''; (data||[]).forEach(r=>{const d=document.createElement('button'); d.className='listrow'; d.innerHTML=`<b>${r.project_name}</b><span>${r.customer_name||''} · ${r.status}</span>`; d.onclick=()=>detail(r); $('list').append(d);});
  if(!data?.length)$('list').innerHTML='<div class="empty"><h3>아직 작성된 견적이 없습니다.</h3><p>첫 번째 견적을 작성해보세요.</p></div>';
  $('count').textContent=`${(data||[]).length}건`;
}
async function detail(r){
  state.detailRecord=r; $('detailTitle').textContent=r.project_name; $('dCustomer').textContent=r.customer_name||'-'; $('dAddress').textContent=r.address||'-'; $('dStatus').textContent=r.status; $('dMemo').textContent=r.memo||'-'; $('dTotal').textContent=`${Number(r.total_amount||0).toLocaleString()}원`; show('detail');
}
async function editEstimate(){
  const r=state.detailRecord; if(!r)return;
  const {data,error}=await db.from('estimate_items').select('*').eq('estimate_id',r.id).order('item_no');
  if(error){alert('창호 항목을 불러오지 못했습니다: '+error.message);return;}
  $('projectName').value=r.project_name||''; $('customerName').value=r.customer_name||''; $('address').value=r.address||''; $('status').value=r.status||'작성중'; $('memo').value=r.memo||'';
  $('items').innerHTML=''; state.items=[]; state.editingId=r.id; $('formTitle').textContent='견적 수정'; $('formEyebrow').textContent='EDIT ESTIMATE'; $('saveBtn').textContent='수정 저장'; $('message').textContent='';
  (data||[]).forEach(item=>addItem({...item, kind:inferKind(item.window_name)})); if(!data?.length)addItem(); show('form');
}
async function deleteEstimate(){
  const r=state.detailRecord; if(!r)return;
  if(!confirm(`“${r.project_name}” 견적을 삭제할까요?\n삭제하면 복구할 수 없습니다.`))return;
  const {error:itemError}=await db.from('estimate_items').delete().eq('estimate_id',r.id);
  if(itemError){alert('창호 항목 삭제 실패: '+itemError.message);return;}
  const {error}=await db.from('estimates').delete().eq('id',r.id);
  if(error){alert('견적 삭제 실패: '+error.message);return;}
  show('home'); await load();
}
$('newBtn').onclick=()=>{resetForm();show('form');addItem();};
$('backBtn').onclick=$('cancelBtn').onclick=()=>{show('home');};
$('detailBackBtn').onclick=()=>{show('home');load();};
$('editBtn').onclick=editEstimate; $('deleteBtn').onclick=deleteEstimate; $('addItem').onclick=()=>addItem();
$('estimateForm').onsubmit=async e=>{
  e.preventDefault(); $('message').textContent=state.editingId?'수정 저장 중...':'저장 중...';
  const payload={project_name:$('projectName').value,customer_name:$('customerName').value,address:$('address').value,status:$('status').value,memo:$('memo').value,total_amount:0};
  let estimateId=state.editingId;
  if(estimateId){ const {error}=await db.from('estimates').update(payload).eq('id',estimateId); if(error){$('message').textContent=error.message;return;} const {error:itemError}=await db.from('estimate_items').delete().eq('estimate_id',estimateId); if(itemError){$('message').textContent=itemError.message;return;} }
  else { const {data,error}=await db.from('estimates').insert(payload).select().single(); if(error){$('message').textContent=error.message;return;} estimateId=data.id; }
  for(const [i,el] of state.items.entries()){
    const kind=el.querySelector('.kind').value; const name=kind==='직접입력'?el.querySelector('.customName').value:el.querySelector('.location').value; const product=el.querySelector('.product').value;
    const {error}=await db.from('estimate_items').insert({estimate_id:estimateId,item_no:i+1,window_name:name,product_code:product,price_product_code:priceProduct[product]||product,actual_width:Number(el.querySelector('.w').value),actual_height:Number(el.querySelector('.h').value)});
    if(error){$('message').textContent=error.message;return;}
  }
  $('message').textContent=state.editingId?'수정되었습니다.':'저장되었습니다.'; setTimeout(()=>{show('home');load();},500);
};
load();
