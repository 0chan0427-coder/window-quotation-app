/* ZIP/XLS analysis and template-based OOXML writer. No uploads or DB writes. */
(function(root){
'use strict';
const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
const norm=v=>String(v??'').normalize('NFKC').replace(/\s+/g,'').toUpperCase();
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null;};
const flatOf=v=>{const m=String(v).match(/(?:^|[^\d])(\d+(?:\.\d+)?)\s*평/);return m?m[1]+'평':null;};
const parse=s=>{const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('엑셀 XML을 읽을 수 없습니다.');return d;};
const nodes=(d,name)=>Array.from(d.getElementsByTagNameNS(NS,name));
const xml=d=>new XMLSerializer().serializeToString(d);
const children=n=>Array.from(n.childNodes).filter(x=>x.nodeType===1);
function el(d,name,attrs={}){const x=d.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))x.setAttribute(k,String(v));return x;}
function textEl(d,name,value){const x=el(d,name);x.appendChild(d.createTextNode(String(value)));return x;}
function decodeName(bytes){const utf=new TextDecoder('utf-8').decode(bytes);return utf.includes('\ufffd')?new TextDecoder('euc-kr').decode(bytes):utf;}
function rows(w,s){return XLSX.utils.sheet_to_json(w.Sheets[s],{header:1,defval:null,raw:true});}
function findHeader(data,required){for(let i=0;i<Math.min(50,data.length);i++){const h=data[i].map(norm);if(required.every(x=>h.includes(norm(x))))return{index:i,headers:h};}return null;}
function records(data,h,file,sheet){return data.slice(h.index+1).map((a,i)=>{const v={_row:h.index+i+2,_file:file,_sheet:sheet};h.headers.forEach((k,j)=>{if(k)v[k]=a[j]});return v;});}
const get=(r,k)=>r[norm(k)];
const idOf=r=>String(get(r,'순번')??'').trim();
const parentId=(r,material=true)=>{const m=idOf(r).match(/^(\d+)-(\d+)$/);return m?m[material?2:1]:null;};
const isGlass=r=>norm(get(r,'카테고리명')??get(r,'카테고리'))==='유리';
const isProduct=r=>/^\d+$/.test(idOf(r))&&!isGlass(r);
function key(r,material){return [get(r,material?'카테고리명':'카테고리'),get(r,material?'모형':'제품명'),get(r,'틀짝망'),get(r,material?'형태명':'창명')].map(norm).join('|');}
function issue(list,flat,r,message){list.push({flat,file:r?._file||'',sheet:r?._sheet||'',row:r?._row||'',message});}
function uniqueIds(list,issues,flat){const seen=new Set();for(const r of list){const id=idOf(r);if(seen.has(id))issue(issues,flat,r,'원본 순번 중복: '+id);seen.add(id);}}
async function analyze(buffer,options={}){
 const files=[];
 const inputs=Array.isArray(buffer)?buffer:[{name:'자료.zip',bytes:buffer}];
 for(const input of inputs){
  if(/\.zip$/i.test(input.name)){const zip=await JSZip.loadAsync(input.bytes,{decodeFileName:decodeName});files.push(...Object.values(zip.files).filter(x=>!x.dir&&!/(^|\/)__MACOSX\/|(^|\/)~\$/.test(x.name)&&/\.xlsx?$/i.test(x.name)));}
  else if(/\.xlsx?$/i.test(input.name)){const bytes=new Uint8Array(input.bytes);files.push({name:input.name,_data:{uncompressedSize:bytes.length},async:async()=>bytes});}
  else throw Error('자재비·시공비 .xls/.xlsx 또는 ZIP 파일을 선택해주세요.');
 }
 if(!files.length)throw Error('자재비·시공비 엑셀 파일이 없습니다.');
 if(files.length>100)throw Error('엑셀 파일은 한 번에 최대 100개까지 처리합니다.');
 let bytes=0;const templates=[],source=new Map(),issues=[];
 for(const file of files){
  const size=file._data?.uncompressedSize||0;bytes+=size;if(size>30*1024*1024||bytes>60*1024*1024)throw Error('압축 해제한 엑셀의 전체 크기는 60MB, 파일당 크기는 30MB 이하로 준비해주세요.');
  const b=await file.async('uint8array');if(b.length>30*1024*1024)throw Error('엑셀 파일이 30MB를 초과합니다.');const w=XLSX.read(b,{type:'array',cellFormula:true});let template=false;
  for(const s of w.SheetNames){const data=rows(w,s);if(findHeader(data,['설치위치','완성창','수량','원가(DC전)']))template=true;}
  if(template){if(!/\.xlsx$/i.test(file.name))throw Error('실행가 양식은 .xlsx로 저장해주세요.');templates.push({name:file.name,bytes:b,workbook:w});continue;}
  let recognized=false;
  for(const s of w.SheetNames){
   const data=rows(w,s);const mh=findHeader(data,['순번','카테고리명','모형','사이즈','수량','판매단가']);const ih=findHeader(data,['순번','카테고리','제품명','시공단가','판매금액']);
   if(!mh&&!ih)continue;recognized=true;
   const f=flatOf(s)||flatOf(file.name);if(!f){issue(issues,'',null,file.name+' / '+s+': 평형을 파일명 또는 시트명에서 찾을 수 없습니다.');continue;}
   const group=source.get(f)||{flat:f,material:[],installation:[],materialFiles:[],installationFiles:[]};source.set(f,group);
   const kind=mh?'material':'installation';group[kind].push(...records(data,mh||ih,file.name,s).filter(r=>isProduct(r)||isGlass(r)));group[kind+'Files'].push(file.name+' / '+s);
  }
  if(!recognized)issue(issues,'',null,file.name+': 자재비·시공비 표의 필수 열을 찾을 수 없습니다.');
 }
 if(!templates.length&&options.defaultTemplate){const b=new Uint8Array(options.defaultTemplate);templates.push({name:'앱 기본 빈 양식',bytes:b,workbook:XLSX.read(b,{type:'array',cellFormula:true})});}
 if(templates.length!==1)throw Error('실행가 양식은 한 개만 사용할 수 있습니다. 감지된 양식: '+templates.length+'개'+(templates.length?' ('+templates.map(x=>x.name).join(', ')+')':''));
 if(!source.size)throw Error('평형별 자재비·시공비 자료를 찾지 못했습니다.');
 const groups=[];
 for(const g of [...source.values()].sort((a,b)=>parseFloat(a.flat)-parseFloat(b.flat))){
  if(g.materialFiles.length!==1||g.installationFiles.length!==1)issue(issues,g.flat,null,'평형마다 자재비 표와 시공비 표가 각각 하나 필요합니다. 발견: '+g.materialFiles.length+' / '+g.installationFiles.length);
  uniqueIds(g.material,issues,g.flat);uniqueIds(g.installation,issues,g.flat);
  const windows=g.material.filter(isProduct).sort((a,b)=>Number(idOf(a))-Number(idOf(b))),inst=g.installation.filter(isProduct).sort((a,b)=>Number(idOf(a))-Number(idOf(b))),usedGlass=new Set(),usedIGlass=new Set();
  if(!windows.length)issue(issues,g.flat,null,'자재비에서 창 제품을 찾지 못했습니다.');if(windows.length>500)issue(issues,g.flat,null,'평형당 창 제품은 최대 500개까지 처리합니다.');
  const iitems=inst.map(r=>{
   const glass=g.installation.filter(x=>isGlass(x)&&parentId(x,false)===idOf(r));let total=num(get(r,'판매금액'));
   if(total===null||total<0)issue(issues,g.flat,r,'시공 판매금액이 없거나 잘못되었습니다.');
   for(const x of glass){usedIGlass.add(x);if(norm(get(x,'틀짝망'))!==norm(get(r,'틀짝망'))||norm(get(x,'창명'))!==norm(get(r,'창명')))issue(issues,g.flat,x,'유리 시공비의 형태가 연결된 창과 다릅니다.');const n=num(get(x,'판매금액'));if(n===null||n<0)issue(issues,g.flat,x,'유리 시공금액이 없거나 잘못되었습니다.');total=total===null||n===null?null:total+n;}
   if(glass.length>1)issue(issues,g.flat,r,'유리 시공비가 여러 개 연결돼 검토가 필요합니다.');
   return{id:g.flat+':'+r._sheet+':'+r._row,sourceId:idOf(r),row:r._row,key:key(r,false),model:get(r,'제품명'),shape:get(r,'창명'),total,glassModels:glass.map(x=>norm(get(x,'제품명'))),raw:r};
  });
  for(const x of g.installation.filter(isGlass))if(!usedIGlass.has(x))issue(issues,g.flat,x,'창과 연결되지 않은 유리 시공비입니다.');
  const products=windows.map(r=>{
   const qty=num(get(r,'수량')),unit=num(get(r,'판매단가'));
   if(qty===null||qty<=0)issue(issues,g.flat,r,'제품 수량이 없거나 0 이하입니다.');
   if(unit===null||unit<0)issue(issues,g.flat,r,'자재 판매단가가 없거나 잘못되었습니다.');
   if(!get(r,'사이즈')||!get(r,'모형')||!get(r,'형태명'))issue(issues,g.flat,r,'규격·모형·형태명 중 누락된 정보가 있습니다.');
   const category=norm(get(r,'카테고리명'));let section=category.includes('외창')?'outer':category.includes('내창')?'inner':null;
   if(!section)issue(issues,g.flat,r,'내창·외창을 구분할 수 없는 카테고리: '+get(r,'카테고리명'));
   const glasses=g.material.filter(x=>isGlass(x)&&parentId(x)===idOf(r));
   if(!glasses.length&&norm(get(r,'유리제외여부'))!=='Y')issue(issues,g.flat,r,'유리 자료가 연결되지 않았습니다. 유리 제외 여부도 확인할 수 없습니다.');
   let glassUnit=0;for(const x of glasses){usedGlass.add(x);if(['사이즈','형태명','틀짝망','창위치'].some(k=>norm(get(x,k))!==norm(get(r,k))))issue(issues,g.flat,x,'유리와 창의 규격·형태·위치가 다릅니다.');if(num(get(x,'수량'))!==qty)issue(issues,g.flat,x,'유리 수량과 창 수량이 다릅니다.');const v=num(get(x,'판매단가'));if(v===null||v<0)issue(issues,g.flat,x,'유리 판매단가가 없거나 잘못되었습니다.');glassUnit+=v??0;}
   if(glasses.length>1)issue(issues,g.flat,r,'유리 자재가 여러 개 연결돼 검토가 필요합니다.');
   for(const x of [r,...glasses]){const q=num(get(x,'수량')),u=num(get(x,'판매단가')),t=num(get(x,'판매총금액'));if(q!==null&&u!==null&&(t===null||Math.abs(q*u-t)>1))issue(issues,g.flat,x,'판매단가 × 수량과 판매총금액이 일치하지 않습니다.');}
   const gm=glasses.map(x=>norm(get(x,'모형')));
   const candidates=iitems.filter(x=>x.key===key(r,true)&&x.glassModels.length===gm.length&&x.glassModels.every((v,i)=>v===gm[i]));
   if(!candidates.length)issue(issues,g.flat,r,'제품·형태·틀짝망·유리스펙이 일치하는 시공비가 없습니다.');
   return{id:g.flat+':'+r._row,sourceId:idOf(r),sourceRow:r._row,location:get(r,'창위치'),brand:get(r,'브랜드'),model:get(r,'모형'),frame:get(r,'틀짝망'),size:get(r,'사이즈'),shape:get(r,'형태명'),glass:glasses.map(x=>get(x,'모형')).join(' / '),qty,unit,glassUnit,section,candidates:candidates.map(x=>({id:x.id,sourceId:x.sourceId,row:x.row,total:x.total,model:x.model,shape:x.shape})),selected:null};
  });
  // A FIX has a PL내창 product category even when it sits in the balcony run.
  // Follow the surrounding regular windows, as the supplied execution workbook does.
  const regular=p=>norm(p.brand)!=='FIX';
  products.forEach((p,i)=>{if(regular(p))return;const neighbor=products.slice(0,i).reverse().find(regular)||products.slice(i+1).find(regular);if(neighbor)p.section=neighbor.section;});
  // Headquarters exports use fixed window order; glass rows are linked separately.
  products.forEach((p,i)=>{const target=iitems[i];if(target&&p.candidates.some(c=>c.id===target.id))p.selected=target.id;else issue(issues,g.flat,windows[i],'창 제품 순번 '+p.sourceId+'와 시공 순번 '+(target?.sourceId||'없음')+'의 제품·형태·유리 정보가 다릅니다. 같은 본사 견적의 파일인지 확인해주세요.');});
  for(const x of iitems)if(!products.some(p=>p.candidates.some(c=>c.id===x.id)))issue(issues,g.flat,x.raw,'대응하는 자재 제품이 없는 시공비입니다.');
  if(inst.length!==windows.length)issue(issues,g.flat,null,'자재 창 수와 시공 창 수가 다릅니다: '+windows.length+' / '+inst.length);
  const tw=templates[0].workbook;const base=tw.SheetNames.find(s=>s===g.flat&&findHeader(rows(tw,s),['설치위치','원가(DC전)']))||tw.SheetNames.find(s=>findHeader(rows(tw,s),['설치위치','원가(DC전)']));
  const sh=tw.Sheets[base];if(norm(sh.A12?.v)!=='설치위치'||norm(sh.H12?.v)!=='수량'||norm(sh.Q12?.v)!=='요율'||norm(sh.P12?.v)!=='원가(DC전)')throw Error('실행가 양식의 열 배치가 지원 형식과 다릅니다. 설치위치 A12, 수량 H12, 요율 Q12인 원본 양식을 넣어주세요.');const val=a=>num(sh[a]?.v);const defaults={innerDiscount:val('H3'),outerDiscount:val('I3'),innerIncrease:val('H4'),outerIncrease:val('I4'),costs:[3,4,5,7,8,9].map(r=>({outer:val('O'+r),total:val('P'+r)}))};
  groups.push({...g,material:undefined,installation:undefined,products,defaults,templateSheet:base,exactTemplate:base===g.flat});
 }
 return{template:templates[0],groups,issues};
}
function validate(analysis,settings){
 const errors=analysis.issues.map(x=>(x.flat?x.flat+' ':'')+(x.file?x.file+' '+x.row+'행: ':'')+x.message);
 for(const g of analysis.groups){const s=settings[g.flat];if(!s){errors.push(g.flat+': 설정 누락');continue;}if(!s.confirmed)errors.push(g.flat+': 할인율·부가시공비 확인이 필요합니다.');
  for(const k of ['innerDiscount','outerDiscount'])if(num(s[k])===null||num(s[k])<0||num(s[k])>1)errors.push(g.flat+': 할인율은 0~100%입니다.');
  for(const k of ['innerIncrease','outerIncrease'])if(num(s[k])===null||num(s[k])<0)errors.push(g.flat+': 인상률을 확인해주세요.');
  if(!Array.isArray(s.costs)||s.costs.length!==6)errors.push(g.flat+': 부가시공비 설정 누락');else for(const c of s.costs)if((c.outer!==null&&c.outer!==''&&num(c.outer)===null)||(c.total!==null&&c.total!==''&&num(c.total)===null)||(num(c.outer)??0)<0||(num(c.total)??0)<(num(c.outer)??0))errors.push(g.flat+': 전체 부가시공비는 외창 비용 이상이어야 합니다.');
  const used=new Set();for(const p of g.products){const choice=s.items?.[p.id];const candidate=p.candidates.find(x=>x.id===choice?.installation);if(!candidate)errors.push(g.flat+' '+p.size+': 시공비 자동 연결을 확인할 수 없습니다.');else if(used.has(candidate.id))errors.push(g.flat+': 같은 시공비를 두 창에 중복 연결했습니다 ('+candidate.sourceId+')');else used.add(candidate.id);if(candidate&&p.selected&&candidate.id!==p.selected)errors.push(g.flat+': 시공비가 자동 연결된 원본 순번과 다릅니다.');if(choice?.rate!==null&&choice?.rate!==undefined&&String(choice.rate).trim()!==''&&(num(choice.rate)===null||num(choice.rate)<=0))errors.push(g.flat+' '+p.size+': 요율은 0보다 커야 합니다.');}
 }
 return errors;
}
function col(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
function cell(row,address,value,formula){const d=row.ownerDocument;let c=children(row).find(x=>x.localName==='c'&&x.getAttribute('r')===address);if(!c){c=el(d,'c',{r:address});row.appendChild(c);}while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute('t');if(formula)c.appendChild(textEl(d,'f',formula.replace(/^=/,'')));else if(typeof value==='number')c.appendChild(textEl(d,'v',value));else if(value!==null&&value!==undefined&&value!==''){c.setAttribute('t','inlineStr');const is=el(d,'is');const t=textEl(d,'t',value);t.setAttribute('xml:space','preserve');is.appendChild(t);c.appendChild(is);}return c;}
function copyRow(d,original,index){const row=original?d.importNode(original,true):el(d,'row');row.setAttribute('r',index);for(const c of children(row)){if(c.localName!=='c')continue;const addr=c.getAttribute('r');c.setAttribute('r',addr.replace(/\d+$/,index));while(c.firstChild)c.removeChild(c.firstChild);c.removeAttribute('t');}return row;}
function cleanSheet(d,last,width){for(const name of ['sheetProtection','drawing','legacyDrawing','rowBreaks','colBreaks','conditionalFormatting','dataValidations','hyperlinks','tableParts','autoFilter'])for(const x of nodes(d,name))x.parentNode.removeChild(x);const dimension=nodes(d,'dimension')[0];if(dimension)dimension.setAttribute('ref','A1:'+width+last);for(const sel of nodes(d,'selection'))sel.parentNode.removeChild(sel);for(const view of nodes(d,'sheetView')){view.setAttribute('view','normal');view.setAttribute('showGridLines','0');view.appendChild(el(d,'selection',{activeCell:'A1',sqref:'A1'}));}for(const view of nodes(d,'sheetView'))view.setAttribute('tabSelected','0');for(const pane of nodes(d,'pane'))pane.parentNode.removeChild(pane);const setup=nodes(d,'pageSetup')[0];if(setup){setup.setAttribute('fitToWidth','1');setup.setAttribute('fitToHeight','0');setup.setAttribute('orientation',width==='AB'?'landscape':'portrait');setup.setAttribute('paperSize','9');setup.removeAttribute('scale');setup.removeAttribute('r:id');}const pr=nodes(d,'sheetPr')[0];if(pr){let ps=nodes(pr,'pageSetUpPr')[0];if(!ps){ps=el(d,'pageSetUpPr');pr.appendChild(ps);}ps.setAttribute('fitToPage','1');}}
function merges(d,refs){for(const x of nodes(d,'mergeCells'))x.parentNode.removeChild(x);if(!refs.length)return;const m=el(d,'mergeCells',{count:refs.length});refs.forEach(ref=>m.appendChild(el(d,'mergeCell',{ref})));const data=nodes(d,'sheetData')[0];data.parentNode.insertBefore(m,data.nextSibling);}
function addForm(row,index,values,formulas){for(const[k,v]of Object.entries(values))cell(row,k+index,v);for(const[k,v]of Object.entries(formulas))cell(row,k+index,null,v);}
function buildMain(base,g,s){
 const d=parse(base),data=nodes(d,'sheetData')[0],originals=nodes(data,'row'),byIndex=new Map(originals.map(r=>[+r.getAttribute('r'),r]));
 const outer=g.products.filter(p=>p.section==='outer'),inner=g.products.filter(p=>p.section==='inner'),os=13+outer.length,is=os+1+inner.length,total=is+1,last=total+1;
 const top=originals.filter(r=>+r.getAttribute('r')<=12).map(r=>r.cloneNode(true));while(data.firstChild)data.removeChild(data.firstChild);top.forEach(r=>data.appendChild(r));
 function set(a,v){const index=+a.match(/\d+$/)[0];let r=nodes(data,'row').find(x=>+x.getAttribute('r')===index);if(!r){r=el(d,'row',{r:index});data.appendChild(r);}cell(r,a,v);}
 set('H3',s.innerDiscount);set('I3',s.outerDiscount);set('H4',s.innerIncrease);set('I4',s.outerIncrease);[3,4,5,7,8,9].forEach((r,i)=>{set('O'+r,num(s.costs[i].outer));set('P'+r,num(s.costs[i].total));});
 for(const r of nodes(data,'row'))for(const c of ['O','P']){const n=+r.getAttribute('r');if(n===6||n===10)cell(r,c+n,null,`SUM(${c}${n===6?3:7}:${c}${n-1})`);}
 // Remove unused example formulas and external links above the product table.
 for(const r of nodes(data,'row'))if(+r.getAttribute('r')<12)for(const c of children(r)){const a=c.getAttribute('r');const f=nodes(c,'f')[0];if((f&&/\[|I8|I9|I10|J10/.test(f.textContent))||/^[JKLM](7|8|9|10)$/.test(a))cell(r,a,null);}
 const header=nodes(data,'row').find(r=>r.getAttribute('r')==='12');header.setAttribute('ht','40');header.setAttribute('customHeight','1');for(const[k,v]of Object.entries({I:'완성창 단가',J:'유리 단가',K:'완성창 단가(DC후)',L:'유리 단가',M:'시공비 단가',Q:'요율',Z:'창 행 판매금액',AA:'수정된최종금액'}))cell(header,k+'12',v);
 const mainRows=[];
 function product(p,r,sub,start,end){const row=copyRow(d,byIndex.get(13),r),choice=s.items[p.id],install=p.candidates.find(c=>c.id===choice.installation).total/p.qty,dc=p.section==='outer'?'I':'H';
  const weight=`$M$${sub}`;const alloc=(c)=>end>=start?`IF(${weight}>0,$${c}$${sub}*M${r}*H${r}/${weight},$${c}$${sub}*H${r}/SUM($H$${start}:$H$${end}))`:'0';
  addForm(row,r,{A:p.location,B:p.brand,C:p.model,D:p.frame,E:p.size,F:p.shape,G:p.glass,H:p.qty,I:p.unit,J:p.glassUnit,M:install,Q:num(choice.rate),AB:'자재 '+p.sourceId+' / 시공 '+p.candidates.find(c=>c.id===choice.installation).sourceId},{K:`I${r}*(1+$${dc}$4-$${dc}$3)`,L:`J${r}`,N:alloc('N'),O:alloc('O'),P:`(I${r}+J${r}+M${r})*H${r}+N${r}+O${r}`,R:`(I${r}+J${r})*H${r}*Q${r}+M${r}*H${r}+N${r}+O${r}`,S:`R${r}*1.1`,T:`Z${r}/1.1-P${r}`,U:`(K${r}+L${r})*H${r}+(M${r}*H${r}+N${r}+O${r})*1.1`,V:`(K${r}+L${r})*H${r}*Q${r}+(M${r}*H${r}+N${r}+O${r})*1.1`,W:`V${r}`,X:`AA${r}-U${r}`,Y:`IFERROR(X${r}/AA${r},0)`,Z:`CEILING(W${r},10000)`,AA:`Z${r}`});
  for(const c of ['R','S','T','V','W','X','Y','Z','AA']){const f=nodes(children(row).find(x=>x.getAttribute('r')===c+r),'f')[0].textContent;cell(row,c+r,null,`IF(Q${r}="","",${f})`);}
  data.appendChild(row);mainRows.push({p,row:r});}
 outer.forEach((p,i)=>product(p,13+i,os,13,os-1));
 function subtotal(r,title,start,end,outerGroup){const row=copyRow(d,byIndex.get(21),r);cell(row,'A'+r,title);for(let n=8;n<=27;n++){const c=col(n);if(c==='Q')continue;let f;if(c==='Y')f=`IFERROR(X${r}/AA${r},0)`;else if(c==='N')f=outerGroup?'O6':'P6-O6';else if(c==='O')f=outerGroup?'O10':'P10-O10';else if(['I','J','K','L','M'].includes(c))f=end>=start?`SUMPRODUCT(${c}${start}:${c}${end},H${start}:H${end})`:'0';else f=end>=start?`SUM(${c}${start}:${c}${end})`:'0';if(['R','S','T','V','W','X','Y','Z','AA'].includes(c)&&end>=start)f=`IF(COUNT(Q${start}:Q${end})<${end-start+1},"",${f})`;cell(row,c+r,null,f);}data.appendChild(row);}
 subtotal(os,'외창 소계',13,os-1,true);inner.forEach((p,i)=>product(p,os+1+i,is,os+1,is-1));subtotal(is,'내창 소계',os+1,is-1,false);
 const tr=copyRow(d,byIndex.get(29),total);cell(tr,'A'+total,'합계');for(let n=8;n<=27;n++){const c=col(n);if(c==='Q')continue;let f=c==='Y'?`IFERROR(X${total}/AA${total},0)`:`${c}${os}+${c}${is}`;if(['R','S','T','V','W','X','Y','Z','AA'].includes(c))f=`IF(COUNT(AA${os},AA${is})<2,"",${f})`;cell(tr,c+total,null,f);}data.appendChild(tr);
 const footer=copyRow(d,byIndex.get(30),last);addForm(footer,last,{H:'소계'},{I:`I${total}+J${total}`,K:`K${total}+L${total}`});data.appendChild(footer);
 const refs=nodes(d,'mergeCell').map(x=>x.getAttribute('ref')).filter(ref=>Math.max(...ref.match(/\d+/g).map(Number))<=12);refs.push(`A${os}:G${os}`,`A${is}:G${is}`,`A${total}:G${total}`,`I${last}:J${last}`,`K${last}:L${last}`);merges(d,refs);cleanSheet(d,last,'AB');
 // Empty sections cannot silently discard their allocated construction costs.
 if(!outer.length&&s.costs.some(c=>+c.outer>0))throw Error(g.flat+': 외창이 없는데 외창 부가시공비가 있습니다.');
 if(!inner.length&&s.costs.some(c=>+c.total>+c.outer))throw Error(g.flat+': 내창이 없는데 내창 부가시공비가 있습니다.');
 return{xml:xml(d),mainRows,last,total,subtotals:[os,is],outerCount:outer.length};
}
function buildIndividual(base,g,main){const d=parse(base),data=nodes(d,'sheetData')[0],originals=nodes(data,'row'),byIndex=new Map(originals.map(r=>[+r.getAttribute('r'),r]));const top=originals.filter(r=>+r.getAttribute('r')<=19).map(r=>r.cloneNode(true));while(data.firstChild)data.removeChild(data.firstChild);top.forEach(r=>data.appendChild(r));for(const r of nodes(data,'row'))for(const c of children(r))if(c.localName==='c'){const a=c.getAttribute('r');if(!a)continue;const cn=a.match(/^[A-Z]+/)[0];if(cn.length>1||cn>'H')r.removeChild(c);}let title=nodes(data,'row').find(r=>r.getAttribute('r')==='2');if(title)cell(title,'A2',g.flat+' 개별단가');
 const q="'"+g.flat.replace(/'/g,"''")+"'!";main.mainRows.forEach(({p,row:src},i)=>{const r=20+i,row=copyRow(d,byIndex.get(20),r);row.setAttribute('ht','48');row.setAttribute('customHeight','1');addForm(row,r,{A:i+1,F:null,H:p.section==='outer'?'외창':'내창'},{B:q+'A'+src,C:q+'B'+src,D:q+'G'+src,E:`IF(${q}AA${src}="","",${q}AA${src})`,F:`IF(E${r}="","",ROUND(E${r}*0.85,-5))`});data.appendChild(row);});
 const outerRow=20+main.mainRows.length,totalRow=outerRow+1;for(const[r,title,count]of [[outerRow,'창호 외부 교체 비용',main.outerCount],[totalRow,'창호 전체 교체 비용',main.mainRows.length]]){const row=copyRow(d,byIndex.get(26),r);cell(row,'A'+r,title);cell(row,'E'+r,null,count?`IF(COUNT(E20:E${19+count})<${count},"",SUM(E20:E${19+count}))`:'0');cell(row,'F'+r,null,`IF(E${r}="","",ROUND(E${r}*0.85,-5))`);data.appendChild(row);}
 const refs=nodes(d,'mergeCell').map(x=>x.getAttribute('ref')).filter(ref=>Math.max(...ref.match(/\d+/g).map(Number))<20);refs.push(`A${outerRow}:D${outerRow}`,`A${totalRow}:D${totalRow}`);merges(d,refs);cleanSheet(d,totalRow,'H');return{xml:xml(d),last:totalRow,subtotals:[outerRow],total:totalRow};}
async function generate(a,settings){const errors=validate(a,settings);if(errors.length)throw Error(errors.slice(0,30).join('\n'));
 if(!root.ExecutionFormulaCache)throw Error('실행가 계산 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
 const original=await JSZip.loadAsync(a.template.bytes);const out=new JSZip();
 for(const name of ['xl/theme/theme1.xml','docProps/core.xml'])if(original.file(name))out.file(name,await original.file(name).async('uint8array'));
 const styles=parse(await original.file('xl/styles.xml').async('string')),xfs=nodes(styles,'cellXfs')[0],wrapped=new Map();
 const borders=nodes(styles,'borders')[0],borderId=children(borders).length,border=el(styles,'border');
 for(const side of ['left','right','top','bottom']){const edge=el(styles,side,{style:'thin'});edge.appendChild(el(styles,'color',{rgb:'FF595959'}));border.appendChild(edge);}border.appendChild(el(styles,'diagonal'));borders.appendChild(border);borders.setAttribute('count',children(borders).length);
 const fills=nodes(styles,'fills')[0],fillIds={};for(const [kind,color]of Object.entries({subtotal:'FFE2EFDA',total:'FFD9E2F3'})){const id=children(fills).length,fill=el(styles,'fill'),pattern=el(styles,'patternFill',{patternType:'solid'});pattern.appendChild(el(styles,'fgColor',{rgb:color}));pattern.appendChild(el(styles,'bgColor',{indexed:'64'}));fill.appendChild(pattern);fills.appendChild(fill);fillIds[kind]=id;}fills.setAttribute('count',children(fills).length);
 const formatted=new Map(),boldFonts=new Map(),fonts=nodes(styles,'fonts')[0];
 function tableStyle(id,kind){const key=id+':'+kind;if(formatted.has(key))return formatted.get(key);const xf=(children(xfs)[Number(id)]||children(xfs)[0]).cloneNode(true);xf.setAttribute('borderId',borderId);xf.setAttribute('applyBorder','1');if(kind==='subtotal'||kind==='total'){xf.setAttribute('fillId',fillIds[kind]);xf.setAttribute('applyFill','1');const fontId=xf.getAttribute('fontId')||'0';if(!boldFonts.has(fontId)){const font=(children(fonts)[+fontId]||children(fonts)[0]).cloneNode(true);if(!nodes(font,'b').length)font.insertBefore(el(styles,'b'),font.firstChild);boldFonts.set(fontId,children(fonts).length);fonts.appendChild(font);fonts.setAttribute('count',children(fonts).length);}xf.setAttribute('fontId',boldFonts.get(fontId));xf.setAttribute('applyFont','1');}const next=children(xfs).length;xfs.appendChild(xf);xfs.setAttribute('count',children(xfs).length);formatted.set(key,next);return next;}
 function formatTable(source,result,width){const doc=parse(source),main=width==='AB';for(const c of nodes(doc,'col')){const max=main?28:8;if(+c.getAttribute('min')>max)c.parentNode.removeChild(c);else if(+c.getAttribute('max')>max)c.setAttribute('max',max);}for(const row of nodes(doc,'row')){for(const c of children(row)){if(c.localName!=='c')continue;const cn=c.getAttribute('r').match(/^[A-Z]+/)[0];if(!main&&(cn.length>1||cn>'H'))row.removeChild(c);if(main&&cn.length===2&&cn>'AB')row.removeChild(c);}const r=+row.getAttribute('r'),footer=main&&r===result.last;if(footer){for(const c of children(row))if(c.localName==='c'&&!/^(H|I|J|K|L)\d+$/.test(c.getAttribute('r')))row.removeChild(c);}const first=main?12:19,last=main?result.total:result.last;if(r<first||r>last){if(!footer)continue;}const count=main?(footer?12:28):6,start=footer?8:1,kind=r===result.total?'total':result.subtotals.includes(r)?'subtotal':'body';for(let n=start;n<=count;n++){const c=cellStyle(row,col(n)+r);c.setAttribute('s',tableStyle(c.getAttribute('s')||'0',kind));}if(kind!=='body'){row.setAttribute('ht','24');row.setAttribute('customHeight','1');}}for(const m of nodes(doc,'mergeCell')){const letters=m.getAttribute('ref').match(/[A-Z]+/g);if(letters.some(c=>main?(c.length===2&&c>'AB'):(c.length>1||c>'H')))m.parentNode.removeChild(m);}for(const m of nodes(doc,'mergeCells'))m.setAttribute('count',children(m).length);for(const row of nodes(doc,'row')){const index=c=>c.getAttribute('r').match(/^[A-Z]+/)[0].split('').reduce((n,a)=>n*26+a.charCodeAt(0)-64,0);const cells=children(row).filter(c=>c.localName==='c').sort((a,b)=>index(a)-index(b));cells.forEach(c=>row.appendChild(c));}return doc;}
 function cellStyle(row,address){let c=children(row).find(c=>c.localName==='c'&&c.getAttribute('r')===address);if(!c){c=el(row.ownerDocument,'c',{r:address});row.appendChild(c);}return c;}
 const generatedSheets=[];

 const wrapStyle=id=>{if(wrapped.has(id))return wrapped.get(id);const source=children(xfs)[Number(id)]||children(xfs)[0],xf=source.cloneNode(true);let align=nodes(xf,'alignment')[0];if(!align){align=el(styles,'alignment');const before=children(xf).find(x=>x.localName==='protection'||x.localName==='extLst');xf.insertBefore(align,before||null);}align.setAttribute('wrapText','1');align.setAttribute('vertical','center');xf.setAttribute('applyAlignment','1');const next=children(xfs).length;xfs.appendChild(xf);xfs.setAttribute('count',next+1);wrapped.set(id,next);return next;};
 const wrapCells=(source,test)=>{const doc=parse(source);for(const c of nodes(doc,'c'))if(test(c.getAttribute('r')))c.setAttribute('s',wrapStyle(c.getAttribute('s')||'0'));return xml(doc);};
 const shared=original.file('xl/sharedStrings.xml');const sharedValues=shared?nodes(parse(await shared.async('string')),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];if(shared)out.file('xl/sharedStrings.xml',await shared.async('uint8array'));
 const wd=parse(await original.file('xl/workbook.xml').async('string')),rd=parse(await original.file('xl/_rels/workbook.xml.rels').async('string'));
 const paths={};for(const sh of nodes(wd,'sheet')){const id=sh.getAttributeNS(REL,'id')||sh.getAttribute('r:id');const r=Array.from(rd.getElementsByTagNameNS(PKG,'Relationship')).find(x=>x.getAttribute('Id')===id);const target=r?.getAttribute('Target');if(target)paths[sh.getAttribute('name')]=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');}
 const wb=parse(`<workbook xmlns="${NS}" xmlns:r="${REL}"><workbookPr/><bookViews><workbookView activeTab="0"/></bookViews><sheets/><definedNames/><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`);
 const rels=parse(`<Relationships xmlns="${PKG}"/>`),types=parse('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>');
 const override=(name,type)=>{const x=types.createElementNS(types.documentElement.namespaceURI,'Override');x.setAttribute('PartName','/'+name);x.setAttribute('ContentType',type);types.documentElement.appendChild(x);};
 const layout=root.ExecutionIndividualLayout;
 if(!layout)throw Error('개별단가 양식 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
 for(const item of layout.media)out.file('xl/media/'+item.name,item.base64,{base64:true});
 const png=types.createElementNS(types.documentElement.namespaceURI,'Default');png.setAttribute('Extension','png');png.setAttribute('ContentType','image/png');types.documentElement.appendChild(png);
 function applyIndividualLayout(doc,id,result){
  const oldCols=nodes(doc,'cols')[0],cols=el(doc,'cols');for(const attrs of layout.columns)cols.appendChild(el(doc,'col',attrs));if(oldCols)oldCols.parentNode.replaceChild(cols,oldCols);else nodes(doc,'sheetData')[0].parentNode.insertBefore(cols,nodes(doc,'sheetData')[0]);
  const margins=nodes(doc,'pageMargins')[0];if(margins)for(const[k,v]of Object.entries(layout.margins))margins.setAttribute(k,v);
  const setup=nodes(doc,'pageSetup')[0];if(setup){setup.setAttribute('orientation','portrait');setup.setAttribute('paperSize','9');setup.setAttribute('fitToWidth','1');setup.setAttribute('fitToHeight',result.last<=48?'1':'0');}
  const data=nodes(doc,'sheetData')[0];for(const attrs of layout.topRows){const row=nodes(data,'row').find(r=>r.getAttribute('r')===attrs.r);if(row)for(const k of ['ht','customHeight'])if(attrs[k]!==undefined)row.setAttribute(k,attrs[k]);}
  const drawingPath='xl/drawings/execution'+id+'.xml';out.file(drawingPath,layout.drawing);out.file('xl/drawings/_rels/execution'+id+'.xml.rels',layout.relationships);override(drawingPath,'application/vnd.openxmlformats-officedocument.drawing+xml');
  const relation=parse(`<Relationships xmlns="${PKG}"><Relationship Id="rIdExecutionDrawing" Type="${REL}/drawing" Target="../drawings/execution${id}.xml"/></Relationships>`);out.file('xl/worksheets/_rels/sheet'+id+'.xml.rels',xml(relation));
  const drawing=el(doc,'drawing');drawing.setAttributeNS(REL,'r:id','rIdExecutionDrawing');const before=children(doc.documentElement).find(x=>['legacyDrawing','legacyDrawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst'].includes(x.localName));doc.documentElement.insertBefore(drawing,before||null);
 }
 let ri=1,si=1;const addRel=(type,target)=>{const id='rId'+ri++;const x=rels.createElementNS(PKG,'Relationship');x.setAttribute('Id',id);x.setAttribute('Type',REL+'/'+type);x.setAttribute('Target',target);rels.documentElement.appendChild(x);return id;};
 addRel('styles','styles.xml');override('xl/styles.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml');if(original.file('xl/theme/theme1.xml')){addRel('theme','theme/theme1.xml');override('xl/theme/theme1.xml','application/vnd.openxmlformats-officedocument.theme+xml');}if(shared){addRel('sharedStrings','sharedStrings.xml');override('xl/sharedStrings.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml');}
 for(const g of a.groups){const main=buildMain(await original.file(paths[g.templateSheet]).async('string'),g,settings[g.flat]);const individualName=Object.keys(paths).find(n=>n===g.templateSheet+'_개별단가')||Object.keys(paths).find(n=>n.includes('개별단가'));if(!individualName)throw Error('양식에서 개별단가 시트를 찾을 수 없습니다.');const individual=buildIndividual(await original.file(paths[individualName]).async('string'),g,main);
  for(const [name,result,width]of [[g.flat,main,'AB'],[g.flat+'_개별단가',individual,'H']]){const path='worksheets/sheet'+si+'.xml';const doc=formatTable(wrapCells(result.xml,addr=>width==='AB'?/^[A-Z]+12$/.test(addr):/^[BCD]\d+$/.test(addr)),result,width);if(width==='H')applyIndividualLayout(doc,si,result);generatedSheets.push({name,path:'xl/'+path,doc});const sh=el(wb,'sheet',{name,sheetId:si});sh.setAttributeNS(REL,'r:id',addRel('worksheet',path));nodes(wb,'sheets')[0].appendChild(sh);const dn=el(wb,'definedName',{name:'_xlnm.Print_Area',localSheetId:si-1});dn.appendChild(wb.createTextNode("'"+name+"'!$A$1:$"+(width==='H'?'F':width)+'$'+(width==='H'?Math.max(30,result.last+2):result.last)));nodes(wb,'definedNames')[0].appendChild(dn);override('xl/'+path,'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml');si++;}
 }
 const values=new Map();for(const {name,doc}of generatedSheets){const cells=new Map();for(const c of nodes(doc,'c')){const formula=nodes(c,'f')[0]?.textContent,t=c.getAttribute('t'),v=nodes(c,'v')[0]?.textContent;const value=t==='inlineStr'?nodes(c,'t').map(x=>x.textContent).join(''):t==='s'?sharedValues[+v]:t==='str'?v:v===undefined||v===''?null:Number(v);cells.set(c.getAttribute('r'),{formula,value,cell:c});}values.set(name,cells);}
 root.ExecutionFormulaCache.cache(values);
 for(const cells of values.values())for(const c of cells.values())if(c.formula){for(const v of nodes(c.cell,'v'))v.parentNode.removeChild(v);if(typeof c.cached==='number'){c.cell.removeAttribute('t');c.cell.appendChild(textEl(c.cell.ownerDocument,'v',c.cached));}else{c.cell.setAttribute('t','str');c.cell.appendChild(textEl(c.cell.ownerDocument,'v',c.cached??''));}}
 for(const {path,doc}of generatedSheets)out.file(path,xml(doc));
 override('xl/workbook.xml','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');if(original.file('docProps/core.xml'))override('docProps/core.xml','application/vnd.openxmlformats-package.core-properties+xml');
 out.file('xl/styles.xml',xml(styles));out.file('xl/workbook.xml',xml(wb));out.file('xl/_rels/workbook.xml.rels',xml(rels));out.file('[Content_Types].xml',xml(types));out.file('_rels/.rels',`<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
 return out.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
root.ExecutionEngine={analyze,validate,generate,num,norm};
})(typeof globalThis!=='undefined'?globalThis:window);
