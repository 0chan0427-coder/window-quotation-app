const { createClient } = supabase; const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY); const $=id=>document.getElementById(id);
function money(value){return `${Number(value||0).toLocaleString('ko-KR')}원`;}
const ADDITIONAL_PRODUCTS=[{key:'door3',name:'3연동 중문',base:1900000,discount:true,service:true},{key:'partition',name:'중문 파티션',base:800000,discount:false,service:false},{key:'ceramic',name:'세라믹탄성코트',base:0,discount:true,service:true},{key:'turning',name:'터닝도어',base:800000,discount:true,service:true},{key:'absdoor',name:'ABS도어',base:300000,discount:true,service:true},{key:'security',name:'방범창',base:150000,discount:true,service:true},{key:'drying',name:'빨래건조대',base:100000,discount:true,service:true}]; const STAFF=[{id:1,name:'한동균 팀장',phone:'010-7415-0619'},{id:2,name:'김민찬 책임',phone:'010-8438-7469'},{id:3,name:'김영찬 책임',phone:'010-5490-9662'}]; const STAFF_KEY='window_quote_staff'; const state={items:[],editingId:null,detailRecord:null,detailItems:[],prices:null,staff:null,estimates:[],hasEstimateNo:false};
function staffInit(){state.staff=null;renderStaff();}
function renderStaff(){const gate=$('staffGate'),choices=$('staffChoices');choices.innerHTML=STAFF.map(x=>`<button class="staffChoice" data-id="${x.id}">${x.name}</button>`).join('');choices.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.staff=STAFF.find(x=>String(x.id)===b.dataset.id);renderStaff();show('home');load();});gate.classList.toggle('hidden',!!state.staff);$('currentStaff').textContent=state.staff?`현재 담당자: ${state.staff.name}`:'';}
$('changeStaff').onclick=()=>{state.staff=null;renderStaff();show('home');};
const locations={'발코니창':['입구방 발코니','입구방(2) 발코니','거실 발코니','안방 발코니','건너방 발코니','건너방(2) 발코니','주방 발코니'],'분합창':['입구방 분합','거실 분합','안방 분합','건너방 분합','주방 분합'],'내창':['입구방 내창','안방 내창','건너방 내창'],'주방창':['주방창'],'복도창':['복도형 아파트 복도창']};
const products=['F-140','F-130I','F-230W','F-230WF','F-250','F-250I'];
const COLORS=['기본색','퓨어 화이트','스노우 화이트','모노 화이트','크림 화이트','라이트 베이지','크리미','크레마','내추럴 오크','워시 베이지','모던 그레이','어반 그레이','모던 블랙']; const priceProduct={'F-130I':'F-140','F-250I':'F-250'};
async function getPrices(){
  if(state.prices)return state.prices;
  try{
    const res=await fetch('assets/price-table-v38.json',{cache:'no-store'});
    if(!res.ok)throw new Error('가격표 파일 HTTP '+res.status);
    const data=await res.json();
    if(!Array.isArray(data)||!data.length)throw new Error('가격표 데이터가 비어 있습니다.');
    state.prices=data;
    return state.prices;
  }catch(err){
    console.error(err);
    throw new Error('엑셀 기준 가격표를 불러오지 못했습니다. assets/price-table-v38.json 파일을 확인해주세요.');
  }
}
function field(o,names){for(const n of names)if(o&&o[n]!==undefined)return o[n];return null;}
async function insertItemCompatible(payload){let p={...payload};for(let attempt=0;attempt<12;attempt++){const result=await db.from('estimate_items').insert(p);if(!result.error)return result;const msg=result.error.message||'';const m=msg.match(/Could not find the '([^']+)' column of 'estimate_items'/i);if(!m)return result;const missing=m[1];if(missing==='window_name'){delete p.window_name;p.item_name=payload.window_name;}else if(missing==='item_name'){delete p.item_name;p.name=payload.window_name;}else if(missing==='name'){delete p.name;p.location=payload.window_name;}else{delete p[missing];}}return{error:{message:'estimate_items 컬럼 호환 처리에 실패했습니다.'}};}
function show(id){['home','form','detail'].forEach(x=>$(x).classList.toggle('hidden',x!==id));}
function ceramicPriceOptions(size){const m={20:[1000000],30:[1300000,1500000],40:[1500000],50:[1800000]};return m[String(size)]||[0];}
function additionalBase(key,size){if(key==='ceramic')return ceramicPriceOptions(size)[0]||0;const p=ADDITIONAL_PRODUCTS.find(x=>x.key===key);return p?.base||0;}
function additionalFinal(item){const qty=Math.max(1,Number(item.qty)||1), base=Number(item.basePrice)||0;if(item.service)return 0;return Math.max(0,(Number(item.appliedUnitPrice)||base)-Math.max(0,Number(item.discount)||0))*qty;}
function additionalUnitApplied(item){if(item.service)return 0;return Math.max(0,(Number(item.appliedUnitPrice)||Number(item.basePrice)||0)-Math.max(0,Number(item.discount)||0));}
function readAdditionalProducts(){return [...document.querySelectorAll('#additionalProducts .additionalProduct')].map(el=>{const key=el.querySelector('.apKey').value;const size=$('sizeBand').value;const p=ADDITIONAL_PRODUCTS.find(x=>x.key===key)||ADDITIONAL_PRODUCTS[0];let base=Number(el.querySelector('.basePrice').value)||additionalBase(key,size);let applied=Number(el.querySelector('.appliedUnitPrice').value)||base;const service=el.querySelector('.serviceCheck').checked;const discount=p.discount?Math.max(0,Number(el.querySelector('.discount').value)||0):0;return {key,name:p.name,qty:Math.max(1,Number(el.querySelector('.qty').value)||1),basePrice:base,appliedUnitPrice:applied,discount,service,finalAmount:service?0:Math.max(0,applied-discount)*Math.max(1,Number(el.querySelector('.qty').value)||1)};});}
function renderAdditionalSummary(){const rows=readAdditionalProducts();const total=rows.reduce((s,x)=>s+x.finalAmount,0);$('additionalProductSummary').innerHTML=rows.length?'<p>추가상품 합계 <b>'+money(total)+'</b></p>':'<p class="muted">선택된 추가상품이 없습니다.</p>';return {rows,total};}
function addAdditionalProduct(d={}){
  const el=document.createElement('div'); el.className='additionalProduct card';
  const size=$('sizeBand').value; const key=d.key||'door3'; const p0=ADDITIONAL_PRODUCTS.find(x=>x.key===key)||ADDITIONAL_PRODUCTS[0];
  const opts0=key==='ceramic'?ceramicPriceOptions(size):[p0.base]; const currentApplied=Number(d.appliedUnitPrice)||opts0[0]||p0.base;
  el.innerHTML=`<div class="itemhead"><b>추가상품</b><button type="button" class="remove additionalRemove">삭제</button></div><label>품목<select class="apKey">${ADDITIONAL_PRODUCTS.map(x=>`<option value="${x.key}">${x.name}</option>`).join('')}</select></label><div class="dims"><label>수량<input class="qty" type="number" min="1" step="1" value="${d.qty||1}"></label><label>정상가(단가)<input class="basePrice" type="number" min="0" step="10000" value="${Number(d.basePrice)||additionalBase(key,size)}" readonly></label></div><label>적용금액(단가) <select class="ceramicApplied"></select><input class="appliedUnitPrice" type="number" min="0" step="10000" value="${currentApplied}"></label><div class="dims"><label>할인금액(단가)<input class="discount" type="number" min="0" step="10000" value="${d.discount||0}"></label><label class="serviceLabel"><span>서비스</span><input class="serviceCheck" type="checkbox" ${d.service?'checked':''}></label></div><div class="apResult"></div>`;
  $('additionalProducts').append(el); el.querySelector('.apKey').value=key;
  let first=true;
  const update=(reset=false)=>{
    const k=el.querySelector('.apKey').value, pp=ADDITIONAL_PRODUCTS.find(x=>x.key===k)||ADDITIONAL_PRODUCTS[0], isCer=k==='ceramic';
    const options=ceramicPriceOptions($('sizeBand').value), base=isCer?options[0]:pp.base;
    el.querySelector('.basePrice').value=base;
    const sel=el.querySelector('.ceramicApplied'); sel.innerHTML=(isCer?options:[base]).map(v=>`<option value="${v}">${money(v)}</option>`).join(''); sel.classList.toggle('hidden',!isCer);
    el.querySelector('.appliedUnitPrice').classList.toggle('hidden',isCer);
    if(reset){
      el.querySelector('.discount').value=0; el.querySelector('.serviceCheck').checked=false;
      el.querySelector('.appliedUnitPrice').value=base;
    } else if(first){
      if(isCer){const saved=Number(d.appliedUnitPrice);sel.value=options.includes(saved)?String(saved):String(base);el.querySelector('.appliedUnitPrice').value=sel.value;}
      else el.querySelector('.appliedUnitPrice').value=Number(d.appliedUnitPrice)||base;
    } else if(isCer && !options.includes(Number(el.querySelector('.appliedUnitPrice').value))){sel.value=String(base);el.querySelector('.appliedUnitPrice').value=base;}
    if(isCer){sel.value=String(Number(el.querySelector('.appliedUnitPrice').value)||base);}
    el.querySelector('.discount').disabled=!pp.discount; el.querySelector('.serviceCheck').disabled=!pp.service;
    const service=el.querySelector('.serviceCheck').checked, applied=Number(isCer?sel.value:el.querySelector('.appliedUnitPrice').value)||0, discount=pp.discount?Math.max(0,Number(el.querySelector('.discount').value)||0):0, qty=Math.max(1,Number(el.querySelector('.qty').value)||1);
    const final=service?0:Math.max(0,applied-discount)*qty; el.querySelector('.apResult').innerHTML=`<b>적용금액 ${money(final)}</b>`; renderAdditionalSummary();
  };
  el.querySelector('.apKey').onchange=()=>{first=false;update(true);};
  el.querySelector('.ceramicApplied').onchange=()=>{el.querySelector('.appliedUnitPrice').value=el.querySelector('.ceramicApplied').value;update();};
  ['qty','appliedUnitPrice','discount'].forEach(c=>el.querySelector('.'+c).addEventListener('input',()=>update()));
  el.querySelector('.serviceCheck').addEventListener('change',()=>update());
  el.querySelector('.additionalRemove').onclick=()=>{el.remove();renderAdditionalSummary();};
  update(); first=false;
}

function loadAdditionalProducts(rows=[]){$('additionalProducts').innerHTML='';(rows||[]).forEach(x=>addAdditionalProduct(x));renderAdditionalSummary();}
function recordAdditionalProducts(r){const ex=recordExtras(r);return Array.isArray(ex.additionalProducts)?ex.additionalProducts:[];}
function resetForm(){$('estimateForm').reset();$('items').innerHTML='';state.items=[];$('additionalProducts').innerHTML='';state.editingId=null;$('formTitle').textContent='새 견적 작성';$('formEyebrow').textContent='NEW ESTIMATE';$('saveBtn').textContent='견적 저장';$('message').textContent='';if($('estimateColor'))$('estimateColor').value='기본색';}
function itemName(item){return item?.installation_location||item?.window_name||item?.item_name||item?.name||item?.location||'';}
function inferKind(name){for(const[k,names]of Object.entries(locations))if(names.includes(name))return k;return '직접입력';}
function itemKind(item){const saved=item?.window_kind||item?.kind||item?.windowKind;if(saved && (Object.prototype.hasOwnProperty.call(locations,saved)||saved==='직접입력'))return saved;return inferKind(itemName(item));}
function itemScreen(item){const option=item?.screen_option||item?.screenOption;if(option==='없음')return '-';if(option==='있음')return 'AL 방충망';const kind=itemKind(item);return ['발코니창','복도창'].includes(kind)?'AL 방충망':'-';}
function itemOutside(item){return ['발코니창','복도창'].includes(itemKind(item));}
function estimateColor(r){const ex=recordExtras(r)||{};return COLORS.includes(r?.estimate_color)?r.estimate_color:(COLORS.includes(ex.color)?ex.color:(COLORS.includes(r?.color)?r.color:'기본색'));}
function handleStatus(item){return item?.window_type==='fixed'?'무':'유';}
function parseTaggedJSON(memo,label){const m=String(memo||'').match(new RegExp('\\['+label+'\\]\\s*(\\{[\\s\\S]*?\\})(?=\\n|$)'));if(!m)return null;try{return JSON.parse(m[1]);}catch{return null;}}
function fillLocations(el,kind,selected=''){const loc=el.querySelector('.location');const list=locations[kind]||[];loc.innerHTML=list.length?list.map(x=>`<option value="${x}" ${x===selected?'selected':''}>${x}</option>`).join(''):'<option value="">직접 입력</option>';}
function addItem(d={}){const n=state.items.length+1,el=document.createElement('div');el.className='item card';el.innerHTML=`<div class="itemhead"><b class="itemNo">창 ${n}</b><button type="button" class="remove">삭제</button></div><label>창 종류<select class="kind"><option value="">선택하세요</option>${Object.keys(locations).map(k=>`<option>${k}</option>`).join('')}<option>직접입력</option></select></label><label>위치<select class="location"><option>창 종류를 먼저 선택</option></select></label><label class="custom hidden">직접 입력<input class="customName"></label><label>창 형태<select class="windowType"><option value="일반창">일반창</option><option value="고정창">고정창</option></select></label><label>적용 제품<select class="product">${products.map(p=>`<option>${p}</option>`).join('')}</select></label><label>방충망<select class="screen"><option value="자동">자동</option><option value="있음">있음</option><option value="없음">없음</option></select></label><button type="button" class="secondary change">제품 변경</button><div class="dims"><label>실측 가로(mm)<input type="number" class="w" inputmode="numeric" min="1" required></label><label>실측 세로(mm)<input type="number" class="h" inputmode="numeric" min="1" required></label></div><label>요율 <span class="muted">(선택)</span><input type="number" class="pricingRate" inputmode="decimal" min="0" step="0.01" placeholder="예: 1.75"></label><div class="result">요율을 비워두면 현재 가격표 계산가를 그대로 사용합니다.</div>`;$('items').append(el);bindItem(el);state.items.push(el);const kind=d.kind||itemKind(d);if(kind){el.querySelector('.kind').value=kind;fillLocations(el,kind,itemName(d));el.querySelector('.custom').classList.toggle('hidden',kind!=='직접입력');}if(kind==='직접입력')el.querySelector('.customName').value=itemName(d);el.querySelector('.product').value=d.product_code||'F-140';el.querySelector('.windowType').value=(d.window_type==='fixed'||d.window_type==='고정창')?'고정창':'일반창';el.querySelector('.screen').value=d.screen_option||'자동';el.querySelector('.w').value=d.actual_width||'';el.querySelector('.h').value=d.actual_height||'';el.querySelector('.pricingRate').value=d.pricing_rate??'';el.dataset.itemId=d.id||'';}
function renumber(){state.items.forEach((e,i)=>e.querySelector('.itemNo').textContent=`창 ${i+1}`);}
function bindItem(el){const kind=el.querySelector('.kind'),prod=el.querySelector('.product');kind.onchange=()=>{fillLocations(el,kind.value);el.querySelector('.custom').classList.toggle('hidden',kind.value!=='직접입력');if(kind.value==='분합창')prod.value='F-230WF';if(kind.value==='내창')prod.value='F-230W';if(kind.value==='주방창')prod.value='F-130I';if(kind.value==='복도창')prod.value='F-250I';renderExtraSummary();};el.querySelector('.remove').onclick=()=>{el.remove();state.items=state.items.filter(x=>x!==el);renumber();renderExtraSummary();};el.querySelector('.change').onclick=()=>prod.focus();}
function getExtras(){const size=$('sizeBand').value,old=$('oldFrame').value,equip=$('equipment').value,protection=$('protection').value;const equipment=equip==='불가'?500000:400000;const demolition=size==='20'?(old==='AL'?300000:400000):(old==='AL'?400000:500000);const map={'none':0,'1-2':140000,'3-4':170000,'5-7':200000,'8-9':230000,'10+':270000};const sash=state.items.filter(el=>el.querySelector('.kind').value==='발코니창'&&Number(el.querySelector('.h').value)>=2000).length*100000;const molding=state.items.filter(el=>['분합창','내창','주방창'].includes(el.querySelector('.kind').value)).length*55000;return {equipment,demolition,sash,molding,protection:map[protection]||0,total:equipment+demolition+sash+molding+(map[protection]||0),color:$('estimateColor')?.value||'기본색',discountRate:0,conditions:{size,old,equip,protection}};}function renderExtraSummary(){const e=getExtras();$('extraSummary').innerHTML='<p>장비비 <b>'+money(e.equipment)+'</b></p><p>철거비 <b>'+money(e.demolition)+'</b></p><p>사춤 / 타일 <b>'+money(e.sash)+'</b></p><p>몰딩 <b>'+money(e.molding)+'</b></p><p>보양 <b>'+money(e.protection)+'</b></p><hr><p class="grand">부가시공비 합계 <b>'+money(e.total)+'</b></p>';}function cleanMemo(value){return String(value||'').replace(/\n?\[고객 데이터\][\s\S]*$/,'').replace(/\n?\[담당자 데이터\][\s\S]*$/,'').replace(/\n?\[부가시공비 데이터\][\s\S]*$/,'').replace(/\n?\[결제 데이터\][\s\S]*$/,'').trim();}
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
function recordExtras(r){let ex=r?.extras_data||{};if(typeof ex==='string'){try{ex=JSON.parse(ex)}catch{ex={}}}return {...{equipment:0,demolition:0,sash:0,molding:0,protection:0,total:0,color:'기본색',discountRate:0,additionalProducts:[]},...ex};}
function materialInstallTotals(calc){const material=(calc?.items||[]).reduce((s,x)=>s+(x.available?Number(x.material)||0:0),0);const install=(calc?.items||[]).reduce((s,x)=>s+(x.available?Number(x.install)||0:0),0);return {material,install};}
function discountInfo(calc,extras){const totals=materialInstallTotals(calc);const rate=Math.max(0,Math.min(100,Number(extras?.discountRate)||0));const discount=Math.round(totals.material*rate/100);const windowTotal=totals.material+totals.install-discount;const extraTotal=Number(extras?.total)||0;return {...totals,rate,discount,windowTotal,extraTotal,finalTotal:windowTotal+extraTotal};}
function customerFinalAmount(r,internalTotal){const ex=recordExtras(r)||{};const manual=Number(ex.customerFinalAmount);if(Number.isFinite(manual)&&manual>0)return Math.floor(manual/10000)*10000;return Math.floor(Number(internalTotal||0)/10000)*10000;}
function normalizedManualAmount(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)return null;return Math.floor(n/10000)*10000;}
function recalcStoredExtras(r,items){
  const saved=recordExtras(r)||{};
  const conditions=saved.conditions||{};
  const size=conditions.size, old=conditions.old, equip=conditions.equip, protection=conditions.protection;
  const equipment=equip!==undefined?(equip==='불가'?500000:400000):Number(saved.equipment)||0;
  const demolition=(size!==undefined&&old!==undefined)?(size==='20'?(old==='AL'?300000:400000):(old==='AL'?400000:500000)):Number(saved.demolition)||0;
  const protectionMap={'none':0,'1-2':140000,'3-4':170000,'5-7':200000,'8-9':230000,'10+':270000};
  const protectionValue=protection!==undefined?(protectionMap[protection]||0):Number(saved.protection)||0;
  const sash=(items||[]).filter(x=>itemKind(x)==='발코니창'&&Number(x.actual_height)>=2000).length*100000;
  const molding=(items||[]).filter(x=>['분합창','내창','주방창'].includes(itemKind(x))).length*55000;
  const additionalProducts=Array.isArray(saved.additionalProducts)?saved.additionalProducts:[];const additionalProductTotal=additionalProducts.reduce((sum,x)=>sum+(Number(x.finalAmount)||0),0);const constructionTotal=equipment+demolition+sash+molding+protectionValue;return {...saved,equipment,demolition,sash,molding,protection:protectionValue,additionalProducts,additionalProductTotal,constructionTotal,total:constructionTotal+additionalProductTotal};
}
function recordPayment(r){return r?.payment_data||parseTaggedJSON(r?.memo,'결제 데이터')||null;}
function encodeExtras(memo,staff,customer,payment){
  const clean=cleanMemo(memo);
  return `${clean}${clean?'\n\n':''}[고객 데이터] ${JSON.stringify(customer||{})}\n[담당자 데이터] ${JSON.stringify(staff||{})}\n[결제 데이터] ${JSON.stringify(payment||{})}`;
}
async function calculate(items, rates=[]){
  const rows=await getPrices();
  if(!Array.isArray(rows)||!rows.length) throw new Error('product_prices에 가격표 데이터가 없습니다.');
  let total=0;
  const normalize=v=>String(v??'').replace(/\s+/g,'').toUpperCase();
  const out=items.map((item,index)=>{
    const lookup=priceProduct[item.product_code]||item.product_code;
    const code=normalize(lookup);
    const w=Number(item.actual_width), h=Number(item.actual_height);
    const productRows=rows.filter(p=>normalize(p.product_code)===code);
    if(!productRows.length)return {...item,lookup,available:false,reason:`가격표 없음: ${lookup}`};
    const widths=productRows.map(p=>Number(p.width_mm)).filter(Number.isFinite);
    const heights=productRows.map(p=>Number(p.height_mm)).filter(Number.isFinite);
    const minWidth=Math.min(...widths);
    const maxWidth=Math.max(...widths);
    const minHeight=Math.min(...heights);
    const maxHeight=Math.max(...heights);
    const requestedWidth=Math.ceil(w/200)*200;
    const requestedHeight=Math.ceil(h/200)*200;
    // 가격표보다 작은 실측 치수는 최소 규격으로, 큰 실측 치수는 최대 규격으로 계산한다.
    // 예: 600×1300 → 최소 규격, 3200×2600 → 최대 규격.
    const appliedWidth=Math.min(Math.max(requestedWidth,minWidth),maxWidth);
    const appliedHeight=Math.min(Math.max(requestedHeight,minHeight),maxHeight);
    let price=productRows.find(p=>Number(p.width_mm)===appliedWidth&&Number(p.height_mm)===appliedHeight);
    // 가격표가 완전한 격자형이 아닌 제품도 가장 가까운 상위 규격을 사용한다.
    if(!price){
      const candidates=productRows.filter(p=>Number(p.width_mm)>=appliedWidth&&Number(p.height_mm)>=appliedHeight);
      if(candidates.length){
        candidates.sort((a,b)=>{
          const da=(Number(a.width_mm)-appliedWidth)+(Number(a.height_mm)-appliedHeight);
          const db=(Number(b.width_mm)-appliedWidth)+(Number(b.height_mm)-appliedHeight);
          return da-db || (Number(a.width_mm)*Number(a.height_mm))-(Number(b.width_mm)*Number(b.height_mm));
        });
        price=candidates[0];
      }
    }
    if(!price)return {...item,lookup,applied_width:appliedWidth,applied_height:appliedHeight,available:false,reason:`가격표 없음: ${lookup} / ${appliedWidth}×${appliedHeight}mm`};
    const material=Number(price.material_cost)||0;
    const install=Number(price.installation_cost)||0;
    const rate=Number(item.pricing_rate ?? rates[index] ?? 0);
    const rateApplied=Number.isFinite(rate)&&rate>0;
    const amount=rateApplied?Math.round(material*rate+install):material+install;
    if(amount<=0)return {...item,lookup,applied_width:appliedWidth,applied_height:appliedHeight,available:false,reason:`가격이 0원: ${lookup} / ${appliedWidth}×${appliedHeight}mm`};
    total+=amount;
    return {...item,lookup,available:true,applied_width:appliedWidth,applied_height:appliedHeight,material,install,amount,pricing_rate:rateApplied?rate:null,base_amount:material+install,rate_applied:rateApplied};
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
async function detail(r){state.detailRecord=r;$('detailTitle').textContent=r.project_name||'현장명 미입력';$('dProject').textContent=r.project_name||'-';$('dCustomer').textContent=r.customer_name||'-';$('dAddress').textContent=r.address||'-';$('dDate').textContent=new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR');$('dStaff').textContent=((recordStaff(r)?.name||'미지정'));$('dStatus').textContent=r.status||'-';$('dMemo').textContent=cleanMemo(r.memo).trim()||'-';$('dTotal').textContent='계산 중...';$('dItems').innerHTML='불러오는 중...';$('dExtras').innerHTML='불러오는 중...';$('quote').classList.add('hidden');show('detail');const{data,error}=await db.from('estimate_items').select('*').eq('estimate_id',r.id).order('id');if(error){$('dTotal').textContent='항목 조회 실패';$('dItems').textContent=error.message;return;}state.detailItems=data||[];let calc={items:state.detailItems.map(x=>({...x,available:false})),total:0};let priceError='';try{calc=await calculate(state.detailItems);}catch(err){console.error(err);priceError=err?.message||'가격표 조회 실패';}const extras=recalcStoredExtras(r,state.detailItems);const quoteColor=estimateColor(r);state.detailItems=state.detailItems.map(x=>({...x,color:quoteColor}));calc.items=calc.items.map(x=>({...x,color:quoteColor}));$('dItems').innerHTML=state.detailItems.length?'<table><thead><tr><th>구분</th><th>위치</th><th>제품</th><th>색상</th><th>실측</th><th>적용</th><th>방충망</th><th>창 형태</th><th>금액</th></tr></thead><tbody>'+calc.items.map(x=>`<tr><td>${itemKind(x)||'-'}</td><td>${itemName(x)||'-'}</td><td>${x.product_code||'-'}</td><td>${x.color||'기본색'}</td><td>${x.actual_width||'-'}×${x.actual_height||'-'}mm</td><td>${x.applied_width||'-'}×${x.applied_height||'-'}mm</td><td>${itemScreen(x)}</td><td>${x.window_type==='fixed'?'고정창 / 핸들 무':'일반창 / 핸들 유'}</td><td>${x.available&&x.amount>0?money(x.amount):(x.reason||priceError||'계산 후 확인')}</td></tr>`).join('')+'</tbody></table>':'등록된 창호 항목이 없습니다.';$('dExtras').innerHTML='<table><tbody>'+[['장비비',extras.equipment],['철거비',extras.demolition],['사춤 / 타일',extras.sash],['몰딩',extras.molding],['보양',extras.protection]].map(([n,v])=>`<tr><td>${n}</td><td class="amount">${money(v||0)}</td></tr>`).join('')+`<tr class="sumRow"><th>부가시공비 합계</th><th class="amount">${money((extras.equipment||0)+(extras.demolition||0)+(extras.sash||0)+(extras.molding||0)+(extras.protection||0))}</th></tr></tbody></table>`+(extras.additionalProducts?.length?`<h4 class="subDetailTitle">추가상품 내역</h4><table><thead><tr><th>품목</th><th>수량</th><th>정상가</th><th>할인</th><th>서비스</th><th>적용금액</th></tr></thead><tbody>${extras.additionalProducts.map(x=>`<tr><td>${x.name||'-'}</td><td>${x.qty||1}</td><td>${money((Number(x.basePrice)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':money((Number(x.discount)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':'-'}</td><td>${money(x.finalAmount||0)}</td></tr>`).join('')}</tbody></table>`:'');calc.extras=extras;const detailDiscount=discountInfo(calc,extras);$('dTotal').textContent=priceError?'가격표 확인 필요':money(detailDiscount.finalTotal);}
async function saveQuoteAsImage(mode){
  let target=document.querySelector(mode==='internal'?'.internalQuoteSheet':'.xlsQuote.customer');
  if(!target && state.detailRecord && state.detailItems?.length){
    try{
      const calc=await calculate(state.detailItems);
      renderQuote(mode,calc);
      target=document.querySelector(mode==='internal'?'.internalQuoteSheet':'.xlsQuote.customer');
    }catch(err){
      console.error(err);
      alert('견적서를 먼저 열지 못했습니다. 가격표를 확인해주세요.');
      return;
    }
  }
  if(!target){alert('저장할 견적서를 먼저 열어주세요.');return;}
  if(typeof html2canvas!=='function'){alert('이미지 저장 기능을 불러오지 못했습니다. 인터넷 연결 후 페이지를 새로고침해주세요.');return;}
  const btn=document.querySelector('.quoteTools .imageSaveBtn');
  if(btn){btn.disabled=true;btn.textContent='이미지 생성 중...';}
  try{
    const canvas=await html2canvas(target,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,windowWidth:Math.max(document.documentElement.clientWidth,target.scrollWidth)});
    const link=document.createElement('a');
    const no=estimateNumber(state.detailRecord)||'견적서';
    link.download=`DODO_${no}_${mode==='internal'?'내부용':'고객용'}.png`;
    link.href=canvas.toDataURL('image/png');
    link.click();
  }catch(err){
    console.error(err);
    alert('이미지 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='이미지 저장';}
  }
}
function renderInternalQuote(calc){
  const r=state.detailRecord;
  const extras=recalcStoredExtras(r,state.detailItems);
  const di=discountInfo(calc,extras);
  const total=di.finalTotal;
  const rows=(calc.items||[]).map((x,i)=>`<tr><td>${i+1}</td><td>${itemKind(x)||'-'}</td><td>${itemName(x)||'-'}</td><td>${x.product_code||'-'}</td><td>${x.actual_width||'-'} × ${x.actual_height||'-'}</td><td>${x.applied_width||'-'} × ${x.applied_height||'-'}</td><td>${x.window_type==='fixed'?'고정창 / 핸들 무':'일반창 / 핸들 유'}</td><td>${x.material?money(x.material):'-'}</td><td>${x.install?money(x.install):'-'}</td><td>${x.rate_applied?Number(x.pricing_rate).toFixed(2):'-'}</td><td>${x.available?money(x.amount):'-'}</td></tr>`).join('');
  $('quote').innerHTML=`<div class="quoteTools"><button onclick="window.print()">인쇄 / PDF 저장</button><button class="imageSaveBtn secondary" type="button" onclick="saveQuoteAsImage('internal')">이미지 저장</button></div>
    <div class="internalQuoteSheet">
      <div class="internalHeader"><div><small>INTERNAL ESTIMATE</small><h2>내부용 상세 견적서</h2></div><div class="internalStaff"><b>${recordStaff(r)?.name||'담당자 미지정'}</b><span>${staffPhone(r)}</span></div></div>
      <div class="internalMeta"><div><b>현장명</b><span>${r.project_name||'-'}</span></div><div><b>고객명</b><span>${r.customer_name||'-'}</span></div><div><b>견적번호</b><span>${estimateNumber(r)}</span></div><div><b>작성일</b><span>${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</span></div><div class="wide"><b>현장주소</b><span>${r.address||'-'}</span></div></div>
      <h3>창호 상세 내역</h3><div class="internalTable detailEstimateTable"><table><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품</th><th>실측 가로 × 세로(mm)</th><th>적용 가로 × 세로(mm)</th><th>형태</th><th>자재비</th><th>시공비</th><th>요율</th><th>합계</th></tr></thead><tbody>${rows||'<tr><td colspan="11">등록된 창호 항목이 없습니다.</td></tr>'}</tbody></table></div>
      <h3>추가상품 내역</h3>${extras.additionalProducts?.length?`<div class="internalTable"><table><thead><tr><th>품목</th><th>수량</th><th>정상가</th><th>할인</th><th>서비스</th><th>적용금액</th></tr></thead><tbody>${extras.additionalProducts.map(x=>`<tr><td>${x.name||'-'}</td><td>${x.qty||1}</td><td>${money((Number(x.basePrice)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':money((Number(x.discount)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':'-'}</td><td>${money(x.finalAmount||0)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">추가상품 없음</p>'}<h3>금액 집계 및 할인</h3><div class="internalTable internalSummaryTable"><table><tbody><tr><th>요율 적용 창호</th><td class="num">${(calc.items||[]).filter(x=>x.rate_applied).length}개</td></tr><tr><th>자재비 합계</th><td class="num">${money(di.material)}</td></tr><tr><th>시공비 합계</th><td class="num">${money(di.install)}</td></tr><tr><th>창호 금액 합계</th><td class="num">${money(di.material+di.install)}</td></tr><tr><th>자재비 할인율</th><td class="num"><input id="discountRate" type="number" min="0" max="100" step="0.1" value="${di.rate}" style="width:90px;text-align:right"> %</td></tr><tr><th>자재비 할인금액</th><td class="num" id="discountAmount">${money(di.discount)}</td></tr><tr><th>부가시공비 합계</th><td class="num">${money(extras.constructionTotal||0)}</td></tr><tr><th>추가상품 합계</th><td class="num">${money(extras.additionalProductTotal||0)}</td></tr><tr class="internalSum"><th>할인 적용 후 최종 견적금액</th><td class="num" id="internalFinalTotal">${money(total)}</td></tr></tbody></table></div><div style="margin:10px 0 18px;text-align:right"><button type="button" id="saveDiscount">할인율 저장</button></div>
      <div class="internalGrand"><span>총 견적금액</span><b id="internalGrandValue">${money(total)}</b></div>
      <div class="internalMemo"><b>메모</b><p>${cleanMemo(r.memo).trim()||'-'}</p></div>
    </div>`;
  const updateDiscountPreview=()=>{const rate=Math.max(0,Math.min(100,Number($('discountRate').value)||0));const discount=Math.round(di.material*rate/100);const final=di.material+di.install-discount+(extras.total||0);$('discountAmount').textContent=money(discount);$('internalFinalTotal').textContent=money(final);$('internalGrandValue').textContent=money(final);};
  $('discountRate').addEventListener('input',updateDiscountPreview);
  $('saveDiscount').onclick=async()=>{const rate=Math.max(0,Math.min(100,Number($('discountRate').value)||0));const nextExtras={...extras,discountRate:rate};const final=di.material+di.install-Math.round(di.material*rate/100)+(extras.total||0);let result=await db.from('estimates').update({extras_data:nextExtras,total_amount:final}).eq('id',r.id);if(result.error){alert(result.error.message);return;}r.extras_data=nextExtras;r.total_amount=final;alert(`자재비 ${rate}% 할인이 저장되었습니다.`);};
  updateDiscountPreview();
  $('quote').classList.remove('hidden');
}
function renderCustomerQuote(calc){
  const r=state.detailRecord;
  const extras=recalcStoredExtras(r,state.detailItems);
  const di=discountInfo(calc,extras);
  const internalTotal=di.finalTotal;
  const total=customerFinalAmount(r,internalTotal);
  const pay=normalizePayment(r,total);
  const quoteColor=estimateColor(r);
  const items=(calc.items||[]).map(x=>({...x,color:quoteColor}));
  const rows=[];
  for(let i=0;i<18;i++){
    const x=items[i];
    if(x){
      const name=itemName(x)||'-', kind=itemKind(x), outside=itemOutside(x);
      const screen=itemScreen(x);
      rows.push(`<tr><td>${i+1}</td><td>${outside?'외창':'내창'}</td><td class="left">${name}</td><td class="left">${x.product_code||'-'}</td><td>${x.window_type==='fixed'?'고정창 / 24T':'일반창 / 28T'}</td><td>${estimateColor(r)}</td><td>1</td><td>${screen}</td><td>${x.available?Number(x.amount).toLocaleString('ko-KR'):'-'}</td><td></td></tr>`);
    }else rows.push(`<tr><td>${i+1}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`);
  }
  const payRows=`<div class="xlsPayRow total"><div class="payLabel">계 약 총 액</div><div class="payValue" id="payTotal">${total.toLocaleString('ko-KR')}</div><div id="payMethodText">${pay.method}</div></div>
  <div class="xlsPayRow"><div class="payLabel">계약금</div><div class="payValue" id="payDepositValue">${pay.deposit.toLocaleString('ko-KR')}</div><div id="payDepositLabel">계약금 (${pay.depositRate}%)</div></div>
  <div class="xlsPayRow"><div class="payLabel">중도금</div><div class="payValue" id="payInterimValue">${pay.interim.toLocaleString('ko-KR')}</div><div id="payInterimLabel">중도금 (${pay.interimRate}%)</div></div>
  <div class="xlsPayRow"><div class="payLabel">잔 금</div><div class="payValue" id="payBalanceValue">${pay.balance.toLocaleString('ko-KR')}</div><div id="payBalanceLabel">잔 금 (${pay.balanceRate}%)</div></div>`;
  const staff=recordStaff(r)||{name:'담당자',phone:'연락처 미등록'};
  $('quote').innerHTML=`<div class="quoteTools"><button onclick="window.print()">인쇄 / PDF 저장</button><button class="imageSaveBtn secondary" type="button" onclick="saveQuoteAsImage('customer')">이미지 저장</button></div>
  <div class="xlsQuote customer">
    <div class="xlsTop">
      <img class="xlsLogo" src="assets/image3.png" alt="LX Z:IN 인테리어 창호 견적서">
      <div class="xlsCompany"><img class="dealerLogo" src="assets/image2.png" alt="LX하우시스 공식대리점"><div class="dealerName"><b>주식회사 도도</b><span>대리점</span></div><div class="staffPerson"><span>담당자</span><b>${staff.name}</b><strong>${staff.phone}</strong></div><div class="staffAddress">제1전시장 : 장항로 3 (롯데백화점 맞은편)<br>서울특별시 동대문구 고산자로 102, 3층</div></div>
      <table class="xlsMeta"><tbody><tr><td class="label">견 적 일 자</td><td class="value">${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</td></tr><tr><td class="label">견 적 번 호</td><td class="value">${estimateNumber(r)}</td></tr><tr><td class="label">현 장 주 소</td><td class="value">${r.address||'-'}</td></tr><tr><td class="label">고 객 정 보</td><td class="value">${r.customer_name||'고객님'} | ${recordCustomerPhone(r)||'010-'}</td></tr><tr><td class="label amount">총 견 적 액</td><td class="value amount">${total.toLocaleString('ko-KR')}</td></tr></tbody></table>
      <div class="xlsValidity">* 본 견적서의 유효 기간은 발행일자로부터 3개월 이내에 한함</div>
    </div>
    <div class="xlsSection">세 부 견 적 사 항 ( V A T 포 함 가 )</div>
    <table class="xlsItems"><colgroup><col class="no"><col class="kind"><col class="loc"><col class="product"><col class="glass"><col class="color"><col class="qty"><col class="screen"><col class="amount"><col class="memo"></colgroup><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품명</th><th>유 리 및 두께</th><th>색상</th><th>수량</th><th>방충망</th><th>금액</th><th>비고</th></tr></thead><tbody>${rows.join('')}</tbody><tbody class="xlsSummary"><tr><td colspan="8" class="sumLabel">창 호 계</td><td class="sumAmount">${Number(calc.total||0).toLocaleString('ko-KR')}</td><td></td></tr><tr><td colspan="8" class="sumLabel">표준 시공 기술료</td><td class="sumAmount">0</td><td></td></tr><tr><td colspan="8" class="sumLabel">부가 시공비</td><td class="sumAmount">${Number(extras.constructionTotal||0).toLocaleString('ko-KR')}</td><td></td></tr>${di.rate>0?`<tr><td colspan="8" class="sumLabel">자재비 할인 (${di.rate}%)</td><td class="sumAmount">-${di.discount.toLocaleString('ko-KR')}</td><td></td></tr>`:''}${extras.additionalProducts?.length?extras.additionalProducts.map(x=>`<tr><td colspan="8" class="sumLabel">추가옵션 ${x.name||''}${x.service?' (서비스)':(Number(x.discount)||0)>0?` (할인 -${(Number(x.discount)||0)*(Number(x.qty)||1).toLocaleString('ko-KR')})`:''}</td><td class="sumAmount">${Number(x.finalAmount||0).toLocaleString('ko-KR')}</td><td></td></tr>`).join(''):''}<tr><td colspan="8" class="sumLabel">[ 합 계 ]</td><td class="sumAmount">${total.toLocaleString('ko-KR')}</td><td></td></tr></tbody></table>
    <div class="xlsSpacer"></div><div class="xlsBottom"><div class="xlsNotes"><div class="xlsNoteRow red">LX하우시스 정품 자재로 LX ENG 본사직영시공팀이 시공함 / 10년 품질보증</div><div class="xlsNoteRow">유리 : LX Z:IN 정품 유리로만 설치 시공함</div><div class="xlsNoteRow">잠금장치 : 자동잠금장치 및 크리센트 적용 (규격이하 제품일 경우 제외)</div><div class="xlsNoteRow">방충망 : 외부창 최신 AL분체방충망 적용, 내부창 제외</div><div class="xlsNoteRow">본 상품은 시공성 상품이므로 공사중 시설 훼손 · 스크레치 등이 발생할수 있음.</div><div class="xlsNoteRow red">사양 변경시 금액의 변경 또는 현장 여건상 시공 불가시 계약 취소 할수 있음 (계약금 전액 환불)</div><div class="xlsNoteRow">공식대리점은 시공 전후의 사진을 온라인 상 활용할 수 있음 (부동의시 비게재)</div></div><div class="xlsPayment">${payRows}<div class="xlsPayRow"><div class="payLabel">* BRP 진행시</div><div style="grid-column:2 / 4;text-align:left">중도금은 생략될 수 있으며, 잔금은 금융기관을 통해 후불 정산됨</div></div><div class="xlsAccount"><div>입금계좌안내</div><div>452-034930-04-025<br>1005-503-086146</div><div>기업은행<br>우리은행</div><div>㈜도도<br>㈜도도</div></div></div></div>
    <div class="xlsFooter"><img class="xlsQr" src="assets/image1.png" alt="공식대리점 QR"><img class="xlsDealerLogo" src="assets/image2.png" alt="LX하우시스 공식대리점"><div class="xlsFooterText"><b>수도권북부영업센터 공식대리점 주식회사 도도</b> (122-86-46519)<br>대표전화 1577-7864 / www.lx-zin.com / admin@lx-zin.com<br>실내건축면허보유 / LX하우시스 초유의 전부문 최우수상 3관왕 지점</div></div>
  </div>
  <div class="paymentEditor"><h3>결제 조건</h3><div class="paymentGrid"><label>결제 방법<select id="paymentMethod"><option>현금</option><option>계좌이체</option><option>카드</option><option>기타</option></select></label><label>계약금 %<input id="payDepositRate" type="number" min="0" max="100" step="1"></label><label>중도금 %<input id="payInterimRate" type="number" min="0" max="100" step="1"></label><label>잔금 %<input id="payBalanceRate" type="number" min="0" max="100" step="1"></label></div><p class="paymentHint">기본 결제 비율은 계약금 10% · 중도금 70% · 잔금 20%입니다. 비율을 바꾸면 금액도 즉시 계산됩니다.</p><div class="paymentTotal"><span>합계 비율</span><b id="paymentRateTotal">100%</b></div><button type="button" id="savePayment">결제 조건 저장</button><div class="manualAmountEditor" style="margin-top:16px;padding-top:16px;border-top:1px solid #ddd"><label>고객용 최종 금액 수기 조정 (원)<input id="customerFinalAmount" type="number" min="0" step="10000" value="${total}"></label><p class="paymentHint">기본값은 내부 최종 견적금액을 만원 단위로 내림한 금액입니다. 금액을 직접 입력하면 고객용 견적의 최종 금액과 계약금·중도금·잔금이 해당 금액을 기준으로 계산됩니다.</p><button type="button" id="saveCustomerFinalAmount">최종 금액 저장</button></div></div>`;
  $('quote').classList.remove('hidden');
  $('payDepositRate').value=pay.depositRate;$('payInterimRate').value=pay.interimRate;$('payBalanceRate').value=pay.balanceRate;$('paymentMethod').value=pay.method||'현금';$('customerFinalAmount').value=total;
  const updatePreview=()=>{const entered=Number($('customerFinalAmount').value)||0;const previewTotal=entered>0?Math.floor(entered/10000)*10000:customerFinalAmount(r,internalTotal);$('customerFinalAmount').value=previewTotal;const dr=Number($('payDepositRate').value)||0,ir=Number($('payInterimRate').value)||0,br=Number($('payBalanceRate').value)||0;const dep=Math.round(previewTotal*dr/100),mid=Math.round(previewTotal*ir/100),bal=previewTotal-dep-mid;$('payTotal').textContent=previewTotal.toLocaleString('ko-KR');$('payDepositValue').textContent=dep.toLocaleString('ko-KR');$('payInterimValue').textContent=mid.toLocaleString('ko-KR');$('payBalanceValue').textContent=bal.toLocaleString('ko-KR');$('payDepositLabel').textContent=`계약금 (${dr}%)`;$('payInterimLabel').textContent=`중도금 (${ir}%)`;$('payBalanceLabel').textContent=`잔 금 (${br}%)`;$('payMethodText').textContent=$('paymentMethod').value;$('paymentRateTotal').textContent=`${dr+ir+br}%`;$('paymentRateTotal').classList.toggle('invalid',dr+ir+br!==100);};
  ['payDepositRate','payInterimRate','payBalanceRate','paymentMethod','customerFinalAmount'].forEach(id=>$(id).addEventListener('input',updatePreview));
  $('paymentMethod').addEventListener('change',updatePreview);updatePreview();
  $('savePayment').onclick=async()=>{const finalForPayment=customerFinalAmount(r,internalTotal);const depositRate=Number($('payDepositRate').value)||0,interimRate=Number($('payInterimRate').value)||0,balanceRate=Number($('payBalanceRate').value)||0;if(depositRate+interimRate+balanceRate!==100)return alert('계약금·중도금·잔금 비율의 합계를 100%로 맞춰주세요.');const deposit=Math.round(finalForPayment*depositRate/100),interim=Math.round(finalForPayment*interimRate/100),balance=finalForPayment-deposit-interim;const payment={depositRate,interimRate,balanceRate,deposit,interim,balance,method:$('paymentMethod').value};let result=await db.from('estimates').update({payment_data:payment}).eq('id',r.id);if(result.error){const memo=cleanMemo(r.memo);result=await db.from('estimates').update({memo:encodeExtras(memo,recordStaff(r),({phone:recordCustomerPhone(r)}),payment)}).eq('id',r.id);}if(result.error)alert(result.error.message);else{r.payment_data=payment;alert('결제 조건이 저장되었습니다.');}};
  $('saveCustomerFinalAmount').onclick=async()=>{const value=normalizedManualAmount($('customerFinalAmount').value);if(!value)return alert('최종 금액을 1만원 단위로 입력해주세요.');$('customerFinalAmount').value=value;const nextExtras={...extras,customerFinalAmount:value};let result=await db.from('estimates').update({extras_data:nextExtras,total_amount:value}).eq('id',r.id);if(result.error){alert(result.error.message);return;}r.extras_data=nextExtras;r.total_amount=value;const dr=Number($('payDepositRate').value)||0,ir=Number($('payInterimRate').value)||0,br=Number($('payBalanceRate').value)||0;const deposit=Math.round(value*dr/100),interim=Math.round(value*ir/100),balance=value-deposit-interim;$('payTotal').textContent=value.toLocaleString('ko-KR');$('payDepositValue').textContent=deposit.toLocaleString('ko-KR');$('payInterimValue').textContent=interim.toLocaleString('ko-KR');$('payBalanceValue').textContent=balance.toLocaleString('ko-KR');alert(`고객용 최종 금액 ${value.toLocaleString('ko-KR')}원이 저장되었습니다.`);};
}
function renderQuote(mode,calc){if(mode==='internal')return renderInternalQuote(calc);return renderCustomerQuote(calc);}
$('newBtn').onclick=()=>{resetForm();$('sizeBand').value='20';$('oldFrame').value='AL';$('equipment').value='가능';$('protection').value='none';show('form');addItem();renderExtraSummary();loadAdditionalProducts([]);};$('backBtn').onclick=$('cancelBtn').onclick=()=>show('home');$('detailBackBtn').onclick=()=>{show('home');staffInit();load();};$('editBtn').onclick=async()=>{const r=state.detailRecord;const{data,error}=await db.from('estimate_items').select('*').eq('estimate_id',r.id).order('id');if(error)return alert(error.message);$('projectName').value=r.project_name||'';$('customerName').value=r.customer_name||'';$('customerPhone').value=recordCustomerPhone(r);$('address').value=r.address||'';$('status').value=r.status||'작성중';$('memo').value=cleanMemo(r.memo);const ex=recordExtras(r);if($('estimateColor'))$('estimateColor').value=estimateColor(r);if(ex&&ex.conditions){$('sizeBand').value=ex.conditions.size;$('oldFrame').value=ex.conditions.old;$('equipment').value=ex.conditions.equip;$('protection').value=ex.conditions.protection;}$('items').innerHTML='';state.items=[];loadAdditionalProducts(ex.additionalProducts||[]);state.editingId=r.id;$('formTitle').textContent='견적 수정';$('formEyebrow').textContent='EDIT ESTIMATE';$('saveBtn').textContent='수정 저장';(data||[]).forEach((x,i)=>addItem({...x,kind:itemKind(x),pricing_rate:(ex.windowRates||[])[i]||''}));if(!data?.length)addItem();show('form');};$('deleteBtn').onclick=async()=>{const r=state.detailRecord;if(!confirm(`“${r.project_name}” 견적을 삭제할까요?`))return;await db.from('estimate_items').delete().eq('estimate_id',r.id);const{error}=await db.from('estimates').delete().eq('id',r.id);if(error)return alert(error.message);show('home');load();};$('internalBtn').onclick=async()=>{const ex=recordExtras(state.detailRecord);renderQuote('internal',await calculate(state.detailItems,ex.windowRates||[]));};$('customerBtn').onclick=async()=>{const ex=recordExtras(state.detailRecord);renderQuote('customer',await calculate(state.detailItems,ex.windowRates||[]));};$('addItem').onclick=()=>{addItem();renderExtraSummary();};$('addAdditionalProduct').onclick=()=>addAdditionalProduct();['sizeBand','oldFrame','equipment','protection'].forEach(id=>$(id).onchange=()=>{renderExtraSummary();if(id==='sizeBand')loadAdditionalProducts(readAdditionalProducts());});
$('estimateForm').onsubmit=async e=>{e.preventDefault();if($('saveBtn').disabled)return;$('saveBtn').disabled=true;$('message').textContent='가격 확인 중...';try{const extras=getExtras();const ap=readAdditionalProducts();extras.additionalProducts=ap;extras.additionalProductTotal=ap.reduce((s,x)=>s+x.finalAmount,0);extras.total+=extras.additionalProductTotal;if(state.editingId&&state.detailRecord){extras.discountRate=Number(recordExtras(state.detailRecord).discountRate)||0;}const rawMemo=$('memo').value;let originalAuthor=null;if(state.editingId&&state.detailRecord)originalAuthor=recordStaff(state.detailRecord);const rawItems=state.items.map(el=>{const kind=el.querySelector('.kind').value;const name=kind==='직접입력'?el.querySelector('.customName').value:el.querySelector('.location').value;const product=el.querySelector('.product').value;const actualWidth=Number(el.querySelector('.w').value);const actualHeight=Number(el.querySelector('.h').value);const pricingRate=Number(el.querySelector('.pricingRate').value);return{installation_location:name,window_kind:kind,screen_option:el.querySelector('.screen').value,product_code:product,window_type:el.querySelector('.windowType').value==='고정창'?'fixed':'normal',actual_width:actualWidth,actual_height:actualHeight,applied_width:Math.ceil(actualWidth/200)*200,applied_height:Math.ceil(actualHeight/200)*200,pricing_rate:Number.isFinite(pricingRate)&&pricingRate>0?pricingRate:null};});if(!rawItems.length)throw new Error('창호 항목을 하나 이상 추가해주세요.');$('message').textContent='가격표 조회 중...';extras.windowRates=rawItems.map(x=>x.pricing_rate||null);const calc=await calculate(rawItems);const unavailable=calc.items.find(x=>!x.available);if(unavailable)throw new Error(unavailable.reason||'해당 치수의 가격표가 없습니다.');const payload={project_name:$('projectName').value,customer_name:$('customerName').value,address:$('address').value,status:$('status').value,memo:cleanMemo(rawMemo),customer_phone:$('customerPhone').value,staff_id:(originalAuthor||state.staff)?.id||null,staff_name:(originalAuthor||state.staff)?.name||'',extras_data:extras,total_amount:calc.total+extras.total};
if(state.hasEstimateNo&&!state.editingId)payload.estimate_no=nextEstimateNo();let id=state.editingId;if(id){const{error}=await db.from('estimates').update(payload).eq('id',id);if(error)throw error;const{error:itemDeleteError}=await db.from('estimate_items').delete().eq('estimate_id',id);if(itemDeleteError)throw itemDeleteError;}else{const{data,error}=await db.from('estimates').insert(payload).select().single();if(error)throw error;id=data.id;}const rows=calc.items.map(x=>({estimate_id:id,installation_location:x.installation_location||itemName(x),window_kind:x.window_kind||itemKind(x),color:extras.color||'기본색',screen_option:x.screen_option||'자동',product_code:x.product_code,window_type:x.window_type||'normal',actual_width:x.actual_width,actual_height:x.actual_height,applied_width:x.applied_width,applied_height:x.applied_height,glass_type:x.glass_type||'28T',material_cost:x.material,installation_cost:x.install,additional_cost:0,total_cost:x.amount,memo:null}));let itemError=null;for(const row of rows){const res=await insertItemCompatible(row);if(res.error){itemError=res.error;break;}}if(itemError)throw itemError;$('message').textContent='저장되었습니다.';setTimeout(()=>{show('home');load();},500);}catch(err){console.error(err);$('message').textContent='저장 실패: '+(err?.message||err);}finally{$('saveBtn').disabled=false;}};

$('estimateSearch')?.addEventListener('input',renderEstimateList);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('estimateSearch')){$('estimateSearch').value='';renderEstimateList();}});
function boot(){
  try{staffInit();if(state.staff){show('home');load();}}catch(err){console.error(err);alert('담당자 선택 화면을 불러오지 못했습니다. 페이지를 새로고침해주세요.');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
