/* 여린교회 챌린지 공유 + 초대 링크 */
(function(){
  'use strict';
  if(window.__YEORIN_CHALLENGE_SHARE__)return;
  window.__YEORIN_CHALLENGE_SHARE__=true;

  function esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function challengeById(id){
    try{return (AD&&AD.challenges||[]).find(function(c){return String(c.id)===String(id);})||null;}
    catch(e){return null;}
  }

  function inviteUrl(id){
    try{
      const u=new URL(location.href);
      u.search='';
      u.hash='';
      u.searchParams.set('challenge',String(id));
      return u.toString();
    }catch(e){return location.href;}
  }

  function inviteText(ch){
    const members=Array.isArray(ch.memberIds)?ch.memberIds.length:0;
    return [
      '우리 같이 말씀 읽어요!',
      '여린교회 챌린지에 초대합니다.',
      '',
      '챌린지: '+(ch.title||'말씀읽기 챌린지'),
      '본문: '+(ch.book||''),
      '기간: '+(ch.startDate||'')+' ~ '+(ch.endDate||''),
      '함께하는 사람: '+members+'명',
      '',
      '같이 읽고 함께 인증해요 🌿'
    ].join('\n');
  }

  async function copyFallback(text,url){
    const full=text+'\n\n'+url;
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        await navigator.clipboard.writeText(full);
      }else{
        const ta=document.createElement('textarea');
        ta.value=full;
        ta.style.position='fixed';
        ta.style.opacity='0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      if(typeof showToast==='function')showToast('초대 문구를 복사했어요. 카카오톡에 붙여넣어 주세요','success');
    }catch(e){
      if(typeof showToast==='function')showToast('공유 문구를 복사하지 못했어요','error');
    }
  }

  window.shareChallenge=async function(id){
    const ch=challengeById(id);
    if(!ch){
      if(typeof showToast==='function')showToast('챌린지를 찾을 수 없어요','error');
      return;
    }
    const text=inviteText(ch);
    const url=inviteUrl(ch.id);

    if(navigator.share){
      try{
        await navigator.share({
          title:'여린교회 | '+(ch.title||'말씀읽기 챌린지'),
          text:text,
          url:url
        });
        return;
      }catch(e){
        if(e&&e.name==='AbortError')return;
      }
    }
    await copyFallback(text,url);
  };

  function shareButton(cid){
    const icon=(typeof ico==='function')?ico('share',16):'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.6 10.6 6.8-4.2M8.6 13.4l6.8 4.2"></path></svg>';
    return '<button class="btn-dashed challenge-share-btn" onclick="shareChallenge(\''+esc(cid)+'\')" style="margin:0 0 14px;border-color:var(--brand3);color:var(--brand);background:#fff">'+icon+' 챌린지 공유하기</button>';
  }

  const baseRenderChDetail=window.renderChDetail;
  if(typeof baseRenderChDetail==='function'){
    window.renderChDetail=function(cid){
      let html=baseRenderChDetail.apply(this,arguments);
      const marker='<div class="card"><div style="font-size:14px;font-weight:700;margin-bottom:8px">참여자 현황</div>';
      const btn=shareButton(cid);
      if(typeof html==='string'&&html.includes(marker))html=html.replace(marker,btn+marker);
      else if(typeof html==='string')html+=btn;
      return html;
    };
  }

  function sharedId(){
    try{return new URL(location.href).searchParams.get('challenge')||'';}
    catch(e){return'';}
  }

  function openSharedChallenge(){
    const id=sharedId();
    if(!id)return;
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      const ch=challengeById(id);
      if(ch){
        clearInterval(timer);
        try{
          bsub='challenge';
          viewChId=id;
          if(typeof selBook!=='undefined')selBook=null;
          if(typeof switchTab==='function')switchTab('bible');
          else if(typeof renderBible==='function')renderBible();
        }catch(e){console.warn('[challenge share route]',e);}
        return;
      }
      if(tries>=24){
        clearInterval(timer);
        try{
          bsub='challenge';
          viewChId=null;
          if(typeof switchTab==='function')switchTab('bible');
          if(typeof showToast==='function')showToast('초대받은 챌린지를 찾을 수 없어요','error');
        }catch(e){}
      }
    },250);
  }

  const baseEnterApp=window.enterApp;
  if(typeof baseEnterApp==='function'){
    window.enterApp=async function(){
      const r=await baseEnterApp.apply(this,arguments);
      if(sharedId())setTimeout(openSharedChallenge,550);
      return r;
    };
  }

  setTimeout(function(){
    try{
      const app=document.getElementById('app');
      if(sharedId()&&app&&app.style.display!=='none')openSharedChallenge();
    }catch(e){}
  },900);

  console.log('[Yeorin] challenge share ready');
})();
