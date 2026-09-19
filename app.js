const $=id=>document.getElementById(id);
const views=[$('home'),$('form'),$('detail')];
let estimates=[];
function show(view){views.forEach(v=>v.classList.add('hidden'));view.classList.remove('hidden');scrollTo(0,0)}
$('newBtn').onclick=()=>{ $('estimateForm').reset();$('message').textContent='';show($('form'));$('projectName').focus(); };
$('backBtn').onclick=$('cancelBtn').onclick=()=>show($('home'));
$('detailBackBtn').onclick=()=>{show($('home'));loadEstimates()};
async function loadEstimates(){
 $('list').innerHTML='<div class="empty">불러오는 중...</div>';
 const {data,error}=await supabaseClient.from('estimates').select('*').order('created_at',{ascending:false});
 if(error){$('list').innerHTML='<div class="empty"><h3>목록을 불러오지 못했습니다.</h3><p>'+escapeHtml(error.message)+'</p></div>';return}
 estimates=data||[];$('count').textContent=estimates.length+'건';
 if(!estimates.length){$('list').innerHTML='<div class="empty"><h3>아직 작성된 견적이 없습니다.</h3><p>첫 번째 견적을 작성해보세요.</p></div>';return}
 $('list').innerHTML=estimates.map(e=>`<article class="estimate"><div><h3>${escapeHtml(e.project_name)}</h3><div class="meta">${escapeHtml(e.customer_name||'고객명 미입력')}<br>${escapeHtml(e.address||'주소 미입력')}<br>작성일: ${date(e.created_at)}</div></div><button data-id="${e.id}">상세보기</button></article>`).join('');
 document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>detail(estimates.find(e=>e.id===b.dataset.id)));
}
$('estimateForm').onsubmit=async ev=>{
 ev.preventDefault();$('message').textContent='저장 중입니다...';
 const payload={project_name:$('projectName').value.trim(),customer_name:$('customerName').value.trim()||null,address:$('address').value.trim()||null,status:$('status').value,memo:$('memo').value.trim()||null,total_amount:0};
 const {error}=await supabaseClient.from('estimates').insert(payload);
 if(error){$('message').textContent='저장 실패: '+error.message;return}
 show($('home'));loadEstimates();
};
function detail(e){$('detailTitle').textContent=e.project_name;$('dCustomer').textContent=e.customer_name||'-';$('dAddress').textContent=e.address||'-';$('dStatus').textContent=e.status||'-';$('dMemo').textContent=e.memo||'-';$('dTotal').textContent=Number(e.total_amount||0).toLocaleString('ko-KR')+'원';show($('detail'))}
function date(v){return v?new Date(v).toLocaleDateString('ko-KR'):'-'}
function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
loadEstimates();