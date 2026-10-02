from pathlib import Path
from PIL import Image
import re, json
root=Path('/mnt/data/v48work')
# Create favicon/app icons from the actual no-hole d mark in company-logo.png.
src=Image.open(root/'assets/company-logo.png').convert('RGBA')
# First d is in bottom band, roughly x=18..78, y=70..149
crop=src.crop((10,65,82,150))
pix=crop.load(); w,h=crop.size
# Make the gray/taupe background transparent while retaining the white d and anti-aliased edges.
for y in range(h):
    for x in range(w):
        r,g,b,a=pix[x,y]
        # Background is warm gray around 130,115,111; white mark is much brighter.
        # Keep near-white, make darker background transparent, with a soft transition.
        lum=(r+g+b)/3
        if lum < 165:
            pix[x,y]=(r,g,b,0)
        elif lum < 215:
            alpha=int((lum-165)/(215-165)*255)
            pix[x,y]=(255,255,255,alpha)
        else:
            pix[x,y]=(255,255,255,255)
# Crop to visible alpha bounds and square-pad.
bbox=crop.getbbox(); crop=crop.crop(bbox)
side=max(crop.size)
padded=Image.new('RGBA',(side,side),(0,0,0,0)); padded.paste(crop,((side-crop.width)//2,(side-crop.height)//2),crop)
# Create burgundy rounded-square icons.
for size,name,rad in [(512,'dodo-d-icon-512.png',110),(64,'dodo-d-icon-64.png',14),(32,'dodo-d-favicon-32.png',7)]:
    base=Image.new('RGBA',(size,size),(0,0,0,0))
    mask=Image.new('L',(size,size),0)
    from PIL import ImageDraw
    md=ImageDraw.Draw(mask); md.rounded_rectangle((0,0,size-1,size-1),radius=rad,fill=255)
    bg=Image.new('RGBA',(size,size),(124,24,29,255)); base.paste(bg,(0,0),mask)
    d=padded.resize((int(size*.62),int(size*.72)),Image.Resampling.LANCZOS)
    # slight upward centering
    x=(size-d.width)//2; y=(size-d.height)//2-1
    base.alpha_composite(d,(x,y))
    base.save(root/'assets'/name)
# Apple touch icon same no-hole d.
Image.open(root/'assets/dodo-d-icon-512.png').save(root/'assets/dodo-d-icon-512.png')

# Update manifest theme and icons.
manifest=json.loads((root/'manifest.webmanifest').read_text(encoding='utf-8'))
manifest['theme_color']='#7c181d'; manifest['background_color']='#f7f5f3'
manifest['icons']=[
 {'src':'assets/dodo-d-icon-64.png','sizes':'64x64','type':'image/png','purpose':'any maskable'},
 {'src':'assets/dodo-d-icon-512.png','sizes':'512x512','type':'image/png','purpose':'any maskable'}]
(root/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

# Replace index with V48 structure, retaining all existing form/detail controls and IDs.
p=root/'index.html'; s=p.read_text(encoding='utf-8')
s=s.replace('meta name="theme-color" content="#0b3b78"','meta name="theme-color" content="#7c181d"')
s=s.replace('DODO 창호 견적 관리 | dodo-pj-1.com','LX Z:IN 창호 견적 관리 | dodo-pj-1.com')
s=s.replace('<div class="app"><header><div><small>프로젝트 1팀</small><h1>창호 견적 관리</h1><div id="currentStaff" class="currentStaff"></div></div><div><b>V46</b><button id="changeStaff" class="smallBtn">담당자 변경</button></div></header><main>','''<div class="app"><header class="topbar"><div class="brandBlock"><img src="assets/company-logo.png" alt="LX Z:IN 주식회사 도도" class="topLogo"><span class="brandDivider"></span><span class="teamName">프로젝트 1팀</span></div><div class="topRight"><span id="currentStaff" class="currentStaff"></span><button id="changeStaff" class="smallBtn">담당자 변경</button></div></header><main>''')
old='''<section id="home"><div class="hero"><small>ESTIMATE WORKSPACE</small><h2>현장 견적을<br>간편하게 관리하세요.</h2><p>창호 위치·제품·실측 치수를 입력하고 견적을 저장합니다.</p><button id="newBtn">+ 새 견적 작성</button></div><div class="heading"><div><small>RECENT ESTIMATES</small><h2>최근 견적</h2></div><span id="count">0건</span></div>
<div class="listTools"><input id="estimateSearch" type="search" placeholder="현장명 · 고객명 · 주소 · 견적번호 검색"></div>
<div id="list"></div></section>'''
new='''<section id="home"><div class="homeHero"><div><small>ESTIMATE WORKSPACE</small><h1>안녕하세요.<br><strong id="homeStaffName">담당자</strong></h1></div></div><div class="homeActions"><button id="newBtn" class="homeAction primary"><span>새 견적 작성</span><em>견적을 새로 작성합니다.</em></button><button id="savedBtn" class="homeAction"><span>저장된 견적</span><em>저장된 견적을 확인합니다.</em></button></div><div class="heading"><div><small>RECENT ESTIMATES</small><h2>최근 견적</h2></div><button id="allSavedBtn" class="linkBtn">전체보기</button></div><div id="recentList"></div></section>
<section id="saved" class="hidden"><div class="pageHead"><button class="textBtn" id="savedBackBtn">← 메인으로</button><small>SAVED ESTIMATES</small><h2>저장된 견적</h2><p>저장된 견적서를 조회하고 수정할 수 있습니다.</p></div><div class="savedTools"><input id="savedSearch" type="search" placeholder="현장명 · 고객명 · 주소 · 견적번호 검색"><span id="savedCount">0건</span></div><div id="list"></div></section>'''
if old not in s: raise SystemExit('home block not found')
s=s.replace(old,new)
s=s.replace('<footer>주식회사 도도 · dodo-pj-1.com · V46</footer>','<footer>주식회사 도도 · dodo-pj-1.com · V48</footer>')
p.write_text(s,encoding='utf-8')

# JS: navigation supports saved page; list renderer targets saved page and recent home list.
p=root/'app.js'; js=p.read_text(encoding='utf-8')
js=js.replace("function show(id){['home','form','detail'].forEach(x=>$(x).classList.toggle('hidden',x!==id));}","function show(id){['home','saved','form','detail'].forEach(x=>$(x).classList.toggle('hidden',x!==id)); if(id==='home'&&state.staff){$('homeStaffName').textContent=state.staff.name;} }")
start=js.index('function renderEstimateList(){')
end=js.index('async function load(){', start)
newjs='''function filteredEstimates(inputId){
  const q=(($(inputId)?.value)||'').trim().toLowerCase();
  return state.estimates.filter((r,i)=>{
    const hay=[r.project_name,r.customer_name,r.address,r.estimate_no,estimateNumber(r,i),r.status,r.staff_name].filter(Boolean).join(' ').toLowerCase();
    return !q||hay.includes(q);
  });
}
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
'''
js=js[:start]+newjs+js[end:]
# Existing load calls renderEstimateList; change to both renderers.
js=js.replace('renderEstimateList();\n}', 'renderRecentList();renderEstimateList();\n}')
# Handler block.
js=js.replace("$('newBtn').onclick=()=>{resetForm();", "$('savedBtn').onclick=()=>{show('saved');renderEstimateList();};$('allSavedBtn').onclick=()=>{show('saved');renderEstimateList();};$('savedBackBtn').onclick=()=>{show('home');renderRecentList();};$('newBtn').onclick=()=>{resetForm();")
js=js.replace("$('backBtn').onclick=$('cancelBtn').onclick=()=>show('home');", "$('backBtn').onclick=$('cancelBtn').onclick=()=>{show('home');renderRecentList();};")
js=js.replace("$('detailBackBtn').onclick=()=>{show('home');staffInit();load();};", "$('detailBackBtn').onclick=()=>{show('saved');renderEstimateList();};")
js=js.replace("show('home');load();", "show('home');load();")
# After save/delete should refresh both; broad replacement safe for those exact occurrences.
js=js.replace("setTimeout(()=>{show('home');load();},500);", "setTimeout(()=>{show('home');load();},500);")
js=js.replace("$('estimateSearch')?.addEventListener('input',renderEstimateList);", "$('savedSearch')?.addEventListener('input',renderEstimateList);")
js=js.replace("if(e.key==='Escape'&&$('estimateSearch')){$('estimateSearch').value='';renderEstimateList();}", "if(e.key==='Escape'&&$('savedSearch')){$('savedSearch').value='';renderEstimateList();}")
p.write_text(js,encoding='utf-8')
