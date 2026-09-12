/* 성경책 리더가 열려 있을 때 시스템 뒤로가기는 리더만 닫습니다. */
(function(){
  'use strict';
  window.addEventListener('popstate',function(ev){
    const reader=document.getElementById('bibleReaderRoot');
    if(!reader)return;
    if(typeof window.closeBibleReader==='function')window.closeBibleReader();
    else reader.remove();
    ev.stopImmediatePropagation();
    history.forward();
  });
})();
