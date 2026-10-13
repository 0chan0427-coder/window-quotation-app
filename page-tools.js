(function(){
const button=document.getElementById('scrollTopBtn');
const update=()=>button.classList.toggle('hidden',window.scrollY<300);
window.addEventListener('scroll',update,{passive:true});
button.onclick=()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
update();
})();
