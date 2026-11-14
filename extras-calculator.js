(()=>{
const $=id=>document.getElementById(id), money=n=>Math.round(Number(n)||0).toLocaleString('ko-KR')+'원', num=id=>Math.max(0,Number($(id)?.value)||0);
const app=$('extrasCalcApp'); if(!app)return;
const protection={'1-2':140000,'3-4':170000,'5-7':200000,'8-9':230000,'10+':270000};
// Standard table: residential BF removal matrix (AL / PVC general / PVC system)
const demo={
 '거주':{'AL':[206000,258000,309000,361000,412000],'PVC 일반':[309000,361000,412000,464000,515000],'PVC 시스템':[412000,464000,515000,567000,619000]},
 '비거주':{'AL':[155000,206000,258000,309000,412000],'PVC 일반':[258000,309000,361000,412000,515000],'PVC 시스템':[361000,412000,464000,515000,619000]}
};
const countBands=['1~3','4~6','7~9','10~15','16+'];
const nonBFResidentPVC=[206000,309000,361000,412000,464000];
const stair={'1~3':[200000,300000,350000,400000],'4~6':[250000,350000,400000,450000],'7~9':[300000,400000,450000,500000],'10~12':[350000,450000,500000,550000]};
const sky={'1~2T':[200000,300000,500000],'2.5~3.5T':[200000,300000,500000],'5T':[350000,450000,700000],'16T':[0,700000,900000],'17T':[0,800000,1100000],'19T':[0,1000000,1500000],'24T':[0,0,0]};
const cargo={'5T':[250000,400000,600000],'11T':[0,400000,600000],'18T':[0,450000,650000],'25T':[0,500000,700000]};
const hydraulic={'13T':[250000,400000,600000],'16T':[300000,450000,650000],'25T':[0,500000,700000],'35T':[0,600000,800000],'50T':[0,700000,1000000],'70T':[0,1000000,1500000],'100T':[0,0,2000000],'160T':[0,0,0],'200T':[0,0,0]};
let equipment=[];
app.innerHTML=`<div class="excalc">
<section class="excalc-card"><h3>① 현장 조건</h3><div class="excalc-grid"><label>보양 룸 수<select id="xcRooms"><option value="">보양 없음</option><option value="1-2">1~2룸</option><option value="3-4">3~4룸</option><option value="5-7">5~7룸</option><option value="8-9">8~9룸</option><option value="10+">10룸 이상</option></select></label><label>철거 현장<select id="xcOccupancy"><option>거주</option><option>비거주</option></select></label><label>철거 제품<select id="xcMaterial"><option>AL</option><option>PVC 일반</option><option>PVC 시스템</option></select></label><label>철거 창호 수량(틀)<input id="xcDemoCount" type="number" min="0" value="0" inputmode="numeric"></label></div><label class="checkline" style="margin-top:12px"><input id="xcBF" type="checkbox" checked> BF 철거 방식 적용</label><p class="excalc-muted">철거비는 거주 여부·제품 종류·철거 틀 수에 따라 단가표를 적용합니다. BF 비철거는 단가표에 기재된 거주·PVC 일반 기준만 자동 계산합니다.</p><div class="excalc-result" id="xcProtectionResult"></div><div class="excalc-result" id="xcDemoResult"></div></section>
<section class="excalc-card"><h3>② 장비비</h3><p class="excalc-subtitle">필요한 장비를 여러 개 추가할 수 있습니다. 선택한 장비별로 금액을 합산합니다.</p><div id="xcEquipmentRows"></div><button type="button" class="excalc-add" id="xcAddEquipment">＋ 장비 항목 추가</button><div class="excalc-result" id="xcEquipmentResult"></div></section>
<section class="excalc-card"><h3>③ 몰딩</h3><div class="excalc-grid"><label>몰딩 규격<select id="xcMoldingType"><option value="55000">소폭 (30mm) · 55,000원/틀</option><option value="70000">광폭 (60mm) · 70,000원/틀</option></select></label><label>몰딩 적용 창호 수(틀)<input id="xcMoldingQty" type="number" min="0" value="0" inputmode="numeric"></label></div><p class="excalc-muted">발코니창 제외. 내부창 및 주방창 등 몰딩 적용 대상만 입력하세요.</p><div class="excalc-result" id="xcMoldingResult"></div></section>
<section class="excalc-card"><h3>④ 방범창</h3><div class="excalc-grid"><label>설치 수량(개)<input id="xcSecurityQty" type="number" min="0" value="0" inputmode="numeric"></label><label>단가<input value="180,000원 / 개" readonly></label></div><div class="excalc-result" id="xcSecurityResult"></div></section>
<section class="excalc-card"><h3>⑤ 빨래건조대</h3><div class="excalc-grid"><label>설치 수량(개)<input id="xcDryingQty" type="number" min="0" value="0" inputmode="numeric"></label><label>단가<input value="50,000원 / 개" readonly></label></div><div class="excalc-result" id="xcDryingResult"></div></section>
<section class="excalc-card"><h3>⑥ 실측비</h3><div class="excalc-grid"><label>실측 일정<select id="xcMeasureType"><option value="0">실측비 없음</option><option value="100000">평일(주간) · 100,000원</option><option value="150000">주말·공휴일 · 150,000원</option></select></label><label>적용 금액<input id="xcMeasureAmount" value="0원" readonly></label></div><div class="excalc-result" id="xcMeasureResult">실측비 0원</div></section>
<section class="excalc-card"><h3>⑦ 핸들</h3><p class="excalc-subtitle">필요한 작업 종류별 수량을 입력하세요.</p><div class="excalc-grid"><label>미핸들 시공 (11,000원/개)<input id="xcHandleNew" type="number" min="0" value="0"></label><label>방충망 손잡이 직인 (4,000원/개)<input id="xcHandleScreen" type="number" min="0" value="0"></label><label>핸들 교체 시공 (32,000원/개)<input id="xcHandleReplace" type="number" min="0" value="0"></label><label>기타 핸들 작업 단가 (원)<input id="xcHandleOtherPrice" type="number" min="0" value="0"></label><label>기타 핸들 작업 수량<input id="xcHandleOtherQty" type="number" min="0" value="0"></label></div><div class="excalc-result" id="xcHandleResult"></div></section>
<section class="excalc-card"><h3>⑧ 기타 추가 비용 (직접 입력)</h3><p class="excalc-subtitle">현장별 특이사항이나 별도 조정 금액을 입력하세요. 금액은 음수도 입력할 수 있습니다.</p><div id="xcManualRows"></div><button type="button" class="excalc-add" id="xcAddManual">＋ 항목 추가</button><div class="excalc-result" id="xcManualResult">기타 추가 비용 합계 0원</div></section>
<section class="excalc-card"><h3>항목별 계산 내역</h3><div id="xcBreakdown"></div></section><div class="excalc-total"><span>부가시공비 합계</span><strong id="xcGrandTotal">0원</strong></div><button type="button" id="xcReset" class="excalc-card" style="color:#6d2024">전체 초기화</button></div>`;
function equipmentCard(type='계단 양중비'){
 const id='xqe'+Math.random().toString(36).slice(2,9);equipment.push(id);const row=document.createElement('div');row.className='excalc-card';row.dataset.id=id;row.style.margin='10px 0';row.innerHTML=`<div class="excalc-row"><label>장비 종류<select class="xqType"><option>계단 양중비</option><option>사다리차</option><option>스카이</option><option>카고크레인</option><option>유압크레인</option><option>세대 윈치</option><option>엘리베이터 사용료</option><option>직접 금액 입력</option></select></label><label class="xqAmountWrap">금액<input class="xqAmount" type="number" min="0" value="0"></label><button type="button" class="xqRemove" aria-label="장비 삭제">×</button></div><div class="excalc-grid xqOptions"></div><div class="excalc-muted xqNote"></div><div class="excalc-result xqResult">0원</div>`;
 row.querySelector('.xqType').value=type;row.querySelector('.xqRemove').onclick=()=>{row.remove();calc();};row.querySelector('.xqType').onchange=()=>{renderEquipmentOptions(row);calc();};row.querySelectorAll('input').forEach(x=>x.oninput=calc);$('xcEquipmentRows').append(row);renderEquipmentOptions(row);return row;
}
function renderEquipmentOptions(row){const type=row.querySelector('.xqType').value,box=row.querySelector('.xqOptions'),amount=row.querySelector('.xqAmountWrap'),note=row.querySelector('.xqNote');let html='';amount.classList.toggle('excalc-hidden',type!=='직접 금액 입력');
 const select=(label,cls,opts)=>`<label>${label}<select class="${cls}">${opts.map(x=>`<option>${x}</option>`).join('')}</select></label>`;
 if(type==='계단 양중비')html=select('층수','xqFloor',Object.keys(stair))+select('양중 구간','xqStage',['1층','2층','3층','4층'])+select('창호 수량 구간','xqQty',Object.keys(stair));
 else if(type==='스카이')html=select('장비 톤수','xqTon',Object.keys(sky))+select('사용 시간','xqTime',['1시간','반일(오전·오후)','전일(8시간)']);
 else if(type==='카고크레인')html=select('장비 톤수','xqTon',Object.keys(cargo))+select('사용 시간','xqTime',['기본가격','반일(오전·오후)','전일(8시간)']);
 else if(type==='유압크레인')html=select('장비 톤수','xqTon',Object.keys(hydraulic))+select('사용 시간','xqTime',['기본가격','반일(오전·오후)','전일(8시간)']);
 else if(type==='세대 윈치')html=select('작업 층수','xqFloor',['2~10층','11~15층','16~19층','20~23층'])+`<label>창호 수량<input class="xqWindows" type="number" min="0" value="1"></label><label>윈치 장치 수<input class="xqWinch" type="number" min="1" value="2"></label>`;
 else if(type==='사다리차')html=select('지역 기준','xqRegion',['표준','부산','강원'])+`<label>사용 횟수<input class="xqQty" type="number" min="0" value="1"></label>`;
 else if(type==='엘리베이터 사용료')html=`<label>사용 횟수<input class="xqQty" type="number" min="0" value="1"></label>`;
 box.innerHTML=html;box.querySelectorAll('select,input').forEach(x=>x.onchange=calc);box.querySelectorAll('input').forEach(x=>x.oninput=calc);
 note.textContent=type==='스카이'?'층수별 적용 가능 여부와 운반비는 현장 조건에 따라 별도 확인하세요.':type==='카고크레인'?'운반비 별도입니다.':type==='세대 윈치'?'기본 2개 장치 기준. 추가 창호·장치당 62,000원 적용.':type==='사다리차'?'표준·부산 150,000원, 강원 130,000원 기준.':type==='엘리베이터 사용료'?'1회 사용료 100,000원.':type==='유압크레인'?'표에 금액이 없는 톤수·시간은 협의 금액으로 직접 입력하세요.':'';
}
function equipmentCost(row){const t=row.querySelector('.xqType').value, val=c=>row.querySelector('.'+c)?.value;
 if(t==='직접 금액 입력')return numFrom(row.querySelector('.xqAmount').value);
 if(t==='계단 양중비'){const q=val('xqQty'),f=val('xqFloor');return stair[q]?.[['1층','2층','3층','4층'].indexOf(val('xqStage'))]||0;}
 if(t==='스카이'){const a=sky[val('xqTon')]||[];return a[['1시간','반일(오전·오후)','전일(8시간)'].indexOf(val('xqTime'))]||0;}
 if(t==='카고크레인'||t==='유압크레인'){const a=(t==='카고크레인'?cargo:hydraulic)[val('xqTon')]||[];return a[['기본가격','반일(오전·오후)','전일(8시간)'].indexOf(val('xqTime'))]||0;}
 if(t==='세대 윈치'){const base={'2~10층':309000,'11~15층':412000,'16~19층':515000,'20~23층':825000}[val('xqFloor')]||0;return base+Math.max(0,numFrom(val('xqWindows'))-1)*62000+Math.max(0,numFrom(val('xqWinch'))-2)*62000;}
 if(t==='사다리차')return ({'표준':150000,'부산':150000,'강원':130000}[val('xqRegion')]||0)*numFrom(val('xqQty'));
 if(t==='엘리베이터 사용료')return 100000*numFrom(val('xqQty'));
 return 0;
}
function numFrom(v){return Math.max(0,Number(v)||0)}
function calc(){const prot=protection[$('xcRooms').value]||0;const occ=$('xcOccupancy').value,mat=$('xcMaterial').value,count=num('xcDemoCount');let dem=0,band=count<=3?0:count<=6?1:count<=9?2:count<=15?3:count?4:-1;
 if(band>=0){if($('xcBF').checked)dem=demo[occ][mat][band]||0;else if(occ==='거주'&&mat==='PVC 일반')dem=nonBFResidentPVC[band]||0;}
 const eq=[...$('xcEquipmentRows').children].reduce((s,r)=>s+equipmentCost(r),0),mold=num('xcMoldingQty')*Number($('xcMoldingType').value||55000),measure=Number($('xcMeasureType').value||0),manual=[...$('xcManualRows').children].reduce((sum,r)=>sum+(Number(r.querySelector('.xmAmount').value)||0),0),security=num('xcSecurityQty')*180000,drying=num('xcDryingQty')*50000;
 const handles=num('xcHandleNew')*11000+num('xcHandleScreen')*4000+num('xcHandleReplace')*32000+num('xcHandleOtherPrice')*num('xcHandleOtherQty');
 $('xcProtectionResult').innerHTML=`보양비 <b>${money(prot)}</b>`;$('xcDemoResult').innerHTML=`철거비 <b>${money(dem)}</b>${count&&band>=0?` <span class="excalc-muted">(${occ} · ${mat} · ${count}틀)</span>`:''}`;
 $('xcMoldingResult').textContent=`몰딩 ${money(mold)}`;$('xcMeasureAmount').value=money(measure);$('xcMeasureResult').textContent=`실측비 ${money(measure)}`;$('xcManualResult').textContent=`기타 추가 비용 합계 ${money(manual)}`;$('xcSecurityResult').textContent=`방범창 ${money(security)}`;$('xcDryingResult').textContent=`빨래건조대 ${money(drying)}`;$('xcHandleResult').textContent=`핸들 ${money(handles)}`;
 [...$('xcEquipmentRows').children].forEach(r=>r.querySelector('.xqResult').textContent=money(equipmentCost(r)));
 const rows=[['보양비',prot],['철거비',dem],['장비비',eq],['몰딩',mold],['실측비',measure],['방범창',security],['빨래건조대',drying],['핸들',handles],['기타 추가 비용',manual]],total=rows.reduce((s,x)=>s+x[1],0);
 const manualLines=[...$('xcManualRows').children].map(r=>({name:r.querySelector('.xmName').value.trim()||'기타 추가 비용',amount:Number(r.querySelector('.xmAmount').value)||0})).filter(x=>x.amount!==0);
 if(manualLines.length){const at=rows.findIndex(x=>x[0]==='기타 추가 비용');rows.splice(at,1,...manualLines);}
 $('xcEquipmentResult').textContent=`장비비 합계 ${money(eq)}`;$('xcBreakdown').innerHTML=rows.map(([n,v])=>`<div class="excalc-line"><span>${n}</span><b>${money(v)}</b></div>`).join('');$('xcGrandTotal').textContent=money(total);
}
function addManualRow(name='',amount=''){const row=document.createElement('div');row.className='excalc-row excalc-manual-row';row.innerHTML=`<label>항목명<input class="xmName" type="text" maxlength="60" placeholder="예: 광폭 몰딩 추가금"></label><label>금액(원)<input class="xmAmount" type="number" step="1" placeholder="금액 입력"></label><button type="button" class="xmRemove" aria-label="항목 삭제">×</button>`;row.querySelector('.xmName').value=name;row.querySelector('.xmAmount').value=amount;row.querySelectorAll('input').forEach(x=>x.addEventListener('input',calc));row.querySelector('.xmRemove').onclick=()=>{row.remove();calc();};$('xcManualRows').append(row);calc();}
$('xcAddManual').onclick=()=>addManualRow();
$('xcAddEquipment').onclick=()=>{equipmentCard();calc();};
function resetCalculator(){app.querySelectorAll('input').forEach(x=>{if(x.type==='checkbox')x.checked=true;else x.value=x.id==='xcDemoCount'||x.id==='xcMoldingQty'||x.id==='xcSecurityQty'||x.id==='xcDryingQty'||x.id.startsWith('xcHandle')?'0':'';});$('xcRooms').value='';$('xcOccupancy').value='거주';$('xcMaterial').value='AL';$('xcMoldingType').value='55000';$('xcMeasureType').value='0';$('xcManualRows').innerHTML='';$('xcEquipmentRows').innerHTML='';equipment=[];equipmentCard();calc();}
$('extrasCalcBtn').onclick=()=>{if(!document.querySelector('#staffGate').classList.contains('hidden'))return;resetCalculator();show('extrasCalc');};
$('extrasCalcBack').onclick=()=>{resetCalculator();show('home');if(typeof renderRecentList==='function')renderRecentList();};
$('xcReset').onclick=resetCalculator;
app.querySelectorAll('input,select').forEach(x=>{x.addEventListener('input',calc);x.addEventListener('change',calc);});equipmentCard();calc();
})();
