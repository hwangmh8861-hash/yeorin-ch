/* 여린교회 나눔 필터 컨트롤 보정 */
(function(){
'use strict';
if(window.__YEORIN_FILTER_CONTROL_POLISH__)return;
window.__YEORIN_FILTER_CONTROL_POLISH__=true;

function inject(){
  if(document.getElementById('yeorin-filter-control-polish-style'))return;
  const s=document.createElement('style');
  s.id='yeorin-filter-control-polish-style';
  s.textContent=`
#nanum-social-root .ys-viewbar{justify-content:flex-end!important;padding:6px 0 4px!important}
#nanum-social-root .ys-view{padding:9px 13px!important;max-width:78%!important;background:#fff!important;border-color:#e3e8e4!important;box-shadow:none!important}
#nanum-social-root .ys-view.on{background:var(--brand-soft)!important;border-color:#cfe0d4!important;color:var(--brand)!important}
#nanum-social-root .ys-view-clear{padding:8px 4px!important}
`;
  document.head.appendChild(s)
}

function relabel(){
  const btn=document.querySelector('#nanum-social-root .ys-view');
  if(btn){
    btn.childNodes.forEach(function(node){
      if(node.nodeType===Node.TEXT_NODE&&node.nodeValue&&node.nodeValue.includes('보기'))node.nodeValue=node.nodeValue.replace(/^보기/,'필터')
    });
    btn.setAttribute('aria-label','나눔 피드 필터')
  }
  const title=document.querySelector('#ysFilter .ys-fhead h3');
  if(title&&title.textContent.trim()==='보기')title.textContent='필터'
}

function run(){inject();relabel()}
const mo=new MutationObserver(run);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){run();mo.observe(document.documentElement,{childList:true,subtree:true})});
else{run();mo.observe(document.documentElement,{childList:true,subtree:true})}

console.log('[Yeorin] filter control polish ready');
})();
