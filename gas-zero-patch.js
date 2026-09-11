/* 여린교회 GAS 제거 전환 패치
 * AI 호출은 Supabase Edge Function(yeorin-ai)로, 주소록은 Supabase RPC로 직접 보강합니다.
 */
(function(){
  'use strict';

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const AI_URL=SUPABASE_URL+'/functions/v1/yeorin-ai';
  const AI_FUNCTIONS=new Set(['askYeorinBible','askYeorinQT','askYeorinPrayer','getDailyVerseForUser','clearDailyVerseCache']);

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
      // 기존 native RPC를 한 번 호출하면 만료 세션이 자동 갱신됩니다.
      await native.edgeRpc('getAllUsers',[]).catch(()=>{});
      return aiCall(fn,args,true);
    }

    const r=await res.json().catch(()=>({}));
    if(!res.ok||r.error)throw new Error(r.error||('HTTP '+res.status));
    return r.data;
  }

  const nativeGas=window.gas;
  window.gas=async function(fn,...args){
    if(AI_FUNCTIONS.has(fn))return aiCall(fn,args);
    return nativeGas(fn,...args);
  };

  // 주소록은 전체 부가 데이터 로딩과 별도로 한 번 더 직접 불러옵니다.
  // 전체 payload 일부가 실패하더라도 주소록 화면만큼은 독립적으로 살아 있게 합니다.
  const nativeEnter=window.enterApp;
  window.enterApp=async function(){
    const result=await nativeEnter.apply(this,arguments);
    Promise.resolve().then(async()=>{
      try{
        const contacts=await window.YeorinNative.edgeRpc('getContacts',[]);
        if(typeof AD!=='undefined'&&AD){
          AD.contacts=Array.isArray(contacts)?contacts:[];
          if(typeof renderAll==='function')renderAll();
        }
      }catch(e){
        console.warn('[contacts direct load]',e);
        if(typeof AD!=='undefined'&&AD&&AD.contacts===null){
          AD.contacts=[];
          if(typeof renderAll==='function')renderAll();
        }
      }
    });
    return result;
  };

  window.YeorinAI={call:aiCall};
  console.log('[Yeorin] GAS-zero patch ready');
})();
