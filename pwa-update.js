/* 여린교회 PWA 업데이트 감지 */
(function(){
'use strict';
if(window.__YEORIN_PWA_UPDATE__)return;window.__YEORIN_PWA_UPDATE__=true;

// 브라우저/홈 화면 추가 UI가 오래된 favicon을 잡지 않도록
// 실제 여린교회 앱 아이콘으로 즉시 교체합니다.
function ensureAppIcons(){
  const icon='/icons/yeorin-icon-192-v3.png';
  let fav=document.querySelector('link[rel="icon"]');
  if(!fav){fav=document.createElement('link');fav.rel='icon';document.head.appendChild(fav);}
  fav.type='image/png';fav.href=icon;
  fav.removeAttribute('sizes');

  let touch=document.querySelector('link[rel="apple-touch-icon"]');
  if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';document.head.appendChild(touch);}
  touch.href=icon;
  touch.removeAttribute('sizes');
}
ensureAppIcons();

if(!('serviceWorker' in navigator))return;

let refreshing=false;
let hadController=!!navigator.serviceWorker.controller;
let updateTimer=null;

async function ensureUpdate(){
  try{
    const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    try{await reg.update();}catch(e){}
  }catch(e){console.error('[Yeorin] service worker update',e)}
}

navigator.serviceWorker.addEventListener('controllerchange',function(){
  if(!hadController){hadController=true;return;}
  if(refreshing)return;
  refreshing=true;
  location.reload();
});

function scheduleUpdate(delay){
  clearTimeout(updateTimer);
  updateTimer=setTimeout(ensureUpdate,delay||0);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scheduleUpdate(100));
else scheduleUpdate(100);
window.addEventListener('pageshow',()=>scheduleUpdate(200));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleUpdate(150)});

console.log('[Yeorin] PWA update checker ready');
})();

/* 설치형 앱 시작 화면 단축
 * - 기존 index.html의 300ms 자동 로그인 대기를 기다리지 않고 즉시 세션을 확인합니다.
 * - 원래 예약된 tryAuto()가 뒤늦게 다시 실행돼도 중복 진입하지 않게 막습니다.
 * - 자동 로그인은 유지하고, 세션이 없는 사용자에게만 기존 로그인/온보딩 화면을 보여줍니다.
 */
(function(){
'use strict';
if(window.__YEORIN_FAST_START__)return;window.__YEORIN_FAST_START__=true;

const nativeTryAuto=window.tryAuto;
if(typeof nativeTryAuto!=='function')return;
let started=false;

window.tryAuto=async function(){
  if(started)return;
  started=true;
  return nativeTryAuto.apply(this,arguments);
};

Promise.resolve().then(function(){
  return window.tryAuto();
}).catch(function(e){
  console.warn('[Yeorin] fast startup',e);
});

console.log('[Yeorin] fast startup ready');
})();
