/* 여린교회 PWA 업데이트 감지 */
(function(){
'use strict';
if(window.__YEORIN_PWA_UPDATE__)return;window.__YEORIN_PWA_UPDATE__=true;
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