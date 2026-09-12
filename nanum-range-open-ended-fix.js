/* 여린교회 QT 장 범위 제한 해제 보정
 * - 끝 장은 선택한 성경책의 마지막 장까지 자유롭게 선택
 * - 기존 최대 3장 제한 제거
 * - 긴 범위는 6장씩 나눠 불러와 과도한 동시 요청을 방지
 */
(function(){
  'use strict';
  if(window.__YEORIN_QT_OPEN_ENDED_RANGE__)return;
  window.__YEORIN_QT_OPEN_ENDED_RANGE__=true;

  function byId(id){return document.getElementById(id);}
  function bookInfo(name){
    try{return (typeof BIBLE!=='undefined'?BIBLE:[]).find(function(x){return x.n===name;})||null;}catch(e){return null;}
  }
  function fullEndOptions(max,start,selected){
    start=Number(start)||0;
    if(!start)return '<option value="">끝 장</option>';
    selected=Number(selected)||start;
    if(selected<start||selected>max)selected=start;
    var h='';
    for(var i=start;i<=max;i++)h+='<option value="'+i+'"'+(i===selected?' selected':'')+'>'+i+'장</option>';
    return h;
  }
  function updateSummary(book,start,end){
    var el=byId('qRangeSummary');if(!el||!start)return;
    end=end||start;
    el.innerHTML=(start===end?book+' '+start+'장':book+' '+start+'장 ~ '+end+'장')
      +'<small>'+(end-start+1)+'개 장 · 원하는 만큼 범위를 선택할 수 있어요.</small>';
  }
  function removeLimitText(){
    var limit=document.querySelector('.nvr-limit');
    if(limit)limit.textContent='끝 장은 이 성경책의 마지막 장까지 선택할 수 있습니다.';
  }
  function expandEndOptions(){
    var book=byId('qB'),start=byId('qCF'),end=byId('qCTSelect');
    if(!book||!start||!end)return;
    var info=bookInfo(book.value),max=info?Number(info.c):0,s=Number(start.value)||0;
    var keep=Number(end.value)||s;
    end.innerHTML=fullEndOptions(max,s,keep);
    if(s){
      var e=Number(end.value)||s;
      var hidden=byId('qCT');if(hidden)hidden.value=String(e);
      updateSummary(book.value,s,e);
    }
    removeLimitText();
  }

  var baseRender=window.renderQt;
  if(typeof baseRender==='function'){
    window.renderQt=function(){
      var r=baseRender.apply(this,arguments);
      setTimeout(expandEndOptions,0);
      return r;
    };
  }

  document.addEventListener('change',function(e){
    if(!e.target)return;
    if(e.target.id==='qB'||e.target.id==='qCF'){
      setTimeout(expandEndOptions,0);
    }else if(e.target.id==='qCTSelect'){
      var book=byId('qB'),start=byId('qCF'),end=byId('qCTSelect'),hidden=byId('qCT');
      if(book&&start&&end){
        var s=Number(start.value)||0,e2=Number(end.value)||s;
        if(hidden)hidden.value=String(e2);
        updateSummary(book.value,s,e2);
      }
    }
  },true);

  var originalLoad=window.YeorinQtRange&&window.YeorinQtRange.load;
  if(originalLoad){
    window.YeorinQtRange.load=async function(book,start,end,keepExisting){
      start=Number(start)||0;end=Number(end)||start;
      if(!start||end-start<6)return originalLoad(book,start,end,keepExisting);

      var list=byId('qVL');
      if(list)list.innerHTML='<div style="padding:16px;color:var(--ink3);font-size:13px">본문을 불러오는 중 · '+(end-start+1)+'개 장</div>';

      /* 기존 렌더러를 6장 단위로 직접 호출하면 선택 상태가 초기화되므로,
         provider 캐시만 먼저 예열한 뒤 마지막에 기존 렌더러를 한 번 실행합니다. */
      try{
        for(var base=start;base<=end;base+=6){
          var jobs=[];
          for(var ch=base;ch<=Math.min(end,base+5);ch++)jobs.push(window.YeorinBible.getChapter(book,ch));
          await Promise.all(jobs);
        }
      }catch(e){console.warn('[qt open range preload]',e);}
      return originalLoad(book,start,end,keepExisting);
    };
  }

  setTimeout(expandEndOptions,0);
})();
