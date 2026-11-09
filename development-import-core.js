(function(root){
'use strict';
const tidy=v=>String(v??'').normalize('NFKC').trim();
const nameKey=v=>tidy(v).toLowerCase().replace(/아파트/g,'').replace(/[\s·.,()_]/g,'');
const addressKey=v=>tidy(v).replace(/^서울(?:시|특별시)?(?=\s)/,'서울특별시').replace(/^경기(?=\s)/,'경기도').replace(/\s/g,'').toLowerCase();
const key=s=>nameKey(s.name)+'\n'+addressKey(s.address);
function regions(address,dong='',district=''){
 const words=tidy(address).split(/\s+/);const city=/^서울/.test(words[0])?'서울':words.slice(1).find(x=>/^[가-힣]+시$/.test(x))||words[0]?.replace(/특별자치시|특별시|광역시$/,'')||'';return {city,district:words.slice(1).find(x=>/^[가-힣]+[구군]$/.test(x))||district,dong:dong||((address.match(/\(([가-힣0-9·]+[동읍면리])(?:[,\s)]|$)/)||[])[1]||'')};
}
function parse(text){
 if(typeof text!=='string'||text.length>1000000)throw Error('자료는 100만 글자 이내로 나눠서 넣어주세요.');
 const lines=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n');const rows=[],unread=[];let row=null,district='',memo=false;
 const flush=()=>{if(row){row.site_note=row.notes.join('\n').trim();delete row.notes;rows.push(row);row=null;}memo=false;};
 const start=(title,line)=>{flush();let name=tidy(title),dong='';let m=name.match(/^\(([^)]+)\)\s*(.*)$/);if(m){dong=m[1];name=m[2];}row={name,address:'',city:'',district,dong,build_year:null,households:null,phone:'',email:'',conditions:'',aliases:[],site_note:'',notes:[],issues:[],sourceLine:line};};
 for(let i=0;i<lines.length;i++){
  const line=tidy(lines[i]);if(!line)continue;
  if(/^[=─━\-]{3,}$/.test(line))continue;
  let group=line.match(/^\[([^\]]+)\]\s*(?:-.*)?$/);if(group){flush();district=group[1];continue;}
  if(/^■\s*.+\(\d+개\s*단지\)\s*$/.test(line)){flush();continue;}
  let title=line.match(/^(?:\d+\s*[.)、]\s*|단지명\s*[:：]\s*)(.+)$/);
  if(title){start(title[1],i+1);continue;}
  const next=tidy(lines[i+1]||'');
  if(!/^(?:메모\s*[:：]|주소\s*[:：]|\d{4}년)/.test(line)&&/^(?:주소\s*[:：]\s*)?(?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)/.test(next)){start(line,i+1);continue;}
  if(!row){unread.push({line:i+1,text:line});continue;}
  if(memo){row.notes.push(lines[i].trimEnd());continue;}
  let note=line.match(/^메모\s*[:：]\s*(.*)$/);if(note){memo=true;row.notes.push(note[1]);continue;}
  if(!row.address&&/^(?:주소\s*[:：]|(?:서울|경기|인천|부산|대구|대전|광주|울산|세종|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주))/.test(line)){
   row.address=line.replace(/^주소\s*[:：]\s*/,'');Object.assign(row,regions(row.address,row.dong,row.district));continue;
  }
  let year=line.match(/(?:준공(?:연도|년도|년)?\s*[:：]?\s*)?((?:19|20|21)\d{2})\s*년(?:식|\s*준공)?/);
  let units=line.match(/([\d,]+)\s*세대/);
  if(year||units){if(year)row.build_year=Number(year[1]);if(units){row.households=Number(units[1].replace(/,/g,''));if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(units[1]))row.issues.push('세대수의 쉼표 위치를 확인해주세요.');}let rest=line.replace(year?.[0]||/$(?!)/,'').replace(units?.[0]||/$(?!)/,'').replace(/[\s/|·,]/g,'');if(rest)row.issues.push('연도·세대수 줄을 확인해주세요: '+line);continue;}
  row.issues.push('해석하지 못한 내용: '+line);
 }
 flush();if(rows.length>500)throw Error('한 번에 최대 500개 단지까지 등록할 수 있습니다.');
 return {rows,unread};
}
function validate(s){
 const errors=[...(s.issues||[])];if(!tidy(s.address))errors.push('주소를 입력해주세요.');
 try{DevelopmentCore.validateSite(s);}catch(e){errors.push(e.message);}return [...new Set(errors)];
}
function classify(rows,existing){
 const seen=new Set();return rows.map(s=>{const errors=validate(s),k=key(s);let status='new',reason='신규 등록';
  if(errors.length){status='error';reason=errors.join(' / ');}
  else if(seen.has(k)){status='duplicate';reason='붙여넣은 자료 안의 중복';}
  else if(existing.some(x=>key(x)===k)){status='duplicate';reason='이미 등록된 단지';}
  else if(existing.some(x=>nameKey(x.name)===nameKey(s.name)||addressKey(x.address)===addressKey(s.address))){status='review';reason='단지명 또는 주소가 기존 단지와 같습니다. 별도 단지인지 확인해주세요.';}
  if(!errors.length)seen.add(k);return {site:s,status,reason};});
}
async function payload(s){
 const errors=validate(s);if(errors.length)throw Error(errors.join(' / '));
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key(s)));const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 const {name,address,city,district,dong,build_year,households,phone,email,conditions,aliases,site_note}=s;
 return {name:tidy(name),address:tidy(address),city,district,dong,build_year,households,phone,email,conditions,aliases,site_note,seed_key:'bulk83:'+hash,stage:'미접촉',task_state:'예정 없음',check_month:null,check_date:null,classification_pending:false};
}
root.DevelopmentImport={parse,classify,validate,payload,key,regions};if(typeof module!=='undefined')module.exports=root.DevelopmentImport;
})(typeof window==='undefined'?globalThis:window);
