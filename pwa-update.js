/* 여린교회 PWA 업데이트 감지 */
(function(){
'use strict';
if(window.__YEORIN_PWA_UPDATE__)return;
window.__YEORIN_PWA_UPDATE__=true;
if(!('serviceWorker' in navigator))return;

const UPDATE_INTERVAL=30*60*1000;
const UPDATE_KEY='yeorinSwUpdateCheckedAt';
let updateTimer=null;
let updateRunning=false;

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
async function ensureUpdate(){
  if(updateRunning||Date.now()-lastChecked()<UPDATE_INTERVAL)return;
  updateRunning=true;
  try{
    const reg=await navigator.serviceWorker.getRegistration('/');
    if(reg){
      try{await reg.update()}catch(e){}
    }else{
      await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    }
    markChecked();
  }catch(e){
    console.warn('[Yeorin] service worker update',e);
  }finally{
    updateRunning=false;
  }
}
function scheduleUpdate(delay){
  clearTimeout(updateTimer);
  updateTimer=setTimeout(()=>runIdle(ensureUpdate),delay||0);
}

// 초기 UI와 세션 복원을 방해하지 않도록 로드 완료 뒤 한 번만 확인합니다.
if(document.readyState==='complete')scheduleUpdate(1800);
else window.addEventListener('load',()=>scheduleUpdate(1800),{once:true});

console.log('[Yeorin] PWA update checker ready');
})();

/* 설치형 앱 시작 화면 단축 */
(function(){
'use strict';
if(window.__YEORIN_FAST_START__)return;
window.__YEORIN_FAST_START__=true;

const nativeTryAuto=window.tryAuto;
if(typeof nativeTryAuto!=='function')return;
let started=false;

window.tryAuto=async function(){
  if(started)return;
  started=true;
  return nativeTryAuto.apply(this,arguments);
};

Promise.resolve().then(()=>window.tryAuto()).catch(e=>{
  console.warn('[Yeorin] fast startup',e);
});

console.log('[Yeorin] fast startup ready');
})();
