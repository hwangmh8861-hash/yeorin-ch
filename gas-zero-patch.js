/* 여린교회 GAS 제거 전환 패치
 * AI 호출은 Supabase Edge Function(yeorin-ai)로,
 * 핵심 읽기/챌린지/주소록 데이터는 Supabase RPC에서 직접 보강합니다.
 * 홈 '오늘의 말씀'은 로컬 데이터로만 처리해 AI/API 비용이 발생하지 않습니다.
 */
(function(){
  'use strict';

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const AI_URL=SUPABASE_URL+'/functions/v1/yeorin-ai';
  const AI_FUNCTIONS=new Set(['askYeorinBible','askYeorinQT','askYeorinPrayer']);

  function loadAddon(src,key){
    return new Promise(function(resolve,reject){
      const flag='__YEORIN_ADDON_'+key+'__';
      if(window[flag]){resolve();return;}
      const old=document.querySelector('script[data-yeorin-addon="'+key+'"]');
      if(old){
        if(old.dataset.loaded==='1'){resolve();return;}
        old.addEventListener('load',function(){resolve();},{once:true});
        old.addEventListener('error',function(){reject(new Error('addon_load_failed:'+key));},{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=src;
      s.async=true;
      s.dataset.yeorinAddon=key;
      s.onload=function(){s.dataset.loaded='1';window[flag]=true;resolve();};
      s.onerror=function(){reject(new Error('addon_load_failed:'+key));};
      document.head.appendChild(s);
    });
  }

  // 이 두 파일은 빌드 시 정적 파일로 함께 배포됩니다.
  // daily-verse-local은 getDailyVerseForUser를 가로채므로 홈 진입 시 AI 호출이 발생하지 않습니다.
  const dailyLocalReady=loadAddon('/daily-verse-local.js','daily-verse-local').catch(function(e){
    console.warn('[daily verse addon]',e);
    throw e;
  });
  loadAddon('/challenge-share.js','challenge-share').catch(function(e){console.warn('[challenge share addon]',e);});

  async function aiCall(fn,args,retried){
    const native=window.YeorinNative;
    if(!native)throw new Error('native_engine_not_ready');
    let s=native.session;
    if(!s||!s.access_token)throw new Error('session_expired');

    const res=await fetch(AI_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer '+s.access_token
      },
      body:JSON.stringify({fn:fn,args:args||[]})
    });

    if(res.status===401&&!retried){
      await native.edgeRpc('getAllUsers',[]).catch(()=>{});
      return aiCall(fn,args,true);
    }

    const r=await res.json().catch(()=>({}));
    if(!res.ok||r.error)throw new Error(r.error||('HTTP '+res.status));
    return r.data;
  }

  const nativeGas=window.gas;
  window.gas=async function(fn,...args){
    if(fn==='getDailyVerseForUser'){
      await dailyLocalReady;
      if(window.YeorinDailyLocal){
        const hasRequest=args.length>1&&String(args[1]||'').trim();
        return hasRequest?window.YeorinDailyLocal.another(args[0]):window.YeorinDailyLocal.today(args[0]);
      }
      throw new Error('daily_local_not_ready');
    }
    if(fn==='clearDailyVerseCache')return{success:true};
    if(AI_FUNCTIONS.has(fn))return aiCall(fn,args);
    return nativeGas(fn,...args);
  };

  function applyCoreData(full){
    if(typeof AD==='undefined'||!AD||!full)return false;
    AD.allBibleProgress=full.allBibleProgress||{};
    AD.challenges=Array.isArray(full.challenges)?full.challenges:[];
    AD.challengeCerts=Array.isArray(full.challengeCerts)?full.challengeCerts:[];
    AD.contacts=Array.isArray(full.contacts)?full.contacts:[];
    if(full.worships)AD.worships=full.worships;
    if(Array.isArray(full.neighbors))AD.neighbors=full.neighbors;
    if(Array.isArray(full.finance))AD.finance=full.finance;
    if(typeof renderAll==='function')renderAll();
    return true;
  }

  async function loadCoreDataWithRetry(){
    const native=window.YeorinNative;
    if(!native)throw new Error('native_engine_not_ready');
    let lastErr=null;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const full=await native.directRpc('yeorin_full_extra_payload',{});
        applyCoreData(full);
        return full;
      }catch(e){
        lastErr=e;
        await new Promise(r=>setTimeout(r,350*(attempt+1)));
      }
    }
    throw lastErr||new Error('core_data_load_failed');
  }

  // 기존 enterApp이 화면을 먼저 열고 백그라운드로 데이터를 읽는 구조라
  // 읽기 탭을 빨리 열면 빈 성경읽기/챌린지 화면이 보일 수 있었습니다.
  // 앱 진입 직후 핵심 데이터를 한 번 더 확실히 받아 실제 DB 상태로 덮어씁니다.
  const nativeEnter=window.enterApp;
  window.enterApp=async function(){
    const result=await nativeEnter.apply(this,arguments);

    try{
      await loadCoreDataWithRetry();
    }catch(e){
      console.warn('[core data direct load]',e);
      // 전체 payload가 실패하더라도 주소록은 독립적으로 복구 시도
      try{
        const contacts=await window.YeorinNative.edgeRpc('getContacts',[]);
        if(typeof AD!=='undefined'&&AD){
          AD.contacts=Array.isArray(contacts)?contacts:[];
          if(typeof renderAll==='function')renderAll();
        }
      }catch(ce){
        console.warn('[contacts direct load]',ce);
      }
    }

    return result;
  };

  // 탭 전환 뒤에도 필요하면 수동 재동기화할 수 있게 노출
  window.refreshYeorinCoreData=async function(){
    const full=await loadCoreDataWithRetry();
    try{window.YeorinNative.clearCaches();}catch(e){}
    return full;
  };

  window.YeorinAI={call:aiCall};
  console.log('[Yeorin] GAS-zero patch ready / daily verse local / core data recovery enabled');
})();
