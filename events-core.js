(function(root){
'use strict';
const staff=[{code:'한',name:'한동균 팀장',color:'#7c181d'},{code:'찬',name:'김민찬 책임',color:'#2976b8'},{code:'영',name:'김영찬 책임',color:'#25917b'}];
function validate(x){
 if(!x.site_name.trim()||x.site_name.length>100)throw Error('단지명을 100자 이내로 입력해주세요.');
 if(!staff.some(s=>s.code===x.staff_code))throw Error('담당자를 선택해주세요.');
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!valid(x.start_date)||!valid(x.end_date)||x.end_date<x.start_date)throw Error('시작일과 종료일을 확인해주세요.');
 if(!x.event_type.trim()||x.event_type.length>50)throw Error('행사 형태를 50자 이내로 입력해주세요.');
 for(const k of ['contract_count','contract_amount'])if(x[k]!==null&&(!Number.isSafeInteger(x[k])||x[k]<0))throw Error('건수와 금액은 0 이상의 정수로 입력해주세요.');
 return x;
}
function filter(rows,f,team=false){return rows.filter(r=>(!f.from||r.start_date>=f.from)&&(!f.to||r.start_date<=f.to)&&(team||!f.staff||r.staff_code===f.staff)&&(!f.search||r.site_name.toLocaleLowerCase().includes(f.search.toLocaleLowerCase())));}
function sort(rows,key,direction){return [...rows].sort((a,b)=>{if(a[key]===null&&b[key]!==null)return 1;if(b[key]===null&&a[key]!==null)return -1;const d=typeof a[key]==='number'?a[key]-b[key]:String(a[key]??'').localeCompare(String(b[key]??''),'ko');return d*(direction==='asc'?1:-1)||String(a.id).localeCompare(String(b.id));});}
function summary(rows){return {events:rows.length,count:rows.reduce((a,r)=>a+(r.contract_count??0),0),amount:rows.reduce((a,r)=>a+(r.contract_amount??0),0),pending:rows.filter(r=>r.contract_amount===null||r.contract_count===null).length};}
function contributions(rows){const total=summary(rows).amount;return staff.map(s=>{const amount=summary(rows.filter(r=>r.staff_code===s.code)).amount;return {...s,amount,percent:total?amount/total*100:0};});}
const api={staff,validate,filter,sort,summary,contributions};root.TeamEvents=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
