/* 여린교회 iPhone 푸시 안내 + 스토리 알림 이동 보정 */
(function(){
'use strict';
if(window.__YEORIN_PUSH_IOS_STORY_FIX__)return;
window.__YEORIN_PUSH_IOS_STORY_FIX__=true;

function isIOS(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function standalone(){return !!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true}
function supported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window}
async function pushStatus(){if(!supported())return {supported:false,on:false};try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();return {supported:true,on:Notification.permission==='granted'&&!!sub}}catch(e){return {supported:true,on:false}}}
async function paintBadge(){const el=document.getElementById('pushStateBadge');if(!el)return;if(isIOS()&&!standalone()){el.textContent='설치 필요';el.classList.remove('on');return}const st=await pushStatus();if(!st.supported){el.textContent='미지원';el.classList.remove('on');return}el.textContent=st.on?'켜짐':'꺼짐';el.classList.toggle('on',st.on)}
async function renderPushModal(){const st=await pushStatus();document.getElementById('yeorinPushModal')?.remove();const root=document.createElement('div');root.id='yeorinPushModal';root.className='push-modal';root.onclick=e=>{if(e.target===root)root.remove()};let main='',help='내가 작성한 새 글과 스토리는 내 휴대폰에 다시 알리지 않아요.';if(isIOS()&&!standalone()){main='<button class="push-btn off" disabled>홈 화면에 추가한 앱에서 알림을 켤 수 있어요</button>';help='아이폰은 iOS 16.4 이상에서 홈 화면에 추가한 웹앱만 푸시 알림을 사용할 수 있어요.'}else if(!st.supported){main='<button class="push-btn off" disabled>이 환경에서는 푸시 알림을 사용할 수 없어요</button>';if(isIOS())help='아이폰은 iOS 16.4 이상이 필요해요.'}else if(st.on)main='<button class="push-btn off" onclick="turnOffYeorinPush()">알림 끄기</button>';else main='<button class="push-btn primary" onclick="turnOnYeorinPush()">알림 켜기</button>';root.innerHTML='<div class="push-sheet"><div class="push-sheet-head"><div class="push-sheet-title">알림 설정</div><button class="push-sheet-close" onclick="closeYeorinPushSettings()">×</button></div><div class="push-desc">새로운 소식과 내 글의 반응을 휴대폰 알림으로 알려드려요.</div><div class="push-list"><div>• 새로운 나눔 / 기도제목</div><div>• 새 스토리</div><div>• 커뮤니티 새 글</div><div>• 내 글의 좋아요 / 댓글</div><div>• 생일 및 주요 캘린더 일정</div></div><div class="push-actions">'+main+'</div><div class="push-help">'+help+'</div></div>';document.body.appendChild(root)}
function installModalPatch(){window.openYeorinPushSettings=function(){renderPushModal().catch(()=>{if(typeof showToast==='function')showToast('알림 설정을 열지 못했어요','error')})};window.closeYeorinPushSettings=function(){document.getElementById('yeorinPushModal')?.remove()}}
async function openStoryFromPush(data){if(!data||data.tab!=='nanum'||data.sub!=='story')return false;const authorId=String(data.authorId||'');if(typeof window.switchTab==='function')window.switchTab('nanum');try{if(typeof window.refreshSocialFeed==='function')await window.refreshSocialFeed()}catch(e){}if(authorId&&typeof window.openStoryUser==='function'){setTimeout(()=>window.openStoryUser(authorId),100);return true}return false}
let coldStory=null;try{const q=new URLSearchParams(location.search);if(q.get('pushTab')==='nanum'&&q.get('pushSub')==='story')coldStory={tab:'nanum',sub:'story',authorId:q.get('pushAuthor')||'',storyId:q.get('pushStory')||q.get('pushPost')||''}}catch(e){}
if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data&&e.data.type==='YEORIN_PUSH_NAV'?e.data.data:null;if(d&&d.sub==='story')openStoryFromPush(d)});
const oldRenderMyPage=window.renderMyPage;if(typeof oldRenderMyPage==='function')window.renderMyPage=function(){const r=oldRenderMyPage.apply(this,arguments);setTimeout(paintBadge,60);return r};
installModalPatch();setTimeout(()=>{installModalPatch();paintBadge();if(coldStory)openStoryFromPush(coldStory)},1050);document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(paintBadge,50)});
console.log('[Yeorin] iPhone/story push fix ready');
})();

(function(){
  function loadHotfix(){
    if(document.getElementById('yeorin-story-runtime-hotfix'))return;
    const h=document.createElement('script');
    h.id='yeorin-story-runtime-hotfix';
    h.src='/story-runtime-hotfix.js?v=20260913-1';
    h.defer=true;
    document.head.appendChild(h);
  }

  const existing=document.getElementById('yeorin-story-v2-runtime');
  if(existing){
    if(window.YeorinStoryV2)loadHotfix();
    else existing.addEventListener('load',loadHotfix,{once:true});
  }else{
    const s=document.createElement('script');
    s.id='yeorin-story-v2-runtime';
    s.src='/story-experience-v2.js?v=20260913-4';
    s.defer=true;
    s.addEventListener('load',loadHotfix,{once:true});
    document.head.appendChild(s);
  }
})();

(function(){
  if(document.getElementById('yeorin-bible-avatar-hotfix'))return;
  const s=document.createElement('script');
  s.id='yeorin-bible-avatar-hotfix';
  s.src='/bible-avatar-hotfix.js?v=20260913-1';
  s.defer=true;
  document.head.appendChild(s);
})();
