/* 여린교회 커뮤니티 이미지 로딩 핫픽스
 * Supabase private Storage가 반환하는 signedURL은 /storage/v1 기준 상대경로이므로
 * 절대 URL로 보정하고 만료 세션/실패 요청을 한 번 재시도합니다.
 */
(function(){
  'use strict';

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const BUCKET='community-media';
  const cache=new Map();

  function native(){if(!window.YeorinNative)throw new Error('native_engine_not_ready');return window.YeorinNative;}
  function token(){const s=native().session;if(!s||!s.access_token)throw new Error('session_expired');return s.access_token;}
  function encPath(p){return String(p||'').split('/').map(encodeURIComponent).join('/');}
  function absoluteSigned(u){
    u=String(u||'');
    if(!u)return'';
    if(/^https?:\/\//i.test(u))return u;
    if(u.startsWith('/storage/v1/'))return SUPABASE_URL+u;
    return SUPABASE_URL+'/storage/v1'+(u.startsWith('/')?u:'/'+u);
  }
  function cached(path){const c=cache.get(path);return c&&c.expires>Date.now()?c.url:'';}
  function remember(path,url){cache.set(path,{url,expires:Date.now()+50*60*1000});return url;}

  async function freshToken(force){
    const n=native();
    const s=n.session;
    const exp=Number(s&&s.expires_at||0)*1000;
    if(force||!s||!s.access_token||(exp&&exp<Date.now()+120000)){
      // directRpc 내부의 ensureSession이 만료 토큰을 갱신합니다.
      await n.directRpc('yeorin_community_feed',{p_page:0,p_per_page:1});
    }
    return token();
  }

  async function storageFetch(url,opts,timeoutMs){
    for(let attempt=0;attempt<2;attempt++){
      const ctrl=new AbortController();
      const timer=setTimeout(()=>ctrl.abort(),timeoutMs||20000);
      try{
        const headers=Object.assign({},opts&&opts.headers||{}, {
          apikey:SUPABASE_KEY,
          Authorization:'Bearer '+await freshToken(attempt>0)
        });
        const res=await fetch(url,Object.assign({},opts||{},{headers,signal:ctrl.signal}));
        if((res.status===400||res.status===401||res.status===403)&&attempt===0){
          let body='';try{body=await res.clone().text();}catch(e){}
          if(/jwt|token|exp|unauthorized/i.test(body))continue;
        }
        return res;
      }catch(e){
        if(attempt===1)throw(e&&e.name==='AbortError'?new Error('network_timeout'):e);
      }finally{clearTimeout(timer);}
    }
  }

  async function signedUrl(path,force){
    if(!force){const old=cached(path);if(old)return old;}
    const res=await storageFetch(
      SUPABASE_URL+'/storage/v1/object/sign/'+BUCKET+'/'+encPath(path),
      {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})},
      20000
    );
    if(!res||!res.ok)throw new Error('sign_failed_'+(res?res.status:'network'));
    const r=await res.json();
    const u=absoluteSigned(r.signedURL||r.signedUrl||r.signed_url||'');
    if(!u)throw new Error('signed_url_missing');
    return remember(path,u);
  }

  function removeFail(img){const wrap=img&&img.closest&&img.closest('.community-img-wrap');const fail=wrap&&wrap.querySelector('.community-img-fail');if(fail)fail.remove();}
  function showFail(img){
    const wrap=img&&img.closest&&img.closest('.community-img-wrap');
    if(!wrap||wrap.querySelector('.community-img-fail'))return;
    const d=document.createElement('div');
    d.className='community-img-fail';
    d.textContent='사진을 불러오지 못했어요 · 눌러서 다시 시도';
    d.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;font-size:11.5px;font-weight:700;color:var(--ink3);background:#eef0ee;z-index:2;';
    d.onclick=function(ev){ev.stopPropagation();d.remove();fixImage(img,true);};
    wrap.appendChild(d);
  }

  async function fixImage(img,force){
    if(!img||!img.dataset||!img.dataset.communityPath)return;
    if(img.dataset.yeorinFixLoading==='1'&&!force)return;
    img.dataset.yeorinFixLoading='1';
    const path=img.dataset.communityPath;
    try{
      removeFail(img);
      if(force)cache.delete(path);
      const url=await signedUrl(path,!!force);
      await new Promise((resolve,reject)=>{
        img.onload=()=>resolve(true);
        img.onerror=()=>reject(new Error('image_load_failed'));
        img.src=url;
      });
      img.classList.add('ready');
      img.dataset.loaded='1';
      img.dataset.yeorinFixDone='1';
    }catch(e){
      console.warn('[community image fix]',e);
      if(!force){img.dataset.yeorinFixLoading='';return fixImage(img,true);}
      showFail(img);
    }finally{img.dataset.yeorinFixLoading='';}
  }

  function scan(root){
    const scope=root&&root.querySelectorAll?root:document;
    const imgs=Array.from(scope.querySelectorAll('#page-community img[data-community-path], img.community-img[data-community-path]'));
    imgs.forEach(img=>{if(img.dataset.yeorinFixDone!=='1')fixImage(img,false);});
  }

  // 기존 커뮤니티 코드가 잘못된 상대 signedURL을 img.src에 넣은 직후에도 복구합니다.
  document.addEventListener('error',function(ev){
    const img=ev.target;
    if(img&&img.matches&&img.matches('img[data-community-path]'))fixImage(img,true);
  },true);

  const observer=new MutationObserver(function(records){
    for(const rec of records){
      for(const node of rec.addedNodes||[]){
        if(node.nodeType!==1)continue;
        if(node.matches&&node.matches('img[data-community-path]'))fixImage(node,false);
        else scan(node);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.communityImageError=function(img){fixImage(img,true);};

  // 라이트박스도 동일한 보정 URL을 사용합니다.
  window.openCommunityImage=async function(id,index){
    try{
      const article=document.getElementById('community-post-'+id);
      const imgs=article?article.querySelectorAll('img[data-community-path]'):[];
      const img=imgs&&imgs[index];
      const path=img&&img.dataset&&img.dataset.communityPath;
      if(!path)throw new Error('image_path_missing');
      const u=await signedUrl(path,false);
      let root=document.getElementById('communityLightbox');if(root)root.remove();
      root=document.createElement('div');root.id='communityLightbox';root.className='community-lightbox';
      root.onclick=e=>{if(e.target===root)root.remove();};
      root.innerHTML='<button class="community-lightbox-close" onclick="document.getElementById(\'communityLightbox\').remove()">×</button><img src="'+u.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" alt="사진 크게 보기">';
      document.body.appendChild(root);
    }catch(e){console.warn('[community lightbox fix]',e);if(typeof showToast==='function')showToast('사진을 열지 못했어요','error');}
  };

  setTimeout(()=>scan(document),0);
  setTimeout(()=>scan(document),500);
  console.log('[Yeorin] community image signedURL fix ready');
})();
