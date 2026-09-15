/* 여린교회 PWA 업데이트 감지 */
(function(){
'use strict';
if(window.__YEORIN_PWA_UPDATE__)return;
window.__YEORIN_PWA_UPDATE__=true;
if(!('serviceWorker' in navigator))return;

const UPDATE_INTERVAL=30*60*1000;
const UPDATE_KEY='yeorinSwUpdateCheckedAt';
const VERSION_KEY='yeorinSwHelperVersion';
const HELPER_VERSION='cleanup-v12';
let updateTimer=null;
let updateRunning=false;

function num(key){try{return Number(localStorage.getItem(key)||0)}catch(e){return 0}}
function str(key){try{return localStorage.getItem(key)||''}catch(e){return''}}
function set(key,value){try{localStorage.setItem(key,String(value))}catch(e){}}
function runIdle(fn){
  if('requestIdleCallback' in window)window.requestIdleCallback(fn,{timeout:2500});
  else setTimeout(fn,0);
}
async function ensureUpdate(force){
  if(updateRunning)return;
  if(!force&&Date.now()-num(UPDATE_KEY)<UPDATE_INTERVAL)return;
  updateRunning=true;
  try{
    const reg=await navigator.serviceWorker.getRegistration('/');
    if(reg){
      try{await reg.update()}catch(e){}
    }else{
      await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
    }
    set(UPDATE_KEY,Date.now());
    set(VERSION_KEY,HELPER_VERSION);
  }catch(e){
    console.warn('[Yeorin] service worker update',e);
  }finally{
    updateRunning=false;
  }
}
function scheduleUpdate(delay,force){
  clearTimeout(updateTimer);
  updateTimer=setTimeout(()=>runIdle(()=>ensureUpdate(!!force)),delay||0);
}

// 이번 정리 버전은 한 번만 즉시 적용하고, 이후에는 30분 주기로만 확인합니다.
const firstCleanupApply=str(VERSION_KEY)!==HELPER_VERSION;
if(document.readyState==='complete')scheduleUpdate(1800,firstCleanupApply);
else window.addEventListener('load',()=>scheduleUpdate(1800,firstCleanupApply),{once:true});

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
