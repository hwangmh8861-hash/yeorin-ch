/* 성경 본문 리더의 읽음 완료를 기존 내 성경읽기 데이터와 확실하게 동기화합니다.
 * - toggle이 아니라 checked=true로 확정 저장
 * - AD.myBibleProgress / allBibleProgress 즉시 반영
 * - 저장 성공 후 오래된 light 캐시 제거
 * - 저장 실패 시 화면/메모리 상태 롤백
 */
(function(){
  'use strict';
  if(window.__YEORIN_BIBLE_PROGRESS_SYNC__)return;
  window.__YEORIN_BIBLE_PROGRESS_SYNC__=true;

  function currentChapter(){
    const root=document.getElementById('bibleReaderRoot');
    if(!root)return null;
    const selects=root.querySelectorAll('.yb-reader-selects select');
    if(selects.length<2)return null;
    const bookIndex=Number(selects[0].value);
    const chapter=Number(selects[1].value);
    if(!Number.isInteger(bookIndex)||!Number.isInteger(chapter)||chapter<1)return null;
    return {bookIndex:bookIndex,chapter:chapter,key:String(bookIndex)+'-'+String(chapter-1)};
  }

  function uniq(arr){return Array.from(new Set(Array.isArray(arr)?arr:[]));}

  function refreshProgressUI(){
    try{if(typeof renderBible==='function')renderBible();}catch(e){}
    try{if(typeof renderHero==='function')renderHero();}catch(e){}
    try{if(typeof curTab!=='undefined'&&curTab==='mypage'&&typeof renderMyPage==='function')renderMyPage();}catch(e){}
  }

  function clearStaleLightCache(){
    try{
      Object.keys(localStorage).forEach(function(k){
        if(k.indexOf('yeorin_native_light_')===0)localStorage.removeItem(k);
      });
    }catch(e){}
  }

  function setButton(state){
    const btn=document.getElementById('ybReadDone');
    if(!btn)return;
    if(state==='saving'){
      btn.disabled=true;
      btn.classList.remove('done');
      btn.textContent='읽음 저장 중...';
      return;
    }
    if(state==='done'){
      btn.disabled=true;
      btn.classList.add('done');
      btn.removeAttribute('onclick');
      btn.textContent='읽음 완료 ✓';
      return;
    }
    btn.disabled=false;
    btn.classList.remove('done');
    btn.setAttribute('onclick','markBibleReaderChapterRead()');
    btn.textContent='이 장 읽음 완료';
  }

  window.markBibleReaderChapterRead=async function(){
    const cur=currentChapter();
    if(!cur||typeof AD==='undefined'||!AD||typeof CU==='undefined'||!CU)return;

    const prevMy=uniq(AD.myBibleProgress);
    AD.allBibleProgress=AD.allBibleProgress||{};
    const prevAll=uniq(AD.allBibleProgress[CU.id]);

    if(prevMy.indexOf(cur.key)>-1){
      if(prevAll.indexOf(cur.key)===-1)AD.allBibleProgress[CU.id]=prevAll.concat(cur.key);
      setButton('done');
      refreshProgressUI();
      return;
    }

    AD.myBibleProgress=prevMy.concat(cur.key);
    AD.allBibleProgress[CU.id]=prevAll.indexOf(cur.key)>-1?prevAll:prevAll.concat(cur.key);
    setButton('saving');
    refreshProgressUI();

    try{
      if(typeof gas!=='function')throw new Error('save_api_not_ready');
      await gas('toggleBibleChapters',CU.id,[{key:cur.key,checked:true}]);
      clearStaleLightCache();
      setButton('done');
      refreshProgressUI();
      if(typeof showToast==='function')showToast('읽기 현황에 반영했어요','success');
    }catch(e){
      AD.myBibleProgress=prevMy;
      AD.allBibleProgress[CU.id]=prevAll;
      setButton('ready');
      refreshProgressUI();
      console.warn('[bible reader progress sync]',e);
      if(typeof showToast==='function')showToast('읽음 저장에 실패했어요. 다시 시도해주세요','error');
    }
  };

  console.log('[Yeorin] bible reader progress sync ready');
})();
