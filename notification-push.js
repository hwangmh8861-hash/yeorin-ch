/* 여린교회 Web Push 알림 v1
 * - 알림 권한/구독 관리
 * - 마이페이지 알림 설정 UI
 * - 푸시 클릭 시 해당 나눔/기도/커뮤니티/캘린더 화면으로 이동
 */
(function(){
  'use strict';
  if(window.__YEORIN_PUSH_V1__)return;
  window.__YEORIN_PUSH_V1__=true;

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const PUSH_URL=SUPABASE_URL+'/functions/v1/yeorin-push';
  let swRegPromise=null;
  let modalOpen=false;

  function supported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
  function standalone(){return !!(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;}
  function sessionToken(){try{return window.YeorinNative&&window.YeorinNative.session&&window.YeorinNative.session.access_token||'';}catch(e){return'';}}
  function b64ToU8(base64){const p='='.repeat((4-base64.length%4)%4),s=(base64+p).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(s),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}

  async function pushApi(action,payload){
    const token=sessionToken();if(!token)throw new Error('session_expired');
    const res=await fetch(PUSH_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+token},body:JSON.stringify(Object.assign({action},payload||{}))});
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.success===false)throw new Error(data.error||('HTTP '+res.status));
    return data;
  }

  async function sw(){
    if(!supported())throw new Error('push_not_supported');
    if(!swRegPromise)swRegPromise=navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(async reg=>{try{await reg.update();}catch(e){}return navigator.serviceWorker.ready;});
    return swRegPromise;
  }

  async function currentSubscription(){try{return (await sw()).pushManager.getSubscription();}catch(e){return null;}}

  async function syncExisting(){
    if(!supported()||Notification.permission!=='granted'||!window.CU)return false;
    const reg=await sw();const sub=await reg.pushManager.getSubscription();if(!sub)return false;
    await pushApi('subscribe',{subscription:sub.toJSON()});return true;
  }

  async function enablePush(){
    if(!supported())throw new Error('이 기기에서는 푸시 알림을 사용할 수 없어요');
    if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!standalone())throw new Error('아이폰에서는 홈 화면에 추가한 앱에서 알림을 켤 수 있어요');
    const perm=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(perm!=='granted')throw new Error('알림 권한이 허용되지 않았어요');
    const cfg=await pushApi('config');
    const reg=await sw();
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(cfg.publicKey)});
    await pushApi('subscribe',{subscription:sub.toJSON()});
    localStorage.setItem('yeorin_push_enabled','1');
    return true;
  }

  async function disablePush(silent){
    if(!supported())return true;
    const sub=await currentSubscription();
    if(sub){try{await pushApi('unsubscribe',{endpoint:sub.endpoint});}catch(e){if(!silent)throw e;}try{await sub.unsubscribe();}catch(e){}}
    localStorage.removeItem('yeorin_push_enabled');
    return true;
  }

  async function status(){
    if(!supported())return {supported:false,on:false,permission:'unsupported'};
    const sub=await currentSubscription();
    return {supported:true,on:Notification.permission==='granted'&&!!sub,permission:Notification.permission,standalone:standalone()};
  }

  function injectStyle(){
    if(document.getElementById('yeorin-push-style'))return;
    const s=document.createElement('style');s.id='yeorin-push-style';s.textContent=`
      .push-state{margin-left:auto;font-size:11px;font-weight:800;color:var(--ink3);padding:3px 8px;border-radius:999px;background:var(--b0)}
      .push-state.on{color:var(--brand);background:var(--brand-soft)}
      .push-modal{position:fixed;inset:0;z-index:1100;background:rgba(20,30,24,.46);display:flex;align-items:flex-end;justify-content:center}
      .push-sheet{width:100%;max-width:var(--max);background:#fff;border-radius:24px 24px 0 0;padding:20px 20px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.12)}
      .push-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
      .push-sheet-title{font-size:18px;font-weight:900;letter-spacing:-.4px}
      .push-sheet-close{width:34px;height:34px;border:0;border-radius:50%;background:var(--b0);font-size:20px;color:var(--ink2)}
      .push-desc{font-size:13px;line-height:1.7;color:var(--ink2);margin:2px 0 16px}
      .push-list{background:var(--b0);border-radius:16px;padding:12px 14px;margin-bottom:16px}
      .push-list div{font-size:12.5px;color:var(--ink2);padding:3px 0;font-weight:650}
      .push-actions{display:grid;grid-template-columns:1fr;gap:8px}
      .push-btn{border:0;border-radius:14px;padding:14px;font-size:14px;font-weight:850;font-family:inherit}
      .push-btn.primary{background:var(--brand);color:#fff}.push-btn.off{background:#f3f4f3;color:var(--ink2)}
      .push-help{font-size:11px;color:var(--ink3);line-height:1.6;margin-top:10px;text-align:center}
    `;document.head.appendChild(s);
  }

  async function paintState(){
    const el=document.getElementById('pushStateBadge');if(!el)return;
    const st=await status();
    if(!st.supported){el.textContent='미지원';el.classList.remove('on');return;}
    el.textContent=st.on?'켜짐':'꺼짐';el.classList.toggle('on',st.on);
  }

  function appendMyPage(){
    const page=document.getElementById('page-mypage');if(!page||page.querySelector('[data-push-setting]'))return;
    const cards=page.querySelectorAll('.card');const target=cards[cards.length-1];if(!target)return;
    const row=document.createElement('div');row.className='my-menu-item';row.dataset.pushSetting='1';row.onclick=()=>window.openYeorinPushSettings();
    row.innerHTML='<span class="mi-icon">🔔</span> 알림 설정 <span id="pushStateBadge" class="push-state">확인 중</span>';
    target.insertBefore(row,target.lastElementChild||null);paintState();
  }

  async function renderModal(){
    const st=await status();
    const old=document.getElementById('yeorinPushModal');if(old)old.remove();
    const root=document.createElement('div');root.id='yeorinPushModal';root.className='push-modal';root.onclick=e=>{if(e.target===root)window.closeYeorinPushSettings();};
    let main='';
    if(!st.supported)main='<button class="push-btn off" disabled>이 기기에서는 알림을 지원하지 않아요</button>';
    else if(/iPhone|iPad|iPod/i.test(navigator.userAgent)&&!st.standalone)main='<button class="push-btn off" disabled>홈 화면에 추가한 뒤 알림을 켤 수 있어요</button>';
    else if(st.on)main='<button class="push-btn off" onclick="turnOffYeorinPush()">알림 끄기</button>';
    else main='<button class="push-btn primary" onclick="turnOnYeorinPush()">알림 켜기</button>';
    root.innerHTML='<div class="push-sheet"><div class="push-sheet-head"><div class="push-sheet-title">알림 설정</div><button class="push-sheet-close" onclick="closeYeorinPushSettings()">×</button></div>'+
      '<div class="push-desc">새 글과 내 글의 반응, 캘린더 일정을 휴대폰 알림으로 알려드려요.</div>'+
      '<div class="push-list"><div>• 새로운 나눔 / 기도제목</div><div>• 커뮤니티 새 글</div><div>• 내 글의 좋아요 / 댓글</div><div>• 생일 및 주요 캘린더 일정</div></div>'+
      '<div class="push-actions">'+main+'</div><div class="push-help">내가 작성한 새 글은 내 휴대폰에 다시 알리지 않아요.</div></div>';
    document.body.appendChild(root);modalOpen=true;
  }

  window.openYeorinPushSettings=function(){renderModal().catch(e=>showToast&&showToast('알림 설정을 열지 못했어요','error'));};
  window.closeYeorinPushSettings=function(){document.getElementById('yeorinPushModal')?.remove();modalOpen=false;};
  window.turnOnYeorinPush=async function(){
    const b=document.querySelector('#yeorinPushModal .push-btn');if(b){b.disabled=true;b.textContent='알림 연결 중...';}
    try{await enablePush();if(typeof showToast==='function')showToast('휴대폰 알림을 켰어요','success');await renderModal();paintState();}
    catch(e){if(typeof showToast==='function')showToast(e.message||'알림을 켜지 못했어요','error');await renderModal();}
  };
  window.turnOffYeorinPush=async function(){
    const b=document.querySelector('#yeorinPushModal .push-btn');if(b){b.disabled=true;b.textContent='알림 해제 중...';}
    try{await disablePush(false);if(typeof showToast==='function')showToast('휴대폰 알림을 껐어요');await renderModal();paintState();}
    catch(e){if(typeof showToast==='function')showToast('알림을 끄지 못했어요','error');await renderModal();}
  };

  async function navigate(data){
    if(!data||!data.tab)return;
    for(let i=0;i<30&&!window.CU;i++)await new Promise(r=>setTimeout(r,150));
    if(!window.CU)return;
    if(data.tab==='community'){
      if(typeof window.switchTab==='function')window.switchTab('community');
      try{if(typeof window.refreshCommunity==='function')await window.refreshCommunity();}catch(e){}
      const id=String(data.postId||'');
      if(id){
        for(let n=0;n<5;n++){
          const el=document.getElementById('community-post-'+id);if(el){setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'center'}),80);break;}
          try{if(typeof window.loadMoreCommunity==='function')await window.loadMoreCommunity();}catch(e){}
        }
      }
    }else if(data.tab==='nanum'){
      const sub=data.sub==='prayer'?'prayer':'qt',date=String(data.date||'');
      if(typeof window.switchTab==='function')window.switchTab('nanum');
      try{nanumSub=sub;}catch(e){}
      try{document.getElementById('ntab-qt')?.classList.toggle('active',sub==='qt');document.getElementById('ntab-prayer')?.classList.toggle('active',sub==='prayer');}catch(e){}
      try{document.getElementById('page-qt').style.display=sub==='qt'?'block':'none';document.getElementById('page-prayer').style.display=sub==='prayer'?'block':'none';}catch(e){}
      if(date&&typeof window.selectNanumDate==='function')window.selectNanumDate(date,true);
    }else if(data.tab==='calendar'){
      if(typeof window.switchTab==='function')window.switchTab('calendar');
      if(data.date){
        const p=String(data.date).split('-');
        try{cy=Number(p[0]);cm=Number(p[1])-1;if(typeof renderHero==='function')renderHero();if(typeof renderCalendar==='function')renderCalendar();}catch(e){}
      }
    }
  }

  function queryNav(){
    try{
      const q=new URLSearchParams(location.search),tab=q.get('pushTab');if(!tab)return null;
      const d={tab,sub:q.get('pushSub')||'',date:q.get('pushDate')||'',postId:q.get('pushPost')||''};
      ['pushTab','pushSub','pushDate','pushPost'].forEach(k=>q.delete(k));
      const rest=q.toString();history.replaceState(history.state||{},'',location.pathname+(rest?'?'+rest:'')+location.hash);
      return d;
    }catch(e){return null;}
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='YEORIN_PUSH_NAV')navigate(e.data.data||{});});
    sw().catch(()=>{});
  }

  const baseRenderMyPage=window.renderMyPage;
  if(typeof baseRenderMyPage==='function')window.renderMyPage=function(){const r=baseRenderMyPage.apply(this,arguments);appendMyPage();return r;};

  const baseLogout=window.doLogout;
  if(typeof baseLogout==='function')window.doLogout=async function(){try{await disablePush(true);}catch(e){}return baseLogout.apply(this,arguments);};

  injectStyle();
  setTimeout(()=>{appendMyPage();syncExisting().catch(()=>{});const d=queryNav();if(d)navigate(d);},900);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncExisting().catch(()=>{});});
  console.log('[Yeorin] web push notifications ready');
})();