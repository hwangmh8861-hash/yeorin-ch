/* 홈 뒤로가기 종료 안내는 잠깐만 보여주고 자동으로 닫습니다. */
(function(){
  'use strict';

  const EXIT_TEXT='한 번 더 누르면 앱을 종료해요';
  const VISIBLE_MS=2300;
  const FADE_MS=220;
  const armed=new WeakSet();

  function findHintNodes(){
    return Array.from(document.querySelectorAll('body *')).filter(el=>{
      if(armed.has(el))return false;
      if(el.children&&el.children.length>0)return false;
      return String(el.textContent||'').trim()===EXIT_TEXT;
    });
  }

  function dismissHint(textNode){
    if(!textNode||armed.has(textNode))return;
    armed.add(textNode);

    // showToast 구현이 텍스트 span을 감싸는 구조여도 토스트 카드까지만 찾아갑니다.
    let card=textNode;
    const candidate=textNode.closest('.toast,.toast-msg,.toast-message,.snackbar,.notification,[role="status"],[aria-live]');
    if(candidate)card=candidate;

    setTimeout(()=>{
      if(!card||!card.isConnected)return;
      card.style.transition='opacity '+FADE_MS+'ms ease, transform '+FADE_MS+'ms ease';
      card.style.opacity='0';
      card.style.transform='translateY(8px)';
      card.style.pointerEvents='none';
      setTimeout(()=>{
        if(!card||!card.isConnected)return;
        // 전용 토스트 노드면 제거하고, 공용 컨테이너라면 내용만 비웁니다.
        if(card===textNode||card.classList.contains('toast')||card.classList.contains('snackbar')||card.getAttribute('role')==='status')card.remove();
        else textNode.remove();
      },FADE_MS+40);
    },VISIBLE_MS);
  }

  function scan(){findHintNodes().forEach(dismissHint);}

  const observer=new MutationObserver(scan);
  const start=()=>{
    if(!document.body)return;
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    scan();
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
