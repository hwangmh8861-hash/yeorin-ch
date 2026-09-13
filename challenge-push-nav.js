/* 챌린지 알림 클릭 시 챌린지 화면으로 이동 */
(function(){
'use strict';
if(window.__YEORIN_CHALLENGE_PUSH_NAV__)return;window.__YEORIN_CHALLENGE_PUSH_NAV__=true;
async function openChallenge(data){
  if(!data||data.tab!=='bible'||data.sub!=='challenge')return;
  for(let i=0;i<30;i++){
    try{if(typeof CU!=='undefined'&&CU)break}catch(e){}
    await new Promise(r=>setTimeout(r,150));
  }
  try{
    if(typeof window.switchTab==='function')window.switchTab('bible');
    bsub='challenge';selBook=null;viewChId=data.challengeId||null;
    if(typeof renderBible==='function')renderBible();
    setTimeout(()=>{
      if(!data.challengeId)return;
      const id=String(data.challengeId);
      const btn=Array.from(document.querySelectorAll('#page-bible button')).find(el=>String(el.getAttribute('onclick')||'').includes('openChallengeReminder')&&String(el.getAttribute('onclick')||'').includes(id));
      if(btn)btn.scrollIntoView({behavior:'smooth',block:'center'});
    },180);
  }catch(e){console.warn('[challenge push nav]',e);}
}
if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='YEORIN_PUSH_NAV')openChallenge(e.data.data||{});});}
function fromQuery(){
  try{
    const q=new URLSearchParams(location.search),tab=q.get('pushTab'),sub=q.get('pushSub'),challengeId=q.get('pushChallenge')||'';
    if(tab!=='bible'||sub!=='challenge')return;
    ['pushTab','pushSub','pushDate','pushPost','pushChallenge'].forEach(k=>q.delete(k));
    const rest=q.toString();history.replaceState(history.state||{},'',location.pathname+(rest?'?'+rest:'')+location.hash);
    openChallenge({tab:'bible',sub:'challenge',challengeId});
  }catch(e){}
}
// 기존 notification-push의 900ms URL 정리보다 먼저 챌린지 목적지를 소비합니다.
setTimeout(fromQuery,300);
})();