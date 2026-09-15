/* 여린교회 PWA 업데이트 감지 */
(function(){
'use strict';
if(window.__YEORIN_PWA_UPDATE__)return;window.__YEORIN_PWA_UPDATE__=true;

// 브라우저/홈 화면 추가 UI가 예전 favicon을 재사용하지 않도록
// 기존 아이콘 링크를 보존하면서 필요한 32px/192px/apple-touch 아이콘만 보완합니다.
function ensureIconLink(rel,sizes,href){
  let link=[...document.querySelectorAll(`link[rel="${rel}"]`)].find(el=>el.sizes&&el.sizes.value===sizes);
  if(!link){
    link=document.createElement('link');
    link.rel=rel;
    if(sizes)link.sizes=sizes;
    document.head.appendChild(link);
  }
  link.type='image/png';
  link.href=href;
  return link;
}

function ensureAppIcons(){
  ensureIconLink('icon','32x32','/favicon-32.png?v=20260915-pwa');
  ensureIconLink('icon','192x192','/icon-192.png?v=20260915-pwa');
  ensureIconLink('apple-touch-icon','180x180','/apple-touch-icon.png?v=20260915-pwa');
}
ensureAppIcons();

if(!('serviceWorker' in navigator))return;

const UPDATE_INTERVAL=30*60*1000;
const UPDATE_KEY='yeorinSwUpdateCheckedAt';
let updateTimer=null;
let updateRunning=false;
let hadController=!!navigator.serviceWorker.controller;

function lastChecked(){
  try{return Number(localStorage.getItem(UPDATE_KEY)||0)}catch(e){return 0}
}
function markChecked(){
  try{localStorage.setItem(UPDATE_KEY,String(Date.now()))}catch(e){}
}
function runIdle(fn){
  if('requestIdleCallback' in window)window.requestIdleCallback(fn,{timeout:2500});
  else setTimeout(fn,0);
}

async function ensureUpdate(force){
  if(updateRunning)return;
  if(!force&&Date.now()-lastChecked()<UPDATE_INTERVAL)return;
  updateRunning=true;
  try{
    const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    try{await reg.update();}catch(e){}
    markChecked();
  }catch(e){
    console.error('[Yeorin] service worker update',e);
  }finally{
    updateRunning=false;
  }
}

// 업데이트가 발견돼도 사용 중인 화면을 즉시 reload 하지 않습니다.
// 새 서비스워커는 다음 앱 진입/탐색부터 자연스럽게 적용됩니다.
navigator.serviceWorker.addEventListener('controllerchange',function(){
  if(!hadController){hadController=true;return;}
  hadController=true;
  try{sessionStorage.setItem('yeorinSwChanged','1')}catch(e){}
});

function scheduleUpdate(delay,force){
  clearTimeout(updateTimer);
  updateTimer=setTimeout(()=>runIdle(()=>ensureUpdate(!!force)),delay||0);
}

// 앱 초기 렌더링과 로그인 복원을 먼저 끝낸 뒤 백그라운드에서 업데이트를 확인합니다.
if(document.readyState==='complete')scheduleUpdate(1500,false);
else window.addEventListener('load',()=>scheduleUpdate(1500,false),{once:true});

document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&Date.now()-lastChecked()>=UPDATE_INTERVAL)scheduleUpdate(1200,false);
});

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
