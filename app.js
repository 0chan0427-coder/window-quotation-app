const { createClient } = supabase; const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY); const $=id=>document.getElementById(id);
function money(value){return `${Number(value||0).toLocaleString('ko-KR')}원`;}
const STAFF=[{id:1,name:'한동균 팀장',phone:'010-7415-0619'},{id:2,name:'김민찬 책임',phone:''},{id:3,name:'김영찬 책임',phone:''}]; const STAFF_KEY='window_quote_staff'; const state={items:[],editingId:null,detailRecord:null,detailItems:[],prices:null,staff:null,estimates:[],hasEstimateNo:false};
function staffInit(){const saved=localStorage.getItem(STAFF_KEY);state.staff=STAFF.find(x=>String(x.id)===saved)||null;renderStaff();}
function renderStaff(){const gate=$('staffGate'),choices=$('staffChoices');choices.innerHTML=STAFF.map(x=>`<button class="staffChoice" data-id="${x.id}">${x.name}</button>`).join('');choices.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.staff=STAFF.find(x=>String(x.id)===b.dataset.id);localStorage.setItem(STAFF_KEY,state.staff.id);renderStaff();show('home');load();});gate.classList.toggle('hidden',!!state.staff);$('currentStaff').textContent=state.staff?`현재 담당자: ${state.staff.name}`:'';}
$('changeStaff').onclick=()=>{localStorage.removeItem(STAFF_KEY);state.staff=null;renderStaff();show('home');};
const locations={'발코니창':['입구방 발코니','입구방(2) 발코니','거실 발코니','안방 발코니','건너방 발코니','건너방(2) 발코니','주방 발코니'],'분합창':['입구방 분합','거실 분합','안방 분합','건너방 분합','주방 분합'],'내창':['입구방 내창','안방 내창','건너방 내창'],'주방창':['주방창'],'복도창':['복도형 아파트 복도창']};
const products=['F-140','F-130I','F-230W','F-230WF','F-250','F-250I']; const priceProduct={'F-130I':'F-140','F-250I':'F-250'};
async function getPrices(){if(state.prices)return state.prices;const{data,error}=await db.from('product_prices').select('product_code,width_mm,height_mm,material_cost,installation_cost');if(error){console.error(error);throw new Error('가격표를 불러오지 못했습니다: '+error.message);}state.prices=data||[];return state.prices;}
function field(o,names){for(const n of names)if(o&&o[n]!==undefined)return o[n];return null;}
async function insertItemCompatible(payload){let p={...payload};for(let attempt=0;attempt<12;attempt++){const result=await db.from('estimate_items').insert(p);if(!result.error)return result;const msg=result.error.message||'';const m=msg.match(/Could not find the '([^']+)' column of 'estimate_items'/i);if(!m)return result;const missing=m[1];if(missing==='window_name'){delete p.window_name;p.item_name=payload.window_name;}else if(missing==='item_name'){delete p.item_name;p.name=payload.window_name;}else if(missing==='name'){delete p.name;p.location=payload.window_name;}else{delete p[missing];}}return{error:{message:'estimate_items 컬럼 호환 처리에 실패했습니다.'}};}
function show(id){['home','form','detail'].forEach(x=>$(x).classList.toggle('hidden',x!==id));}
function resetForm(){$('estimateForm').reset();$('items').innerHTML='';state.items=[];state.editingId=null;$('formTitle').textContent='새 견적 작성';$('formEyebrow').textContent='NEW ESTIMATE';$('saveBtn').textContent='견적 저장';$('message').textContent='';}
function itemName(item){return item?.window_name||item?.item_name||item?.name||item?.location||'';}
function inferKind(name){for(const[k,names]of Object.entries(locations))if(names.includes(name))return k;return '직접입력';}
function fillLocations(el,kind,selected=''){const loc=el.querySelector('.location');const list=locations[kind]||[];loc.innerHTML=list.length?list.map(x=>`<option value="${x}" ${x===selected?'selected':''}>${x}</option>`).join(''):'<option value="">직접 입력</option>';}
function addItem(d={}){const n=state.items.length+1,el=document.createElement('div');el.className='item card';el.innerHTML=`<div class="itemhead"><b class="itemNo">창 ${n}</b><button type="button" class="remove">삭제</button></div><label>창 종류<select class="kind"><option value="">선택하세요</option>${Object.keys(locations).map(k=>`<option>${k}</option>`).join('')}<option>직접입력</option></select></label><label>위치<select class="location"><option>창 종류를 먼저 선택</option></select></label><label class="custom hidden">직접 입력<input class="customName"></label><label>창 형태<select class="windowType"><option value="일반창">일반창</option><option value="고정창">고정창</option></select></label><label>적용 제품<select class="product">${products.map(p=>`<option>${p}</option>`).join('')}</select></label><button type="button" class="secondary change">제품 변경</button><div class="dims"><label>실측 가로(mm)<input type="number" class="w" inputmode="numeric" min="1" required></label><label>실측 세로(mm)<input type="number" class="h" inputmode="numeric" min="1" required></label></div><div class="result">가격은 저장 후 견적서에서 계산됩니다.</div>`;$('items').append(el);bindItem(el);state.items.push(el);if(d.kind){el.querySelector('.kind').value=d.kind;fillLocations(el,d.kind,itemName(d));el.querySelector('.custom').classList.toggle('hidden',d.kind!=='직접입력');}if(d.kind==='직접입력')el.querySelector('.customName').value=itemName(d);el.querySelector('.product').value=d.product_code||'F-140';el.querySelector('.windowType').value=(d.window_type==='fixed'||d.window_type==='고정창')?'고정창':'일반창';el.querySelector('.w').value=d.actual_width||'';el.querySelector('.h').value=d.actual_height||'';el.dataset.itemId=d.id||'';}
function renumber(){state.items.forEach((e,i)=>e.querySelector('.itemNo').textContent=`창 ${i+1}`);}
function bindItem(el){const kind=el.querySelector('.kind'),prod=el.querySelector('.product');kind.onchange=()=>{fillLocations(el,kind.value);el.querySelector('.custom').classList.toggle('hidden',kind.value!=='직접입력');if(kind.value==='분합창')prod.value='F-230WF';if(kind.value==='내창')prod.value='F-230W';if(kind.value==='주방창')prod.value='F-130I';if(kind.value==='복도창')prod.value='F-250I';renderExtraSummary();};el.querySelector('.remove').onclick=()=>{el.remove();state.items=state.items.filter(x=>x!==el);renumber();renderExtraSummary();};el.querySelector('.change').onclick=()=>prod.focus();}
function getExtras(){const size=$('sizeBand').value,old=$('oldFrame').value,equip=$('equipment').value,protection=$('protection').value;const equipment=equip==='불가'?500000:400000;const demolition=size==='20'?(old==='AL'?300000:400000):(old==='AL'?400000:500000);const map={'none':0,'1-2':140000,'3-4':170000,'5-7':200000,'8-9':230000,'10+':270000};const sash=state.items.filter(el=>el.querySelector('.kind').value==='발코니창'&&Number(el.querySelector('.h').value)>=2000).length*100000;const molding=state.items.filter(el=>['분합창','내창','주방창'].includes(el.querySelector('.kind').value)).length*55000;return {equipment,demolition,sash,molding,protection:map[protection]||0,total:equipment+demolition+sash+molding+(map[protection]||0),conditions:{size,old,equip,protection}};}function renderExtraSummary(){const e=getExtras();$('extraSummary').innerHTML='<p>장비비 <b>'+money(e.equipment)+'</b></p><p>철거비 <b>'+money(e.demolition)+'</b></p><p>사춤 / 타일 <b>'+money(e.sash)+'</b></p><p>몰딩 <b>'+money(e.molding)+'</b></p><p>보양 <b>'+money(e.protection)+'</b></p><hr><p class="grand">부가시공비 합계 <b>'+money(e.total)+'</b></p>';}function cleanMemo(value){return String(value||'').replace(/\n?\[고객 데이터\][\s\S]*$/,'').replace(/\n?\[담당자 데이터\][\s\S]*$/,'').replace(/\n?\[부가시공비 데이터\][\s\S]*$/,'').replace(/\n?\[결제 데이터\][\s\S]*$/,'').trim();}
function recordStaff(r){
  if(r?.staff_id){const byId=STAFF.find(x=>Number(x.id)===Number(r.staff_id));if(byId)return byId;}
  if(r?.staff_name){const byName=STAFF.find(x=>x.name===r.staff_name);if(byName)return byName;return {id:r.staff_id,name:r.staff_name,phone:r.staff_phone||''};}
  return state.staff;
}
function staffPhone(r){return recordStaff(r)?.phone||r?.staff_phone||'연락처 미등록';}
function defaultPayment(total){return {depositRate:10,interimRate:70,balanceRate:20,deposit:Math.round(total*.10),interim:Math.round(total*.70),balance:total-Math.round(total*.10)-Math.round(total*.70),method:'현금'};}
function normalizePayment(r,total){
  const saved=recordPayment(r);
  if(!saved||saved.depositRate===undefined||saved.interimRate===undefined||saved.balanceRate===undefined)return defaultPayment(total);
  const depositRate=Number(saved.depositRate)||0, interimRate=Number(saved.interimRate)||0, balanceRate=Number(saved.balanceRate)||0;
  return {depositRate,interimRate,balanceRate,deposit:Math.round(total*depositRate/100),interim:Math.round(total*interimRate/100),balance:total-Math.round(total*depositRate/100)-Math.round(total*interimRate/100),method:saved.method||'현금'};
}
function recordCustomerPhone(r){return r?.customer_phone||'';}
function recordExtras(r){return r?.extras_data||{equipment:0,demolition:0,sash:0,molding:0,protection:0,total:0};}
function recordPayment(r){return r?.payment_data||null;}
function encodeExtras(memo,staff,customer,payment){
  const clean=cleanMemo(memo);
  return `${clean}${clean?'\n\n':''}[고객 데이터] ${JSON.stringify(customer||{})}\n[담당자 데이터] ${JSON.stringify(staff||{})}\n[결제 데이터] ${JSON.stringify(payment||{})}`;
}
async function calculate(items){
  const rows=await getPrices();
  if(!Array.isArray(rows)||!rows.length) throw new Error('product_prices에 가격표 데이터가 없습니다.');
  let total=0;
  const normalize=v=>String(v??'').replace(/\s+/g,'').toUpperCase();
  const out=items.map(item=>{
    const lookup=priceProduct[item.product_code]||item.product_code;
    const code=normalize(lookup);
    const w=Number(item.actual_width), h=Number(item.actual_height);
    const appliedWidth=Math.ceil(w/200)*200;
    const appliedHeight=Math.ceil(h/200)*200;
    const price=rows.find(p=>normalize(p.product_code)===code&&Number(p.width_mm)===appliedWidth&&Number(p.height_mm)===appliedHeight);
    if(!price)return {...item,lookup,applied_width:appliedWidth,applied_height:appliedHeight,available:false,reason:`가격표 없음: ${lookup} / ${appliedWidth}×${appliedHeight}mm`};
    const material=Number(price.material_cost)||0;
    const install=Number(price.installation_cost)||0;
    const amount=material+install;
    if(amount<=0)return {...item,lookup,applied_width:appliedWidth,applied_height:appliedHeight,available:false,reason:`가격이 0원: ${lookup} / ${appliedWidth}×${appliedHeight}mm`};
    total+=amount;
    return {...item,lookup,available:true,applied_width:appliedWidth,applied_height:appliedHeight,material,install,amount};
  });
  return {items:out,total};
}
function nextEstimateNo(){
  const d=new Date(), ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const nums=state.estimates.map(r=>String(r.estimate_no||'').match(new RegExp(`^Q-${ds}-(\\d+)$`))).filter(Boolean).map(m=>Number(m[1]));
  const n=(nums.length?Math.max(...nums):0)+1;
  return `Q-${ds}-${String(n).padStart(3,'0')}`;
}
function estimateNumber(r,index=0){
  if(r?.estimate_no)return String(r.estimate_no);
  const d=new Date(r?.created_at||Date.now());
  const ds=`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const id=String(r?.id||'').replace(/-/g,'').slice(-4).toUpperCase()||String(index+1).padStart(4,'0');
  return `Q-${ds}-${id}`;
}
function renderEstimateList(){
  const q=(($('estimateSearch')?.value)||'').trim().toLowerCase();
  const data=state.estimates.filter((r,i)=>{
    const hay=[r.project_name,r.customer_name,r.address,r.estimate_no,estimateNumber(r,i),r.status,r.staff_name].filter(Boolean).join(' ').toLowerCase();
    return !q||hay.includes(q);
  });
  $('list').innerHTML='';
  data.forEach((r,i)=>{
    const b=document.createElement('button');
    b.className='listrow';
    b.innerHTML=`<div class="listMain"><div class="listTop"><b>${r.project_name||'현장명 미입력'}</b><span>${r.customer_name?` / ${r.customer_name}`:''}</span></div><div class="listBottom"><span>${estimateNumber(r,i)}</span><span>${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</span><span class="statusBadge">${r.status||'작성중'}</span></div></div>`;
    b.onclick=()=>detail(r);
    $('list').append(b);
  });
  if(!data.length)$('list').innerHTML=q?'<div class="empty"><h3>검색 결과가 없습니다.</h3><p>현장명, 고객명, 주소 또는 견적번호를 확인해보세요.</p></div>':'<div class="empty"><h3>아직 작성된 견적이 없습니다.</h3><p>첫 번째 견적을 작성해보세요.</p></div>';
  $('count').textContent=q?`${data.length} / ${state.estimates.length}건`:`${data.length}건`;
}
async function load(){
  const schema=await db.from('estimates').select('estimate_no').limit(1);
  state.hasEstimateNo=!schema.error;
  const{data,error}=await db.from('estimates').select('*').order('created_at',{ascending:false});
  if(error){$('list').innerHTML=`<div class="empty">${error.message}</div>`;return;}
  state.estimates=data||[];
  renderEstimateList();
}
async function detail(r){state.detailRecord=r;$('detailTitle').textContent=r.project_name||'현장명 미입력';$('dProject').textContent=r.project_name||'-';$('dCustomer').textContent=r.customer_name||'-';$('dAddress').textContent=r.address||'-';$('dDate').textContent=new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR');$('dStaff').textContent=((recordStaff(r)?.name||'미지정'));$('dStatus').textContent=r.status||'-';$('dMemo').textContent=cleanMemo(r.memo).trim()||'-';$('dTotal').textContent='계산 중...';$('dItems').innerHTML='불러오는 중...';$('dExtras').innerHTML='불러오는 중...';$('quote').classList.add('hidden');show('detail');const{data,error}=await db.from('estimate_items').select('*').eq('estimate_id',r.id).order('id');if(error){$('dTotal').textContent='항목 조회 실패';$('dItems').textContent=error.message;return;}state.detailItems=data||[];let calc={items:state.detailItems.map(x=>({...x,available:false})),total:0};let priceError='';try{calc=await calculate(state.detailItems);}catch(err){console.error(err);priceError=err?.message||'가격표 조회 실패';}const extras=recordExtras(r)||{equipment:0,demolition:0,sash:0,molding:0,protection:0,total:0};$('dItems').innerHTML=state.detailItems.length?'<table><thead><tr><th>구분</th><th>위치</th><th>제품</th><th>실측</th><th>창 형태</th><th>금액</th></tr></thead><tbody>'+calc.items.map(x=>`<tr><td>${inferKind(itemName(x))||'-'}</td><td>${itemName(x)||'-'}</td><td>${x.product_code||'-'}</td><td>${x.actual_width||'-'}×${x.actual_height||'-'}mm</td><td>${x.window_type==='fixed'?'고정창':'일반창'}</td><td>${x.available&&x.amount>0?money(x.amount):(x.reason||priceError||'계산 후 확인')}</td></tr>`).join('')+'</tbody></table>':'등록된 창호 항목이 없습니다.';$('dExtras').innerHTML='<table><tbody>'+[['장비비',extras.equipment],['철거비',extras.demolition],['사춤 / 타일',extras.sash],['몰딩',extras.molding],['보양',extras.protection]].map(([n,v])=>`<tr><td>${n}</td><td class="amount">${money(v||0)}</td></tr>`).join('')+`<tr class="sumRow"><th>부가시공비 합계</th><th class="amount">${money(extras.total||0)}</th></tr></tbody></table>`;calc.extras=extras;$('dTotal').textContent=priceError?'가격표 확인 필요':money(calc.total+(extras.total||0));}
function renderInternalQuote(calc){
  const r=state.detailRecord;
  const extras=calc.extras||recordExtras(r)||{equipment:0,demolition:0,sash:0,molding:0,protection:0,total:0};
  const total=calc.total+(extras.total||0);
  const rows=(calc.items||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${inferKind(itemName(x))||'-'}</td><td>${itemName(x)||'-'}</td><td>${x.product_code||'-'}</td><td>${x.actual_width||'-'} × ${x.actual_height||'-'}</td><td>${x.applied_width||'-'} × ${x.applied_height||'-'}</td><td>${x.window_type==='fixed'?'고정창':'일반창'}</td><td>${x.material?money(x.material):'-'}</td><td>${x.install?money(x.install):'-'}</td><td>${x.available?money(x.amount):'-'}</td></tr>`).join('');
  $('quote').innerHTML=`<div class="quoteTools"><button onclick="window.print()">인쇄 / PDF 저장</button></div>
    <div class="internalQuoteSheet">
      <div class="internalHeader"><div><small>INTERNAL ESTIMATE</small><h2>내부용 상세 견적서</h2></div><div class="internalStaff"><b>${recordStaff(r)?.name||'담당자 미지정'}</b><span>${staffPhone(r)}</span></div></div>
      <div class="internalMeta"><div><b>현장명</b><span>${r.project_name||'-'}</span></div><div><b>고객명</b><span>${r.customer_name||'-'}</span></div><div><b>견적번호</b><span>${estimateNumber(r)}</span></div><div><b>작성일</b><span>${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</span></div><div class="wide"><b>현장주소</b><span>${r.address||'-'}</span></div></div>
      <h3>창호 상세 내역</h3><div class="internalTable"><table><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품</th><th>실측 가로 × 세로(mm)</th><th>적용 가로 × 세로(mm)</th><th>형태</th><th>자재비</th><th>시공비</th><th>합계</th></tr></thead><tbody>${rows||'<tr><td colspan="10">등록된 창호 항목이 없습니다.</td></tr>'}</tbody></table></div>
      <h3>부가시공비</h3><div class="internalTable"><table><tbody>${[['장비비',extras.equipment],['철거비',extras.demolition],['사춤 / 타일',extras.sash],['몰딩',extras.molding],['보양',extras.protection]].map(([n,v])=>`<tr><th>${n}</th><td class="num">${money(v||0)}</td></tr>`).join('')}<tr class="internalSum"><th>부가시공비 합계</th><td class="num">${money(extras.total||0)}</td></tr></tbody></table></div>
      <div class="internalGrand"><span>총 견적금액</span><b>${money(total)}</b></div>
      <div class="internalMemo"><b>메모</b><p>${cleanMemo(r.memo).trim()||'-'}</p></div>
    </div>`;
  $('quote').classList.remove('hidden');
}
function renderCustomerQuote(calc){
  const r=state.detailRecord;
  const extras=calc.extras||recordExtras(r)||{equipment:0,demolition:0,sash:0,molding:0,protection:0,total:0};
  const total=calc.total+(extras.total||0);
  const pay=normalizePayment(r,total);
  const items=calc.items||[];
  const rows=[];
  for(let i=0;i<18;i++){
    const x=items[i];
    if(x){
      const name=itemName(x)||'-', kind=inferKind(name), outside=['발코니창','복도창'].includes(kind);
      rows.push(`<tr><td>${i+1}</td><td>${outside?'외창':'내창'}</td><td class="left">${name}</td><td class="left">${x.product_code||'-'}</td><td>${x.window_type==='fixed'?'고정창 / 24T':'일반창 / 28T'}</td><td>기본색</td><td>1</td><td>${outside?'AL 방충망':'-'}</td><td>${x.available?Number(x.amount).toLocaleString('ko-KR'):'-'}</td><td></td></tr>`);
    }else rows.push(`<tr><td>${i+1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`);
  }
  const payRows=`<div class="xlsPayRow total"><div class="payLabel">계 약 총 액</div><div class="payValue" id="payTotal">${total.toLocaleString('ko-KR')}</div><div id="payMethodText">${pay.method}</div></div>
  <div class="xlsPayRow"><div class="payLabel">계약금</div><div class="payValue" id="payDepositValue">${pay.deposit.toLocaleString('ko-KR')}</div><div id="payDepositLabel">계약금 (${pay.depositRate}%)</div></div>
  <div class="xlsPayRow"><div class="payLabel">중도금</div><div class="payValue" id="payInterimValue">${pay.interim.toLocaleString('ko-KR')}</div><div id="payInterimLabel">중도금 (${pay.interimRate}%)</div></div>
  <div class="xlsPayRow"><div class="payLabel">잔 금</div><div class="payValue" id="payBalanceValue">${pay.balance.toLocaleString('ko-KR')}</div><div id="payBalanceLabel">잔 금 (${pay.balanceRate}%)</div></div>`;
  $('quote').innerHTML=`<div class="quoteTools"><button onclick="window.print()">인쇄 / PDF 저장</button></div>
  <div class="xlsQuote customer">
    <div class="xlsSide"></div><div class="xlsTop">
      <img class="xlsLogo" src="assets/image3.png" alt="LX Z:IN 인테리어 창호 견적서"><img class="xlsBadge" src="assets/image4.png" alt="10년 무상보증">
      <div class="xlsNotice">㈜LX하우시스의 완성 창호인 LX Z:IN WINDOW 정품 창호로만 시공합니다.</div>
      <div class="xlsCompany"><img class="staffBrand" src="assets/staff_brand.png" alt="LX하우시스 공식대리점"><div class="staffCardName">${recordStaff(r)?.name||'담당자'}</div><div class="staffCardPhone">${staffPhone(r)}</div></div>
      <table class="xlsMeta"><tbody><tr><td class="label">견 적 일 자</td><td class="value">${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</td></tr><tr><td class="label">견 적 번 호</td><td class="value">${estimateNumber(r)}</td></tr><tr><td class="label">현 장 주 소</td><td class="value">${r.address||'-'}</td></tr><tr><td class="label">고 객 정 보</td><td class="value">${r.customer_name||'고객님'} | ${recordCustomerPhone(r)||'010-'}</td></tr><tr><td class="label amount">총 견 적 액</td><td class="value amount">${total.toLocaleString('ko-KR')}</td></tr></tbody></table>
      <div class="xlsValidity">* 본 견적서의 유효 기간은 발행일자로 부터 3개월 이내에 한함</div>
    </div>
    <div class="xlsSection">세 부 견 적 사 항 ( V A T 포 함 가 )</div>
    <table class="xlsItems"><colgroup><col class="no"><col class="kind"><col class="loc"><col class="product"><col class="glass"><col class="color"><col class="qty"><col class="screen"><col class="amount"><col class="memo"></colgroup><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품명</th><th>유 리 및 두께</th><th>색상</th><th>수량</th><th>방충망</th><th>금액</th><th>비고</th></tr></thead><tbody>${rows.join('')}</tbody><tbody class="xlsSummary"><tr><td colspan="8" class="sumLabel">창 호 계</td><td class="sumAmount">${Number(calc.total||0).toLocaleString('ko-KR')}</td><td></td></tr><tr><td colspan="8" class="sumLabel">표준 시공 기술료</td><td class="sumAmount">0</td><td></td></tr><tr><td colspan="8" class="sumLabel">부가 시공비</td><td class="sumAmount">${Number(extras.total||0).toLocaleString('ko-KR')}</td><td></td></tr><tr><td colspan="8" class="sumLabel">[ 합 계 ]</td><td class="sumAmount">${total.toLocaleString('ko-KR')}</td><td></td></tr></tbody></table>
    <div class="xlsSpacer"></div><div class="xlsBottom"><div class="xlsNotes"><div class="xlsNoteRow red">LX하우시스 정품 자재로 LX ENG 본사직영시공팀이 시공함 / 10년 품질보증</div><div class="xlsNoteRow">유리 : LX Z:IN 정품 유리로만 설치 시공함</div><div class="xlsNoteRow">잠금장치 : 자동잠금장치 및 크리센트 적용 (규격이하 제품일 경우 제외)</div><div class="xlsNoteRow">방충망 : 외부창 최신 AL분체방충망 적용, 내부창 제외</div><div class="xlsNoteRow">본 상품은 시공성 상품이므로 공사중 시설 훼손 · 스크레치 등이 발생할수 있음.</div><div class="xlsNoteRow red">사양 변경시 금액의 변경 또는 현장 여건상 시공 불가시 계약 취소 할수 있음 (계약금 전액 환불)</div><div class="xlsNoteRow">공식대리점은 시공 전후의 사진을 온라인 상 활용할 수 있음 (부동의시 비게재)</div></div><div class="xlsPayment">${payRows}<div class="xlsPayRow"><div class="payLabel">* BRP 진행시</div><div style="grid-column:2 / 4;text-align:left">중도금은 생략될 수 있으며, 잔금은 금융기관을 통해 후불 정산됨</div></div><div class="xlsAccount"><div>입금계좌안내</div><div>452-034930-04-025<br>1005-503-086146</div><div>기업은행<br>우리은행</div><div>㈜도도<br>㈜도도</div></div></div></div>
    <div class="xlsFooter"><img class="xlsQr" src="assets/image1.png" alt="공식대리점 QR"><img class="xlsDealerLogo" src="assets/image2.png" alt="LX하우시스 공식대리점"><div class="xlsFooterText"><b>수도권북부영업센터 공식대리점 주식회사 도도</b> (122-86-46519)<br>대표전화 1577-7864 / www.lx-zin.com / admin@lx-zin.com<br>실내건축면허보유 / LX하우시스 초유의 전부문 최우수상 3관왕 지점</div></div>
  </div>
  <div class="paymentEditor"><h3>결제 조건</h3><div class="paymentGrid"><label>결제 방법<select id="paymentMethod"><option>현금</option><option>계좌이체</option><option>카드</option><option>기타</option></select></label><label>계약금 %<input id="payDepositRate" type="number" min="0" max="100" step="1"></label><label>중도금 %<input id="payInterimRate" type="number" min="0" max="100" step="1"></label><label>잔금 %<input id="payBalanceRate" type="number" min="0" max="100" step="1"></label></div><p class="paymentHint">기본 결제 비율은 계약금 10% · 중도금 70% · 잔금 20%입니다. 비율을 바꾸면 금액도 즉시 계산됩니다.</p><div class="paymentTotal"><span>합계 비율</span><b id="paymentRateTotal">100%</b></div><button type="button" id="savePayment">결제 조건 저장</button></div>`;
  $('quote').classList.remove('hidden');
  $('payDepositRate').value=pay.depositRate;$('payInterimRate').value=pay.interimRate;$('payBalanceRate').value=pay.balanceRate;$('paymentMethod').value=pay.method||'현금';
  const updatePreview=()=>{const dr=Number($('payDepositRate').value)||0,ir=Number($('payInterimRate').value)||0,br=Number($('payBalanceRate').value)||0;const dep=Math.round(total*dr/100),mid=Math.round(total*ir/100),bal=total-dep-mid;$('payDepositValue').textContent=dep.toLocaleString('ko-KR');$('payInterimValue').textContent=mid.toLocaleString('ko-KR');$('payBalanceValue').textContent=bal.toLocaleString('ko-KR');$('payDepositLabel').textContent=`계약금 (${dr}%)`;$('payInterimLabel').textContent=`중도금 (${ir}%)`;$('payBalanceLabel').textContent=`잔 금 (${br}%)`;$('payMethodText').textContent=$('paymentMethod').value;$('paymentRateTotal').textContent=`${dr+ir+br}%`;$('paymentRateTotal').classList.toggle('invalid',dr+ir+br!==100);};
  ['payDepositRate','payInterimRate','payBalanceRate','paymentMethod'].forEach(id=>$(id).addEventListener('input',updatePreview));
  $('paymentMethod').addEventListener('change',updatePreview);updatePreview();
  $('savePayment').onclick=async()=>{const depositRate=Number($('payDepositRate').value)||0,interimRate=Number($('payInterimRate').value)||0,balanceRate=Number($('payBalanceRate').value)||0;if(depositRate+interimRate+balanceRate!==100)return alert('계약금·중도금·잔금 비율의 합계를 100%로 맞춰주세요.');const deposit=Math.round(total*depositRate/100),interim=Math.round(total*interimRate/100),balance=total-deposit-interim;const payment={depositRate,interimRate,balanceRate,deposit,interim,balance,method:$('paymentMethod').value};let result=await db.from('estimates').update({payment_data:payment}).eq('id',r.id);if(result.error){const memo=cleanMemo(r.memo);result=await db.from('estimates').update({memo:encodeExtras(memo,recordStaff(r),({phone:recordCustomerPhone(r)}),payment)}).eq('id',r.id);}if(result.error)alert(result.error.message);else{r.payment_data=payment;alert('결제 조건이 저장되었습니다.');}};
}
function renderQuote(mode,calc){if(mode==='internal')return renderInternalQuote(calc);return renderCustomerQuote(calc);}
$('newBtn').onclick=()=>{resetForm();$('sizeBand').value='20';$('oldFrame').value='AL';$('equipment').value='가능';$('protection').value='none';show('form');addItem();renderExtraSummary();};$('backBtn').onclick=$('cancelBtn').onclick=()=>show('home');$('detailBackBtn').onclick=()=>{show('home');staffInit();load();};$('editBtn').onclick=async()=>{const r=state.detailRecord;const{data,error}=await db.from('estimate_items').select('*').eq('estimate_id',r.id).order('id');if(error)return alert(error.message);$('projectName').value=r.project_name||'';$('customerName').value=r.customer_name||'';$('customerPhone').value=recordCustomerPhone(r);$('address').value=r.address||'';$('status').value=r.status||'작성중';$('memo').value=cleanMemo(r.memo);const ex=recordExtras(r);if(ex&&ex.conditions){$('sizeBand').value=ex.conditions.size;$('oldFrame').value=ex.conditions.old;$('equipment').value=ex.conditions.equip;$('protection').value=ex.conditions.protection;}$('items').innerHTML='';state.items=[];state.editingId=r.id;$('formTitle').textContent='견적 수정';$('formEyebrow').textContent='EDIT ESTIMATE';$('saveBtn').textContent='수정 저장';(data||[]).forEach(x=>addItem({...x,kind:inferKind(itemName(x))}));if(!data?.length)addItem();show('form');};$('deleteBtn').onclick=async()=>{const r=state.detailRecord;if(!confirm(`“${r.project_name}” 견적을 삭제할까요?`))return;await db.from('estimate_items').delete().eq('estimate_id',r.id);const{error}=await db.from('estimates').delete().eq('id',r.id);if(error)return alert(error.message);show('home');load();};$('internalBtn').onclick=async()=>renderQuote('internal',await calculate(state.detailItems));$('customerBtn').onclick=async()=>renderQuote('customer',await calculate(state.detailItems));$('addItem').onclick=()=>{addItem();renderExtraSummary();};['sizeBand','oldFrame','equipment','protection'].forEach(id=>$(id).onchange=renderExtraSummary);
$('estimateForm').onsubmit=async e=>{e.preventDefault();if($('saveBtn').disabled)return;$('saveBtn').disabled=true;$('message').textContent='가격 확인 중...';try{const extras=getExtras();const rawMemo=$('memo').value;let originalAuthor=null;if(state.editingId&&state.detailRecord)originalAuthor=recordStaff(state.detailRecord);const rawItems=state.items.map(el=>{const kind=el.querySelector('.kind').value;const name=kind==='직접입력'?el.querySelector('.customName').value:el.querySelector('.location').value;const product=el.querySelector('.product').value;const actualWidth=Number(el.querySelector('.w').value);const actualHeight=Number(el.querySelector('.h').value);return{installation_location:name,product_code:product,window_type:el.querySelector('.windowType').value==='고정창'?'fixed':'normal',actual_width:actualWidth,actual_height:actualHeight,applied_width:Math.ceil(actualWidth/200)*200,applied_height:Math.ceil(actualHeight/200)*200};});if(!rawItems.length)throw new Error('창호 항목을 하나 이상 추가해주세요.');$('message').textContent='가격표 조회 중...';const calc=await calculate(rawItems);const unavailable=calc.items.find(x=>!x.available);if(unavailable)throw new Error(unavailable.reason||'해당 치수의 가격표가 없습니다.');const payload={project_name:$('projectName').value,customer_name:$('customerName').value,address:$('address').value,status:$('status').value,memo:cleanMemo(rawMemo),customer_phone:$('customerPhone').value,staff_id:(originalAuthor||state.staff)?.id||null,staff_name:(originalAuthor||state.staff)?.name||'',extras_data:extras,total_amount:calc.total+extras.total};
if(state.hasEstimateNo&&!state.editingId)payload.estimate_no=nextEstimateNo();let id=state.editingId;if(id){const{error}=await db.from('estimates').update(payload).eq('id',id);if(error)throw error;const{error:itemDeleteError}=await db.from('estimate_items').delete().eq('estimate_id',id);if(itemDeleteError)throw itemDeleteError;}else{const{data,error}=await db.from('estimates').insert(payload).select().single();if(error)throw error;id=data.id;}const rows=calc.items.map(x=>({estimate_id:id,installation_location:x.installation_location||itemName(x),product_code:x.product_code,window_type:x.window_type||'normal',actual_width:x.actual_width,actual_height:x.actual_height,applied_width:x.applied_width,applied_height:x.applied_height,glass_type:x.glass_type||'28T',material_cost:x.material,installation_cost:x.install,additional_cost:0,total_cost:x.amount,memo:null}));const{error:itemError}=await db.from('estimate_items').insert(rows);if(itemError)throw itemError;$('message').textContent='저장되었습니다.';setTimeout(()=>{show('home');load();},500);}catch(err){console.error(err);$('message').textContent='저장 실패: '+(err?.message||err);}finally{$('saveBtn').disabled=false;}};

$('estimateSearch')?.addEventListener('input',renderEstimateList);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('estimateSearch')){$('estimateSearch').value='';renderEstimateList();}});
function boot(){
  try{staffInit();if(state.staff){show('home');load();}}catch(err){console.error(err);alert('담당자 선택 화면을 불러오지 못했습니다. 페이지를 새로고침해주세요.');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
