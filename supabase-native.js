/* 여린교회 Supabase Native Data Engine
 * UI/HTML은 그대로 두고 데이터/인증/캐시만 이 파일에서 담당합니다.
 */
(function(){
  'use strict';

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const AUTH_URL=SUPABASE_URL+'/functions/v1/yeorin-auth';
  const EDGE_RPC_URL=SUPABASE_URL+'/functions/v1/yeorin-rpc';
  const REST_RPC=SUPABASE_URL+'/rest/v1/rpc/';
  const CACHE_TTL=30*60*1000;
  const WEEK_STALE_MS=60*1000;

  let session=null, profile=null;
  try{session=JSON.parse(localStorage.getItem('yeorin_session')||'null');}catch(e){}
  try{profile=JSON.parse(localStorage.getItem('yeorin_profile')||'null');}catch(e){}

  const weekMem=new Map();
  const weekInflight=new Map();
  let dayReqSeq=0;

  function saveSession(s){session=s||null;try{s?localStorage.setItem('yeorin_session',JSON.stringify(s)):localStorage.removeItem('yeorin_session');}catch(e){}}
  function saveProfile(p){profile=p||null;try{p?localStorage.setItem('yeorin_profile',JSON.stringify(p)):localStorage.removeItem('yeorin_profile');}catch(e){}}
  function cacheKey(kind){return 'yeorin_native_'+kind+'_'+String((profile&&profile.id)||'none');}
  function cacheGet(kind,ttl=CACHE_TTL){try{const v=JSON.parse(localStorage.getItem(cacheKey(kind))||'null');return v&&v.ts&&Date.now()-v.ts<ttl?v:null;}catch(e){return null;}}
  function cacheSet(kind,data){try{localStorage.setItem(cacheKey(kind),JSON.stringify({ts:Date.now(),data:data}));}catch(e){}}
  function clearCaches(){try{Object.keys(localStorage).forEach(k=>{if(k.indexOf('yeorin_native_')===0||k.indexOf('yeorin_cache_')===0)localStorage.removeItem(k);});}catch(e){}weekMem.clear();weekInflight.clear();}
  function freshSession(){if(!session||!session.access_token)return false;const exp=Number(session.expires_at||0)*1000;return !exp||exp>Date.now()+60000;}

  async function refreshSession(){
    if(!session||!session.refresh_token)return false;
    try{
      const res=await fetch(AUTH_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify({action:'refresh',refresh_token:session.refresh_token})});
      const r=await res.json();
      if(!res.ok||!r.success||!r.session){saveSession(null);saveProfile(null);return false;}
      saveSession(r.session);if(r.user)saveProfile(r.user);return true;
    }catch(e){return false;}
  }
  async function ensureSession(){return freshSession()?true:refreshSession();}
  function headers(){const h={'Content-Type':'application/json','apikey':SUPABASE_KEY};if(session&&session.access_token)h.Authorization='Bearer '+session.access_token;return h;}

  async function directRpc(name,body,retried){
    if(!await ensureSession())throw new Error('session_expired');
    const res=await fetch(REST_RPC+name,{method:'POST',headers:headers(),body:JSON.stringify(body||{})});
    if(res.status===401&&!retried&&await refreshSession())return directRpc(name,body,true);
    if(!res.ok){let msg='HTTP '+res.status;try{const e=await res.json();msg=e.message||e.error||msg;}catch(_e){}throw new Error(msg);}
    return res.json();
  }

  async function edgeRpc(fn,args,retried){
    if(!await ensureSession())throw new Error('session_expired');
    const res=await fetch(EDGE_RPC_URL,{method:'POST',headers:headers(),body:JSON.stringify({fn:fn,args:args||[]})});
    if(res.status===401&&!retried&&await refreshSession())return edgeRpc(fn,args,true);
    const r=await res.json().catch(()=>({}));
    if(!res.ok||r.error)throw new Error(r.error||('HTTP '+res.status));
    return r.data;
  }

  async function auth(action,args){
    const body=action==='login'
      ?{action:'login',name:String(args[0]||''),password:String(args[1]||'')}
      :{action:'register',name:String(args[0]||''),password:String(args[1]||''),emoji:String(args[2]||'🌿'),bio:String(args[3]||'')};
    const res=await fetch(AUTH_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(body)});
    const r=await res.json().catch(()=>({success:false,error:'로그인 처리 실패'}));
    if(!res.ok&&!r.success)throw new Error(r.error||('HTTP '+res.status));
    if(r.success&&r.session)saveSession(r.session);
    if(r.success&&r.user)saveProfile(r.user);
    return r;
  }

  async function freshLight(){const d=await directRpc('yeorin_light_payload',{});cacheSet('light',d);return d;}
  function weekStart(ds){const p=String(ds).split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);const dow=(d.getDay()+6)%7;d.setDate(d.getDate()-dow);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

  async function fetchWeek(ds,force){
    const ws=weekStart(ds),mem=weekMem.get(ws);
    if(!force&&mem)return mem.data;
    if(!force){const c=cacheGet('week_'+ws,10*60*1000);if(c){weekMem.set(ws,c);return c.data;}}
    if(weekInflight.has(ws))return weekInflight.get(ws);
    const job=directRpc('yeorin_week_posts',{p_week_start:ws}).then(data=>{const v={ts:Date.now(),data:data||{}};weekMem.set(ws,v);cacheSet('week_'+ws,v.data);weekInflight.delete(ws);return v.data;}).catch(e=>{weekInflight.delete(ws);throw e;});
    weekInflight.set(ws,job);return job;
  }
  function cachedWeek(ds){const ws=weekStart(ds),m=weekMem.get(ws);if(m)return m;const c=cacheGet('week_'+ws,10*60*1000);if(c){weekMem.set(ws,c);return c;}return null;}
  function prefetchAround(ds){
    const p=String(ds).split('-'),d=new Date(+p[0],+p[1]-1,+p[2]);[-7,0,7].forEach(n=>{const x=new Date(d);x.setDate(x.getDate()+n);const s=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');fetchWeek(s,false).catch(()=>{});});
  }

  function hydrateLight(d){
    if(!d||typeof CU==='undefined'||!CU)return;
    AD={
      users:d.users||[],myBibleProgress:d.myBibleProgress||[],allBibleProgress:(AD&&AD.allBibleProgress)||{},
      challenges:(AD&&AD.challenges)||[],challengeCerts:(AD&&AD.challengeCerts)||[],calendarEvents:d.calendarEvents||[],
      newCounts:d.newCounts||{qt:0,prayer:0},notices:d.notices||[],contacts:(AD&&AD.contacts)||null
    };
    recentQt=(d.qtRecent&&d.qtRecent.posts)||[];
    recentPr=(d.prayerRecent&&d.prayerRecent.posts)||[];
    postDates=d.postDates||{qt:{},prayer:{}};
    if(typeof initNanumDate==='function')initNanumDate();
    newCounts=AD.newCounts||{qt:0,prayer:0};
    if(typeof updateBadges==='function')updateBadges();
    if(typeof renderAll==='function')renderAll();
    if(typeof nanumDate!=='undefined'&&nanumDate)prefetchAround(nanumDate);
  }

  async function call(fn,args){
    if(fn==='loginUser')return auth('login',args);
    if(fn==='registerUser')return auth('register',args);
    if(fn==='loadAllDataLight'){
      const c=cacheGet('light');
      if(c){freshLight().then(d=>{if(typeof CU!=='undefined'&&CU)hydrateLight(d);}).catch(()=>{});return c.data;}
      return freshLight();
    }
    if(fn==='loadAllData'){
      const r=await Promise.all([freshLight(),directRpc('yeorin_full_extra_payload',{})]);return Object.assign({},r[0],r[1]);
    }
    if(fn==='loadRefreshData')return freshLight();
    if(fn==='getQTPosts')return directRpc('yeorin_qt_posts',{p_filter:String(args[0]||'week'),p_page:Number(args[1]||0),p_per_page:Number(args[2]||10)});
    if(fn==='getPrayerPosts')return directRpc('yeorin_prayer_posts',{p_filter:String(args[0]||'active'),p_page:Number(args[1]||0),p_per_page:Number(args[2]||10)});
    if(fn==='getPostsByDate'){
      const ds=String(args[1]||''),w=await fetchWeek(ds,false),pair=w&&w[ds]||{};return args[0]==='qt'?(pair.qt||{posts:[]}):(pair.prayer||{posts:[]});
    }
    if(fn==='toggleReaction')return directRpc('yeorin_toggle_reaction',{p_target_type:String(args[0]||''),p_target_id:String(args[1]||''),p_key:String(args[2]||'')});
    if(fn==='toggleBibleChapter')return directRpc('yeorin_toggle_bible',{p_book_chapter:String(args[1]||'')});
    if(fn==='toggleBibleChapters')return directRpc('yeorin_toggle_bible_batch',{p_items:Array.isArray(args[1])?args[1]:[]});
    if(fn==='updateReadStatus')return directRpc('yeorin_mark_read',{p_tab:String(args[1]||'')});
    return edgeRpc(fn,args);
  }

  // 기존 UI 함수들은 그대로 이 API만 호출합니다. GAS 네트워크는 더 이상 사용하지 않습니다.
  window.gas=function(fn,...args){return call(fn,args);};
  window.YeorinNative={call,directRpc,edgeRpc,fetchWeek,prefetchAround,clearCaches,get session(){return session;},get profile(){return profile;}};

  // 로그인 성공 후 데이터가 올 때까지 앱 진입을 막지 않습니다.
  window.enterApp=async function(){
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('registerScreen').style.display='none';
    document.getElementById('app').style.display='block';
    if(typeof renderHero==='function')renderHero();

    const cached=cacheGet('light');
    if(cached)hydrateLight(cached.data);
    else document.getElementById('page-main').innerHTML=loadingView('main','여린교회에 오신 걸 환영해요');

    // 화면은 먼저 열고 네트워크는 뒤에서 갱신
    freshLight().then(d=>hydrateLight(d)).catch(e=>console.warn('[native light]',e));
    directRpc('yeorin_full_extra_payload',{}).then(full=>{
      if(!AD)return;
      AD.allBibleProgress=full.allBibleProgress||{};
      AD.challenges=full.challenges||[];
      AD.challengeCerts=full.challengeCerts||[];
      AD.contacts=full.contacts||[];
      if(typeof renderAll==='function')renderAll();
    }).catch(e=>console.warn('[native extra]',e));

    // AI 말씀은 첫 화면 렌더를 막지 않음
    setTimeout(()=>{try{if(typeof loadYeorinDailyVerse==='function')loadYeorinDailyVerse();}catch(e){}},250);
  };

  // 날짜 선택은 이미 받은 주간 메모리에서 즉시 전환합니다.
  window.loadDayPosts=async function(ds,silent){
    const req=++dayReqSeq;_loadedDate=ds;
    const cached=cachedWeek(ds);
    if(cached&&cached.data&&Object.prototype.hasOwnProperty.call(cached.data,ds)){
      const pair=cached.data[ds]||{};
      qtPosts=(pair.qt&&pair.qt.posts)||[];prPosts=(pair.prayer&&pair.prayer.posts)||[];dayLoading=false;
      if(nanumSub==='qt')renderQt();else renderPrayer();
      if(Date.now()-cached.ts>WEEK_STALE_MS)fetchWeek(ds,true).catch(()=>{});
      return;
    }
    dayLoading=true;
    if(!silent){qtPosts=[];prPosts=[];if(nanumSub==='qt')renderQt();else renderPrayer();}
    try{
      const w=await fetchWeek(ds,false);if(req!==dayReqSeq||_loadedDate!==ds)return;
      const pair=w&&w[ds]||{};qtPosts=(pair.qt&&pair.qt.posts)||[];prPosts=(pair.prayer&&pair.prayer.posts)||[];dayLoading=false;
      if(nanumSub==='qt')renderQt();else renderPrayer();prefetchAround(ds);
    }catch(e){dayLoading=false;console.warn('[native day]',e);if(nanumSub==='qt')renderQt();else renderPrayer();}
  };

  // 세션이 살아 있으면 자동 로그인은 네트워크 없이 시작
  window.tryAuto=async function(){
    const oldSaved=localStorage.getItem('yeorin_user');
    try{
      if(profile&&session&&await ensureSession()){
        CU=profile;await window.enterApp();if(typeof restoreLastTab==='function')restoreLastTab();
        const sp=document.getElementById('splash');if(sp){sp.style.opacity='0';setTimeout(()=>sp.style.display='none',160);}return;
      }
      if(oldSaved){
        const d=JSON.parse(oldSaved);if(d&&d.name&&d.pw){const r=await auth('login',[d.name,d.pw]);if(r.success){CU=r.user;localStorage.removeItem('yeorin_user');await window.enterApp();if(typeof restoreLastTab==='function')restoreLastTab();const sp=document.getElementById('splash');if(sp)sp.style.display='none';return;}}
      }
    }catch(e){console.warn('[native auto]',e);}
    saveSession(null);saveProfile(null);localStorage.removeItem('yeorin_user');
    const sp=document.getElementById('splash');if(sp)sp.style.display='none';
    const obSeen=localStorage.getItem('yeorin_obSeen');document.getElementById(obSeen?'loginScreen':'onboarding').style.display=obSeen?'flex':'block';
  };

  const oldLogout=window.doLogout;
  window.doLogout=function(){saveSession(null);saveProfile(null);clearCaches();try{localStorage.removeItem('yeorin_user');}catch(e){};return oldLogout.apply(this,arguments);};

  // 묵상 작성 중에는 빈 상태 일러스트를 숨기고 도우미 캐릭터를 키움
  function polishQt(){
    const page=document.getElementById('page-qt');if(!page)return;
    if(typeof sqf!=='undefined'&&sqf){page.querySelectorAll('.ab-empty').forEach(el=>el.style.display='none');}
    page.querySelectorAll('button').forEach(btn=>{if((btn.textContent||'').indexOf('여린이 묵상 도우미')>-1){btn.style.minHeight='86px';btn.style.display='flex';btn.style.alignItems='center';btn.style.justifyContent='center';btn.style.gap='12px';const img=btn.querySelector('img.yeorin-img');if(img){img.style.height='52px';img.style.width='52px';img.style.objectFit='contain';}}});
  }
  const rq=window.renderQt;window.renderQt=function(){const r=rq.apply(this,arguments);polishQt();return r;};
  const rp=window.renderPrayer;window.renderPrayer=function(){const r=rp.apply(this,arguments);if(typeof spf!=='undefined'&&spf){const p=document.getElementById('page-prayer');if(p)p.querySelectorAll('.ab-empty').forEach(el=>el.style.display='none');}return r;};

  console.log('[Yeorin] Supabase Native engine ready');
})();
