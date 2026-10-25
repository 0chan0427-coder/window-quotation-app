(function(){
'use strict';
const byId=id=>document.getElementById(id);
const icons={contracts:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8m-8 4h4"/>',home:'<path d="m3 10 9-7 9 7v10H5V10M9 20v-7h6v7"/>',saved:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',development:'<path d="M4 21V5l8-2v18M12 9h8v12M8 7v1m0 3v1m0 3v1m8-3v1m0 3v1M2 21h20"/>',execution:'<path d="M4 3h11l5 5v13H4zM14 3v6h6M8 13h8m-8 4h8"/>',application:'<path d="M4 3h11l5 5v13H4zM14 3v6h6M8 14l3 3 5-6"/>'};
const svg=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]}</svg>`;
const menu=[['home','홈','logoHomeBtn'],['saved','견적 관리','savedBtn'],['events','행사 현황','eventsBtn'],['contracts','계약 현황','contractsBtn'],['development','단지 개발','developmentBtn'],['execution','실행가 엑셀 생성','executionBtn'],['application','신청서 엑셀 생성','applicationBtn']];
const nav=document.createElement('aside');nav.id='workspaceNav';nav.className='workspace-nav';nav.setAttribute('aria-label','주 메뉴');
nav.innerHTML='<div class="workspace-nav-head"><span class="workspace-mark">D</span><div class="workspace-nav-label"><b>프로젝트 1팀</b><small>주식회사 도도</small></div><button type="button" id="workspacePin" aria-label="메뉴 고정" aria-pressed="false">고정</button></div><nav>'+menu.map(([id,label,target])=>`<button type="button" class="workspace-nav-item" data-route="${id}" data-target="${target}" title="${label}">${svg(id)}<span class="workspace-nav-label">${label}</span></button>`).join('')+'</nav><div class="workspace-nav-foot"><span class="workspace-avatar">팀</span><span class="workspace-nav-label" id="workspaceStaff"></span></div>';
document.body.append(nav);
const overlay=document.createElement('button');overlay.type='button';overlay.className='workspace-overlay';overlay.setAttribute('aria-label','메뉴 닫기');document.body.append(overlay);
const menuToggle=document.createElement('button');menuToggle.type='button';menuToggle.id='workspaceMenu';menuToggle.className='workspace-menu-toggle';menuToggle.setAttribute('aria-label','메뉴 열기');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-controls',nav.id);menuToggle.textContent='☰';document.querySelector('.topbar').prepend(menuToggle);
const summary=document.createElement('aside');summary.id='liveEstimate';summary.className='live-estimate';summary.setAttribute('aria-label','실시간 견적 요약');
summary.innerHTML='<div class="live-heading"><span class="live-kicker">LIVE ESTIMATE</span><h2>견적 요약</h2><p id="liveSite">새 견적</p></div><div id="liveBreakdown" class="live-breakdown"><dl><div><dt>창호 금액</dt><dd id="liveWindow">—</dd></div><div><dt>부가시공비 공급가</dt><dd id="liveConstruction">—</dd></div><div><dt>부가시공비 부가세</dt><dd id="liveVat">—</dd></div><div><dt>추가상품</dt><dd id="liveProducts">—</dd></div></dl><details><summary>부가시공비 세부 내역</summary><dl id="liveExtraDetails"></dl></details><p class="live-note" id="liveExecutionNote" hidden>실행가에 포함된 부가시공비는 별도로 더하지 않습니다.</p></div><div class="live-total"><span id="liveTotalLabel">현재 계산금액</span><strong id="liveTotal" aria-live="polite" aria-atomic="true">—</strong></div><p class="live-status" id="liveStatus" role="status">창호 정보를 입력해주세요.</p><button type="button" id="liveToggle" aria-expanded="false" aria-controls="liveBreakdown">상세 보기</button><button type="submit" form="estimateForm" id="liveSave">견적 저장</button>';
document.body.append(summary);
let route='',timer,revision=0;
function closeMenu(){document.body.classList.remove('workspace-menu-open');menuToggle.setAttribute('aria-expanded','false');}
function closeDetails(){summary.classList.remove('is-expanded');byId('liveToggle').setAttribute('aria-expanded','false');byId('liveToggle').textContent='상세 보기';}
menuToggle.onclick=()=>{const open=document.body.classList.toggle('workspace-menu-open');menuToggle.setAttribute('aria-expanded',String(open));if(open)nav.querySelector('[aria-current="page"]')?.focus();};
overlay.onclick=closeMenu;
window.matchMedia('(max-width:767px)').addEventListener('change',()=>{closeMenu();closeDetails();});
byId('workspacePin').onclick=()=>{const pinned=nav.classList.toggle('is-pinned');byId('workspacePin').setAttribute('aria-pressed',String(pinned));byId('workspacePin').textContent=pinned?'해제':'고정';};
nav.querySelectorAll('[data-target]').forEach(b=>b.onclick=e=>{closeMenu();if(e.detail>0)b.blur();byId(b.dataset.target).click();window.scrollTo({top:0,behavior:'auto'});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.body.classList.contains('workspace-menu-open')){closeMenu();menuToggle.focus();}closeDetails();}});
byId('liveToggle').onclick=()=>{const open=summary.classList.toggle('is-expanded');byId('liveToggle').setAttribute('aria-expanded',String(open));byId('liveToggle').textContent=open?'상세 닫기':'상세 보기';};
function sync(){
 const ready=!!state.staff;document.body.classList.toggle('workspace-ready',ready);byId('workspaceStaff').textContent=state.staff?.name||'';
 const active=['home','saved','form','detail','events','contracts','incentives','development','execution','application'].find(id=>!byId(id).classList.contains('hidden'))||'home';
 document.body.classList.toggle('quote-editing',ready&&active==='form');
 nav.querySelectorAll('[data-route]').forEach(b=>{const yes=b.dataset.route===(['form','detail'].includes(active)?'saved':active==='incentives'?'contracts':active);b.classList.toggle('is-active',yes);if(yes)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 byId('liveSave').disabled=byId('saveBtn').disabled;byId('liveSave').textContent=byId('saveBtn').textContent;
 if(active!==route){route=active;revision++;closeDetails();if(active==='form')schedule();else clearTimeout(timer);}
}
const routeObserver=new MutationObserver(sync);['home','saved','form','detail','events','contracts','incentives','development','execution','application','staffGate'].forEach(id=>routeObserver.observe(byId(id),{attributes:true,attributeFilter:['class']}));
new MutationObserver(sync).observe(byId('saveBtn'),{attributes:true,attributeFilter:['disabled'],childList:true});
function schedule(){revision++;clearTimeout(timer);byId('liveTotal').textContent='—';byId('liveStatus').textContent='계산 중…';byId('liveStatus').classList.remove('has-warning');timer=setTimeout(()=>refresh(revision),140);}
function resetAmounts(){['liveWindow','liveConstruction','liveVat','liveProducts','liveTotal'].forEach(id=>byId(id).textContent='—');byId('liveExtraDetails').replaceChildren();byId('liveExecutionNote').hidden=true;}
async function refresh(ticket){
 if(route!=='form'||!state.staff)return;
 byId('liveSite').textContent=byId('projectName').value.trim()||'새 견적';
 try{
  const raw=[],positions=[];let pending=0;
  state.items.forEach((el,index)=>{
   const value=cls=>el.querySelector('.'+cls).value;const kind=value('kind'),name=kind==='직접입력'?value('customName').trim():value('location');const width=Number(value('w')),height=Number(value('h')),rate=Number(value('pricingRate'));
   const scope=value('windowScope')||defaultWindowScope(kind);
   if(!kind||!name||!(width>0)||!(height>0)||rate<0||(kind==='직접입력'&&!['외부창','내부창'].includes(scope))){pending++;return;}
   raw.push({installation_location:name,window_kind:kind,window_scope:scope,screen_option:value('screen'),product_code:value('product'),window_type:value('windowType')==='고정창'?'fixed':'normal',actual_width:width,actual_height:height,pricing_rate:rate>0?rate:null,pricing_rate_source:'manual',sort_order:index+1});positions.push(index);
  });
  const extras=getExtras({allowIncomplete:true});extras.additionalProductTotal=readAdditionalProducts().reduce((sum,x)=>sum+x.finalAmount,0);
  const calc=raw.length?await calculate(raw,raw.map(x=>x.pricing_rate),extras.conditions):{items:[],total:0};
  if(ticket!==revision||route!=='form')return;
  const unavailable=calc.items.filter(x=>!x.available);const info=discountInfo(calc,extras);
  byId('liveWindow').textContent=money(info.windowTotal);byId('liveConstruction').textContent=money(info.constructionExtra);byId('liveVat').textContent=money(info.constructionVat);byId('liveProducts').textContent=money(info.extraProducts);byId('liveTotal').textContent=money(info.finalTotal);
  byId('liveTotalLabel').textContent=pending||unavailable.length||!raw.length?'현재 계산금액':'최종 견적금액';
  const partial=pending+unavailable.length;
  byId('liveStatus').textContent=!state.items.length?'창호 항목을 추가해주세요.':partial?`미완성 ${partial}개 · 현재 입력 기준의 임시 합계입니다.`:'모든 창호 계산 완료 · 부가시공비 VAT 포함';
  byId('liveStatus').classList.toggle('has-warning',!!partial||!state.items.length);
  const execution=calc.items.some(x=>x.pricing_source==='execution');byId('liveExecutionNote').hidden=!execution;
  byId('liveExtraDetails').replaceChildren();[['장비비',extras.equipment],['철거비',extras.demolition],['사춤 / 타일',extras.sash],['몰딩',extras.molding],['보양',extras.protection]].forEach(([label,value])=>{const line=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=execution?'실행가 포함':money(value);line.append(dt,dd);byId('liveExtraDetails').append(line);});
  state.items.forEach(el=>{el.querySelector('.result').textContent='창 종류·규격을 입력하면 금액이 표시됩니다.';});
  calc.items.forEach((x,i)=>{const box=state.items[positions[i]]?.querySelector('.result');if(box)box.textContent=x.available?`적용 규격 ${x.applied_width} × ${x.applied_height} mm · ${money(x.amount)}`:x.reason||'가격 확인 필요';});
 }catch(e){if(ticket!==revision)return;resetAmounts();byId('liveStatus').textContent=e.message||'가격을 확인하지 못했습니다. 입력을 다시 확인해주세요.';byId('liveStatus').classList.add('has-warning');}
}
byId('estimateForm').addEventListener('input',schedule);byId('estimateForm').addEventListener('change',schedule);
['items','additionalProducts'].forEach(id=>new MutationObserver(schedule).observe(byId(id),{childList:true}));
sync();
})();
