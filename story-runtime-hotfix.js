/* 여린교회 스토리 런타임 핫픽스
 * - Android/PWA 뒤로가기에서 스토리 화면이 튕겨 복귀하는 현상 방지
 * - CU 초기화 타이밍과 무관하게 RPC의 mine 값을 기준으로 내 스토리 표시
 */
(function(){
'use strict';
if(window.__YEORIN_STORY_RUNTIME_HOTFIX__)return;
window.__YEORIN_STORY_RUNTIME_HOTFIX__=true;

let bounce=false;
let refreshing=null;
let retryTimer=null;

const esc=s=>String(s==null?'':s)
  .replace(/&/g,'&amp;')
  .replace(/</g,'&lt;')
  .replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;')
  .replace(/'/g,'&#39;');

function uid(){
  try{return typeof CU!=='undefined'&&CU&&CU.id?String(CU.id):''}catch(e){return''}
}
function face(u){
  try{return typeof YA==='function'?YA(u||{}):''}catch(e){return''}
}
function plusSvg(){
  return '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
}

function groupStories(list){
  const m=new Map();
  list.forEach(x=>{
    if(!x||!x.authorId)return;
    if(!m.has(x.authorId))m.set(x.authorId,[]);
    m.get(x.authorId).push(x);
  });
  const mk=id=>({authorId:id,list:m.get(id).slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))});
  const latest=x=>x.list.reduce((a,s)=>Math.max(a,+new Date(s.createdAt)),0);
  const mineStory=list.find(x=>x&&x.mine&&x.authorId);
  const me=mineStory?String(mineStory.authorId):uid();
  const out=[];
  if(me&&m.has(me))out.push(mk(me));
  const rest=[...m.keys()].filter(id=>String(id)!==me).map(mk);
  out.push(...rest.filter(x=>x.list.some(s=>!s.viewed)).sort((a,b)=>latest(b)-latest(a)));
  out.push(...rest.filter(x=>x.list.every(s=>s.viewed)).sort((a,b)=>latest(b)-latest(a)));
  return {order:out,me};
}

function renderStrip(list){
  const host=document.querySelector('#nanum-social-root .ys-stories');
  if(!host)return false;
  const grouped=groupStories(list),order=grouped.order,me=grouped.me;
  const mine=me?order.find(x=>String(x.authorId)===me):null;
  const myFace=face({id:me});
  let h='';
  if(mine){
    const seen=mine.list.every(s=>s.viewed);
    h+='<button data-story-hotfix="1" class="ys-story'+(seen?' seen':'')+'" onclick="openStoryUser(\''+esc(me)+'\')"><div class="ys-ring"><div class="ys-face">'+myFace+'</div><span class="ys-plus" onclick="event.stopPropagation();openStoryUploader()">'+plusSvg()+'</span></div><div class="ys-name">내 스토리</div></button>';
  }else{
    h+='<button data-story-hotfix="1" class="ys-story" onclick="openStoryUploader()"><div class="ys-ring empty"><div class="ys-face">'+myFace+'</div><span class="ys-plus">'+plusSvg()+'</span></div><div class="ys-name">내 스토리</div></button>';
  }
  order.filter(x=>String(x.authorId)!==me).forEach(x=>{
    const a=(x.list[0]&&x.list[0].author)||{},seen=x.list.every(s=>s.viewed);
    h+='<button class="ys-story'+(seen?' seen':'')+'" onclick="openStoryUser(\''+esc(x.authorId)+'\')"><div class="ys-ring"><div class="ys-face">'+face(a)+'</div></div><div class="ys-name">'+esc(a.name||'')+'</div></button>';
  });
  host.innerHTML=h;
  host.dataset.storyV2='1';
  return true;
}

async function refreshStories(){
  if(refreshing)return refreshing;
  const api=window.YeorinStoryV2;
  if(!api||typeof api.syncStories!=='function')return [];
  refreshing=Promise.resolve(api.syncStories()).then(list=>{
    const rows=Array.isArray(list)?list:[];
    renderStrip(rows);
    return rows;
  }).catch(e=>{
    console.warn('[story hotfix sync]',e);
    return [];
  }).finally(()=>{refreshing=null});
  return refreshing;
}

function scheduleRefresh(delay){
  clearTimeout(retryTimer);
  retryTimer=setTimeout(()=>refreshStories(),delay||80);
}

function closeTopStoryLayer(){
  const viewers=document.getElementById('ys2ViewerModal');
  if(viewers){
    try{if(typeof window.closeStoryViewers==='function')window.closeStoryViewers();else viewers.remove()}catch(e){viewers.remove()}
    return true;
  }
  const viewer=document.getElementById('ysStoryView');
  if(viewer){
    try{if(typeof window.closeStory==='function')window.closeStory();else viewer.remove()}catch(e){viewer.remove()}
    return true;
  }
  const uploader=document.getElementById('ysUpload');
  if(uploader){
    try{if(typeof window.closeStoryUploader==='function')window.closeStoryUploader();else uploader.remove()}catch(e){uploader.remove()}
    return true;
  }
  const write=document.getElementById('ysWrite');
  if(write){write.remove();return true}
  return false;
}

// app-ux-fix의 popstate보다 capture 단계에서 먼저 처리합니다.
// 뒤로가기로 history가 한 칸 이동하면 스토리 레이어만 닫고 즉시 forward하여 현재 탭을 유지합니다.
window.addEventListener('popstate',function(e){
  if(bounce){
    bounce=false;
    e.stopImmediatePropagation();
    return;
  }
  if(!closeTopStoryLayer())return;
  e.stopImmediatePropagation();
  bounce=true;
  try{history.forward()}catch(err){bounce=false}
},true);

// 기존 스토리 런타임이 strip을 다시 그리면 mine 판정이 초기 CU 타이밍에 흔들릴 수 있어
// hotfix 마커가 사라진 경우 서버 기준으로 한 번 더 동기화해 복원합니다.
const mo=new MutationObserver(()=>{
  const host=document.querySelector('#nanum-social-root .ys-stories');
  if(host&&!host.querySelector('[data-story-hotfix="1"]'))scheduleRefresh(120);
});
mo.observe(document.documentElement,{childList:true,subtree:true});

document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleRefresh(80)});
setTimeout(()=>refreshStories(),250);
setTimeout(()=>refreshStories(),1200);
setTimeout(()=>refreshStories(),3200);

console.log('[Yeorin] story runtime hotfix ready');
})();
