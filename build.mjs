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
try{YEORIN_SESSION=JSON.parse(localStorage.getItem('yeorin_session')||'null');}catch(e){}

function saveYeorinSession(s){
  YEORIN_SESSION=s||null;
  try{
    if(s)localStorage.setItem('yeorin_session',JSON.stringify(s));
    else localStorage.removeItem('yeorin_session');
  }catch(e){}
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
    if(!res.ok||!r.success||!r.session){saveYeorinSession(null);return false;}
    saveYeorinSession(r.session);
    return true;
  }catch(e){return false;}
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
    return r;
  }

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

const logoutNeedle = `  localStorage.removeItem('yeorin_user');\n  localStorage.removeItem('yeorin_lastTab');`;
const logoutReplacement = `  localStorage.removeItem('yeorin_user');\n  saveYeorinSession(null);\n  localStorage.removeItem('yeorin_lastTab');`;
if (!html.includes(logoutNeedle)) throw new Error('로그아웃 블록을 찾지 못했습니다.');
html = html.replace(logoutNeedle, logoutReplacement);

await writeFile(join(dist, 'index.html'), html, 'utf8');
console.log('Yeorin Supabase build complete');
