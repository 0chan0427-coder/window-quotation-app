(function(root){
'use strict';
const reviewStages=['미검토','우선 재협약','조건부 재협약','보류','재진행 제외'];
const reviewTags=['교체 수요 남음','교체 많이 완료','후속 상담 남음','자리 좋음','자리 나쁨','홍보 충분','홍보 부족','비용 부담','관리소 협조 좋음','관리소 협조 어려움','주변 단지와 함께 진행 가능','이동 부담','일정 기간 후 재검토'];
const staff=[{code:'한',name:'한동균 팀장',color:'#7c181d'},{code:'찬',name:'김민찬 책임',color:'#2976b8'},{code:'영',name:'김영찬 책임',color:'#25917b'}];
function validate(x){
 if(!x.site_name.trim()||x.site_name.length>100)throw Error('단지명을 100자 이내로 입력해주세요.');
 if(!staff.some(s=>s.code===x.staff_code))throw Error('담당자를 선택해주세요.');
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!valid(x.start_date)||!valid(x.end_date)||x.end_date<x.start_date)throw Error('시작일과 종료일을 확인해주세요.');
 if(!x.event_type.trim()||x.event_type.length>50)throw Error('행사 형태를 50자 이내로 입력해주세요.');
 for(const k of ['contract_count','contract_amount'])if(x[k]!==null&&(!Number.isSafeInteger(x[k])||x[k]<0))throw Error('건수와 금액은 0 이상의 정수로 입력해주세요.');
 if(x.expense_items!==undefined)x.expense_items=expenses(x.expense_items);
 if(x.review_stage!==undefined){if(!reviewStages.includes(x.review_stage))throw Error('재행사 검토 단계를 확인해주세요.');if(typeof x.region!=='string'||x.region.length>80||typeof x.review_note!=='string'||x.review_note.length>1000)throw Error('지역은 80자, 검토 메모는 1000자 이내로 입력해주세요.');if(!Array.isArray(x.review_tags)||x.review_tags.some(t=>!reviewTags.includes(t)))throw Error('검토 이유를 확인해주세요.');x.review_tags=[...new Set(x.review_tags)];if(x.review_month!==null&&!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(x.review_month))throw Error('재검토 예정월을 확인해주세요.');}
 return x;
}
function filter(rows,f,team=false){return rows.filter(r=>(!f.from||r.start_date>=f.from)&&(!f.to||r.start_date<=f.to)&&(team||!f.staff||r.staff_code===f.staff)&&(!f.region||(r.region||'').toLocaleLowerCase().includes(f.region.toLocaleLowerCase()))&&(!f.stage||(r.review_stage||'미검토')===f.stage)&&(!f.search||r.site_name.toLocaleLowerCase().includes(f.search.toLocaleLowerCase())));}
function sort(rows,key,direction){return [...rows].sort((a,b)=>{if(a[key]===null&&b[key]!==null)return 1;if(b[key]===null&&a[key]!==null)return -1;const d=typeof a[key]==='number'?a[key]-b[key]:String(a[key]??'').localeCompare(String(b[key]??''),'ko');return d*(direction==='asc'?1:-1)||String(a.id).localeCompare(String(b.id));});}
function summary(rows){return {events:rows.length,count:rows.reduce((a,r)=>a+(r.contract_count??0),0),amount:rows.reduce((a,r)=>a+(r.contract_amount??0),0),pending:rows.filter(r=>r.contract_amount===null||r.contract_count===null).length};}
function contributions(rows){const total=summary(rows).amount;return staff.map(s=>{const amount=summary(rows.filter(r=>r.staff_code===s.code)).amount;return {...s,amount,percent:total?amount/total*100:0};});}
function expenses(items){if(!Array.isArray(items)||items.length>100)throw Error('비용 항목은 최대 100개입니다.');return items.map(x=>{const name=String(x.name||'').trim(),memo=String(x.memo||'').trim();if(!name||name.length>100||memo.length>300||!Number.isSafeInteger(x.amount)||x.amount<0)throw Error('비용 항목명과 0 이상의 금액을 확인해주세요.');return {name,amount:x.amount,memo};});}
function expenseTotal(row){return (row.expense_items||[]).reduce((n,x)=>n+x.amount,0);}
function reviewMetrics(r){const registered=Array.isArray(r.expense_items)&&r.expense_items.length>0,cost=registered?expenseTotal(r):null;return {cost,costPerContract:cost!==null&&r.contract_count>0?Math.round(cost/r.contract_count):null,costRatio:cost!==null&&r.contract_amount>0?cost/r.contract_amount:null};}
const api={reviewStages,reviewTags,reviewMetrics,staff,validate,filter,sort,summary,contributions,expenses,expenseTotal};root.TeamEvents=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
