/* 여린교회 커뮤니티 피드 v1 */
(function(){
  'use strict';

  const SUPABASE_URL='https://putqauaiboychaalgyew.supabase.co';
  const SUPABASE_KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV';
  const BUCKET='community-media';
  const PAGE_SIZE=10;
  const LINK_PREVIEW_URL=SUPABASE_URL+'/functions/v1/yeorin-link-preview';
  const COLORS={'빨강':'#D64545','주황':'#E07B24','초록':'#2F8A4E','파랑':'#2F6FD6','보라':'#7B4FD6','회색':'#8A8F8C'};
  const SIZES={'크게':'big','작게':'small'};
  const EMOJIS=['😊','😂','🥰','😍','🤗','😅','🥲','😭','🤔','😴','🙏','🙌','👏','👍','💪','🎉','🎂','❤️','💕','✨','🔥','🌿','🌸','💐','☀️','📖','✝️','⛪','☕','🍚'];
  const URL_RE=/\b(?:https?:\/\/|www\.)(?:(?!&(?:quot|#39|lt|gt);)[^\s<>])+/gi;
  const RAW_URL_RE=/\b(?:https?:\/\/|www\.)[^\s<>"'\[\]]+/i;
  const linkCache=new Map();
  const linkRequested=new Set();
  let compose={mode:'new',linkUrl:null,linkPreview:null,linkLoading:false,dismissed:null,poll:null,timer:null,palette:''};
  const signedCache=new Map();
  const expandedComments=new Set();
  let feedState={posts:[],page:0,hasMore:false,total:0,loading:false,loaded:false};
  let composeFiles=[];

  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
  function encPath(p){return String(p||'').split('/').map(encodeURIComponent).join('/');}
  function native(){if(!window.YeorinNative)throw new Error('native_engine_not_ready');return window.YeorinNative;}
  function token(){const s=native().session;if(!s||!s.access_token)throw new Error('session_expired');return s.access_token;}
  // 앱을 오래 켜두면 로그인 토큰이 만료돼 사진 업로드·표시가 막히므로, 스토리지 요청 전에 항상 갱신 여부를 확인합니다.
  async function freshToken(force){
    const n=native();
    if(force&&typeof n.refreshSession==='function'){await n.refreshSession();return token();}
    const s=n.session;
    const exp=Number(s&&s.expires_at||0)*1000;
    if(force||!s||!s.access_token||(exp&&exp<Date.now()+120000)){
      if(typeof n.ensureSession==='function')await n.ensureSession();
      else await n.directRpc('yeorin_community_feed',{p_page:0,p_per_page:1}).catch(()=>{});
    }
    return token();
  }
  async function storageFetch(url,opts,timeoutMs){
    for(let attempt=0;attempt<2;attempt++){
      const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeoutMs||30000);
      try{
        const headers=Object.assign({},opts.headers||{},{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+await freshToken(attempt>0)});
        const res=await fetch(url,Object.assign({},opts,{headers,signal:ctrl.signal}));
        if((res.status===400||res.status===401||res.status===403)&&attempt===0){
          let body='';try{body=await res.clone().text();}catch(e){}
          if(/jwt|token|exp|unauthorized/i.test(body))continue;
        }
        return res;
      }catch(e){
        if(attempt===1)throw(e&&e.name==='AbortError')?new Error('network_timeout'):e;
      }finally{clearTimeout(timer);}
    }
  }
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
      .community-img-fail{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:10px;font-size:11.5px;font-weight:700;color:var(--ink3);background:#eef0ee;}
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
      .community-link{color:#2F6FD6;text-decoration:underline;text-underline-offset:2px;word-break:break-all;}
      .community-text .rt-big{font-size:1.28em;font-weight:800;line-height:1.45;}
      .community-text .rt-small{font-size:.84em;}
      .community-toolbar{display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px;scrollbar-width:none;border-top:1px solid #f0f1f0;margin-top:2px;padding-top:10px;}
      .community-toolbar::-webkit-scrollbar{display:none;}
      .community-toolbar button{flex-shrink:0;border:none;border-radius:11px;background:var(--b0);color:var(--ink2);font-size:12.5px;font-weight:800;padding:8px 11px;}
      .community-toolbar button.on{background:var(--brand-soft);color:var(--brand);}
      .community-palette{display:flex;flex-wrap:wrap;gap:7px;padding:2px 0 12px;}
      .community-palette .sw{border:none;border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:800;background:#f5f6f5;}
      .community-palette .emo{border:none;background:#f5f6f5;border-radius:10px;width:40px;height:40px;font-size:21px;}
      .community-rich-preview{background:#f8f9f8;border-radius:14px;padding:11px 13px;margin:0 0 12px;}
      .community-rich-preview .lbl{font-size:10.5px;font-weight:800;color:var(--ink3);margin-bottom:5px;}
      .community-rich-preview .community-text{margin:0;}
      .community-link-card{display:flex;align-items:stretch;border:1px solid #e6e8e6;border-radius:14px;overflow:hidden;margin:0 0 12px;background:#fff;text-decoration:none;color:inherit;min-height:88px;}
      .community-link-card .clc-body{flex:1;min-width:0;padding:11px 13px;display:flex;flex-direction:column;justify-content:center;gap:3px;}
      .community-link-card .clc-title{font-size:13.5px;font-weight:800;color:var(--ink);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .community-link-card .clc-desc{font-size:12px;color:var(--ink3);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .community-link-card .clc-site{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink3);font-weight:700;margin-top:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
      .community-link-card .clc-site img{width:14px;height:14px;border-radius:3px;flex-shrink:0;}
      .community-link-card .clc-thumb{width:34%;max-width:150px;flex-shrink:0;background:#f2f3f2;}
      .community-link-card .clc-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
      .community-link-card.loading{align-items:center;justify-content:center;color:var(--ink3);font-size:12px;font-weight:700;}
      .community-link-wrap{position:relative;}
      .community-link-wrap .x{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:14px;line-height:1;z-index:2;}
      .community-poll{border:1px solid #e6e8e6;border-radius:16px;padding:13px 13px 11px;margin:0 0 12px;background:#fcfdfc;}
      .community-poll .cp-meta{font-size:11px;font-weight:800;color:var(--brand);margin-bottom:5px;}
      .community-poll .cp-q{font-size:14.5px;font-weight:850;color:var(--ink);margin-bottom:10px;line-height:1.4;}
      .community-poll .cp-opt{position:relative;display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:1.5px solid #e3e6e3;border-radius:12px;background:#fff;padding:11px 12px;margin-bottom:7px;overflow:hidden;font-size:13.5px;color:var(--ink);font-weight:700;}
      .community-poll .cp-opt.mine{border-color:var(--brand);}
      .community-poll .cp-opt:disabled{opacity:1;}
      .community-poll .cp-bar{position:absolute;left:0;top:0;bottom:0;background:var(--brand-soft);z-index:0;transition:width .25s;}
      .community-poll .cp-check{position:relative;z-index:1;width:18px;height:18px;border-radius:50%;border:1.5px solid #c9cec9;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;}
      .community-poll.multi .cp-check{border-radius:5px;}
      .community-poll .cp-opt.mine .cp-check{background:var(--brand);border-color:var(--brand);}
      .community-poll .cp-label{position:relative;z-index:1;flex:1;min-width:0;word-break:break-word;}
      .community-poll .cp-count{position:relative;z-index:1;font-size:12px;color:var(--ink2);font-weight:800;flex-shrink:0;}
      .community-poll .cp-foot{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--ink3);font-weight:700;margin-top:3px;}
      .community-poll .cp-foot button{border:none;background:none;color:var(--ink2);font-size:11.5px;font-weight:800;padding:3px 0;}
      .community-poll-editor{border:1.5px solid var(--brand-soft);border-radius:16px;padding:12px;margin:0 0 12px;background:#fbfdfb;}
      .community-poll-editor .cpe-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;font-weight:850;}
      .community-poll-editor .cpe-head button{border:none;background:none;color:#9b4038;font-size:12px;font-weight:800;}
      .community-poll-editor input[type=text]{width:100%;border:1px solid #e3e6e3;border-radius:11px;padding:10px 11px;font-size:13.5px;outline:none;background:#fff;color:var(--ink);}
      .community-poll-editor .cpe-opt{display:flex;gap:6px;margin-top:7px;}
      .community-poll-editor .cpe-opt button{border:none;background:var(--b0);border-radius:10px;width:38px;font-size:16px;color:var(--ink3);}
      .community-poll-editor .cpe-add{border:none;background:none;color:var(--brand);font-size:12.5px;font-weight:800;padding:9px 2px 4px;}
      .community-poll-editor .cpe-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;font-size:12.5px;font-weight:700;color:var(--ink2);}
      .community-poll-editor select{border:1px solid #e3e6e3;border-radius:10px;padding:7px 8px;font-size:12.5px;background:#fff;color:var(--ink);}
      .community-voters h4{font-size:13px;font-weight:850;margin:12px 0 6px;}
      .community-voters .v{display:inline-flex;align-items:center;gap:4px;background:#f4f6f4;border-radius:999px;padding:5px 9px;margin:0 5px 6px 0;font-size:12px;font-weight:700;}
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

  function cachedUrl(path){const c=signedCache.get(path);return c&&c.expires>Date.now()?c.url:'';}
  function communityImgTag(path){
    const u=cachedUrl(path);
    return '<img class="community-img'+(u?' ready':'')+'" data-community-path="'+esc(path)+'"'+(u?' data-loaded="1" src="'+esc(u)+'"':'')+' alt="커뮤니티 사진" onerror="communityImageError(this)">';
  }
  // 글 서식: **굵게**, [빨강]글자[/색], [크게]글자[/크기] — 정해진 값만 허용해 안전하게 그립니다.
  function applyInline(html){
    const colorNames=Object.keys(COLORS).join('|');
    const colorRe=new RegExp('\\[('+colorNames+')\\]((?:(?!\\[(?:'+colorNames+')\\])[\\s\\S])*?)\\[\\/색\\]','g');
    const sizeRe=/\[(크게|작게)\]((?:(?!\[(?:크게|작게)\])[\s\S])*?)\[\/크기\]/g;
    let prev,guard=0;
    do{
      prev=html;
      html=html.replace(colorRe,(m,c,t)=>'<span style="color:'+COLORS[c]+'">'+t+'</span>');
      html=html.replace(sizeRe,(m,z,t)=>'<span class="rt-'+SIZES[z]+'">'+t+'</span>');
      html=html.replace(/\*\*(?!\s)([^*\n]+?)\*\*/g,'<b>$1</b>');
    }while(html!==prev&&++guard<8);
    return html;
  }
  function linkify(escaped){
    return String(escaped).split(/(<[^>]+>)/).map(part=>{
      if(part.startsWith('<'))return part;
      return part.replace(URL_RE,m=>{
        const trail=(m.match(/[.,!?;:)\]}]+$/)||[''])[0];
        const shown=trail?m.slice(0,-trail.length):m;
        const raw=shown.replace(/&amp;/g,'&');
        const href=/^www\./i.test(raw)?'https://'+raw:raw;
        if(!/^https?:\/\//i.test(href))return m;
        return '<a class="community-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer nofollow" onclick="event.stopPropagation()">'+shown+'</a>'+trail;
      });
    }).join('');
  }
  function richText(content){return linkify(applyInline(esc(content)));}
  function normalizeLink(u){u=String(u||'').trim();if(/^www\./i.test(u))u='https://'+u;return u.replace(/[.,!?;:)\]}]+$/,'').slice(0,2048);}
  function firstLink(text){const m=String(text||'').match(RAW_URL_RE);return m?normalizeLink(m[0]):null;}
  function hostOf(u){try{return new URL(u).hostname.replace(/^www\./,'');}catch(e){return'';}}

  function linkCardHtml(url,p,extraClass){
    if(!url||!p)return'';
    const host=hostOf(url);
    return '<a class="community-link-card'+(extraClass||'')+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer nofollow" onclick="event.stopPropagation()">'
      +'<div class="clc-body"><div class="clc-title">'+esc(p.title||host)+'</div>'+(p.description?'<div class="clc-desc">'+esc(p.description)+'</div>':'')
      +'<div class="clc-site">'+(p.favicon?'<img src="'+esc(p.favicon)+'" referrerpolicy="no-referrer" alt="" onerror="this.remove()">':'')+'<span>'+esc(p.siteName||host)+'</span></div></div>'
      +(p.image?'<div class="clc-thumb"><img src="'+esc(p.image)+'" referrerpolicy="no-referrer" loading="lazy" alt="" onerror="this.parentNode.remove()"></div>':'')
      +'</a>';
  }
  async function fetchLinkPreview(url){
    if(linkCache.has(url))return linkCache.get(url);
    const res=await storageFetch(LINK_PREVIEW_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})},15000);
    if(!res||!res.ok)throw new Error('preview_failed_'+(res?res.status:'network'));
    const r=await res.json();const p=r&&r.preview||null;linkCache.set(url,p);return p;
  }
  // 미리보기가 아직 없는 글은 한 번만 서버에 요청해서 채워 넣습니다.
  function hydrateLinkPreviews(){
    feedState.posts.forEach(post=>{
      if(!post.linkUrl||post.linkPreview||linkRequested.has(post.id))return;
      linkRequested.add(post.id);
      fetchLinkPreview(post.linkUrl).then(p=>{if(p){post.linkPreview=p;renderCommunity();}}).catch(e=>console.warn('[community link]',e));
    });
  }

  function userById(id){const list=(typeof AD!=='undefined'&&AD&&AD.users)||[];return list.find(u=>String(u.id)===String(id))||null;}
  function pollDeadline(p){
    if(!p.closesAt)return'';
    if(p.closed)return' · 마감됨';
    const ms=new Date(p.closesAt)-Date.now();const h=Math.ceil(ms/3600000);
    return h<=24?' · '+h+'시간 후 마감':' · '+Math.ceil(h/24)+'일 후 마감';
  }
  function pollHtml(post){
    const p=post.poll;if(!p||!Array.isArray(p.options))return'';
    const voted=p.options.some(o=>o.mine),closed=!!p.closed,show=voted||closed;
    const total=p.options.reduce((a,o)=>a+(Number(o.count)||0),0);
    return '<div class="community-poll'+(p.multiple?' multi':'')+'">'
      +'<div class="cp-meta">투표 · '+(p.multiple?'여러 개 선택':'하나만 선택')+pollDeadline(p)+'</div>'
      +(p.question?'<div class="cp-q">'+esc(p.question)+'</div>':'')
      +p.options.map(o=>{
        const pct=total?Math.round((Number(o.count)||0)*100/total):0;
        return '<button class="cp-opt'+(o.mine?' mine':'')+'" '+(closed?'disabled':'')+' onclick="voteCommunity(\''+esc(post.id)+'\',\''+esc(o.id)+'\')">'
          +(show?'<span class="cp-bar" style="width:'+pct+'%"></span>':'')
          +'<span class="cp-check">'+(o.mine?'✓':'')+'</span><span class="cp-label">'+esc(o.label)+'</span>'
          +(show?'<span class="cp-count">'+(Number(o.count)||0)+'명 · '+pct+'%</span>':'')+'</button>';
      }).join('')
      +'<div class="cp-foot"><span>'+(Number(p.totalVoters)||0)+'명 참여</span>'
      +(voted&&!closed?'<button onclick="cancelCommunityVote(\''+esc(post.id)+'\')">투표 취소</button>':'')
      +((Number(p.totalVoters)||0)>0?'<button onclick="showCommunityVoters(\''+esc(post.id)+'\')">참여자 보기</button>':'')
      +'</div></div>';
  }

  function mediaClass(n){return n===1?'one':n===2?'two':n===3?'three':n===4?'four':'five';}
  function mediaHtml(post){
    const arr=post.media||[];if(!arr.length)return'';
    const shown=arr.slice(0,5);
    return '<div class="community-media '+mediaClass(shown.length)+'">'+shown.map((m,i)=>'<div class="community-img-wrap" onclick="openCommunityImage(\''+esc(post.id)+'\','+i+')">'+communityImgTag(m.storagePath)+(i===4&&arr.length>5?'<div class="community-img-more">+'+(arr.length-5)+'</div>':'')+'</div>').join('')+'</div>';
  }
  function commentHtml(c){
    const a=c.author||{};const mine=String(c.authorId||'')===String(CU&&CU.id||'');
    return '<div class="community-comment"><div class="community-comment-av">'+esc(a.emoji||'🌿')+'</div><div class="community-comment-body"><span class="community-comment-name">'+esc(a.name||'교인')+'</span>'+linkify(esc(c.text))+(mine?' <button class="c-del" onclick="deleteCommunityComment(\''+esc(c.id)+'\')">삭제</button>':'')+'</div></div>';
  }
  function postHtml(post){
    const a=post.author||{};const hearts=(post.reactions&&post.reactions.heart)||[];const liked=hearts.includes(String(CU&&CU.id||''));const comments=post.comments||[];
    const expanded=expandedComments.has(String(post.id));const visible=expanded?comments:comments.slice(-2);
    return '<article class="community-post" id="community-post-'+esc(post.id)+'">'
      +'<div class="community-author"><div class="community-avatar">'+esc(a.emoji||'🌿')+'</div><div class="community-author-meta"><div class="community-name">'+esc(a.name||'교인')+'</div><div class="community-time">'+relativeTime(post.createdAt)+(post.pinned?' · 고정됨':'')+'</div></div>'+(post.mine?'<button class="community-more" onclick="openCommunityPostMenu(\''+esc(post.id)+'\')">···</button>':'')+'</div>'
      +(post.content?'<div class="community-text">'+richText(post.content)+'</div>':'')+pollHtml(post)+linkCardHtml(post.linkUrl,post.linkPreview)+mediaHtml(post)
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
    hydrateLinkPreviews();
  }

  // Supabase는 서명 주소를 "/object/sign/..." 처럼 /storage/v1 기준 상대경로로 돌려줍니다.
  function absoluteSigned(u){
    u=String(u||'');if(!u)return'';
    if(/^https?:\/\//.test(u))return u;
    if(u.startsWith('/storage/v1/'))return SUPABASE_URL+u;
    return SUPABASE_URL+'/storage/v1'+(u.startsWith('/')?u:'/'+u);
  }
  function remember(path,u){signedCache.set(path,{url:u,expires:Date.now()+50*60*1000});return u;}
  async function signedUrl(path,force){
    if(!force){const old=cachedUrl(path);if(old)return old;}
    const res=await storageFetch(SUPABASE_URL+'/storage/v1/object/sign/'+BUCKET+'/'+encPath(path),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})},20000);
    if(!res.ok)throw new Error('sign_failed_'+res.status);
    const r=await res.json();const u=absoluteSigned(r.signedURL||r.signedUrl||r.signed_url||'');if(!u)throw new Error('signed_url_missing');
    return remember(path,u);
  }
  async function signMany(paths){
    const need=Array.from(new Set(paths)).filter(p=>!cachedUrl(p));
    if(!need.length)return;
    try{
      const res=await storageFetch(SUPABASE_URL+'/storage/v1/object/sign/'+BUCKET,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600,paths:need})},20000);
      if(!res.ok)throw new Error('sign_many_failed_'+res.status);
      const list=await res.json();
      (Array.isArray(list)?list:[]).forEach(x=>{const u=absoluteSigned(x&&(x.signedURL||x.signedUrl));if(x&&x.path&&u&&!x.error)remember(x.path,u);});
    }catch(e){console.warn('[community sign many]',e);}
  }
  function setImg(img,u){
    img.onload=()=>{img.classList.add('ready');img.dataset.loaded='1';};
    img.src=u;
  }
  async function hydrateCommunityImages(){
    const imgs=Array.from(document.querySelectorAll('#page-community img[data-community-path]')).filter(img=>!img.dataset.loaded&&!img.dataset.loading);
    if(!imgs.length)return;
    imgs.forEach(img=>img.dataset.loading='1');
    await signMany(imgs.map(img=>img.dataset.communityPath));
    imgs.forEach(async img=>{
      try{setImg(img,await signedUrl(img.dataset.communityPath));}
      catch(e){console.warn('[community image]',e);img.dataset.loading='';showImgFailed(img);}
    });
  }
  function showImgFailed(img){
    const wrap=img.closest('.community-img-wrap');if(!wrap||wrap.querySelector('.community-img-fail'))return;
    const d=document.createElement('div');d.className='community-img-fail';d.textContent='사진을 불러오지 못했어요 · 눌러서 다시 시도';
    d.onclick=ev=>{ev.stopPropagation();d.remove();img.dataset.retried='';img.dataset.loaded='';retryImg(img);};
    wrap.appendChild(d);
  }
  async function retryImg(img){
    try{setImg(img,await signedUrl(img.dataset.communityPath,true));}catch(e){showImgFailed(img);}
  }
  // 주소가 만료됐거나 일시적으로 실패하면 새 주소로 한 번 더 시도합니다.
  window.communityImageError=function(img){
    const path=img&&img.dataset&&img.dataset.communityPath;if(!path)return;
    if(!img.dataset.retried){img.dataset.retried='1';signedCache.delete(path);retryImg(img);return;}
    showImgFailed(img);
  };

  function resetCompose(mode){
    if(compose.timer)clearTimeout(compose.timer);
    compose={mode:mode||'new',linkUrl:null,linkPreview:null,linkLoading:false,dismissed:null,poll:null,timer:null,palette:''};
  }
  function openComposer(){
    composeFiles=[];resetCompose('new');
    const root=document.createElement('div');root.id='communityComposeRoot';root.innerHTML=composeHtml('',false);document.body.appendChild(root);renderComposePreviews();
  }
  function composeHtml(content,editing,id){
    return '<div class="community-overlay" onclick="if(event.target===this)closeCommunityComposer()"><div class="community-compose">'
      +'<div class="community-compose-head"><div class="community-compose-title">'+(editing?'글 수정':'새 글 작성')+'</div><button class="community-compose-close" onclick="closeCommunityComposer()">×</button></div>'
      +'<textarea id="communityComposeText" maxlength="5000" placeholder="무슨 이야기를 나누고 싶으세요?" oninput="communityComposeInput()">'+esc(content||'')+'</textarea>'
      +'<div class="community-toolbar">'
      +'<button type="button" onpointerdown="event.preventDefault()" onclick="communityFormat(\'bold\')"><b>굵게</b></button>'
      +'<button type="button" id="communityTbColor" onpointerdown="event.preventDefault()" onclick="toggleCommunityPalette(\'color\')">글씨색</button>'
      +'<button type="button" id="communityTbSize" onpointerdown="event.preventDefault()" onclick="toggleCommunityPalette(\'size\')">크기</button>'
      +'<button type="button" id="communityTbEmoji" onpointerdown="event.preventDefault()" onclick="toggleCommunityPalette(\'emoji\')">이모지</button>'
      +(editing?'':'<button type="button" id="communityTbPoll" onclick="toggleCommunityPoll()">투표</button>')
      +'</div>'
      +'<div id="communityPalette" class="community-palette" style="display:none"></div>'
      +'<div id="communityRichPreview" class="community-rich-preview" style="display:none"></div>'
      +'<div id="communityLinkBox"></div>'
      +(editing?'':'<div id="communityPollBox"></div><div id="communityPhotoRow" class="community-photo-row"></div><div class="community-note">사진은 최대 5장까지 올릴 수 있어요. 업로드할 때 자동으로 용량을 줄입니다.</div>')
      +'<button id="communitySubmitBtn" class="community-submit" onclick="'+(editing?'saveCommunityEdit(\''+esc(id)+'\')':'submitCommunityPost()')+'">'+(editing?'수정하기':'올리기')+'</button></div></div>';
  }
  function composeText(){const ta=document.getElementById('communityComposeText');return ta?ta.value:'';}
  function editText(ta,start,end,insert,selStart,selEnd){
    const v=ta.value;
    if(v.length-(end-start)+insert.length>5000){showToast('글은 5000자까지 쓸 수 있어요','error');return;}
    ta.value=v.slice(0,start)+insert+v.slice(end);
    ta.focus();try{ta.setSelectionRange(selStart,selEnd);}catch(e){}
    window.communityComposeInput();
  }
  function wrapSelection(open,close){
    const ta=document.getElementById('communityComposeText');if(!ta)return;
    const s=typeof ta.selectionStart==='number'?ta.selectionStart:ta.value.length,e=typeof ta.selectionEnd==='number'?ta.selectionEnd:s;
    const sel=ta.value.slice(s,e);
    editText(ta,s,e,open+sel+close,s+open.length,s+open.length+sel.length);
  }
  function insertAtCursor(text){
    const ta=document.getElementById('communityComposeText');if(!ta)return;
    const s=typeof ta.selectionStart==='number'?ta.selectionStart:ta.value.length,e=typeof ta.selectionEnd==='number'?ta.selectionEnd:s;
    editText(ta,s,e,text,s+text.length,s+text.length);
  }
  window.communityFormat=function(kind,arg){
    if(kind==='bold')wrapSelection('**','**');
    else if(kind==='color'&&COLORS[arg])wrapSelection('['+arg+']','[/색]');
    else if(kind==='size'&&SIZES[arg])wrapSelection('['+arg+']','[/크기]');
    else if(kind==='emoji')insertAtCursor(arg);
    if(kind!=='emoji')window.toggleCommunityPalette('');
  };
  window.toggleCommunityPalette=function(kind){
    compose.palette=compose.palette===kind?'':kind;
    const box=document.getElementById('communityPalette');if(!box)return;
    ['Color','Size','Emoji'].forEach(k=>{const b=document.getElementById('communityTb'+k);if(b)b.classList.toggle('on',compose.palette===k.toLowerCase());});
    if(!compose.palette){box.style.display='none';box.innerHTML='';return;}
    box.style.display='flex';
    if(compose.palette==='color')box.innerHTML=Object.keys(COLORS).map(c=>'<button type="button" class="sw" style="color:'+COLORS[c]+'" onpointerdown="event.preventDefault()" onclick="communityFormat(\'color\',\''+c+'\')">'+c+'</button>').join('');
    else if(compose.palette==='size')box.innerHTML='<button type="button" class="sw" style="font-size:15px" onpointerdown="event.preventDefault()" onclick="communityFormat(\'size\',\'크게\')">크게</button><button type="button" class="sw" style="font-size:11px" onpointerdown="event.preventDefault()" onclick="communityFormat(\'size\',\'작게\')">작게</button>';
    else box.innerHTML=EMOJIS.map(x=>'<button type="button" class="emo" onpointerdown="event.preventDefault()" onclick="communityFormat(\'emoji\',\''+x+'\')">'+x+'</button>').join('');
  };
  function renderRichPreview(){
    const box=document.getElementById('communityRichPreview');if(!box)return;
    const t=composeText();
    const styled=/\*\*[^*\n]+\*\*|\[(빨강|주황|초록|파랑|보라|회색|크게|작게)\]/.test(t);
    if(!styled){box.style.display='none';box.innerHTML='';return;}
    box.style.display='block';box.innerHTML='<div class="lbl">미리보기</div><div class="community-text">'+richText(t)+'</div>';
  }
  function renderLinkBox(){
    const box=document.getElementById('communityLinkBox');if(!box)return;
    if(!compose.linkUrl){box.innerHTML='';return;}
    const x='<button type="button" class="x" aria-label="미리보기 빼기" onclick="dismissCommunityLink()">×</button>';
    if(compose.linkLoading){box.innerHTML='<div class="community-link-wrap"><div class="community-link-card loading">링크 미리보기를 불러오는 중...</div>'+x+'</div>';return;}
    if(!compose.linkPreview){box.innerHTML='';return;}
    box.innerHTML='<div class="community-link-wrap">'+linkCardHtml(compose.linkUrl,compose.linkPreview)+x+'</div>';
  }
  function refreshComposeLink(){
    const url=firstLink(composeText());
    if(!url||url===compose.dismissed){if(compose.linkUrl){compose.linkUrl=null;compose.linkPreview=null;compose.linkLoading=false;renderLinkBox();}return;}
    if(url===compose.linkUrl)return;
    compose.linkUrl=url;compose.linkPreview=null;compose.linkLoading=true;renderLinkBox();
    fetchLinkPreview(url).then(p=>{if(compose.linkUrl!==url)return;compose.linkPreview=p;compose.linkLoading=false;renderLinkBox();})
      .catch(e=>{console.warn('[compose link]',e);if(compose.linkUrl!==url)return;compose.linkPreview=null;compose.linkLoading=false;renderLinkBox();});
  }
  window.communityComposeInput=function(){
    renderRichPreview();
    if(compose.timer)clearTimeout(compose.timer);
    compose.timer=setTimeout(refreshComposeLink,650);
  };
  window.dismissCommunityLink=function(){compose.dismissed=compose.linkUrl;compose.linkUrl=null;compose.linkPreview=null;compose.linkLoading=false;renderLinkBox();};

  function renderPollEditor(){
    const box=document.getElementById('communityPollBox');if(!box)return;
    const tb=document.getElementById('communityTbPoll');if(tb)tb.classList.toggle('on',!!compose.poll);
    if(!compose.poll){box.innerHTML='';return;}
    const p=compose.poll;
    box.innerHTML='<div class="community-poll-editor"><div class="cpe-head"><span>투표 만들기</span><button type="button" onclick="toggleCommunityPoll()">투표 빼기</button></div>'
      +'<input type="text" maxlength="200" placeholder="투표 제목 (선택)" value="'+esc(p.question)+'" oninput="communityPollSet(\'question\',this.value)">'
      +p.options.map((o,i)=>'<div class="cpe-opt"><input type="text" maxlength="80" placeholder="항목 '+(i+1)+'" value="'+esc(o)+'" oninput="communityPollOption('+i+',this.value)">'+(p.options.length>2?'<button type="button" onclick="communityPollRemove('+i+')">×</button>':'')+'</div>').join('')
      +(p.options.length<10?'<button type="button" class="cpe-add" onclick="communityPollAdd()">+ 항목 추가</button>':'')
      +'<div class="cpe-row"><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" '+(p.multiple?'checked':'')+' onchange="communityPollSet(\'multiple\',this.checked)">여러 개 선택 허용</label>'
      +'<select onchange="communityPollSet(\'days\',Number(this.value))">'+[[0,'마감 없음'],[1,'1일 뒤 마감'],[3,'3일 뒤 마감'],[7,'7일 뒤 마감']].map(d=>'<option value="'+d[0]+'"'+(p.days===d[0]?' selected':'')+'>'+d[1]+'</option>').join('')+'</select></div></div>';
  }
  window.toggleCommunityPoll=function(){
    compose.poll=compose.poll?null:{question:'',options:['',''],multiple:false,days:0};
    renderPollEditor();
    if(compose.poll){const first=document.querySelector('#communityPollBox input[type=text]');if(first)first.focus();}
  };
  window.communityPollSet=function(k,v){if(compose.poll)compose.poll[k]=v;};
  window.communityPollOption=function(i,v){if(compose.poll)compose.poll.options[i]=v;};
  window.communityPollAdd=function(){if(compose.poll&&compose.poll.options.length<10){compose.poll.options.push('');renderPollEditor();const inputs=document.querySelectorAll('#communityPollBox .cpe-opt input');const last=inputs[inputs.length-1];if(last)last.focus();}};
  window.communityPollRemove=function(i){if(compose.poll&&compose.poll.options.length>2){compose.poll.options.splice(i,1);renderPollEditor();}};
  function pollPayload(){
    if(!compose.poll)return{poll:null};
    const seen=new Set(),opts=[];
    compose.poll.options.map(o=>String(o||'').trim()).forEach(o=>{if(o&&!seen.has(o.toLowerCase())){seen.add(o.toLowerCase());opts.push(o);}});
    if(opts.length<2)return{error:'투표 항목을 서로 다른 내용으로 2개 이상 적어주세요'};
    return{poll:{question:String(compose.poll.question||'').trim(),options:opts,multiple:!!compose.poll.multiple,closesAt:compose.poll.days?new Date(Date.now()+compose.poll.days*86400000).toISOString():null}};
  }
  function closeCommunityComposer(){const r=document.getElementById('communityComposeRoot');if(r)r.remove();composeFiles.forEach(x=>{try{URL.revokeObjectURL(x.preview);}catch(e){}});composeFiles=[];if(compose.timer)clearTimeout(compose.timer);}
  function renderComposePreviews(){
    const row=document.getElementById('communityPhotoRow');if(!row)return;
    row.innerHTML='<label class="community-photo-add"><b>+</b>사진 '+composeFiles.length+'/5<input type="file" accept="image/*" multiple style="display:none" onchange="selectCommunityFiles(this.files)"></label>'+composeFiles.map((x,i)=>'<div class="community-preview"><img src="'+x.preview+'"><button onclick="removeCommunityFile('+i+')">×</button></div>').join('');
  }
  window.selectCommunityFiles=function(files){
    const arr=Array.from(files||[]);for(const f of arr){if(composeFiles.length>=5)break;if(!String(f.type||'').startsWith('image/'))continue;composeFiles.push({file:f,preview:URL.createObjectURL(f)});}renderComposePreviews();
  };
  window.removeCommunityFile=function(i){const x=composeFiles.splice(i,1)[0];if(x&&x.preview)URL.revokeObjectURL(x.preview);renderComposePreviews();};

  async function imageSource(file){
    if('createImageBitmap'in window){
      try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){}
      try{return await createImageBitmap(file);}catch(e){}
    }
    return await new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('image_decode_failed'))};im.src=u;});
  }
  async function canvasBlob(canvas,type,q){return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('image_encode_failed')),type,q));}
  // 아이폰 사파리처럼 WebP로 저장을 못 하는 기기는 PNG가 나오므로 JPEG로 바꿔 저장합니다.
  async function encode(canvas,q){
    let b=await canvasBlob(canvas,'image/webp',q);
    if(b.type!=='image/webp')b=await canvasBlob(canvas,'image/jpeg',Math.min(q,.85));
    return b;
  }
  const RAW_TYPES=['image/jpeg','image/png','image/webp'];
  async function compressImage(file){
    if(file.size>25*1024*1024)throw new Error('image_too_large');
    let src;
    try{src=await imageSource(file);}
    catch(e){
      // 화면에서 해석을 못 하는 사진이라도 흔한 형식이고 크지 않으면 원본을 그대로 올립니다.
      if(RAW_TYPES.includes(file.type)&&file.size<=8*1024*1024)return file;
      throw new Error('image_unsupported');
    }
    const sw=src.width||src.naturalWidth,sh=src.height||src.naturalHeight;
    if(!sw||!sh){if(src.close)src.close();throw new Error('image_decode_failed');}
    let max=1600,scale=Math.min(1,max/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
    let c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(src,0,0,w,h);if(src.close)src.close();
    let q=.82,b=await encode(c,q);while(b.size>850*1024&&q>.56){q-=.08;b=await encode(c,q);}
    if(b.size>1100*1024&&Math.max(w,h)>1200){scale=1200/Math.max(w,h);const c2=document.createElement('canvas');c2.width=Math.round(w*scale);c2.height=Math.round(h*scale);const x2=c2.getContext('2d',{alpha:false});x2.fillStyle='#fff';x2.fillRect(0,0,c2.width,c2.height);x2.drawImage(c,0,0,c2.width,c2.height);c.width=c.height=0;c=c2;b=await encode(c,.68);}
    c.width=c.height=0;
    return b;
  }
  function extFor(type){return type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';}
  async function uploadBlob(path,blob){
    const res=await storageFetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encPath(path),{method:'POST',headers:{'Content-Type':blob.type||'image/webp','x-upsert':'true','cache-control':'3600'},body:blob},60000);
    if(!res.ok){let m='upload_failed_'+res.status;try{const r=await res.json();m=r.message||r.error||m;}catch(e){}throw new Error(m);}return true;
  }
  async function removeStored(path){
    try{await storageFetch(SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encPath(path),{method:'DELETE'},15000);}catch(e){}
    signedCache.delete(path);
  }
  function uploadErrorMessage(e){
    const m=String(e&&e.message||e||'');
    if(m==='image_too_large')return'25MB가 넘는 사진은 올릴 수 없어요';
    if(m==='image_unsupported'||m==='image_decode_failed')return'이 사진 형식은 올릴 수 없어요. HEIC 대신 JPG 사진을 골라주세요';
    if(m==='network_timeout'||/Failed to fetch|NetworkError|Load failed/i.test(m))return'인터넷 연결이 불안정해요. 잠시 후 다시 시도해주세요';
    if(m==='session_expired'||/jwt|token/i.test(m))return'로그인이 만료됐어요. 다시 로그인해주세요';
    return'게시글을 올리지 못했어요';
  }

  window.submitCommunityPost=async function(){
    const text=(document.getElementById('communityComposeText').value||'').trim();
    const pp=pollPayload();if(pp.error){showToast(pp.error,'error');return;}
    if(!text&&!composeFiles.length&&!pp.poll){showToast('내용이나 사진, 투표를 넣어주세요','error');return;}
    if(compose.timer){clearTimeout(compose.timer);refreshComposeLink();}
    const linkUrl=compose.linkUrl&&compose.linkUrl!==compose.dismissed?compose.linkUrl:null;
    const btn=document.getElementById('communitySubmitBtn');btn.disabled=true;btn.textContent=composeFiles.length?'사진 최적화 중...':'올리는 중...';
    try{await freshToken();}catch(e){}
    const postId=uuid(),uid=authUid();if(!uid){btn.disabled=false;btn.textContent='올리기';showToast('로그인 정보를 다시 확인해주세요','error');return;}
    const uploaded=[];
    try{
      for(let i=0;i<composeFiles.length;i++){
        btn.textContent='사진 '+(i+1)+'/'+composeFiles.length+' 준비 중...';const blob=await compressImage(composeFiles[i].file);btn.textContent='사진 '+(i+1)+'/'+composeFiles.length+' 올리는 중...';const path=uid+'/'+postId+'/'+String(i+1).padStart(2,'0')+'.'+extFor(blob.type);await uploadBlob(path,blob);uploaded.push(path);
      }
      btn.textContent='올리는 중...';await native().directRpc('yeorin_community_create_v2',{p_post_id:postId,p_content:text,p_media_paths:uploaded,p_link_url:linkUrl,p_poll:pp.poll});
      closeCommunityComposer();showToast('게시글을 올렸어요','success');await loadFeed(true);
    }catch(e){console.warn('[community create]',e);for(const p of uploaded)await removeStored(p);btn.disabled=false;btn.textContent='올리기';showToast(uploadErrorMessage(e),'error');}
  };

  async function sendVote(post,ids){
    const before=JSON.parse(JSON.stringify(post.poll));
    const me=String(CU&&CU.id||'');
    post.poll.options.forEach(o=>{
      const was=!!o.mine,now=ids.includes(String(o.id));
      if(was!==now){o.mine=now;o.count=(Number(o.count)||0)+(now?1:-1);o.voters=now?(o.voters||[]).concat(me):(o.voters||[]).filter(v=>String(v)!==me);}
    });
    post.poll.totalVoters=new Set(post.poll.options.flatMap(o=>o.voters||[])).size;
    renderCommunity();
    try{
      const r=await native().directRpc('yeorin_community_vote',{p_post_id:post.id,p_option_ids:ids});
      if(r&&r.poll){post.poll=r.poll;renderCommunity();}
    }catch(e){
      console.warn('[community vote]',e);post.poll=before;renderCommunity();
      const m=String(e&&e.message||'');
      showToast(m.includes('poll_closed')?'마감된 투표예요':'투표를 저장하지 못했어요','error');
    }
  }
  window.voteCommunity=function(postId,optionId){
    const post=feedState.posts.find(x=>String(x.id)===String(postId));if(!post||!post.poll||post.poll.closed)return;
    const mine=post.poll.options.filter(o=>o.mine).map(o=>String(o.id));
    let ids;
    if(post.poll.multiple)ids=mine.includes(String(optionId))?mine.filter(x=>x!==String(optionId)):mine.concat(String(optionId));
    else{if(mine.length===1&&mine[0]===String(optionId))return;ids=[String(optionId)];}
    sendVote(post,ids);
  };
  window.cancelCommunityVote=function(postId){
    const post=feedState.posts.find(x=>String(x.id)===String(postId));if(!post||!post.poll)return;sendVote(post,[]);
  };
  window.showCommunityVoters=function(postId){
    const post=feedState.posts.find(x=>String(x.id)===String(postId));if(!post||!post.poll)return;
    const body=post.poll.options.map(o=>'<h4>'+esc(o.label)+' <span style="color:var(--ink3);font-weight:700">'+(Number(o.count)||0)+'명</span></h4>'
      +((o.voters||[]).length?(o.voters||[]).map(id=>{const u=userById(id)||{};return '<span class="v">'+esc(u.emoji||'🌿')+' '+esc(u.name||'교인')+'</span>';}).join(''):'<div style="font-size:12px;color:var(--ink3)">아직 없어요</div>')).join('');
    const root=document.createElement('div');root.id='communityComposeRoot';
    root.innerHTML='<div class="community-overlay" onclick="if(event.target===this)closeCommunityComposer()"><div class="community-compose community-voters"><div class="community-compose-head"><div class="community-compose-title">참여자</div><button class="community-compose-close" onclick="closeCommunityComposer()">×</button></div>'+body+'</div></div>';
    document.body.appendChild(root);
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
  window.openCommunityEdit=function(id){
    const p=feedState.posts.find(x=>String(x.id)===String(id));if(!p)return;closeCommunityComposer();resetCompose('edit');
    compose.linkUrl=p.linkUrl||null;compose.linkPreview=p.linkPreview||null;
    const inText=firstLink(p.content);if(inText&&!p.linkUrl)compose.dismissed=inText;
    const root=document.createElement('div');root.id='communityComposeRoot';root.innerHTML=composeHtml(p.content||'',true,id);document.body.appendChild(root);
    renderRichPreview();renderLinkBox();
    if(compose.linkUrl&&!compose.linkPreview)refreshComposeLink();
  };
  window.saveCommunityEdit=async function(id){
    const text=(document.getElementById('communityComposeText').value||'').trim();const p=feedState.posts.find(x=>String(x.id)===String(id));if(!p)return;
    if(!text&&!(p.media||[]).length&&!p.poll){showToast('내용이 없는 글은 저장할 수 없어요','error');return;}
    if(compose.timer){clearTimeout(compose.timer);compose.timer=null;}
    const found=firstLink(text);const linkUrl=found&&found!==compose.dismissed?found:null;
    const btn=document.getElementById('communitySubmitBtn');btn.disabled=true;
    try{
      await native().directRpc('yeorin_community_update_v2',{p_post_id:id,p_content:text,p_link_url:linkUrl});
      p.content=text;if(p.linkUrl!==linkUrl){p.linkUrl=linkUrl;p.linkPreview=linkUrl&&linkUrl===compose.linkUrl?compose.linkPreview:null;linkRequested.delete(p.id);}
      closeCommunityComposer();renderCommunity();showToast('수정했어요','success');
    }catch(e){console.warn('[community edit]',e);btn.disabled=false;showToast('수정하지 못했어요','error');}
  };
  window.deleteCommunityPost=async function(id){if(!confirm('게시글을 삭제할까요?'))return;const p=feedState.posts.find(x=>String(x.id)===String(id));closeCommunityComposer();try{await native().directRpc('yeorin_community_delete',{p_post_id:id});for(const m of (p&&p.media)||[])removeStored(m.storagePath);feedState.posts=feedState.posts.filter(x=>String(x.id)!==String(id));renderCommunity();showToast('삭제했어요','success');}catch(e){console.warn('[community delete]',e);showToast('게시글을 삭제하지 못했어요','error');}};
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
