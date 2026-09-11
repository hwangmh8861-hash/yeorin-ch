/* 여린교회 나눔 날짜/업로드 시각 UX 보정
 * - 나눔 일반 진입 시 항상 오늘 날짜 선택
 * - 홈의 최근 나눔을 눌러 특정 날짜로 이동하는 동작은 유지
 * - 나눔과 커뮤니티 게시물에 업로드 날짜 + 시각 표시
 */
(function(){
  'use strict';
  if(window.__YEORIN_NANUM_TIME_FIX__)return;
  window.__YEORIN_NANUM_TIME_FIX__=true;

  const TZ='Asia/Seoul';
  let explicitNanumJump=false;
  const communityTimes=new Map();
  let communitySyncBusy=false;
  let communitySyncTimer=null;

  function kstToday(){
    try{return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
    catch(e){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  }

  function today(){
    try{if(typeof td==='function')return td();}catch(e){}
    return kstToday();
  }

  function stamp(value,fallbackDate){
    if(value){
      const d=new Date(value);
      if(!Number.isNaN(d.getTime())){
        try{
          const parts=new Intl.DateTimeFormat('ko-KR',{
            timeZone:TZ,year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false
          }).formatToParts(d);
          const get=t=>parts.find(p=>p.type===t)?.value||'';
          const h=get('hour')==='24'?'00':get('hour');
          return get('year')+'. '+get('month')+'. '+get('day')+'. '+h+':'+get('minute');
        }catch(e){}
      }
    }
    if(fallbackDate){
      const p=String(fallbackDate).split('-');
      if(p.length===3)return Number(p[0])+'. '+Number(p[1])+'. '+Number(p[2])+'.';
      return String(fallbackDate);
    }
    return '';
  }

  function forceToday(){
    const t=today();
    try{nanumDate=t;}catch(e){}
    try{if(typeof setStripMonthOf==='function')setStripMonthOf(t);}catch(e){}
    try{_loadedDate='';}catch(e){}
    return t;
  }

  // 기존 initNanumDate는 오늘 글이 없으면 최근 게시물 날짜를 골랐습니다.
  // 이제 일반 진입의 기준 날짜는 게시물 유무와 관계없이 항상 오늘입니다.
  window.initNanumDate=function(){forceToday();};

  function decorateNanum(type){
    let posts=[];
    try{posts=type==='qt'?(Array.isArray(qtPosts)?qtPosts:[]):(Array.isArray(prPosts)?prPosts:[]);}catch(e){return;}
    const page=document.getElementById(type==='qt'?'page-qt':'page-prayer');
    if(!page)return;
    const cards=Array.from(page.querySelectorAll('.card')).filter(c=>c.querySelector('.avatar'));
    cards.forEach((card,i)=>{
      const post=posts[i];if(!post)return;
      const av=card.querySelector('.avatar');
      const meta=av&&av.nextElementSibling;
      const timeEl=meta&&meta.children&&meta.children[1];
      if(timeEl)timeEl.textContent=stamp(post.createdAt,post.date);
    });
  }

  const baseRenderQt=window.renderQt;
  if(typeof baseRenderQt==='function')window.renderQt=function(){
    const r=baseRenderQt.apply(this,arguments);decorateNanum('qt');return r;
  };
  const baseRenderPrayer=window.renderPrayer;
  if(typeof baseRenderPrayer==='function')window.renderPrayer=function(){
    const r=baseRenderPrayer.apply(this,arguments);decorateNanum('prayer');return r;
  };

  // 홈의 최근 나눔에서 과거 글을 직접 누른 경우에는 그 날짜로 이동해야 하므로 예외 처리합니다.
  const baseOpenNanumAt=window.openNanumAt;
  if(typeof baseOpenNanumAt==='function')window.openNanumAt=function(){
    explicitNanumJump=true;
    try{return baseOpenNanumAt.apply(this,arguments);}
    finally{explicitNanumJump=false;}
  };

  // 나눔 탭을 다른 화면에서 일반적으로 열면 오늘 날짜를 다시 선택합니다.
  const baseSwitchTab=window.switchTab;
  if(typeof baseSwitchTab==='function')window.switchTab=function(id){
    let entering=false;
    try{entering=String(id)==='nanum'&&String(curTab||'')!=='nanum';}catch(e){entering=String(id)==='nanum';}
    const t=(entering&&!explicitNanumJump)?forceToday():null;
    const r=baseSwitchTab.apply(this,arguments);
    if(t){
      try{if(typeof renderHero==='function')renderHero();}catch(e){}
      try{if(typeof loadDayPosts==='function')loadDayPosts(t,true);}catch(e){}
    }
    if(String(id)==='community')scheduleCommunitySync(true);
    return r;
  };

  function updateCommunityDom(){
    document.querySelectorAll('#page-community .community-post[id^="community-post-"]').forEach(article=>{
      const id=String(article.id||'').replace('community-post-','');
      const createdAt=communityTimes.get(id);if(!createdAt)return;
      const el=article.querySelector('.community-time');if(!el)return;
      const pinned=/고정됨/.test(el.textContent||'');
      el.textContent=stamp(createdAt)+(pinned?' · 고정됨':'');
    });
  }

  async function syncCommunityTimes(force){
    if(communitySyncBusy||!window.YeorinNative)return;
    const articles=Array.from(document.querySelectorAll('#page-community .community-post[id^="community-post-"]'));
    if(!articles.length)return;
    const ids=articles.map(a=>String(a.id).replace('community-post-',''));
    if(!force&&ids.every(id=>communityTimes.has(id))){updateCommunityDom();return;}
    communitySyncBusy=true;
    try{
      const pages=Math.max(1,Math.ceil(articles.length/10));
      for(let page=0;page<pages;page++){
        const data=await window.YeorinNative.directRpc('yeorin_community_feed',{p_page:page,p_per_page:10});
        for(const p of (data&&data.posts)||[]){if(p&&p.id&&p.createdAt)communityTimes.set(String(p.id),p.createdAt);}
        if(data&&!data.hasMore)break;
      }
      updateCommunityDom();
    }catch(e){console.warn('[community exact timestamp]',e);}
    finally{communitySyncBusy=false;}
  }

  function scheduleCommunitySync(force){
    clearTimeout(communitySyncTimer);
    communitySyncTimer=setTimeout(()=>syncCommunityTimes(!!force),90);
  }

  const baseRefreshCommunity=window.refreshCommunity;
  if(typeof baseRefreshCommunity==='function')window.refreshCommunity=async function(){
    const r=await baseRefreshCommunity.apply(this,arguments);scheduleCommunitySync(true);return r;
  };
  const baseLoadMoreCommunity=window.loadMoreCommunity;
  if(typeof baseLoadMoreCommunity==='function')window.loadMoreCommunity=async function(){
    const r=await baseLoadMoreCommunity.apply(this,arguments);scheduleCommunitySync(false);return r;
  };

  const communityPage=document.getElementById('page-community');
  if(communityPage){
    new MutationObserver(()=>scheduleCommunitySync(false)).observe(communityPage,{childList:true,subtree:true});
  }

  // 이전 버전 주간 캐시에 createdAt이 없을 수 있으므로 이번 변경에서 한 번만 비웁니다.
  try{
    if(localStorage.getItem('yeorin_nanum_time_v1')!=='1'){
      Object.keys(localStorage).forEach(k=>{if(k.indexOf('yeorin_native_week_')===0||k.indexOf('yeorin_native_light_')===0)localStorage.removeItem(k);});
      localStorage.setItem('yeorin_nanum_time_v1','1');
    }
  }catch(e){}

  setTimeout(()=>{
    try{if(typeof curTab!=='undefined'&&curTab==='nanum'){decorateNanum('qt');decorateNanum('prayer');}}catch(e){}
    try{if(typeof curTab!=='undefined'&&curTab==='community')scheduleCommunitySync(true);}catch(e){}
  },500);

  console.log('[Yeorin] nanum today + exact post timestamps ready');
})();