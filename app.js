const { createClient } = supabase; const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY); const $=id=>document.getElementById(id);
function money(value){return `${Number(value||0).toLocaleString('ko-KR')}원`;}
const ADDITIONAL_PRODUCTS=[{key:'door3',name:'3연동 중문',base:1900000,discount:true,service:true},{key:'partition',name:'중문 파티션',base:800000,discount:false,service:false},{key:'ceramic',name:'세라믹탄성코트',base:0,discount:true,service:true},{key:'turning',name:'터닝도어',base:800000,discount:true,service:true},{key:'absdoor',name:'ABS도어',base:300000,discount:true,service:true},{key:'security',name:'방범창',base:150000,discount:true,service:true},{key:'drying',name:'빨래건조대',base:100000,discount:true,service:true}]; const STAFF=[{id:1,name:'한동균 팀장',phone:'010-7415-0619'},{id:2,name:'김민찬 책임',phone:'010-8438-7469'},{id:3,name:'김영찬 책임',phone:'010-5490-9662'}]; const STAFF_KEY='window_quote_staff'; const state={items:[],editingId:null,detailRecord:null,detailItems:[],prices:null,staff:null,estimates:[],hasEstimateNo:false,history:[]};
function staffInit(){state.staff=null;renderStaff();}
function renderStaff(){const gate=$('staffGate'),choices=$('staffChoices');choices.innerHTML=STAFF.map(x=>`<button class="staffChoice" data-id="${x.id}">${x.name}</button>`).join('');choices.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.staff=STAFF.find(x=>String(x.id)===b.dataset.id);renderStaff();show('home');load();});gate.classList.toggle('hidden',!!state.staff);$('currentStaff').textContent=state.staff?`현재 담당자: ${state.staff.name}`:'';}
$('changeStaff').onclick=()=>{state.staff=null;renderStaff();show('home');};
$('logoHomeBtn').onclick=()=>{show('home');renderRecentList();};
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
async function getExecutionPrices(){
  if(state.executionPrices)return state.executionPrices;
  try{const res=await fetch('assets/execution-pricing-v45.json',{cache:'no-store'});if(!res.ok)throw new Error('실행가 가격 데이터 HTTP '+res.status);const data=await res.json();if(!Array.isArray(data)||!data.length)throw new Error('실행가 가격 데이터가 비어 있습니다.');state.executionPrices=data;return data;}catch(err){console.error(err);throw new Error('실행가 기준 데이터를 불러오지 못했습니다.');}
}
function executionSheetForBand(size){return ({'20':'24평','30':'31평','40':'43평','50':'43평'})[String(size)]||null;}
function normalizeExecutionCode(v){const n=String(v??'').replace(/\s+/g,'').toUpperCase();return n==='F-130I'?'F-140':n==='F-250I'?'F-250':n;}
async function findExecutionPrice(item,conditions={}){const rows=await getExecutionPrices();const code=normalizeExecutionCode(item.product_code);const w=Number(item.actual_width),h=Number(item.actual_height);const same=rows.filter(x=>normalizeExecutionCode(x.product_code)===code&&Number(x.width_mm)===w&&Number(x.height_mm)===h);if(!same.length)return null;const preferred=executionSheetForBand(conditions?.size);if(!preferred)return null;return same.find(x=>x.execution_sheet===preferred)||null;}
async function isLegacyExecutionDefaultRate(item,rate,conditions={}){const n=Number(rate);if(!Number.isFinite(n)||n<=0||item?.pricing_rate_source==='manual')return false;try{const execution=await findExecutionPrice(item,conditions);return !!execution&&Number(execution.default_rate)>0&&Math.abs(Number(execution.default_rate)-n)<0.0001;}catch(_){return false;}}

function field(o,names){for(const n of names)if(o&&o[n]!==undefined)return o[n];return null;}
async function insertItemCompatible(payload){let p={...payload};for(let attempt=0;attempt<12;attempt++){const result=await db.from('estimate_items').insert(p);if(!result.error)return result;const msg=result.error.message||'';const m=msg.match(/Could not find the '([^']+)' column of 'estimate_items'/i);if(!m)return result;const missing=m[1];if(missing==='window_name'){delete p.window_name;p.item_name=payload.window_name;}else if(missing==='item_name'){delete p.item_name;p.name=payload.window_name;}else if(missing==='name'){delete p.name;p.location=payload.window_name;}else{delete p[missing];}}return{error:{message:'estimate_items 컬럼 호환 처리에 실패했습니다.'}};}
function show(id){['home','saved','form','detail'].forEach(x=>$(x).classList.toggle('hidden',x!==id)); if(id==='home'&&state.staff){$('homeStaffName').textContent=state.staff.name+'님';} }
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
function defaultWindowScope(kind){return ['발코니창','복도창'].includes(kind)?'외부창':['분합창','내창','주방창'].includes(kind)?'내부창':'';}
function itemWindowScope(item){const saved=item?.window_scope||item?.windowScope;if(saved==='외부창'||saved==='내부창')return saved;return defaultWindowScope(itemKind(item));}
function itemScreen(item){const option=item?.screen_option||item?.screenOption;if(option==='없음')return '-';if(option==='있음')return 'AL 방충망';const kind=itemKind(item);return ['발코니창','복도창'].includes(kind)?'AL 방충망':'-';}
function itemOutside(item){return ['발코니창','복도창'].includes(itemKind(item));}
function estimateColor(r){const ex=recordExtras(r)||{};return COLORS.includes(r?.estimate_color)?r.estimate_color:(COLORS.includes(ex.color)?ex.color:(COLORS.includes(r?.color)?r.color:'기본색'));}
function handleStatus(item){return item?.window_type==='fixed'?'무':'유';}
function parseTaggedJSON(memo,label){const m=String(memo||'').match(new RegExp('\\['+label+'\\]\\s*(\\{[\\s\\S]*?\\})(?=\\n|$)'));if(!m)return null;try{return JSON.parse(m[1]);}catch{return null;}}
function fillLocations(el,kind,selected=''){const loc=el.querySelector('.location');const list=locations[kind]||[];loc.innerHTML=list.length?list.map(x=>`<option value="${x}" ${x===selected?'selected':''}>${x}</option>`).join(''):'<option value="">직접 입력</option>';}
function addItem(d={}){const n=state.items.length+1,el=document.createElement('div');el.className='item card';el.innerHTML=`<div class="itemhead"><b class="itemNo">창 ${n}</b><button type="button" class="remove">삭제</button></div><label>창 종류<select class="kind"><option value="">선택하세요</option>${Object.keys(locations).map(k=>`<option>${k}</option>`).join('')}<option>직접입력</option></select></label><label>위치<select class="location"><option>창 종류를 먼저 선택</option></select></label><label class="custom hidden">직접 입력<input class="customName"></label><label class="customScope hidden">창 구분 <span class="scopeHelp">(부가시공비 계산용)</span><select class="windowScope"><option value="">선택하세요</option><option value="외부창">외부창</option><option value="내부창">내부창</option></select><span class="scopeWarning hidden">※ 기존 견적의 직접입력 창입니다. 내부창/외부창을 선택해주세요.</span></label><label>창 형태<select class="windowType"><option value="일반창">일반창</option><option value="고정창">고정창</option></select></label><label>적용 제품<select class="product">${products.map(p=>`<option>${p}</option>`).join('')}</select></label><label>방충망<select class="screen"><option value="자동">자동</option><option value="있음">있음</option><option value="없음">없음</option></select></label><button type="button" class="secondary change">제품 변경</button><div class="dims"><label>실측 가로(mm)<input type="number" class="w" inputmode="numeric" min="1" required></label><label>실측 세로(mm)<input type="number" class="h" inputmode="numeric" min="1" required></label></div><label>요율 <span class="muted">(선택)</span><input type="number" class="pricingRate" inputmode="decimal" min="0" step="0.01" placeholder="예: 1.75"></label><div class="result">요율을 비워두면 현재 가격표 계산가를 그대로 사용합니다.</div>`;$('items').append(el);bindItem(el);state.items.push(el);const kind=d.kind||itemKind(d);if(kind){el.querySelector('.kind').value=kind;fillLocations(el,kind,itemName(d));el.querySelector('.custom').classList.toggle('hidden',kind!=='직접입력');}if(kind==='직접입력'){el.querySelector('.customName').value=itemName(d);el.querySelector('.windowScope').value=d.window_scope||d.windowScope||'';}else{el.querySelector('.windowScope').value=itemWindowScope(d);}el.querySelector('.scopeWarning')?.classList.toggle('hidden',!!el.querySelector('.windowScope').value);el.classList.toggle('scopeRequired',kind==='직접입력'&&!el.querySelector('.windowScope').value);el.querySelector('.product').value=d.product_code||'F-140';el.querySelector('.customScope').classList.toggle('hidden',kind!=='직접입력');el.querySelector('.scopeWarning')?.classList.toggle('hidden',kind!=='직접입력'||!!el.querySelector('.windowScope').value);el.querySelector('.windowType').value=(d.window_type==='fixed'||d.window_type==='고정창')?'고정창':'일반창';el.querySelector('.screen').value=d.screen_option||'자동';el.querySelector('.w').value=d.actual_width||'';el.querySelector('.h').value=d.actual_height||'';el.querySelector('.pricingRate').value=d.pricing_rate??'';el.dataset.itemId=d.id||'';}
function renumber(){state.items.forEach((e,i)=>e.querySelector('.itemNo').textContent=`창 ${i+1}`);}
function bindItem(el){
  const kind=el.querySelector('.kind'),prod=el.querySelector('.product'),scope=el.querySelector('.windowScope');
  const scopeWrap=el.querySelector('.customScope'), warning=el.querySelector('.scopeWarning');
  const syncScope=()=>{
    const direct=kind.value==='직접입력';
    scopeWrap.classList.toggle('hidden',!direct);
    if(direct){
      warning.classList.toggle('hidden',!!scope.value);
      el.classList.toggle('scopeRequired',!scope.value);
    }else{
      scope.value=defaultWindowScope(kind.value);
      warning.classList.add('hidden');
      el.classList.remove('scopeRequired');
    }
    renderExtraSummarySafe();
  };
  kind.onchange=()=>{fillLocations(el,kind.value);el.querySelector('.custom').classList.toggle('hidden',kind.value!=='직접입력');if(kind.value==='분합창')prod.value='F-230WF';if(kind.value==='내창')prod.value='F-230W';if(kind.value==='주방창')prod.value='F-130I';if(kind.value==='복도창')prod.value='F-250I';syncScope();};
  scope.onchange=()=>{syncScope();};
  el.querySelector('.remove').onclick=()=>{el.remove();state.items=state.items.filter(x=>x!==el);renumber();renderExtraSummarySafe();};
  el.querySelector('.change').onclick=()=>prod.focus();
  syncScope();
}
function renderExtraSummarySafe(){try{renderExtraSummary();}catch(e){const box=$('extraSummary');if(box)box.innerHTML='<p class="muted">직접입력 창의 내부/외부 구분을 선택하면 부가시공비가 계산됩니다.</p>';}}

function getExtras(){const size=$('sizeBand').value,old=$('oldFrame').value,equip=$('equipment').value,protection=$('protection').value;const equipment=equip==='불가'?500000:400000;const demolitionBase={'20':{AL:300000,PL:400000},'30':{AL:400000,PL:500000},'40':{AL:500000,PL:600000},'50':{AL:600000,PL:700000}};const demolition=demolitionBase[size]?.[old]??demolitionBase['20'][old];const map={'none':0,'1-2':140000,'3-4':170000,'5-7':200000,'8-9':230000,'10+':270000};const directMissing=state.items.find(el=>el.querySelector('.kind').value==='직접입력'&&!['외부창','내부창'].includes(el.querySelector('.windowScope').value));if(directMissing)throw new Error('직접입력 창의 창 구분(내부창/외부창)을 선택해주세요.');const sash=state.items.filter(el=>itemWindowScope({window_kind:el.querySelector('.kind').value,window_scope:el.querySelector('.windowScope').value})==='외부창'&&Number(el.querySelector('.h').value)>=2000).length*100000;const molding=state.items.filter(el=>itemWindowScope({window_kind:el.querySelector('.kind').value,window_scope:el.querySelector('.windowScope').value})==='내부창').length*55000;return {equipment,demolition,sash,molding,protection:map[protection]||0,total:equipment+demolition+sash+molding+(map[protection]||0),color:$('estimateColor')?.value||'기본색',discountRate:0,conditions:{size,old,equip,protection}};}function renderExtraSummary(){const e=getExtras();const sizeLabel={'20':'20평대','30':'30평대','40':'40평대','50':'50평대 이상'}[e.conditions.size]||'-';const oldLabel=e.conditions.old==='AL'?'AL창':'PL창';const equipLabel=e.conditions.equip==='불가'?'장비 불가':'장비 가능';const protectionLabel={'none':'보양 없음','1-2':'1~2룸','3-4':'3~4룸','5-7':'5~7룸','8-9':'8~9룸','10+':'10룸 이상'}[e.conditions.protection]||'-';const sashCount=Math.round(e.sash/100000),moldingCount=Math.round(e.molding/55000);$('extraSummary').innerHTML='<p>장비비 <b>'+money(e.equipment)+'</b></p><p>철거비 <b>'+money(e.demolition)+'</b></p><p>사춤 / 타일 <b>'+money(e.sash)+'</b></p><p>몰딩 <b>'+money(e.molding)+'</b></p><p>보양 <b>'+money(e.protection)+'</b></p><hr><p class="grand">부가시공비 합계 <b>'+money(e.total)+'</b></p><div class="extraInfoButtons"><button type="button" class="secondary extraInfoBtn" id="extraRulesBtn">부가시공비 계산 기준 보기 ▾</button><button type="button" class="secondary extraInfoBtn" id="extraFormulaBtn">현재 견적 계산식 보기 ▾</button></div><div id="extraRules" class="extraFormula hidden"><p><b>부가시공비 계산 기준</b></p><ul><li><b>장비비:</b> 장비 가능 400,000원 / 장비 불가 500,000원</li><li><b>철거비:</b> 20평대 AL 300,000원 / PL 400,000원, 30평대 AL 400,000원 / PL 500,000원, 40평대 AL 500,000원 / PL 600,000원, 50평대 이상 AL 600,000원 / PL 700,000원</li><li><b>사춤 / 타일:</b> 외부창 중 실측 높이 2,000mm 이상인 프레임 × 100,000원</li><li><b>몰딩:</b> 내부창 프레임 × 55,000원</li><li><b>보양:</b> 선택한 보양 범위에 따라 0 / 140,000 / 170,000 / 200,000 / 230,000 / 270,000원</li><li><b>직접입력창:</b> 선택한 내부창 / 외부창 구분을 기준으로 부가시공비에 반영</li></ul></div><div id="extraFormula" class="extraFormula hidden"><p><b>현재 견적에 적용된 계산식</b></p><ul><li>장비비: '+(e.equipment===500000?'500,000원 (장비 불가)':'400,000원 (장비 가능)')+'</li><li>철거비: '+sizeLabel+' '+oldLabel+' → '+money(e.demolition)+'</li><li>사춤 / 타일: 외부창 중 실측 높이 2,000mm 이상 '+sashCount+'프레임 × 100,000원 = '+money(e.sash)+'</li><li>몰딩: 내부창 '+moldingCount+'프레임 × 55,000원 = '+money(e.molding)+'</li><li>보양: '+protectionLabel+' → '+money(e.protection)+'</li></ul><p class="muted">※ 직접입력 창은 선택한 내부창/외부창 구분을 기준으로 계산됩니다.</p></div>';const rulesBtn=$('extraRulesBtn'),rulesPanel=$('extraRules'),formulaBtn=$('extraFormulaBtn'),formulaPanel=$('extraFormula');if(rulesBtn&&rulesPanel)rulesBtn.onclick=()=>{const opening=rulesPanel.classList.toggle('hidden')===false;rulesBtn.textContent=opening?'부가시공비 계산 기준 닫기 ▴':'부가시공비 계산 기준 보기 ▾';};if(formulaBtn&&formulaPanel)formulaBtn.onclick=()=>{const opening=formulaPanel.classList.toggle('hidden')===false;formulaBtn.textContent=opening?'현재 견적 계산식 닫기 ▴':'현재 견적 계산식 보기 ▾';};}function cleanMemo(value){return String(value||'').replace(/\n?\[고객 데이터\][\s\S]*$/,'').replace(/\n?\[담당자 데이터\][\s\S]*$/,'').replace(/\n?\[부가시공비 데이터\][\s\S]*$/,'').replace(/\n?\[결제 데이터\][\s\S]*$/,'').trim();}
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
function discountInfo(calc,extras){const totals=materialInstallTotals(calc);const rate=Math.max(0,Math.min(100,Number(extras?.discountRate)||0));const rateMaterial=Number(calc?.rateMaterialTotal)||totals.material;const discount=Math.round(rateMaterial*rate/100);const windowTotal=Number(calc?.total)||0;const hasExecution=Array.isArray(calc?.items)&&calc.items.some(x=>x.pricing_source==='execution');const constructionExtra=hasExecution?0:Number(extras?.constructionTotal||extras?.total||0);const constructionVat=Math.round(constructionExtra*0.10);const constructionExtraWithVat=constructionExtra+constructionVat;const extraProducts=Number(extras?.additionalProductTotal||0);const extraTotal=constructionExtraWithVat+extraProducts;return {...totals,rate,rateMaterial,discount,windowTotal,constructionExtra,constructionVat,constructionExtraWithVat,extraProducts,extraTotal,finalTotal:windowTotal-discount+extraTotal};}
function customerFinalAmount(r,internalTotal){const ex=recordExtras(r)||{};const manual=Number(ex.customerFinalAmount);if(Number.isFinite(manual)&&manual>0)return Math.floor(manual/10000)*10000;return Math.floor(Number(internalTotal||0)/10000)*10000;}
function normalizedManualAmount(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)return null;return Math.floor(n/10000)*10000;}
function recalcStoredExtras(r,items){
  const saved=recordExtras(r)||{};
  const conditions=saved.conditions||{};
  const size=conditions.size, old=conditions.old, equip=conditions.equip, protection=conditions.protection;
  const equipment=equip!==undefined?(equip==='불가'?500000:400000):Number(saved.equipment)||0;
  const demolitionBase={'20':{AL:300000,PL:400000},'30':{AL:400000,PL:500000},'40':{AL:500000,PL:600000},'50':{AL:600000,PL:700000}};const demolition=(size!==undefined&&old!==undefined)?(demolitionBase[size]?.[old]||demolitionBase['20'][old]):Number(saved.demolition)||0;
  const protectionMap={'none':0,'1-2':140000,'3-4':170000,'5-7':200000,'8-9':230000,'10+':270000};
  const protectionValue=protection!==undefined?(protectionMap[protection]||0):Number(saved.protection)||0;
  const sash=(items||[]).filter(x=>itemWindowScope(x)==='외부창'&&Number(x.actual_height)>=2000).length*100000;
  const molding=(items||[]).filter(x=>itemWindowScope(x)==='내부창').length*55000;
  const additionalProducts=Array.isArray(saved.additionalProducts)?saved.additionalProducts:[];const additionalProductTotal=additionalProducts.reduce((sum,x)=>sum+(Number(x.finalAmount)||0),0);const constructionTotal=equipment+demolition+sash+molding+protectionValue;return {...saved,equipment,demolition,sash,molding,protection:protectionValue,additionalProducts,additionalProductTotal,constructionTotal,total:constructionTotal+additionalProductTotal};
}
function recordPayment(r){return r?.payment_data||parseTaggedJSON(r?.memo,'결제 데이터')||null;}
function encodeExtras(memo,staff,customer,payment){
  const clean=cleanMemo(memo);
  return `${clean}${clean?'\n\n':''}[고객 데이터] ${JSON.stringify(customer||{})}\n[담당자 데이터] ${JSON.stringify(staff||{})}\n[결제 데이터] ${JSON.stringify(payment||{})}`;
}
async function calculate(items,rates=[],conditions={}){
  const rows=await getPrices(); if(!Array.isArray(rows)||!rows.length)throw new Error('product_prices에 가격표 데이터가 없습니다.');
  let total=0,rateMaterialTotal=0; const normalize=v=>String(v??'').replace(/\s+/g,'').toUpperCase(); const out=[];
  for(let index=0;index<items.length;index++){
    const item=items[index],lookup=priceProduct[item.product_code]||item.product_code,code=normalize(lookup),w=Number(item.actual_width),h=Number(item.actual_height);
    let rate=Number(item.pricing_rate??0);if(await isLegacyExecutionDefaultRate({...item,product_code:lookup},rate,conditions))rate=0;const rateApplied=Number.isFinite(rate)&&rate>0; let execution=null;
    if(rateApplied){try{execution=await findExecutionPrice({...item,product_code:lookup},conditions);}catch(err){console.warn(err);}}
    if(execution){
      const k=Number(execution.complete_window_dc)||0,l=Number(execution.glass_dc)||0,m=Number(execution.installation)||0,n=Number(execution.equipment_demolition_tile)||0,o=Number(execution.survey_molding_protection)||0;
      const effectiveRate=rate;
      const rateMaterial=(k+l)*effectiveRate,install=(m+n+o)*1.1,rawAmount=rateMaterial+install,amount=Math.ceil(rawAmount/10000)*10000;
      total+=amount;rateMaterialTotal+=rateMaterial;
      out.push({...item,lookup,available:amount>0,applied_width:w,applied_height:h,material:k+l,install,raw_amount:rawAmount,amount,pricing_rate:effectiveRate,pricing_rate_source:'manual',rate_applied:true,pricing_source:'execution',execution_sheet:execution.execution_sheet,execution_components:{complete_window_dc:k,glass_dc:l,installation:m,equipment_demolition_tile:n,survey_molding_protection:o,rate_material:rateMaterial}});continue;
    }
    const productRows=rows.filter(p=>normalize(p.product_code)===code);
    if(!productRows.length){out.push({...item,lookup,available:false,reason:`가격표 없음: ${lookup}`});continue;}
    const widths=productRows.map(p=>Number(p.width_mm)).filter(Number.isFinite),heights=productRows.map(p=>Number(p.height_mm)).filter(Number.isFinite);
    const minWidth=Math.min(...widths),maxWidth=Math.max(...widths),minHeight=Math.min(...heights),maxHeight=Math.max(...heights);
    const requestedWidth=Math.ceil(w/200)*200,requestedHeight=Math.ceil(h/200)*200,appliedWidth=Math.min(Math.max(requestedWidth,minWidth),maxWidth),appliedHeight=Math.min(Math.max(requestedHeight,minHeight),maxHeight);
    let price=productRows.find(p=>Number(p.width_mm)===appliedWidth&&Number(p.height_mm)===appliedHeight);
    if(!price){const candidates=productRows.filter(p=>Number(p.width_mm)>=appliedWidth&&Number(p.height_mm)>=appliedHeight);if(candidates.length){candidates.sort((a,b)=>{const da=(Number(a.width_mm)-appliedWidth)+(Number(a.height_mm)-appliedHeight),db=(Number(b.width_mm)-appliedWidth)+(Number(b.height_mm)-appliedHeight);return da-db||(Number(a.width_mm)*Number(a.height_mm))-(Number(b.width_mm)*Number(b.height_mm));});price=candidates[0];}}
    if(!price){out.push({...item,lookup,applied_width:appliedWidth,applied_height:appliedHeight,available:false,reason:`가격표 없음: ${lookup} / ${appliedWidth}×${appliedHeight}mm`});continue;}
    const baseMaterial=Number(price.material_cost)||0,baseInstall=Number(price.installation_cost)||0,rateMaterial=rateApplied?Math.round(baseMaterial*rate):baseMaterial,amount=rateMaterial+baseInstall;
    if(amount<=0){out.push({...item,lookup,applied_width:appliedWidth,applied_height:appliedHeight,available:false,reason:`가격이 0원: ${lookup} / ${appliedWidth}×${appliedHeight}mm`});continue;}
    total+=amount;rateMaterialTotal+=rateMaterial;out.push({...item,lookup,available:true,applied_width:appliedWidth,applied_height:appliedHeight,material:baseMaterial,install:baseInstall,amount,pricing_rate:rateApplied?rate:null,pricing_rate_source:rateApplied?'manual':'none',base_amount:baseMaterial+baseInstall,rate_applied:rateApplied,pricing_source:'price-table'});
  }
  return {items:out,total,rateMaterialTotal};
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
function filteredEstimates(inputId){
  const q=(($(inputId)?.value)||'').trim().toLowerCase();
  const status=($(inputId==='savedSearch'?'savedStatus':null)?.value)||'';
  return state.estimates.filter((r,i)=>{
    const hay=[r.project_name,r.customer_name,r.customer_phone,r.address,r.estimate_no,estimateNumber(r,i),r.status,r.staff_name].filter(Boolean).join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!status||String(r.status||'작성중')===status);
  });
}
function downloadBlob(filename,content,type='text/plain;charset=utf-8'){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvCell(v){const x=String(v??'').replace(/"/g,'""');return `"${x}"`;}
function exportEstimatesCsv(){const rows=filteredEstimates('savedSearch');if(!rows.length)return alert('내보낼 견적이 없습니다.');const header=['견적번호','작성일','현장명','고객명','연락처','현장주소','담당자','상태','총 견적금액'];const lines=[header.map(csvCell).join(',')];rows.forEach((r,i)=>lines.push([estimateNumber(r,i),new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR'),r.project_name||'',r.customer_name||'',r.customer_phone||recordCustomerPhone(r)||'',r.address||'',r.staff_name||'',r.status||'작성중',Number(r.total_amount||0)].map(csvCell).join(',')));downloadBlob(`DODO_견적목록_${new Date().toISOString().slice(0,10)}.csv`,'\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');}
async function backupAllData(){const [er,ir]=await Promise.all([db.from('estimates').select('*').order('created_at',{ascending:true}),db.from('estimate_items').select('*')]);if(er.error)return alert(er.error.message);if(ir.error)return alert(ir.error.message);const payload={format:'DODO_QUOTE_BACKUP_V50',exported_at:new Date().toISOString(),estimates:er.data||[],estimate_items:ir.data||[]};downloadBlob(`DODO_견적백업_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(payload,null,2),'application/json;charset=utf-8');}
async function restoreBackup(file){if(!file)return;try{const text=await file.text(),backup=JSON.parse(text);if(backup?.format!=='DODO_QUOTE_BACKUP_V50')throw new Error('지원하지 않는 백업 파일입니다.');const estimates=Array.isArray(backup.estimates)?backup.estimates:[],items=Array.isArray(backup.estimate_items)?backup.estimate_items:[];if(!estimates.length)return alert('백업 파일에 견적 데이터가 없습니다.');if(!confirm(`${estimates.length}건의 견적을 복원합니다. 기존 데이터는 유지되고 백업 데이터가 새 견적으로 추가됩니다. 계속할까요?`))return;const map=new Map();for(const src of estimates){const row={...src};delete row.id;delete row.estimate_no;const ins=await db.from('estimates').insert(row).select().single();if(ins.error)throw ins.error;map.set(src.id,ins.data.id);}for(const src of items){const newId=map.get(src.estimate_id);if(!newId)continue;const row={...src,estimate_id:newId};delete row.id;const ins=await insertItemCompatible(row);if(ins.error)throw ins.error;}alert(`${map.size}건의 견적을 복원했습니다.`);await load();show('saved');renderEstimateList();}catch(err){console.error(err);alert('백업 복원 실패: '+(err?.message||err));}}
async function copyEstimate(r){const q=await fetchEstimateItems(r.id);if(q.error)return alert(q.error.message);const data=(q.data||[]).slice();const ex=recordExtras(r);$('projectName').value=r.project_name||'';$('customerName').value=r.customer_name||'';$('customerPhone').value=recordCustomerPhone(r);$('address').value=r.address||'';$('status').value=r.status||'작성중';$('memo').value=cleanMemo(r.memo);if($('estimateColor'))$('estimateColor').value=estimateColor(r);if(ex?.conditions){$('sizeBand').value=ex.conditions.size||$('sizeBand').value;$('oldFrame').value=ex.conditions.old||$('oldFrame').value;$('equipment').value=ex.conditions.equip||$('equipment').value;$('protection').value=ex.conditions.protection||$('protection').value;}$('items').innerHTML='';state.items=[];loadAdditionalProducts(ex.additionalProducts||[]);state.editingId=null;state.detailRecord=null;$('formTitle').textContent='견적 복사';$('formEyebrow').textContent='COPY ESTIMATE';$('saveBtn').textContent='새 견적 저장';for(let i=0;i<data.length;i++){const x=data[i];const legacy=await isLegacyExecutionDefaultRate(x,x.pricing_rate,ex.conditions||{});addItem({...x,kind:itemKind(x),pricing_rate:legacy?'':(x.pricing_rate??'')});}if(!data.length)addItem();show('form');renderExtraSummary();}
async function recordHistory(estimateId,action,previousSnapshot,nextSnapshot){try{const staff=state.staff||recordStaff(state.detailRecord)||{};const result=await db.from('estimate_history').insert({estimate_id:estimateId,action,staff_id:staff.id||null,staff_name:staff.name||'',previous_snapshot:previousSnapshot||null,next_snapshot:nextSnapshot||null});if(result.error)console.warn('estimate_history 저장 실패:',result.error.message);}catch(err){console.warn('estimate_history 저장 예외:',err);}}
async function loadHistory(estimateId){const box=$('historyList');if(!box)return;box.innerHTML='불러오는 중...';const result=await db.from('estimate_history').select('*').eq('estimate_id',estimateId).order('changed_at',{ascending:false});if(result.error){box.innerHTML='<p class="muted">변경 이력 기능을 사용하려면 V50 DB 마이그레이션을 먼저 적용해주세요.</p>';return;}state.history=result.data||[];box.innerHTML=state.history.length?state.history.map(h=>{const a=h.action==='create'?'최초 저장':h.action==='delete'?'삭제':'수정';const before=h.previous_snapshot?.estimate?.total_amount;const after=h.next_snapshot?.estimate?.total_amount;const moneyText=(v)=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR')+'원':'-';return `<div class="historyRow"><div><b>${a}</b><span>${new Date(h.changed_at).toLocaleString('ko-KR')}</span></div><div>${h.staff_name||'담당자 미지정'}</div><div>${before!==undefined?moneyText(before)+' → ':''}${after!==undefined?moneyText(after):''}</div></div>`;}).join(''):'<p class="muted">아직 변경 이력이 없습니다.</p>';}
function snapshotEstimate(r,items){return {estimate:{...r},items:(items||[]).map(x=>({...x}))};}
function renderRecentList(){
  const data=state.estimates.slice(0,5);
  const el=$('recentList'); if(!el)return;
  el.innerHTML='';
  data.forEach((r,i)=>{
    const b=document.createElement('button'); b.className='listrow';
    b.innerHTML=`<div class="listMain"><div class="listTop"><b>${r.project_name||'현장명 미입력'}</b><span>${r.customer_name?` / ${r.customer_name}`:''}</span></div><div class="listBottom"><span>${estimateNumber(r,i)}</span><span>${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</span><span class="statusBadge">${r.status||'작성중'}</span></div></div><span class="listOpen">열기</span>`;
    b.onclick=()=>detail(r); el.append(b);
  });
  if(!data.length)el.innerHTML='<div class="empty"><h3>아직 작성된 견적이 없습니다.</h3><p>새 견적 작성에서 첫 견적을 시작해보세요.</p></div>';
}
function renderEstimateList(){
  const data=filteredEstimates('savedSearch');
  const el=$('list'); if(!el)return; el.innerHTML='';
  data.forEach((r,i)=>{
    const b=document.createElement('button'); b.className='listrow';
    b.innerHTML=`<div class="listMain"><div class="listTop"><b>${r.project_name||'현장명 미입력'}</b><span>${r.customer_name?` / ${r.customer_name}`:''}</span></div><div class="listBottom"><span>${estimateNumber(r,i)}</span><span>${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</span><span class="statusBadge">${r.status||'작성중'}</span></div></div><span class="listOpen">열기</span>`;
    b.onclick=()=>detail(r); el.append(b);
  });
  if(!data.length)el.innerHTML='<div class="empty"><h3>검색 결과가 없습니다.</h3><p>현장명, 고객명, 주소 또는 견적번호를 확인해보세요.</p></div>';
  if($('savedCount'))$('savedCount').textContent=`${data.length}건`;
}
async function load(){
  const schema=await db.from('estimates').select('estimate_no').limit(1);
  state.hasEstimateNo=!schema.error;
  const{data,error}=await db.from('estimates').select('*').order('created_at',{ascending:false});
  if(error){$('list').innerHTML=`<div class="empty">${error.message}</div>`;return;}
  state.estimates=data||[];
  renderRecentList();renderEstimateList();
}
async function fetchEstimateItems(estimateId){let q=await db.from('estimate_items').select('*').eq('estimate_id',estimateId).order('sort_order',{ascending:true,nullsFirst:false});if(q.error&&/sort_order|column/i.test(q.error.message||''))q=await db.from('estimate_items').select('*').eq('estimate_id',estimateId).order('created_at',{ascending:true});if(q.error&&/created_at|column/i.test(q.error.message||''))q=await db.from('estimate_items').select('*').eq('estimate_id',estimateId).order('id',{ascending:true});if(!q.error&&Array.isArray(q.data)){q.data.sort((a,b)=>{const sa=Number(a.sort_order),sb=Number(b.sort_order);const va=Number.isFinite(sa)&&sa>0,vb=Number.isFinite(sb)&&sb>0;if(va&&vb)return sa-sb;if(va&&!vb)return -1;if(!va&&vb)return 1;const ta=Date.parse(a.created_at||''),tb=Date.parse(b.created_at||'');if(Number.isFinite(ta)&&Number.isFinite(tb)&&ta!==tb)return ta-tb;return String(a.id||'').localeCompare(String(b.id||''));});}return q;}
async function detail(r){
  state.detailRecord=r;$('detailTitle').textContent=r.project_name||'현장명 미입력';$('dProject').textContent=r.project_name||'-';$('dCustomer').textContent=r.customer_name||'-';$('dAddress').textContent=r.address||'-';$('dDate').textContent=new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR');$('dStaff').textContent=(recordStaff(r)?.name||'미지정');$('dStatus').textContent=r.status||'-';$('dMemo').textContent=cleanMemo(r.memo).trim()||'-';$('dTotal').textContent='계산 중...';$('dItems').innerHTML='불러오는 중...';$('dExtras').innerHTML='불러오는 중...';$('quote').classList.add('hidden');show('detail');
  const result=await fetchEstimateItems(r.id);if(result.error){$('dTotal').textContent='항목 조회 실패';$('dItems').textContent=result.error.message;return;}
  state.detailItems=(result.data||[]).slice();const extras=recalcStoredExtras(r,state.detailItems);let calc={items:state.detailItems.map(x=>({...x,available:false})),total:0,rateMaterialTotal:0};let priceError='';try{calc=await calculate(state.detailItems,extras.windowRates||[],extras.conditions||{});}catch(err){console.error(err);priceError=err?.message||'가격표 조회 실패';}
  const quoteColor=estimateColor(r);state.detailItems=state.detailItems.map(x=>({...x,color:quoteColor}));calc.items=calc.items.map(x=>({...x,color:quoteColor}));
  $('dItems').innerHTML=state.detailItems.length?'<table><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품</th><th>색상</th><th>실측</th><th>적용</th><th>방충망</th><th>요율</th><th>기준</th><th>금액</th></tr></thead><tbody>'+calc.items.map((x,i)=>`<tr><td>${i+1}</td><td>${itemKind(x)||'-'}</td><td>${itemName(x)||'-'}</td><td>${x.product_code||'-'}</td><td>${x.color||'기본색'}</td><td>${x.actual_width||'-'}×${x.actual_height||'-'}mm</td><td>${x.applied_width||'-'}×${x.applied_height||'-'}mm</td><td>${itemScreen(x)}</td><td>${x.rate_applied?Number(x.pricing_rate).toFixed(2):'-'}</td><td>${x.pricing_source==='execution'?`실행가 ${x.execution_sheet}`:'가격표'}</td><td>${x.available&&x.amount>0?money(x.amount):(x.reason||priceError||'계산 후 확인')}</td></tr>`).join('')+'</tbody></table>':'등록된 창호 항목이 없습니다.';
  const constructionSupply=Number(extras.equipment||0)+Number(extras.demolition||0)+Number(extras.sash||0)+Number(extras.molding||0)+Number(extras.protection||0);const constructionVat=Math.round(constructionSupply*0.10);const constructionWithVat=constructionSupply+constructionVat;
  const extraRows=[['장비비',extras.equipment],['철거비',extras.demolition],['사춤 / 타일',extras.sash],['몰딩',extras.molding],['보양',extras.protection]];
  const sizeLabels={'20':'20평대','30':'30평대','40':'40평대','50':'50평대 이상'},oldLabel=extras.conditions?.old==='AL'?'AL창':'PL창',protectionLabels={'none':'보양 없음','1-2':'1~2룸','3-4':'3~4룸','5-7':'5~7룸','8-9':'8~9룸','10+':'10룸 이상'};
  $('dExtras').innerHTML='<table><tbody>'+extraRows.map(([n,v])=>`<tr><td>${n}</td><td class="amount">${money(v||0)}</td></tr>`).join('')+`<tr><td>부가시공비 공급가</td><td class="amount">${money(constructionSupply)}</td></tr><tr><td>부가세 (10%)</td><td class="amount">${money(constructionVat)}</td></tr><tr class="sumRow"><th>부가시공비 최종 금액 (VAT 포함)</th><th class="amount">${money(constructionWithVat)}</th></tr></tbody></table>`+
    `<div class="detailExtraInfoButtons"><button type="button" class="secondary extraInfoBtn" id="detailExtraRulesBtn">부가시공비 계산 기준 보기 ▾</button><button type="button" class="secondary extraInfoBtn" id="detailExtraFormulaBtn">현재 견적 계산식 보기 ▾</button></div>`+
    `<div id="detailExtraRules" class="extraFormula hidden"><p><b>부가시공비 계산 기준</b></p><ul><li><b>장비비:</b> 장비 가능 400,000원 / 장비 불가 500,000원</li><li><b>철거비:</b> 20평대 AL 300,000원 / PL 400,000원, 30평대 AL 400,000원 / PL 500,000원, 40평대 AL 500,000원 / PL 600,000원, 50평대 이상 AL 600,000원 / PL 700,000원</li><li><b>사춤 / 타일:</b> 외부창 중 실측 높이 2,000mm 이상인 프레임 × 100,000원</li><li><b>몰딩:</b> 내부창 프레임 × 55,000원</li><li><b>보양:</b> 선택한 보양 범위에 따라 0 / 140,000 / 170,000 / 200,000 / 230,000 / 270,000원</li><li><b>부가세:</b> 부가시공비 공급가의 10%를 별도 계산하여 합산</li><li><b>직접입력창:</b> 선택한 내부창 / 외부창 구분을 기준으로 부가시공비에 반영</li></ul></div>`+
    `<div id="detailExtraFormula" class="extraFormula hidden"><p><b>현재 견적에 적용된 계산식</b></p><ul><li>장비비: ${money(extras.equipment||0)}</li><li>철거비: ${sizeLabels[extras.conditions?.size]||'-'} ${oldLabel} → ${money(extras.demolition||0)}</li><li>사춤 / 타일: 외부창 중 실측 높이 2,000mm 이상 ${Math.round((extras.sash||0)/100000)}프레임 × 100,000원 = ${money(extras.sash||0)}</li><li>몰딩: 내부창 ${Math.round((extras.molding||0)/55000)}프레임 × 55,000원 = ${money(extras.molding||0)}</li><li>보양: ${protectionLabels[extras.conditions?.protection]||'-'} → ${money(extras.protection||0)}</li><li>부가시공비 공급가: ${money(constructionSupply)}</li><li>부가세 10%: ${money(constructionSupply)} × 10% = ${money(constructionVat)}</li><li><b>부가시공비 최종: ${money(constructionSupply)} + ${money(constructionVat)} = ${money(constructionWithVat)}</b></li></ul><p class="muted">※ 직접입력 창은 저장된 내부창/외부창 구분을 기준으로 계산됩니다.</p></div>`+
    (extras.additionalProducts?.length?`<h4 class="subDetailTitle">추가상품 내역</h4><table><thead><tr><th>품목</th><th>수량</th><th>정상가</th><th>할인</th><th>서비스</th><th>적용금액</th></tr></thead><tbody>${extras.additionalProducts.map(x=>`<tr><td>${x.name||'-'}</td><td>${x.qty||1}</td><td>${money((Number(x.basePrice)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':money((Number(x.discount)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':'-'}</td><td>${money(x.finalAmount||0)}</td></tr>`).join('')}</tbody></table>`:'');
  const rb=$('detailExtraRulesBtn'),rp=$('detailExtraRules'),fb=$('detailExtraFormulaBtn'),fp=$('detailExtraFormula');if(rb&&rp)rb.onclick=()=>{const open=rp.classList.toggle('hidden')===false;rb.textContent=open?'부가시공비 계산 기준 닫기 ▴':'부가시공비 계산 기준 보기 ▾';};if(fb&&fp)fb.onclick=()=>{const open=fp.classList.toggle('hidden')===false;fb.textContent=open?'현재 견적 계산식 닫기 ▴':'현재 견적 계산식 보기 ▾';};
  calc.extras=extras;const detailDiscount=discountInfo(calc,extras);$('dTotal').textContent=priceError?'가격표 확인 필요':money(detailDiscount.finalTotal);loadHistory(r.id);
}

async function saveQuoteAsImage(mode){
  let target=document.querySelector(mode==='internal'?'.internalQuoteSheet':'.xlsQuote.customer');
  if(!target && state.detailRecord && state.detailItems?.length){
    try{
      const ex=recordExtras(state.detailRecord); const calc=await calculate(state.detailItems,ex.windowRates||[],ex.conditions||{});
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
  const r=state.detailRecord,extras=recalcStoredExtras(r,state.detailItems),di=discountInfo(calc,extras),total=di.finalTotal;
  const rows=(calc.items||[]).map((x,i)=>{const ec=x.execution_components||{};return `<tr><td>${i+1}</td><td>${itemKind(x)||'-'}</td><td>${itemName(x)||'-'}</td><td>${x.product_code||'-'}</td><td>${x.actual_width||'-'} × ${x.actual_height||'-'}</td><td>${x.applied_width||'-'} × ${x.applied_height||'-'}</td><td>${x.window_type==='fixed'?'고정창 / 핸들 무':'일반창 / 핸들 유'}</td><td>${x.pricing_source==='execution'?money(ec.complete_window_dc||0):money(x.material||0)}</td><td>${x.pricing_source==='execution'?money(ec.glass_dc||0):'-'}</td><td>${x.pricing_source==='execution'?money(x.install||0):money(x.install||0)}</td><td>${x.rate_applied?Number(x.pricing_rate).toFixed(2):'-'}</td><td>${x.available?money(x.amount):'-'}</td></tr>`}).join('');
  $('quote').innerHTML=`<div class="quoteTools"><button onclick="window.print()">인쇄 / PDF 저장</button><button class="imageSaveBtn secondary" type="button" onclick="saveQuoteAsImage('internal')">이미지 저장</button></div><div class="internalQuoteSheet"><div class="internalHeader"><div><small>INTERNAL ESTIMATE V49</small><h2>내부용 상세 견적서</h2></div><div class="internalStaff"><b>${recordStaff(r)?.name||'담당자 미지정'}</b><span>${staffPhone(r)}</span></div></div><div class="internalMeta"><div><b>현장명</b><span>${r.project_name||'-'}</span></div><div><b>고객명</b><span>${r.customer_name||'-'}</span></div><div><b>견적번호</b><span>${estimateNumber(r)}</span></div><div><b>작성일</b><span>${new Date(r.created_at||Date.now()).toLocaleDateString('ko-KR')}</span></div><div class="wide"><b>현장주소</b><span>${r.address||'-'}</span></div></div><h3>창호 상세 내역</h3><div class="internalTable detailEstimateTable"><table><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품</th><th>실측</th><th>적용</th><th>형태</th><th>완성창(DC)</th><th>유리</th><th>시공/부대</th><th>요율</th><th>합계</th></tr></thead><tbody>${rows||'<tr><td colspan="12">등록된 창호 항목이 없습니다.</td></tr>'}</tbody></table></div><h3>추가상품 내역</h3>${extras.additionalProducts?.length?`<div class="internalTable"><table><thead><tr><th>품목</th><th>수량</th><th>정상가</th><th>할인</th><th>서비스</th><th>적용금액</th></tr></thead><tbody>${extras.additionalProducts.map(x=>`<tr><td>${x.name||'-'}</td><td>${x.qty||1}</td><td>${money((Number(x.basePrice)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':money((Number(x.discount)||0)*(Number(x.qty)||1))}</td><td>${x.service?'서비스':'-'}</td><td>${money(x.finalAmount||0)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">추가상품 없음</p>'}<h3>금액 집계</h3><div class="internalTable internalSummaryTable"><table><tbody><tr><th>요율 적용 창호</th><td class="num">${(calc.items||[]).filter(x=>x.rate_applied).length}개</td></tr><tr><th>창호 계산 합계</th><td class="num">${money(calc.total)}</td></tr><tr><th>자재비 할인율</th><td class="num"><input id="discountRate" type="number" min="0" max="100" step="0.1" value="${di.rate}" style="width:90px;text-align:right"> %</td></tr><tr><th>자재비 할인금액</th><td class="num" id="discountAmount">${money(di.discount)}</td></tr><tr><th>추가시공비 별도</th><td class="num">${money(di.constructionExtra)}</td></tr><tr><th>추가상품 합계</th><td class="num">${money(di.extraProducts)}</td></tr><tr class="internalSum"><th>최종 견적금액</th><td class="num" id="internalFinalTotal">${money(total)}</td></tr></tbody></table></div><div style="margin:10px 0 18px;text-align:right"><button type="button" id="saveDiscount">할인율 저장</button></div><div class="internalGrand"><span>총 견적금액</span><b id="internalGrandValue">${money(total)}</b></div><div class="internalMemo"><b>메모</b><p>${cleanMemo(r.memo).trim()||'-'}</p></div></div>`;
  const updateDiscountPreview=()=>{const rate=Math.max(0,Math.min(100,Number($('discountRate').value)||0));const discount=Math.round(di.rateMaterial*rate/100);const final=di.windowTotal-discount+di.constructionExtra+di.extraProducts;$('discountAmount').textContent=money(discount);$('internalFinalTotal').textContent=money(final);$('internalGrandValue').textContent=money(final);};
  $('discountRate').addEventListener('input',updateDiscountPreview);
  $('saveDiscount').onclick=async()=>{const rate=Math.max(0,Math.min(100,Number($('discountRate').value)||0));const nextExtras={...extras,discountRate:rate};const final=di.windowTotal-Math.round(di.rateMaterial*rate/100)+di.constructionExtra+di.extraProducts;delete nextExtras.customerFinalAmount;const result=await db.from('estimates').update({extras_data:nextExtras,total_amount:final}).eq('id',r.id);if(result.error){alert(result.error.message);return;}r.extras_data=nextExtras;r.total_amount=final;alert(`자재비 ${rate}% 할인이 저장되었습니다.`);};
  updateDiscountPreview();$('quote').classList.remove('hidden');
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
    <table class="xlsItems"><colgroup><col class="no"><col class="kind"><col class="loc"><col class="product"><col class="glass"><col class="color"><col class="qty"><col class="screen"><col class="amount"><col class="memo"></colgroup><thead><tr><th>No.</th><th>구분</th><th>위치</th><th>제품명</th><th>유 리 및 두께</th><th>색상</th><th>수량</th><th>방충망</th><th>금액</th><th>비고</th></tr></thead><tbody>${rows.join('')}</tbody><tbody class="xlsSummary"><tr><td colspan="8" class="sumLabel">창 호 계</td><td class="sumAmount">${Number(calc.total||0).toLocaleString('ko-KR')}</td><td></td></tr><tr><td colspan="8" class="sumLabel">표준 시공 기술료</td><td class="sumAmount">0</td><td></td></tr><tr><td colspan="8" class="sumLabel">부가 시공비 공급가</td><td class="sumAmount">${Number(di.constructionExtra||0).toLocaleString('ko-KR')}</td><td></td></tr><tr><td colspan="8" class="sumLabel">부가 시공비 부가세 (10%)</td><td class="sumAmount">${Number(di.constructionVat||0).toLocaleString('ko-KR')}</td><td></td></tr><tr><td colspan="8" class="sumLabel">부가 시공비 최종 (VAT 포함)</td><td class="sumAmount">${Number(di.constructionExtraWithVat||0).toLocaleString('ko-KR')}</td><td></td></tr>${di.rate>0?`<tr><td colspan="8" class="sumLabel">자재비 할인 (${di.rate}%)</td><td class="sumAmount">-${di.discount.toLocaleString('ko-KR')}</td><td></td></tr>`:''}${extras.additionalProducts?.length?extras.additionalProducts.map(x=>`<tr><td colspan="8" class="sumLabel">추가옵션 ${x.name||''}${x.service?' (서비스)':(Number(x.discount)||0)>0?` (할인 -${(Number(x.discount)||0)*(Number(x.qty)||1).toLocaleString('ko-KR')})`:''}</td><td class="sumAmount">${Number(x.finalAmount||0).toLocaleString('ko-KR')}</td><td></td></tr>`).join(''):''}<tr><td colspan="8" class="sumLabel">[ 합 계 ]</td><td class="sumAmount">${total.toLocaleString('ko-KR')}</td><td></td></tr></tbody></table>
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
$('savedBtn').onclick=()=>{show('saved');renderEstimateList();};$('allSavedBtn').onclick=()=>{show('saved');renderEstimateList();};$('savedBackBtn').onclick=()=>{show('home');renderRecentList();};$('newBtn').onclick=()=>{resetForm();$('sizeBand').value='20';$('oldFrame').value='AL';$('equipment').value='가능';$('protection').value='none';show('form');addItem();renderExtraSummary();loadAdditionalProducts([]);};$('backBtn').onclick=$('cancelBtn').onclick=()=>{show('home');renderRecentList();};$('detailBackBtn').onclick=()=>{show('saved');renderEstimateList();};$('editBtn').onclick=async()=>{const r=state.detailRecord;const q=await fetchEstimateItems(r.id);if(q.error)return alert(q.error.message);const data=(q.data||[]).slice();$('projectName').value=r.project_name||'';$('customerName').value=r.customer_name||'';$('customerPhone').value=recordCustomerPhone(r);$('address').value=r.address||'';$('status').value=r.status||'작성중';$('memo').value=cleanMemo(r.memo);const ex=recordExtras(r);if($('estimateColor'))$('estimateColor').value=estimateColor(r);if(ex&&ex.conditions){$('sizeBand').value=ex.conditions.size||$('sizeBand').value;$('oldFrame').value=ex.conditions.old||$('oldFrame').value;$('equipment').value=ex.conditions.equip||$('equipment').value;$('protection').value=ex.conditions.protection||$('protection').value;}$('items').innerHTML='';state.items=[];loadAdditionalProducts(ex.additionalProducts||[]);state.editingId=r.id;$('formTitle').textContent='견적 수정';$('formEyebrow').textContent='EDIT ESTIMATE';$('saveBtn').textContent='수정 저장';for(let i=0;i<data.length;i++){const x=data[i];const storedRate=Number(x.pricing_rate);const legacy=await isLegacyExecutionDefaultRate(x,storedRate,ex.conditions||{});const recovered=legacy?'':(Number.isFinite(storedRate)&&storedRate>0?storedRate:'');addItem({...x,kind:itemKind(x),pricing_rate:recovered});}if(!data.length)addItem();show('form');};$('deleteBtn').onclick=async()=>{const r=state.detailRecord;if(!confirm(`“${r.project_name}” 견적을 삭제할까요?`))return;const before=snapshotEstimate(r,state.detailItems);await recordHistory(r.id,'delete',before,null);await db.from('estimate_items').delete().eq('estimate_id',r.id);const{error}=await db.from('estimates').delete().eq('id',r.id);if(error)return alert(error.message);show('home');load();};$('internalBtn').onclick=async()=>{const ex=recordExtras(state.detailRecord);renderQuote('internal',await calculate(state.detailItems,ex.windowRates||[],ex.conditions||{}));};$('customerBtn').onclick=async()=>{const ex=recordExtras(state.detailRecord);renderQuote('customer',await calculate(state.detailItems,ex.windowRates||[],ex.conditions||{}));};$('addItem').onclick=()=>{addItem();renderExtraSummary();};$('addAdditionalProduct').onclick=()=>addAdditionalProduct();['sizeBand','oldFrame','equipment','protection'].forEach(id=>$(id).onchange=()=>{renderExtraSummary();if(id==='sizeBand')loadAdditionalProducts(readAdditionalProducts());});
$('estimateForm').onsubmit=async e=>{e.preventDefault();if($('saveBtn').disabled)return;$('saveBtn').disabled=true;$('message').textContent='가격 확인 중...';try{
  const historyBefore=state.editingId&&state.detailRecord?snapshotEstimate(state.detailRecord,state.detailItems):null;const extras=getExtras(),ap=readAdditionalProducts();extras.additionalProducts=ap;extras.additionalProductTotal=ap.reduce((s,x)=>s+x.finalAmount,0);extras.constructionSupply=extras.total;extras.constructionVat=Math.round(Number(extras.constructionTotal||extras.total||0)*0.10);extras.constructionTotalWithVat=Number(extras.constructionTotal||extras.total||0)+extras.constructionVat;extras.total=Number(extras.constructionTotalWithVat||0)+extras.additionalProductTotal;
  const rawMemo=$('memo').value;let originalAuthor=null;if(state.editingId&&state.detailRecord)originalAuthor=recordStaff(state.detailRecord);
  const rawItems=state.items.map((el,index)=>{const kind=el.querySelector('.kind').value;const name=kind==='직접입력'?el.querySelector('.customName').value:el.querySelector('.location').value;const windowScope=el.querySelector('.windowScope').value||defaultWindowScope(kind);if(kind==='직접입력'&&!['외부창','내부창'].includes(windowScope))throw new Error('직접입력 창의 창 구분(내부창/외부창)을 선택해주세요.');const product=el.querySelector('.product').value;const actualWidth=Number(el.querySelector('.w').value),actualHeight=Number(el.querySelector('.h').value),pricingRate=Number(el.querySelector('.pricingRate').value);return{installation_location:name,window_kind:kind,window_scope:windowScope,screen_option:el.querySelector('.screen').value,product_code:product,window_type:el.querySelector('.windowType').value==='고정창'?'fixed':'normal',actual_width:actualWidth,actual_height:actualHeight,applied_width:Math.ceil(actualWidth/200)*200,applied_height:Math.ceil(actualHeight/200)*200,pricing_rate:Number.isFinite(pricingRate)&&pricingRate>0?pricingRate:null,sort_order:index+1};});
  if(!rawItems.length)throw new Error('창호 항목을 하나 이상 추가해주세요.');extras.windowRates=rawItems.map(x=>x.pricing_rate||null);
  $('message').textContent=rawItems.some(x=>Number(x.pricing_rate)>0)?'요율 적용 계산 중...':'가격표 기준 계산 중...';const calc=await calculate(rawItems,extras.windowRates,extras.conditions||{});const unavailable=calc.items.find(x=>!x.available);if(unavailable)throw new Error(unavailable.reason||'해당 치수의 가격표가 없습니다.');
  const finalInfo=discountInfo(calc,extras);const oldExtras=state.editingId&&state.detailRecord?recordExtras(state.detailRecord):{};const ratesChanged=state.editingId?JSON.stringify((oldExtras.windowRates||[]).map(v=>Number(v)||0))!==JSON.stringify(rawItems.map(x=>Number(x.pricing_rate)||0)):false;
  if(state.editingId){delete extras.customerFinalAmount;}
  const payload={project_name:$('projectName').value,customer_name:$('customerName').value,address:$('address').value,status:$('status').value,memo:cleanMemo(rawMemo),customer_phone:$('customerPhone').value,staff_id:(originalAuthor||state.staff)?.id||null,staff_name:(originalAuthor||state.staff)?.name||'',extras_data:extras,total_amount:finalInfo.finalTotal};
  if(state.hasEstimateNo&&!state.editingId)payload.estimate_no=nextEstimateNo();let id=state.editingId;
  if(id){const{error}=await db.from('estimates').update(payload).eq('id',id);if(error)throw error;const{error:itemDeleteError}=await db.from('estimate_items').delete().eq('estimate_id',id);if(itemDeleteError)throw itemDeleteError;}else{const{data,error}=await db.from('estimates').insert(payload).select().single();if(error)throw error;id=data.id;}
  const rows=calc.items.map((x,i)=>({estimate_id:id,installation_location:x.installation_location||itemName(x),window_kind:x.window_kind||itemKind(x),window_scope:x.window_scope||itemWindowScope(x),color:extras.color||'기본색',screen_option:x.screen_option||'자동',product_code:x.product_code,window_type:x.window_type||'normal',actual_width:x.actual_width,actual_height:x.actual_height,applied_width:x.applied_width,applied_height:x.applied_height,glass_type:x.glass_type||'28T',material_cost:x.material,installation_cost:x.install,additional_cost:0,total_cost:x.amount,sort_order:i+1,pricing_rate:x.pricing_rate||null,pricing_rate_source:x.pricing_rate?'manual':'none',memo:null}));
  let itemError=null;for(const row of rows){const res=await insertItemCompatible(row);if(res.error){itemError=res.error;break;}}if(itemError)throw itemError;
  const successMessage=ratesChanged?'저장되었습니다. 변경된 요율로 금액을 다시 계산했습니다.':(state.editingId?'견적이 수정되었습니다.':'견적이 저장되었습니다.');$('message').textContent=successMessage;alert(successMessage);setTimeout(()=>{show('home');load();},300);
}catch(err){console.error(err);const msg=err?.message||String(err)||'알 수 없는 오류가 발생했습니다.';$('message').textContent='저장 실패: '+msg;alert('저장에 실패했습니다.\n\n'+msg);}finally{$('saveBtn').disabled=false;}};

$('savedSearch')?.addEventListener('input',renderEstimateList);$('savedStatus')?.addEventListener('change',renderEstimateList);$('exportExcelBtn')?.addEventListener('click',exportEstimatesCsv);$('backupBtn')?.addEventListener('click',backupAllData);$('restoreInput')?.addEventListener('change',e=>{restoreBackup(e.target.files?.[0]);e.target.value='';});$('copyBtn')?.addEventListener('click',()=>state.detailRecord&&copyEstimate(state.detailRecord));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('savedSearch')){$('savedSearch').value='';renderEstimateList();}});
function boot(){
  try{staffInit();if(state.staff){show('home');load();}}catch(err){console.error(err);alert('담당자 선택 화면을 불러오지 못했습니다. 페이지를 새로고침해주세요.');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
