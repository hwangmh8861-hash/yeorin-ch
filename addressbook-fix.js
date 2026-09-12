/* 여린교회 주소록 로딩 보정
 * - 전체 부가 데이터 로딩과 주소록을 분리
 * - 주소록 탭 진입 시 전용 RPC로 즉시 로드
 * - null/undefined 상태에서 무한 로딩되는 문제 방지
 */
(function(){
  'use strict';
  if(window.__YEORIN_ADDRESSBOOK_FIX__)return;
  window.__YEORIN_ADDRESSBOOK_FIX__=true;

  var baseRender=window.renderAddressBook;
  if(typeof baseRender!=='function')return;
  var inflight=null;

  function page(){return document.getElementById('page-addressbook');}

  function loading(){
    var el=page();
    if(!el)return;
    if(typeof loadingView==='function')el.innerHTML=loadingView('mypage','주소록을 불러오고 있어요');
    else el.innerHTML='<div class="loading">주소록을 불러오고 있어요</div>';
  }

  function failed(){
    var el=page();
    if(!el)return;
    el.innerHTML='<div class="card" style="text-align:center;padding:28px 18px">'
      +'<div style="font-size:14px;color:var(--ink2);margin-bottom:12px">주소록을 불러오지 못했어요.</div>'
      +'<button class="btn-primary" style="width:auto;padding:10px 20px" onclick="loadAddressBookOnly(true)">다시 불러오기</button>'
      +'</div>';
  }

  async function loadAddressBookOnly(force){
    if(typeof AD!=='undefined'&&AD&&Array.isArray(AD.contacts)&&!force)return AD.contacts;
    if(inflight)return inflight;

    var native=window.YeorinNative;
    if(!native||typeof native.directRpc!=='function'){
      failed();
      return [];
    }

    loading();
    inflight=native.directRpc('yeorin_contacts_payload',{})
      .then(function(rows){
        if(typeof AD==='undefined'||!AD)return [];
        AD.contacts=Array.isArray(rows)?rows:[];
        if(typeof renderHero==='function')renderHero();
        if(typeof curTab!=='undefined'&&curTab==='addressbook')baseRender();
        return AD.contacts;
      })
      .catch(function(e){
        console.warn('[addressbook lazy load]',e);
        failed();
        throw e;
      })
      .finally(function(){inflight=null;});
    return inflight;
  }

  window.loadAddressBookOnly=loadAddressBookOnly;
  window.renderAddressBook=function(){
    if(typeof AD==='undefined'||!AD){loading();return;}
    if(!Array.isArray(AD.contacts)){
      loading();
      loadAddressBookOnly(false).catch(function(){});
      return;
    }
    return baseRender.apply(this,arguments);
  };

  try{
    if(typeof curTab!=='undefined'&&curTab==='addressbook')window.renderAddressBook();
  }catch(e){console.warn('[addressbook fix init]',e);}
})();
