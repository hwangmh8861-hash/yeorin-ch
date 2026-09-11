import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
await mkdir(dist, { recursive: true });

async function copyDir(src, dst) {
  await mkdir(dst, { recursive: true });
  for (const name of await readdir(src)) {
    if (['.git', 'dist', 'node_modules'].includes(name)) continue;
    const from = join(src, name);
    const to = join(dst, name);
    const info = await stat(from);
    if (info.isDirectory()) await copyDir(from, to);
    else if (name !== 'index.html' && name !== 'build.mjs' && name !== 'package.json' && name !== 'vercel.json') await copyFile(from, to);
  }
}
await copyDir(root, dist);

let html = await readFile(join(root, 'index.html'), 'utf8');

const oldGas = `function gas(fn,...a){
  return fetch(window.GAS_URL,{
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({fn:fn,args:a})
  }).then(function(res){
    if(!res.ok)throw new Error('HTTP '+res.status);
    return res.json();
  }).then(function(r){
    if(r.error)throw new Error(r.error);
    return r.data;
  });
}`;

const newGas = `const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
const YEORIN_AUTH_URL=SUPABASE_URL+'/functions/v1/yeorin-auth';
const YEORIN_RPC_URL=SUPABASE_URL+'/functions/v1/yeorin-rpc';
const YEORIN_REST_RPC=SUPABASE_URL+'/rest/v1/rpc/';
const YEORIN_CACHE_TTL=30*60*1000;
let YEORIN_SESSION=null;
let YEORIN_PROFILE=null;
try{YEORIN_SESSION=JSON.parse(localStorage.getItem('yeorin_session')||'null');}catch(e){}
try{YEORIN_PROFILE=JSON.parse(localStorage.getItem('yeorin_profile')||'null');}catch(e){}

function saveYeorinSession(s){
  YEORIN_SESSION=s||null;
  try{
    if(s)localStorage.setItem('yeorin_session',JSON.stringify(s));
    else localStorage.removeItem('yeorin_session');
  }catch(e){}
}
function saveYeorinProfile(p){
  YEORIN_PROFILE=p||null;
  try{
    if(p)localStorage.setItem('yeorin_profile',JSON.stringify(p));
    else localStorage.removeItem('yeorin_profile');
  }catch(e){}
}
function yeorinSessionFresh(){
  if(!YEORIN_SESSION||!YEORIN_SESSION.access_token)return false;
  const exp=Number(YEORIN_SESSION.expires_at||0)*1000;
  return !exp||exp>Date.now()+60000;
}
function yeorinCacheKey(kind){return 'yeorin_cache_'+kind+'_'+String((YEORIN_PROFILE&&YEORIN_PROFILE.id)||'none');}
function getYeorinCache(kind){
  try{
    const v=JSON.parse(localStorage.getItem(yeorinCacheKey(kind))||'null');
    if(!v||!v.ts||Date.now()-v.ts>YEORIN_CACHE_TTL)return null;
    return v.data||null;
  }catch(e){return null;}
}
function setYeorinCache(kind,data){
  try{localStorage.setItem(yeorinCacheKey(kind),JSON.stringify({ts:Date.now(),data:data}));}catch(e){}
}
function clearYeorinCaches(){
  try{
    Object.keys(localStorage).forEach(function(k){if(k.indexOf('yeorin_cache_')===0)localStorage.removeItem(k);});
  }catch(e){}
}
function invalidateYeorinLightCache(){
  try{localStorage.removeItem(yeorinCacheKey('light'));}catch(e){}
}

async function refreshYeorinSession(){
  if(!YEORIN_SESSION||!YEORIN_SESSION.refresh_token)return false;
  try{
    const res=await fetch(YEORIN_AUTH_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({action:'refresh',refresh_token:YEORIN_SESSION.refresh_token})
    });
    const r=await res.json();
    if(!res.ok||!r.success||!r.session){saveYeorinSession(null);saveYeorinProfile(null);clearYeorinCaches();return false;}
    saveYeorinSession(r.session);
    if(r.user)saveYeorinProfile(r.user);
    return true;
  }catch(e){return false;}
}
async function ensureYeorinSession(){
  if(yeorinSessionFresh())return true;
  return await refreshYeorinSession();
}
function yeorinHeaders(){
  const h={'Content-Type':'application/json','apikey':SUPABASE_KEY};
  if(YEORIN_SESSION&&YEORIN_SESSION.access_token)h.Authorization='Bearer '+YEORIN_SESSION.access_token;
  return h;
}
async function directRpc(name,body,retried){
  if(!await ensureYeorinSession())throw new Error('session_expired');
  const res=await fetch(YEORIN_REST_RPC+name,{method:'POST',headers:yeorinHeaders(),body:JSON.stringify(body||{})});
  if(res.status===401&&!retried&&await refreshYeorinSession())return directRpc(name,body,true);
  if(!res.ok){let msg='HTTP '+res.status;try{const e=await res.json();msg=e.message||e.error||msg;}catch(_e){}throw new Error(msg);}
  return await res.json();
}
function applyFreshLight(d){
  try{
    if(typeof AD==='undefined'||!AD||typeof CU==='undefined'||!CU||!d)return;
    AD.users=d.users||AD.users;
    AD.myBibleProgress=d.myBibleProgress||AD.myBibleProgress;
    AD.calendarEvents=d.calendarEvents||AD.calendarEvents;
    AD.newCounts=d.newCounts||AD.newCounts;
    AD.notices=d.notices||AD.notices;
    if(typeof recentQt!=='undefined')recentQt=(d.qtRecent&&d.qtRecent.posts)||recentQt;
    if(typeof recentPr!=='undefined')recentPr=(d.prayerRecent&&d.prayerRecent.posts)||recentPr;
    if(typeof postDates!=='undefined')postDates=d.postDates||postDates;
    if(typeof newCounts!=='undefined')newCounts=d.newCounts||newCounts;
    if(typeof updateBadges==='function')updateBadges();
    if(typeof renderAll==='function')renderAll();
  }catch(e){console.warn('[fresh-light]',e);}
}
async function freshLight(){
  const d=await directRpc('yeorin_light_payload',{});
  setYeorinCache('light',d);
  return d;
}

async function gas(fn,...a){
  if(fn==='loginUser'||fn==='registerUser'){
    const body=fn==='loginUser'
      ?{action:'login',name:String(a[0]||''),password:String(a[1]||'')}
      :{action:'register',name:String(a[0]||''),password:String(a[1]||''),emoji:String(a[2]||'🌿'),bio:String(a[3]||'')};
    const res=await fetch(YEORIN_AUTH_URL,{
      method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(body)
    });
    const r=await res.json();
    if(!res.ok&&!r.success)throw new Error(r.error||('HTTP '+res.status));
    if(r.success&&r.session)saveYeorinSession(r.session);
    if(r.success&&r.user)saveYeorinProfile(r.user);
    return r;
  }

  if(fn==='loadAllDataLight'){
    const cached=getYeorinCache('light');
    if(cached){
      freshLight().then(applyFreshLight).catch(function(){});
      return cached;
    }
    return await freshLight();
  }
  if(fn==='loadAllData'){
    const pair=await Promise.all([freshLight(),directRpc('yeorin_full_extra_payload',{})]);
    return Object.assign({},pair[0],pair[1]);
  }
  if(fn==='loadRefreshData'){
    const qf=String(a[1]||'week'),pf=String(a[2]||'active');
    const light=await freshLight();
    if(qf!=='week'||pf!=='active'){
      const pair=await Promise.all([
        qf==='week'?Promise.resolve(light.qtData):directRpc('yeorin_qt_posts',{p_filter:qf,p_page:0,p_per_page:10}),
        pf==='active'?Promise.resolve(light.prayerData):directRpc('yeorin_prayer_posts',{p_filter:pf,p_page:0,p_per_page:10})
      ]);
      light.qtData=pair[0];light.qtRecent=pair[0];light.prayerData=pair[1];light.prayerRecent=pair[1];
    }
    return light;
  }
  if(fn==='getQTPosts')return await directRpc('yeorin_qt_posts',{p_filter:String(a[0]||'week'),p_page:Number(a[1]||0),p_per_page:Number(a[2]||10)});
  if(fn==='getPrayerPosts')return await directRpc('yeorin_prayer_posts',{p_filter:String(a[0]||'active'),p_page:Number(a[1]||0),p_per_page:Number(a[2]||10)});
  if(fn==='getPostsByDate')return await directRpc('yeorin_posts_by_date',{p_type:String(a[0]||''),p_date:String(a[1]||'')});
  if(fn==='toggleReaction'){
    const r=await directRpc('yeorin_toggle_reaction',{p_target_type:String(a[0]||''),p_target_id:String(a[1]||''),p_key:String(a[2]||'')});invalidateYeorinLightCache();return r;
  }
  if(fn==='toggleBibleChapter'){
    const r=await directRpc('yeorin_toggle_bible',{p_book_chapter:String(a[1]||'')});invalidateYeorinLightCache();return r;
  }
  if(fn==='toggleBibleChapters'){
    const r=await directRpc('yeorin_toggle_bible_batch',{p_items:Array.isArray(a[1])?a[1]:[]});invalidateYeorinLightCache();return r;
  }
  if(fn==='updateReadStatus')return await directRpc('yeorin_mark_read',{p_tab:String(a[1]||'')});

  if(!await ensureYeorinSession())throw new Error('session_expired');
  async function callEdge(){
    return fetch(YEORIN_RPC_URL,{method:'POST',headers:yeorinHeaders(),body:JSON.stringify({fn:fn,args:a})});
  }
  let res=await callEdge();
  if(res.status===401&&await refreshYeorinSession())res=await callEdge();
  if(!res.ok)throw new Error('HTTP '+res.status);
  const r=await res.json();
  if(r.error)throw new Error(r.error);
  if(!/^(get|load|ask)/.test(fn)&&fn!=='clearDailyVerseCache')invalidateYeorinLightCache();
  return r.data;
}`;

if (!html.includes(oldGas)) throw new Error('기존 gas() 블록을 찾지 못했습니다. 원본 index.html이 변경됐는지 확인하세요.');
html = html.replace(oldGas, newGas);

// Supabase 세션이 살아 있으면 비밀번호 재로그인 없이 즉시 진입합니다.
const autoStart = html.indexOf('async function tryAuto(){');
const autoTail = "\n}\nsetTimeout(function(){try{tryAuto();}catch(e){}},300);";
const autoEnd = autoStart >= 0 ? html.indexOf(autoTail, autoStart) : -1;
if (autoStart < 0 || autoEnd < 0) throw new Error('tryAuto 블록을 찾지 못했습니다.');
const newTryAuto = `async function tryAuto(){
  const oldSaved=localStorage.getItem('yeorin_user');
  setSplashMsg('자동 로그인 중...');
  try{
    if(YEORIN_PROFILE&&YEORIN_SESSION&&await ensureYeorinSession()){
      CU=YEORIN_PROFILE;
      setSplashMsg('환영합니다, '+CU.name+'님');
      await enterApp();
      restoreLastTab();
      setTimeout(function(){
        const sp=document.getElementById('splash');
        sp.style.transition='opacity .22s';sp.style.opacity='0';
        setTimeout(function(){sp.style.display='none';},240);
      },60);
      return;
    }
    if(oldSaved){
      const d=JSON.parse(oldSaved);
      if(d&&d.name&&d.pw){
        const r=await gas('loginUser',String(d.name),String(d.pw));
        if(r.success){
          CU=r.user;saveYeorinProfile(r.user);localStorage.removeItem('yeorin_user');
          setSplashMsg('환영합니다, '+r.user.name+'님');
          await enterApp();restoreLastTab();
          setTimeout(function(){
            const sp=document.getElementById('splash');
            sp.style.transition='opacity .22s';sp.style.opacity='0';
            setTimeout(function(){sp.style.display='none';},240);
          },60);
          return;
        }
      }
    }
  }catch(e){console.warn('[auto-login]',e);}
  saveYeorinSession(null);saveYeorinProfile(null);clearYeorinCaches();localStorage.removeItem('yeorin_user');
  document.getElementById('splash').style.display='none';
  const obSeen=localStorage.getItem('yeorin_obSeen');
  if(obSeen)document.getElementById('loginScreen').style.display='flex';
  else document.getElementById('onboarding').style.display='block';
}`;
html = html.slice(0, autoStart) + newTryAuto + html.slice(autoEnd + 2);

// 로그인/가입 성공 후 평문 비밀번호를 저장하지 않습니다.
const oldCredentialSave = "localStorage.setItem('yeorin_user',JSON.stringify({name:n,pw:p}));";
html = html.split(oldCredentialSave).join("saveYeorinProfile(r.user); localStorage.removeItem('yeorin_user');");

const logoutNeedle = `  localStorage.removeItem('yeorin_user');\n  localStorage.removeItem('yeorin_lastTab');`;
const logoutReplacement = `  localStorage.removeItem('yeorin_user');\n  saveYeorinSession(null);\n  saveYeorinProfile(null);\n  clearYeorinCaches();\n  localStorage.removeItem('yeorin_lastTab');`;
if (!html.includes(logoutNeedle)) throw new Error('로그아웃 블록을 찾지 못했습니다.');
html = html.replace(logoutNeedle, logoutReplacement);

await writeFile(join(dist, 'index.html'), html, 'utf8');
console.log('Yeorin Supabase turbo build complete');
