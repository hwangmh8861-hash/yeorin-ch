/* 성경책 리더 뒤로가기 안정화
 * - 리더 진입 시 전용 history entry 1개만 추가
 * - 시스템 뒤로가기는 history.forward() 반동 없이 리더만 닫기
 * - 닫기 버튼도 같은 history entry를 소비해 뒤로가기 스택을 깨끗하게 유지
 */
(function(){
  'use strict';

  let nativeClose=null;
  let handlingPop=false;
  let wrapped=false;

  function readerOpen(){
    return !!document.getElementById('bibleReaderRoot');
  }

  function pushReaderEntry(){
    if(readerOpen())return;
    const st=Object.assign({},history.state||{});
    if(st.yeorinBibleReader)return;
    st.yeorinBibleReader=true;
    history.pushState(st,'',location.href);
  }

  window.addEventListener('popstate',function(ev){
    if(!readerOpen())return;
    handlingPop=true;
    try{
      if(typeof nativeClose==='function')nativeClose();
      else if(typeof window.closeBibleReader==='function')window.closeBibleReader();
      else document.getElementById('bibleReaderRoot')?.remove();
    }finally{
      handlingPop=false;
    }
    ev.stopImmediatePropagation();
  },true);

  function init(){
    if(wrapped)return;
    if(typeof window.openBibleReaderBooks!=='function'||typeof window.closeBibleReader!=='function'){
      setTimeout(init,0);
      return;
    }
    wrapped=true;

    const nativeOpenBooks=window.openBibleReaderBooks;
    const nativeContinue=window.continueBibleReader;
    nativeClose=window.closeBibleReader;

    window.openBibleReaderBooks=function(){
      pushReaderEntry();
      return nativeOpenBooks.apply(this,arguments);
    };

    if(typeof nativeContinue==='function'){
      window.continueBibleReader=function(){
        pushReaderEntry();
        return nativeContinue.apply(this,arguments);
      };
    }

    window.closeBibleReader=function(){
      if(!handlingPop&&readerOpen()&&history.state&&history.state.yeorinBibleReader){
        history.back();
        return;
      }
      return nativeClose.apply(this,arguments);
    };
  }

  setTimeout(init,0);
})();
