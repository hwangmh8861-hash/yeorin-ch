/* 여린교회 나눔 작성 화면 격리
 * 소셜 피드에서 '나눔/기도 작성'으로 들어갔을 때
 * 기존 레거시 피드 카드가 작성 폼 아래에 함께 렌더되는 문제를 막습니다.
 */
(function(){
'use strict';
if(window.__YEORIN_NANUM_COMPOSE_ISOLATION__)return;
window.__YEORIN_NANUM_COMPOSE_ISOLATION__=true;

function qtComposing(){try{return typeof sqf!=='undefined'&&!!sqf}catch(e){return false}}
function prayerComposing(){try{return typeof spf!=='undefined'&&!!spf}catch(e){return false}}

function isolate(pageId,submitId){
  const page=document.getElementById(pageId),submit=document.getElementById(submitId);
  if(!page||!submit)return;
  const form=submit.closest('.card');
  if(!form)return;
  Array.from(page.children).forEach(function(child){
    child.style.display=child===form?'':'none';
  });
}

function isolateQt(){if(qtComposing())isolate('page-qt','qtSubmitBtn')}
function isolatePrayer(){if(prayerComposing())isolate('page-prayer','prSubmitBtn')}

const baseRenderQt=window.renderQt;
if(typeof baseRenderQt==='function'){
  window.renderQt=function(){
    const r=baseRenderQt.apply(this,arguments);
    isolateQt();
    requestAnimationFrame(isolateQt);
    return r;
  };
}

const baseRenderPrayer=window.renderPrayer;
if(typeof baseRenderPrayer==='function'){
  window.renderPrayer=function(){
    const r=baseRenderPrayer.apply(this,arguments);
    isolatePrayer();
    requestAnimationFrame(isolatePrayer);
    return r;
  };
}

console.log('[Yeorin] nanum compose isolation ready');
})();
