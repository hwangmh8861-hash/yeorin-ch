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

async function refreshYeorinSession(){
  if(!YEORIN_SESSION||!YEORIN_SESSION.refresh_token)return false;
  try{
    const res=await fetch(YEORIN_AUTH_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({action:'refresh',refresh_token:YEORIN_SESSION.refresh_token})
    });
    const r=await res.json();
    if(!res.ok||!r.success||!r.session){saveYeorinSession(null);saveYeorinProfile(null);return false;}
    saveYeorinSession(r.session);
    if(r.user)saveYeorinProfile(r.user);
    return true;
  }catch(e){return false;}
}

async function ensureYeorinSession(){
  if(yeorinSessionFresh())return true;
  return await refreshYeorinSession();
}

async function gas(fn,...a){
  if(fn==='loginUser'||fn==='registerUser'){
    const body=fn==='loginUser'
      ?{action:'login',name:String(a[0]||''),password:String(a[1]||'')}
      :{action:'register',name:String(a[0]||''),password:String(a[1]||''),emoji:String(a[2]||'🌿'),bio:String(a[3]||'')};
    const res=await fetch(YEORIN_AUTH_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify(body)
    });
    const r=await res.json();
    if(!res.ok&&!r.success)throw new Error(r.error||('HTTP '+res.status));
    if(r.success&&r.session)saveYeorinSession(r.session);
    if(r.success&&r.user)saveYeorinProfile(r.user);
    return r;
  }

  if(!await ensureYeorinSession())throw new Error('session_expired');
  async function callRpc(){
    const headers={'Content-Type':'application/json','apikey':SUPABASE_KEY};
    if(YEORIN_SESSION&&YEORIN_SESSION.access_token)headers.Authorization='Bearer '+YEORIN_SESSION.access_token;
    return fetch(YEORIN_RPC_URL,{method:'POST',headers:headers,body:JSON.stringify({fn:fn,args:a})});
  }

  let res=await callRpc();
  if(res.status===401&&await refreshYeorinSession())res=await callRpc();
  if(!res.ok)throw new Error('HTTP '+res.status);
  const r=await res.json();
  if(r.error)throw new Error(r.error);
  return r.data;
}`;

if (!html.includes(oldGas)) throw new Error('기존 gas() 블록을 찾지 못했습니다. 원본 index.html이 변경됐는지 확인하세요.');
html = html.replace(oldGas, newGas);

// 기존에는 앱을 열 때마다 이름/비밀번호로 로그인 요청을 다시 보냈습니다.
// Supabase 세션과 프로필이 있으면 즉시 재사용하고, 예전 로컬 데이터는 1회만 자동 이전합니다.
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
        sp.style.transition='opacity .35s';sp.style.opacity='0';
        setTimeout(function(){sp.style.display='none';},380);
      },180);
      return;
    }

    // 구버전에서 저장해 둔 이름/비밀번호가 있으면 첫 1회만 Supabase로 전환
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
            sp.style.transition='opacity .35s';sp.style.opacity='0';
            setTimeout(function(){sp.style.display='none';},380);
          },180);
          return;
        }
      }
    }
  }catch(e){console.warn('[auto-login]',e);}

  saveYeorinSession(null);saveYeorinProfile(null);localStorage.removeItem('yeorin_user');
  document.getElementById('splash').style.display='none';
  const obSeen=localStorage.getItem('yeorin_obSeen');
  if(obSeen)document.getElementById('loginScreen').style.display='flex';
  else document.getElementById('onboarding').style.display='block';
}`;
html = html.slice(0, autoStart) + newTryAuto + html.slice(autoEnd + 2);

// 로그인/가입 성공 후 평문 비밀번호를 localStorage에 다시 저장하지 않습니다.
const oldCredentialSave = "localStorage.setItem('yeorin_user',JSON.stringify({name:n,pw:p}));";
html = html.split(oldCredentialSave).join("saveYeorinProfile(r.user); localStorage.removeItem('yeorin_user');");

const logoutNeedle = `  localStorage.removeItem('yeorin_user');\n  localStorage.removeItem('yeorin_lastTab');`;
const logoutReplacement = `  localStorage.removeItem('yeorin_user');\n  saveYeorinSession(null);\n  saveYeorinProfile(null);\n  localStorage.removeItem('yeorin_lastTab');`;
if (!html.includes(logoutNeedle)) throw new Error('로그아웃 블록을 찾지 못했습니다.');
html = html.replace(logoutNeedle, logoutReplacement);

await writeFile(join(dist, 'index.html'), html, 'utf8');
console.log('Yeorin Supabase optimized build complete');
