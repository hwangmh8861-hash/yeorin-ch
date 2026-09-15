/* 홈 뒤로가기 종료 안내는 잠깐만 보여주고 자동으로 닫습니다. */
(function(){
  'use strict';

  const EXIT_TEXT='한 번 더 누르면 앱을 종료해요';
  const VISIBLE_MS=2300;
  const FADE_MS=220;

  let fadeTimer=null,hideTimer=null;

  function clearTimers(){
    if(fadeTimer){clearTimeout(fadeTimer);fadeTimer=null;}
    if(hideTimer){clearTimeout(hideTimer);hideTimer=null;}
  }

  // 종료 안내 때문에 건드린 인라인 스타일을 원래대로 돌려놓습니다.
  function resetStyle(card){
    if(!card)return;
    card.style.transition='';
    card.style.transform='';
    card.style.pointerEvents='';
  }

  function scheduleDismiss(){
    const card=document.getElementById('toast');
    if(!card)return;
    clearTimers();
    resetStyle(card);

    fadeTimer=setTimeout(function(){
      if(!card.isConnected)return;
      card.style.transition='opacity '+FADE_MS+'ms ease, transform '+FADE_MS+'ms ease';
      card.style.opacity='0';
      card.style.transform='translateY(8px)';
      card.style.pointerEvents='none';

      hideTimer=setTimeout(function(){
        if(!card.isConnected)return;
        // 토스트는 앱 전체가 재사용하는 공용 노드이므로 제거하지 않고 숨기기만 합니다.
        card.style.display='none';
        resetStyle(card);
      },FADE_MS+40);
    },VISIBLE_MS);
  }

  function install(){
    if(window.__YEORIN_EXIT_HINT_PATCH__)return;
    const base=window.showToast;
    if(typeof base!=='function'){setTimeout(install,150);return;}
    window.__YEORIN_EXIT_HINT_PATCH__=true;

    window.showToast=function(msg,type){
      const r=base.apply(this,arguments);
      if(String(msg==null?'':msg).trim()===EXIT_TEXT){
        scheduleDismiss();
      }else{
        // 다른 토스트가 올라오면 종료 안내용 타이머와 스타일을 즉시 정리합니다.
        clearTimers();
        resetStyle(document.getElementById('toast'));
      }
      return r;
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
