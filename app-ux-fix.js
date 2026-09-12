/* 여린교회 PWA 앱 UX 보정
 * - 브라우저 기본 pull-to-refresh 대신 현재 화면만 새로고침
 * - 탭 이동을 history에 연결해 Android 뒤로가기 동작을 앱처럼 처리
 * - 뒤로가기 시 이전 탭과 스크롤 위치 복원
 * - 팝업/작성창/사이드메뉴가 열려 있으면 먼저 닫기
 */
(function(){
  'use strict';

  if(window.__YEORIN_APP_UX_FIX__)return;
  window.__YEORIN_APP_UX_FIX__=true;

  const STYLE_ID='yeorin-app-ux-style';
  const PTR_ID='yeorinPullRefresh';
  const PULL_TRIGGER=76;
  const PULL_RAW_TRIGGER=120;
  const PULL_MAX=112;
  const PULL_ACTIVATE_DISTANCE=14;
  const PULL_HOLD_MS=170;
  const PULL_HORIZONTAL_TOLERANCE=24;
  let historyReady=false;
  let historyNavigating=false;
  let overlayBounce=false;
  let rootBounce=false;
  let lastRootBackAt=0;
  let refreshing=false;
  let pullActive=false;
  let pullIntent=false;
  let pullArmed=false;
  let pullStartX=0;
  let pullStartY=0;
  let pullDistance=0;
  let pullRawDistance=0;
  let pullArmTimer=null;

  function inApp(){
    try{return typeof CU!=='undefined'&&!!CU;}catch(e){return false;}
  }
  function currentTab(){
    try{return typeof curTab!=='undefined'&&curTab?String(curTab):'main';}catch(e){return'main';}
  }
  function isEditable(el){
    if(!el)return false;
    return !!(el.closest&&el.closest('input,textarea,select,[contenteditable="true"],.community-compose'));
  }
  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      html,body,#appFrame{overscroll-behavior-y:none!important;}
      body{touch-action:pan-x pan-y;}
      #${PTR_ID}{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top));transform:translate(-50%,-72px);z-index:1200;pointer-events:none;opacity:0;transition:transform .18s ease,opacity .18s ease;}
      #${PTR_ID}.show{opacity:1;}
      #${PTR_ID}.loading{transform:translate(-50%,0)!important;opacity:1;}
      #${PTR_ID} .ptr-pill{min-width:126px;height:42px;padding:0 14px;border-radius:21px;background:rgba(255,255,255,.98);box-shadow:0 5px 20px rgba(26,38,32,.16);display:flex;align-items:center;justify-content:center;gap:8px;color:#586359;font-size:12px;font-weight:800;white-space:nowrap;border:1px solid rgba(226,231,226,.9);}
      #${PTR_ID} .ptr-icon{width:18px;height:18px;border-radius:50%;border:2px solid #dbe5dd;border-top-color:#2F6B47;transition:transform .12s ease;}
      #${PTR_ID}.ready .ptr-icon{transform:rotate(180deg);border-color:#2F6B47;}
      #${PTR_ID}.loading .ptr-icon{animation:yeorinPtrSpin .72s linear infinite;border-color:#dbe5dd;border-top-color:#2F6B47;}
      @keyframes yeorinPtrSpin{to{transform:rotate(360deg)}}
    `;document.head.appendChild(s);
  }
  function indicator(){
    let el=document.getElementById(PTR_ID);
    if(!el){
      el=document.createElement('div');el.id=PTR_ID;
      el.innerHTML='<div class="ptr-pill"><span class="ptr-icon"></span><span class="ptr-text">당겨서 새로고침</span></div>';
      document.body.appendChild(el);
    }
    return el;
  }
  function setIndicator(distance,state,text){
    const el=indicator();
    el.classList.toggle('show',distance>5||state==='loading');
    el.classList.toggle('ready',state==='ready');
    el.classList.toggle('loading',state==='loading');
    if(state!=='loading'){
      const y=Math.min(54,Math.max(-72,-72+distance*.92));
      el.style.transform='translate(-50%,'+y+'px)';
    }else el.style.transform='';
    const t=el.querySelector('.ptr-text');if(t)t.textContent=text||(state==='ready'?'놓으면 업데이트':'당겨서 새로고침');
  }
  function hideIndicator(){
    const el=indicator();el.classList.remove('show','ready','loading');el.style.transform='translate(-50%,-72px)';
  }
  function clearPullArm(){
    if(pullArmTimer){clearTimeout(pullArmTimer);pullArmTimer=null;}
    pullArmed=false;
    const el=document.getElementById(PTR_ID);if(el)delete el.dataset.vib;
  }
  function cancelPull(){
    clearPullArm();
    pullActive=false;
    pullIntent=false;
    pullDistance=0;
    pullRawDistance=0;
    hideIndicator();
  }
  function armPullRefresh(){
    if(pullArmed||pullArmTimer)return;
    pullArmTimer=setTimeout(function(){
      pullArmTimer=null;
      if(!pullActive||!pullIntent||pullRawDistance<PULL_RAW_TRIGGER)return;
      pullArmed=true;
      setIndicator(pullDistance,'ready','놓으면 업데이트');
      const el=indicator();
      if(navigator.vibrate&&!el.dataset.vib){
        el.dataset.vib='1';try{navigator.vibrate(8);}catch(err){}
      }
    },PULL_HOLD_MS);
  }

  function popupOpen(){
    const light=document.getElementById('communityLightbox');if(light)return true;
    const comp=document.getElementById('communityComposeRoot');if(comp)return true;
    const side=document.getElementById('sideMenu');if(side&&side.classList.contains('open'))return true;
    const root=document.getElementById('popupRoot');if(root&&root.innerHTML.trim())return true;
    return !!document.querySelector('.overlay.open,.modal.open,[role="dialog"][aria-modal="true"]');
  }
  function closeTopPopup(){
    const light=document.getElementById('communityLightbox');if(light){light.remove();return true;}
    const comp=document.getElementById('communityComposeRoot');
    if(comp){
      try{if(typeof window.closeCommunityComposer==='function')window.closeCommunityComposer();else comp.remove();}catch(e){comp.remove();}
      return true;
    }
    const side=document.getElementById('sideMenu');
    if(side&&side.classList.contains('open')){
      try{if(typeof closeSideMenu==='function')closeSideMenu();else{side.classList.remove('open');document.getElementById('sideMenuOverlay')?.classList.remove('open');}}catch(e){}
      return true;
    }
    const root=document.getElementById('popupRoot');
    if(root&&root.innerHTML.trim()){
      try{if(typeof closePopup==='function')closePopup();else root.innerHTML='';}catch(e){root.innerHTML='';}
      return true;
    }
    return false;
  }

  function saveCurrentEntry(){
    if(!historyReady||historyNavigating)return;
    const st=Object.assign({},history.state||{});
    if(!st.yeorin)return;
    st.tab=currentTab();
    st.scrollY=Math.max(0,window.scrollY||0);
    history.replaceState(st,'',location.href);
  }

  function ensureHistory(){
    if(historyReady||!inApp())return;
    const tab=currentTab();
    history.replaceState({yeorin:true,tab:'main',scrollY:0,root:true},'',location.href);
    history.pushState({yeorin:true,tab:'main',scrollY:0,guard:true},'',location.href);
    if(tab!=='main')history.pushState({yeorin:true,tab,scrollY:Math.max(0,window.scrollY||0)},'',location.href);
    historyReady=true;
  }

  function restoreScroll(y){
    const top=Math.max(0,Number(y)||0);
    requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top,behavior:'auto'})));
  }

  const nativeSwitch=window.switchTab;
  if(typeof nativeSwitch==='function'){
    window.switchTab=function(id){
      ensureHistory();
      const from=currentTab();
      if(historyReady&&!historyNavigating)saveCurrentEntry();
      const r=nativeSwitch.apply(this,arguments);
      if(historyReady&&!historyNavigating&&String(id)!==String(from)){
        history.pushState({yeorin:true,tab:String(id),scrollY:0},'',location.href);
        restoreScroll(0);
      }
      return r;
    };
  }

  window.addEventListener('popstate',function(ev){
    if(!historyReady||!inApp())return;

    if(overlayBounce){overlayBounce=false;return;}
    if(rootBounce){rootBounce=false;return;}

    if(popupOpen()){
      closeTopPopup();
      overlayBounce=true;
      history.forward();
      return;
    }

    const st=ev.state;
    if(!st||!st.yeorin)return;

    if(st.root&&currentTab()==='main'){
      const now=Date.now();
      if(now-lastRootBackAt<1800){
        lastRootBackAt=0;
        history.back();
        return;
      }
      lastRootBackAt=now;
      if(typeof showToast==='function')showToast('한 번 더 누르면 앱을 종료해요');
      rootBounce=true;
      history.forward();
      return;
    }

    historyNavigating=true;
    try{
      if(typeof nativeSwitch==='function'&&String(currentTab())!==String(st.tab))nativeSwitch.call(window,st.tab||'main');
    }finally{
      historyNavigating=false;
      restoreScroll(st.scrollY);
    }
  });

  async function refreshCurrentView(){
    if(refreshing||!inApp())return;
    refreshing=true;
    const tab=currentTab();
    const keepY=Math.max(0,window.scrollY||0);
    setIndicator(PULL_TRIGGER,'loading','업데이트 중...');

    try{
      if(tab==='community'&&typeof window.refreshCommunity==='function'){
        await window.refreshCommunity();
      }else{
        const jobs=[];
        try{
          if(typeof _lastRefresh!=='undefined')_lastRefresh=0;
          if(typeof refreshOnReturn==='function')jobs.push(Promise.resolve(refreshOnReturn()));
        }catch(e){}
        if(typeof window.refreshYeorinCoreData==='function')jobs.push(Promise.resolve(window.refreshYeorinCoreData()));
        if(jobs.length)await Promise.allSettled(jobs);
        else if(typeof renderAll==='function')renderAll();
      }
      restoreScroll(keepY);
      if(typeof showToast==='function')showToast('현재 화면을 업데이트했어요','success');
    }catch(e){
      console.warn('[pull refresh]',e);
      restoreScroll(keepY);
      if(typeof showToast==='function')showToast('업데이트하지 못했어요','error');
    }finally{
      setTimeout(()=>{refreshing=false;hideIndicator();},420);
    }
  }
  window.refreshCurrentYeorinView=refreshCurrentView;

  document.addEventListener('touchstart',function(e){
    if(refreshing||popupOpen()||isEditable(e.target)||window.scrollY>1||!inApp())return;
    if(!e.touches||e.touches.length!==1)return;
    clearPullArm();
    const touch=e.touches[0];
    pullActive=true;
    pullIntent=false;
    pullStartX=touch.clientX;
    pullStartY=touch.clientY;
    pullDistance=0;
    pullRawDistance=0;
  },{passive:true});

  document.addEventListener('touchmove',function(e){
    if(!pullActive||!e.touches||e.touches.length!==1)return;
    const touch=e.touches[0];
    const dx=touch.clientX-pullStartX;
    const raw=touch.clientY-pullStartY;
    const absX=Math.abs(dx);

    if(window.scrollY>1){cancelPull();return;}
    if(raw<-6){cancelPull();return;}

    if(!pullIntent){
      if(raw<PULL_ACTIVATE_DISTANCE)return;
      if(absX>PULL_HORIZONTAL_TOLERANCE&&absX>raw*.75){cancelPull();return;}
      if(raw<=absX*1.15)return;
      pullIntent=true;
    }

    if(absX>36&&absX>raw*.9){cancelPull();return;}

    pullRawDistance=Math.max(0,raw);
    pullDistance=Math.min(PULL_MAX,Math.max(0,(pullRawDistance-PULL_ACTIVATE_DISTANCE)*.72));
    if(pullDistance>5)e.preventDefault();

    if(pullRawDistance>=PULL_RAW_TRIGGER){
      if(pullArmed)setIndicator(pullDistance,'ready','놓으면 업데이트');
      else{
        setIndicator(pullDistance,'pull','잠깐 유지해주세요');
        armPullRefresh();
      }
    }else{
      clearPullArm();
      setIndicator(pullDistance,'pull','당겨서 새로고침');
    }
  },{passive:false});

  function finishPull(){
    if(!pullActive)return;
    const shouldRefresh=pullIntent&&pullArmed&&pullRawDistance>=PULL_RAW_TRIGGER;
    clearPullArm();
    pullActive=false;
    pullIntent=false;
    pullDistance=0;
    pullRawDistance=0;
    if(shouldRefresh)refreshCurrentView();
    else hideIndicator();
  }
  document.addEventListener('touchend',finishPull,{passive:true});
  document.addEventListener('touchcancel',cancelPull,{passive:true});

  document.addEventListener('scroll',function(){
    if(historyReady&&!historyNavigating){
      clearTimeout(window.__yeorinScrollStateTimer);
      window.__yeorinScrollStateTimer=setTimeout(saveCurrentEntry,120);
    }
  },{passive:true});

  const nativeEnter=window.enterApp;
  if(typeof nativeEnter==='function'){
    window.enterApp=async function(){
      const r=await nativeEnter.apply(this,arguments);
      ensureHistory();
      return r;
    };
  }

  injectStyle();
  setTimeout(ensureHistory,0);
  setTimeout(ensureHistory,700);
  console.log('[Yeorin] app UX navigation + pull refresh ready');
})();