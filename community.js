/* 여린교회 커뮤니티 피드 v1 */
(function(){
  'use strict';

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const BUCKET='community-media';
  const PAGE_SIZE=10;
  const signedCache=new Map();
  const expandedComments=new Set();
  let feedState={posts:[],page:0,hasMore:false,total:0,loading:false,loaded:false};
  let composeFiles=[];

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function encPath(p){return String(p||'').split('/').map(encodeURIComponent).join('/');}
  function native(){if(!window.YeorinNative)throw new Error('native_engine_not_ready');return window.YeorinNative;}
  function token(){const s=native().session;if(!s||!s.access_token)throw new Error('session_expired');return s.access_token;}
  function authUid(){
    try{
      const t=token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const p=JSON.parse(atob(t+'='.repeat((4-t.length%4)%4)));
      return String(p.sub||'');
    }catch(e){return'';}
  }
  function relativeTime(v){
    const d=new Date(v),now=new Date(),sec=Math.max(0,Math.floor((now-d)/1000));
    if(sec<60)return'방금 전';
    const m=Math.floor(sec/60);if(m<60)return m+'분 전';
    const h=Math.floor(m/60);if(h<24)return h+'시간 전';
    const day=Math.floor(h/24);if(day<7)return day+'일 전';
    return (d.getMonth()+1)+'월 '+d.getDate()+'일';
  }
  function uuid(){if(crypto&&crypto.randomUUID)return crypto.randomUUID();return'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});}

  function injectStyles(){
    const style=document.createElement('style');style.id='community-style';style.textContent=`
      #page-community{background:#fff;min-height:calc(100vh - 105px);margin:-22px -20px -110px;padding-bottom:118px;}
      .community-head{position:sticky;top:0;z-index:80;background:rgba(255,255,255,.96);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:space-between;padding:18px 18px 14px;border-bottom:1px solid #f0f1f0;}
      .community-title{font-size:22px;font-weight:900;letter-spacing:-.7px;color:var(--ink);}
      .community-head-sub{font-size:11px;color:var(--ink3);font-weight:700;margin-top:1px;}
      .community-refresh{width:38px;height:38px;border:none;border-radius:50%;background:var(--b0);color:var(--ink2);display:flex;align-items:center;justify-content:center;}
      .community-feed{background:#fff;}
      .community-post{padding:16px 16px 18px;border-bottom:8px solid #f6f7f6;}
      .community-author{display:flex;align-items:center;gap:10px;margin-bottom:11px;}
      .community-avatar{width:38px;height:38px;border-radius:50%;background:var(--brand-soft);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
      .community-author-meta{min-width:0;flex:1;}
      .community-name{font-size:14px;font-weight:800;line-height:1.25;color:var(--ink);}
      .community-time{font-size:11px;color:var(--ink3);font-weight:600;margin-top:2px;}
      .community-more{border:none;background:none;width:34px;height:34px;border-radius:50%;font-size:22px;color:var(--ink3);line-height:1;}
      .community-text{font-size:14.5px;line-height:1.62;color:var(--ink);white-space:pre-wrap;word-break:break-word;margin:0 1px 12px;}
      .community-media{display:grid;gap:3px;border-radius:14px;overflow:hidden;margin:0 -1px 12px;background:#f2f3f2;}
      .community-media.one{grid-template-columns:1fr;}
      .community-media.two,.community-media.four,.community-media.five{grid-template-columns:repeat(2,1fr);}
      .community-media.three{grid-template-columns:repeat(2,1fr);}
      .community-media.three .community-img-wrap:first-child{grid-column:1/3;aspect-ratio:16/9;}
      .community-img-wrap{position:relative;aspect-ratio:1/1;overflow:hidden;background:#eef0ee;cursor:pointer;}
      .community-media.one .community-img-wrap{aspect-ratio:4/3;max-height:430px;}
      .community-img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .2s;}
      .community-img.ready{opacity:1;}
      .community-img-more{position:absolute;inset:0;background:rgba(0,0,0,.36);display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:800;}
      .community-actions{display:flex;align-items:center;gap:17px;padding:2px 0 0;}
      .community-action{display:flex;align-items:center;gap:6px;border:none;background:none;color:var(--ink2);font-size:13px;font-weight:700;padding:6px 0;}
      .community-action.liked{color:#d6535f;}
      .community-action svg{width:21px;height:21px;}
      .community-comments{margin-top:8px;}
      .community-comment{display:flex;gap:7px;padding:5px 0;font-size:13px;line-height:1.45;}
      .community-comment-av{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--brand-soft);font-size:11px;flex-shrink:0;}
      .community-comment-body{flex:1;min-width:0;color:var(--ink2);}
      .community-comment-name{font-weight:800;color:var(--ink);margin-right:5px;}
      .community-comment-more{border:none;background:none;color:var(--ink3);font-size:12px;font-weight:700;padding:3px 0 5px;}
      .community-comment-form{display:flex;align-items:center;gap:7px;margin-top:7px;background:#f5f6f5;border-radius:18px;padding:5px 6px 5px 12px;}
      .community-comment-input{flex:1;border:none;background:transparent;outline:none;font-size:13px;min-width:0;padding:7px 0;color:var(--ink);}
      .community-comment-send{border:none;border-radius:14px;background:var(--brand);color:#fff;font-size:12px;font-weight:800;padding:8px 11px;}
      .community-empty{text-align:center;padding:90px 28px;color:var(--ink3);font-size:13px;line-height:1.75;}
      .community-empty .big{font-size:34px;margin-bottom:10px;}
      .community-load-more{display:block;margin:16px auto 24px;border:none;background:var(--b0);color:var(--ink2);font-size:13px;font-weight:800;padding:11px 24px;border-radius:999px;}
      .community-fab{position:fixed;bottom:94px;right:22px;width:56px;height:56px;border-radius:19px;border:none;background:linear-gradient(150deg,var(--brand2),var(--brand));color:#fff;box-shadow:0 8px 22px rgba(47,107,71,.34);z-index:160;display:none;align-items:center;justify-content:center;}
      .community-fab svg{width:26px;height:26px;}
      @media(min-width:520px){.community-fab{right:calc(50% - (var(--max)/2) + 22px);}}
      .community-overlay{position:fixed;inset:0;background:rgba(20,30,24,.45);z-index:800;display:flex;align-items:flex-end;justify-content:center;}
      .community-compose{width:100%;max-width:var(--max);background:#fff;border-radius:24px 24px 0 0;padding:17px 18px calc(20px + env(safe-area-inset-bottom));max-height:88vh;overflow-y:auto;}
      .community-compose-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;}
      .community-compose-title{font-size:17px;font-weight:900;letter-spacing:-.4px;}
      .community-compose-close{width:34px;height:34px;border:none;border-radius:50%;background:var(--b0);font-size:20px;color:var(--ink2);}
      .community-compose textarea{width:100%;min-height:125px;resize:none;border:none;outline:none;font-size:15px;line-height:1.65;color:var(--ink);padding:6px 2px 12px;background:#fff;}
      .community-photo-row{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none;}
      .community-photo-row::-webkit-scrollbar{display:none;}
      .community-photo-add,.community-preview{width:82px;height:82px;border-radius:14px;flex-shrink:0;overflow:hidden;position:relative;}
      .community-photo-add{border:1.5px dashed var(--line2);background:var(--b0);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--ink3);font-size:11px;font-weight:700;}
      .community-photo-add b{font-size:23px;line-height:1;color:var(--brand2);font-weight:500;margin-bottom:5px;}
      .community-preview img{width:100%;height:100%;object-fit:cover;}
      .community-preview button{position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,.62);color:#fff;font-size:14px;line-height:1;}
      .community-submit{width:100%;border:none;border-radius:15px;background:var(--brand);color:#fff;padding:14px;font-size:14px;font-weight:800;margin-top:3px;}
      .community-submit:disabled{opacity:.45;}
      .community-note{font-size:11px;color:var(--ink3);font-weight:600;margin:0 2px 10px;}
      .community-menu{display:flex;gap:8px;}
      .community-menu button{flex:1;border:none;border-radius:14px;padding:13px;font-size:13px;font-weight:800;}
      .community-menu .edit{background:var(--brand-soft);color:var(--brand);}
      .community-menu .delete{background:#f8e9e7;color:#9b4038;}
      .community-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:950;display:flex;align-items:center;justify-content:center;}
      .community-lightbox img{max-width:100%;max-height:88vh;object-fit:contain;}
      .community-lightbox-close{position:absolute;top:calc(14px + env(safe-area-inset-top));right:14px;width:40px;height:40px;border:none;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:24px;}
      .community-main-link{margin-top:12px;background:#fff;border-radius:22px;padding:17px 18px;box-shadow:var(--shadow);display:flex;align-items:center;gap:13px;cursor:pointer;}
      .community-main-link .icon{width:44px;height:44px;border-radius:15px;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;}
      .community-main-link .text{flex:1;}.community-main-link .title{font-size:15px;font-weight:850;}.community-main-link .sub{font-size:11.5px;color:var(--ink3);font-weight:600;margin-top:2px;}
    `;document.head.appendChild(style);
  }

  function injectDom(){
    const content=document.querySelector('.content');
    if(content&&!document.getElementById('page-community')){
      const page=document.createElement('div');page.className='page';page.id='page-community';content.appendChild(page);
    }
    const inner=document.querySelector('.bottom-inner');
    if(inner&&!document.getElementById('btab-community')){
      const b=document.createElement('button');b.className='btab';b.id='btab-community';b.onclick=()=>window.switchTab('community');
      b.innerHTML='<span class="bico" data-ico="message"></span>커뮤니티';inner.appendChild(b);
    }
    const side=document.querySelector('.side-menu-list');
    if(side&&!document.getElementById('side-community')){
      const b=document.createElement('button');b.id='side-community';b.className='side-menu-item';b.onclick=()=>window.sideMenuGo('community');
      b.innerHTML='<span class="smi-icon" data-ico="message"></span><span>커뮤니티</span><span class="smi-arrow">›</span>';
      const addr=Array.from(side.querySelectorAll('.side-menu-item')).find(x=>x.textContent.includes('여린 주소록'));
      side.insertBefore(b,addr||side.lastElementChild);
    }
    if(!document.getElementById('communityFab')){
      const f=document.createElement('button');f.id='communityFab';f.className='community-fab';f.setAttribute('aria-label','커뮤니티 글쓰기');f.onclick=openComposer;
      f.innerHTML=typeof ico==='function'?ico('plus',26):'+';document.body.appendChild(f);
    }
    if(typeof paintStaticIcons==='function')paintStaticIcons();
  }

  async function loadFeed(reset){
    if(feedState.loading)return;
    feedState.loading=true;
    if(reset){feedState.page=0;feedState.posts=[];}
    renderCommunity();
    try{
      const data=await native().directRpc('yeorin_community_feed',{p_page:feedState.page,p_per_page:PAGE_SIZE});
      feedState.posts=reset?(data.posts||[]):feedState.posts.concat(data.posts||[]);
      feedState.hasMore=!!data.hasMore;feedState.total=Number(data.total)||0;feedState.loaded=true;
    }catch(e){console.warn('[community feed]',e);if(typeof showToast==='function')showToast('커뮤니티를 불러오지 못했어요','error');}
    finally{feedState.loading=false;renderCommunity();}
  }

  function mediaClass(n){return n===1?'one':n===2?'two':n===3?'three':n===4?'four':'five';}
  function mediaHtml(post){
    const arr=post.media||[];if(!arr.length)return'';
    const shown=arr.slice(0,5);
    return '<div class="community-media '+mediaClass(shown.length)+'">'+shown.map((m,i)=>'<div class="community-img-wrap" onclick="openCommunityImage(\''+esc(post.id)+'\','+i+')"><img class="community-img" data-community-path="'+esc(m.storagePath)+'" alt="커뮤니티 사진">'+(i===4&&arr.length>5?'<div class="community-img-more">+'+(arr.length-5)+'</div>':'')+'</div>').join('')+'</div>';
  }
  function commentHtml(c){
    const a=c.author||{};const mine=String(c.authorId||'')===String(CU&&CU.id||'');
    return '<div class="community-comment"><div class="community-comment-av">'+esc(a.emoji||'🌿')+'</div><div class="community-comment-body"><span class="community-comment-name">'+esc(a.name||'교인')+'</span>'+esc(c.text)+(mine?' <button class="c-del" onclick="deleteCommunityComment(\''+esc(c.id)+'\')">삭제</button>':'')+'</div></div>';
  }
  function postHtml(post){
    const a=post.author||{};const hearts=(post.reactions&&post.reactions.heart)||[];const liked=hearts.includes(String(CU&&CU.id||''));const comments=post.comments||[];
    const expanded=expandedComments.has(String(post.id));const visible=expanded?comments:comments.slice(-2);
    return '<article class="community-post" id="community-post-'+esc(post.id)+'">'
      +'<div class="community-author"><div class="community-avatar">'+esc(a.emoji||'🌿')+'</div><div class="community-author-meta"><div class="community-name">'+esc(a.name||'교인')+'</div><div class="community-time">'+relativeTime(post.createdAt)+(post.pinned?' · 고정됨':'')+'</div></div>'+(post.mine?'<button class="community-more" onclick="openCommunityPostMenu(\''+esc(post.id)+'\')">···</button>':'')+'</div>'
      +(post.content?'<div class="community-text">'+esc(post.content)+'</div>':'')+mediaHtml(post)
      +'<div class="community-actions"><button class="community-action '+(liked?'liked':'')+'" onclick="toggleCommunityLike(\''+esc(post.id)+'\')">'+(typeof ico==='function'?ico('heart',21):'♡')+'<span>'+hearts.length+'</span></button><button class="community-action" onclick="toggleCommunityComments(\''+esc(post.id)+'\')">'+(typeof ico==='function'?ico('message',21):'💬')+'<span>'+comments.length+'</span></button></div>'
      +(comments.length?'<div class="community-comments">'+visible.map(commentHtml).join('')+(comments.length>2?'<button class="community-comment-more" onclick="toggleCommunityComments(\''+esc(post.id)+'\')">'+(expanded?'댓글 접기':'댓글 '+comments.length+'개 모두 보기')+'</button>':'')+(expanded?commentForm(post.id):'')+'</div>':(expanded?'<div class="community-comments">'+commentForm(post.id)+'</div>':''))
      +'</article>';
  }
  function commentForm(id){return '<form class="community-comment-form" onsubmit="submitCommunityComment(event,\''+esc(id)+'\')"><input class="community-comment-input" id="community-comment-'+esc(id)+'" maxlength="1000" placeholder="댓글을 남겨보세요"><button class="community-comment-send" type="submit">등록</button></form>';}

  function renderCommunity(){
    const el=document.getElementById('page-community');if(!el)return;
    let body='';
    if(!feedState.loaded&&feedState.loading){body='<div style="padding:20px">'+(typeof skeletonCards==='function'?skeletonCards(3):'불러오는 중...')+'</div>';}
    else if(!feedState.posts.length){body='<div class="community-empty"><div class="big">🌿</div><b>아직 올라온 이야기가 없어요.</b><br>여린교회의 첫 번째 이야기를 남겨보세요.</div>';}
    else body='<div class="community-feed">'+feedState.posts.map(postHtml).join('')+'</div>'+(feedState.hasMore?'<button class="community-load-more" onclick="loadMoreCommunity()">'+(feedState.loading?'불러오는 중...':'이전 글 더 보기')+'</button>':'');
    el.innerHTML='<header class="community-head"><div><div class="community-title">커뮤니티</div><div class="community-head-sub">우리의 일상을 편하게 나눠요</div></div><button class="community-refresh" onclick="refreshCommunity()" aria-label="새로고침">↻</button></header>'+body;
    hydrateCommunityImages();
  }

  async function signedUrl(path){
    const old=signedCache.get(path);if(old&&old.expires>Date.now())return old.url;
    const res=await fetch(SUPABASE_URL+'/storage/v1/object/sign/'+BUCKET+'/'+encPath(path),{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+token()},body:JSON.stringify({expiresIn:3600})});
    if(!res.ok)throw new Error('sign_failed');
    const r=await res.json();let u=r.signedURL||r.signedUrl||r.signed_url||'';if(u&&u.startsWith('/'))u=SUPABASE_URL+u;if(!u)throw new Error('signed_url_missing');
    signedCache.set(path,{url:u,expires:Date.now()+50*60*1000});return u;
  }
  async function hydrateCommunityImages(){
    const imgs=Array.from(document.querySelectorAll('#page-community img[data-community-path]'));
    imgs.forEach(async img=>{if(img.dataset.loading)return;img.dataset.loading='1';try{img.src=await signedUrl(img.dataset.communityPath);img.onload=()=>img.classList.add('ready');}catch(e){console.warn('[community image]',e);}});
  }

  function openComposer(){
    composeFiles=[];
    const root=document.createElement('div');root.id='communityComposeRoot';root.innerHTML=composeHtml('',false);document.body.appendChild(root);renderComposePreviews();
  }
  function composeHtml(content,editing,id){return '<div class="community-overlay" onclick="if(event.target===this)closeCommunityComposer()"><div class="community-compose"><div class="community-compose-head"><div class="community-compose-title">'+(editing?'글 수정':'새 글 작성')+'</div><button class="community-compose-close" onclick="closeCommunityComposer()">×</button></div><textarea id="communityComposeText" maxlength="5000" placeholder="무슨 이야기를 나누고 싶으세요?">'+esc(content||'')+'</textarea>'+(editing?'':'<div id="communityPhotoRow" class="community-photo-row"></div><div class="community-note">사진은 최대 5장까지 올릴 수 있어요. 업로드할 때 자동으로 용량을 줄입니다.</div>')+'<button id="communitySubmitBtn" class="community-submit" onclick="'+(editing?'saveCommunityEdit(\''+esc(id)+'\')':'submitCommunityPost()')+'">'+(editing?'수정하기':'올리기')+'</button></div></div>';}
  function closeCommunityComposer(){const r=document.getElementById('communityComposeRoot');if(r)r.remove();}
  function renderComposePreviews(){
    const row=document.getElementById('communityPhotoRow');if(!row)return;
    row.innerHTML='<label class="community-photo-add"><b>+</b>사진 '+composeFiles.length+'/5<input type="file" accept="image/*" multiple style="display:none" onchange="selectCommunityFiles(this.files)"></label>'+composeFiles.map((x,i)=>'<div class="community-preview"><img src="'+x.preview+'"><button onclick="removeCommunityFile('+i+')">×</button></div>').join('');
  }
  window.selectCommunityFiles=function(files){
    const arr=Array.from(files||[]);for(const f of arr){if(composeFiles.length>=5)break;if(!String(f.type||'').startsWith('image/'))continue;composeFiles.push({file:f,preview:URL.createObjectURL(f)});}renderComposePreviews();
  };
  window.removeCommunityFile=function(i){const x=composeFiles.splice(i,1)[0];if(x&&x.preview)URL.revokeObjectURL(x.preview);renderComposePreviews();};

  async function imageSource(file){
    if('createImageBitmap'in window)return await createImageBitmap(file);
    return await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=e=>{URL.revokeObjectURL(u);reject(e)};im.src=u;});
  }
  async function canvasBlob(canvas,q){return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('image_encode_failed')),'image/webp',q));}
  async function compressImage(file){
    if(file.size>25*1024*1024)throw new Error('image_too_large');
    const src=await imageSource(file);const sw=src.width||src.naturalWidth,sh=src.height||src.naturalHeight;
    let max=1600,scale=Math.min(1,max/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
    let c=document.createElement('canvas');c.width=w;c.height=h;let ctx=c.getContext('2d',{alpha:false});ctx.drawImage(src,0,0,w,h);if(src.close)src.close();
    let q=.82,b=await canvasBlob(c,q);while(b.size>850*1024&&q>.56){q-=.08;b=await canvasBlob(c,q);}if(b.size>1100*1024&&Math.max(w,h)>1200){scale=1200/Math.max(w,h);const c2=document.createElement('canvas');c2.width=Math.round(w*scale);c2.height=Math.round(h*scale);c2.getContext('2d',{alpha:false}).drawImage(c,0,0,c2.width,c2.height);c=c2;b=await canvasBlob(c,.68);}return b;
  }
  async function uploadBlob(path,blob){
    const res=await fetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encPath(path),{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+token(),'Content-Type':'image/webp','x-upsert':'false','cache-control':'3600'},body:blob});
    if(!res.ok){let m='upload_failed';try{const r=await res.json();m=r.message||r.error||m;}catch(e){}throw new Error(m);}return true;
  }
  async function removeStored(path){
    try{await fetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encPath(path),{method:'DELETE',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+token()}});}catch(e){}
    signedCache.delete(path);
  }

  window.submitCommunityPost=async function(){
    const text=(document.getElementById('communityComposeText').value||'').trim();if(!text&&!composeFiles.length){showToast('내용이나 사진을 넣어주세요','error');return;}
    const btn=document.getElementById('communitySubmitBtn');btn.disabled=true;btn.textContent=composeFiles.length?'사진 최적화 중...':'올리는 중...';
    const postId=uuid(),uid=authUid();if(!uid){btn.disabled=false;showToast('로그인 정보를 다시 확인해주세요','error');return;}
    const uploaded=[];
    try{
      for(let i=0;i<composeFiles.length;i++){
        btn.textContent='사진 '+(i+1)+'/'+composeFiles.length+' 준비 중...';const blob=await compressImage(composeFiles[i].file);const path=uid+'/'+postId+'/'+String(i+1).padStart(2,'0')+'.webp';await uploadBlob(path,blob);uploaded.push(path);
      }
      btn.textContent='올리는 중...';await native().directRpc('yeorin_community_create',{p_post_id:postId,p_content:text,p_media_paths:uploaded});
      closeCommunityComposer();showToast('게시글을 올렸어요','success');await loadFeed(true);
    }catch(e){console.warn('[community create]',e);for(const p of uploaded)await removeStored(p);btn.disabled=false;btn.textContent='올리기';showToast('게시글을 올리지 못했어요','error');}
  };

  window.toggleCommunityLike=async function(id){
    const p=feedState.posts.find(x=>String(x.id)===String(id));if(!p)return;const list=(p.reactions&&p.reactions.heart)||[];const me=String(CU&&CU.id||''),had=list.includes(me);
    p.reactions=p.reactions||{};p.reactions.heart=had?list.filter(x=>x!==me):list.concat(me);renderCommunity();
    try{await native().directRpc('yeorin_toggle_reaction',{p_target_type:'community',p_target_id:String(id),p_key:'heart'});}catch(e){p.reactions.heart=list;renderCommunity();showToast('공감을 저장하지 못했어요','error');}
  };
  window.toggleCommunityComments=function(id){const k=String(id);expandedComments.has(k)?expandedComments.delete(k):expandedComments.add(k);renderCommunity();setTimeout(()=>{const el=document.getElementById('community-comment-'+k);if(el&&expandedComments.has(k))el.focus();},30);};
  window.submitCommunityComment=async function(ev,id){ev.preventDefault();const input=document.getElementById('community-comment-'+id);const text=(input.value||'').trim();if(!text)return;input.disabled=true;try{const r=await native().directRpc('yeorin_community_add_comment',{p_post_id:id,p_text:text});const p=feedState.posts.find(x=>String(x.id)===String(id));if(p){p.comments=p.comments||[];p.comments.push(r.comment);}renderCommunity();}catch(e){input.disabled=false;showToast('댓글을 등록하지 못했어요','error');}};
  window.deleteCommunityComment=async function(id){if(!confirm('댓글을 삭제할까요?'))return;try{await native().directRpc('yeorin_community_delete_comment',{p_comment_id:id});feedState.posts.forEach(p=>p.comments=(p.comments||[]).filter(c=>String(c.id)!==String(id)));renderCommunity();}catch(e){showToast('댓글을 삭제하지 못했어요','error');}};

  window.openCommunityPostMenu=function(id){
    const p=feedState.posts.find(x=>String(x.id)===String(id));if(!p)return;
    const root=document.createElement('div');root.id='communityComposeRoot';root.innerHTML='<div class="community-overlay" onclick="if(event.target===this)closeCommunityComposer()"><div class="community-compose"><div class="community-compose-head"><div class="community-compose-title">게시글 관리</div><button class="community-compose-close" onclick="closeCommunityComposer()">×</button></div><div class="community-menu"><button class="edit" onclick="openCommunityEdit(\''+esc(id)+'\')">수정</button><button class="delete" onclick="deleteCommunityPost(\''+esc(id)+'\')">삭제</button></div></div></div>';document.body.appendChild(root);
  };
  window.openCommunityEdit=function(id){const p=feedState.posts.find(x=>String(x.id)===String(id));if(!p)return;closeCommunityComposer();const root=document.createElement('div');root.id='communityComposeRoot';root.innerHTML=composeHtml(p.content||'',true,id);document.body.appendChild(root);};
  window.saveCommunityEdit=async function(id){const text=(document.getElementById('communityComposeText').value||'').trim();const p=feedState.posts.find(x=>String(x.id)===String(id));if(!p)return;if(!text&&!(p.media||[]).length){showToast('내용이 없는 글은 저장할 수 없어요','error');return;}const btn=document.getElementById('communitySubmitBtn');btn.disabled=true;try{await native().directRpc('yeorin_community_update',{p_post_id:id,p_content:text});p.content=text;closeCommunityComposer();renderCommunity();showToast('수정했어요','success');}catch(e){btn.disabled=false;showToast('수정하지 못했어요','error');}};
  window.deleteCommunityPost=async function(id){if(!confirm('게시글을 삭제할까요?'))return;const p=feedState.posts.find(x=>String(x.id)===String(id));closeCommunityComposer();try{for(const m of (p&&p.media)||[])await removeStored(m.storagePath);await native().directRpc('yeorin_community_delete',{p_post_id:id});feedState.posts=feedState.posts.filter(x=>String(x.id)!==String(id));renderCommunity();showToast('삭제했어요','success');}catch(e){console.warn('[community delete]',e);showToast('게시글을 삭제하지 못했어요','error');}};
  window.closeCommunityComposer=closeCommunityComposer;
  window.refreshCommunity=()=>loadFeed(true);
  window.loadMoreCommunity=async function(){if(feedState.loading||!feedState.hasMore)return;feedState.page+=1;await loadFeed(false);};

  window.openCommunityImage=async function(id,index){
    const p=feedState.posts.find(x=>String(x.id)===String(id));const m=p&&p.media&&p.media[index];if(!m)return;try{const u=await signedUrl(m.storagePath);const root=document.createElement('div');root.id='communityLightbox';root.className='community-lightbox';root.onclick=e=>{if(e.target===root)root.remove();};root.innerHTML='<button class="community-lightbox-close" onclick="document.getElementById(\'communityLightbox\').remove()">×</button><img src="'+esc(u)+'" alt="사진 크게 보기">';document.body.appendChild(root);}catch(e){showToast('사진을 열지 못했어요','error');}
  };

  function installHooks(){
    const baseSwitch=window.switchTab;
    window.switchTab=function(id){
      const r=baseSwitch.apply(this,arguments);const hero=document.getElementById('hero'),sheet=document.querySelector('.sheet'),fab=document.getElementById('communityFab');
      if(hero)hero.style.display=id==='community'?'none':'';if(sheet)sheet.style.marginTop=id==='community'?'0':'';if(fab)fab.style.display=id==='community'?'flex':'none';
      if(id==='community'){document.querySelectorAll('.btab').forEach(b=>b.classList.remove('active'));document.getElementById('btab-community')?.classList.add('active');if(!feedState.loaded)loadFeed(true);else renderCommunity();}
      return r;
    };
    const baseRenderAll=window.renderAll;
    window.renderAll=function(){const r=baseRenderAll.apply(this,arguments);if(typeof curTab!=='undefined'&&curTab==='community')renderCommunity();return r;};
    const baseRenderMain=window.renderMain;
    window.renderMain=function(){baseRenderMain.apply(this,arguments);const el=document.getElementById('page-main');if(el&&!el.querySelector('.community-main-link'))el.insertAdjacentHTML('beforeend','<div class="community-main-link" onclick="switchTab(\'community\')"><div class="icon">'+(typeof ico==='function'?ico('message',22):'💬')+'</div><div class="text"><div class="title">커뮤니티</div><div class="sub">교회 일상과 사진을 자유롭게 나눠요</div></div><span style="color:var(--ink3)">›</span></div>');};
    const baseRestore=window.restoreLastTab;
    window.restoreLastTab=function(){try{const t=localStorage.getItem('yeorin_lastTab'),at=Number(localStorage.getItem('yeorin_lastTabAt')||0);if(t==='community'&&at&&Date.now()-at<30*60*1000){window.switchTab('community');return;}}catch(e){}return baseRestore.apply(this,arguments);};
  }

  injectStyles();injectDom();installHooks();
  console.log('[Yeorin] community feed ready');
})();
