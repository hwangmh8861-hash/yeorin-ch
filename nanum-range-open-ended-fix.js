/* 여린교회 QT 장 범위 제한 해제 보정
 * - 끝 장은 선택한 성경책의 마지막 장까지 자유롭게 선택
 * - 기존 최대 3장 제한 제거
 * - 긴 범위는 6장씩 나눠 불러와 과도한 동시 요청을 방지
 * - 인상 깊은 구절의 실제 장절을 별도 저장
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
    if(!start)return '<option value="">선택</option>';
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
      setTimeout(function(){expandEndOptions();ensureSelectedRefField();syncSelectedRefs();},0);
      return r;
    };
  }

  document.addEventListener('change',function(e){
    if(!e.target)return;
    if(e.target.id==='qB'||e.target.id==='qCF'){
      clearSelectedRefs();
      setTimeout(expandEndOptions,0);
    }else if(e.target.id==='qCTSelect'){
      clearSelectedRefs();
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

  /* ---------- 인상 깊은 구절의 실제 장절 보존 ---------- */
  function ensureSelectedRefField(){
    var el=byId('qSR');
    if(el)return el;
    var form=byId('qVL');
    if(!form)return null;
    el=document.createElement('input');
    el.type='hidden';el.id='qSR';el.value='[]';
    form.parentNode.appendChild(el);
    return el;
  }
  function parseSelectedRow(row){
    if(!row)return null;
    var key=String(row.getAttribute('data-range-key')||'');
    var ch=Number(key.split('|')[0]||0);
    var label=String((row.querySelector('.nv-vn')||{}).textContent||'').trim();
    var m=label.match(/^(\d+)(?:\s*[-–~]\s*(\d+))?$/);
    if(!ch||!m)return null;
    var v=Number(m[1]),to=Number(m[2]||m[1]);
    return{ch:ch,v:v,to:to};
  }
  function collectSelectedRefs(){
    return Array.prototype.slice.call(document.querySelectorAll('#qVL .nv-vr.on[data-range-key]'))
      .map(parseSelectedRow).filter(Boolean)
      .sort(function(a,b){return(a.ch-b.ch)||(a.v-b.v)||(a.to-b.to);});
  }
  /* 선택한 절만 장절 표기로 만듭니다. 피드 표기와 같은 규칙입니다.
     골로새서 1:17 / 골로새서 1:9–12 / 빌립보서 3:10–11, 15–16, 20–21 / 로마서 8:38–39, 9:1–2 */
  function formatRefs(book,refs){
    if(!book||!refs||!refs.length)return'';
    var rows=refs.map(function(r){
      var ch=Number(r&&r.ch),from=Number(r&&(r.v!=null?r.v:r.from));
      var to=Number(r&&(r.to!=null?r.to:(r.v!=null?r.v:r.from)));
      return{ch:ch,v:from,to:Math.max(from,to||from)};
    }).filter(function(r){return r.ch>0&&r.v>0;})
      .sort(function(a,b){return(a.ch-b.ch)||(a.v-b.v)||(a.to-b.to);});
    if(!rows.length)return'';
    var merged=[];
    rows.forEach(function(r){
      var last=merged[merged.length-1];
      if(last&&last.ch===r.ch&&r.v<=last.to+1){last.to=Math.max(last.to,r.to);return;}
      merged.push({ch:r.ch,v:r.v,to:r.to});
    });
    var groups=[];
    merged.forEach(function(r){
      var seg=r.v===r.to?String(r.v):r.v+'–'+r.to,last=groups[groups.length-1];
      if(last&&last.ch===r.ch)last.segs.push(seg);else groups.push({ch:r.ch,segs:[seg]});
    });
    return book+' '+groups.map(function(g){return g.ch+':'+g.segs.join(', ');}).join(', ');
  }
  function esc(v){
    return typeof escapeHtml==='function'?escapeHtml(String(v==null?'':v))
      :String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  /* 탭할 때마다 지금 무엇을 담았는지 바로 보이게 합니다. */
  function paintPickSummary(refs){
    var el=byId('qPickSummary');if(!el)return;
    var bookEl=byId('qB'),label=formatRefs(bookEl?bookEl.value:'',refs||[]);
    if(!label){
      el.classList.remove('on');
      el.innerHTML='<span class="nvr-pick-sum-lb">선택한 구절</span>'
        +'<span class="nvr-pick-sum-v muted">아직 선택한 구절이 없어요</span>';
      return;
    }
    el.classList.add('on');
    el.innerHTML='<span class="nvr-pick-sum-lb">선택한 구절</span>'
      +'<span class="nvr-pick-sum-v">'+esc(label)+'</span>';
  }
  function syncSelectedRefs(){
    var refs=collectSelectedRefs(),el=ensureSelectedRefField();
    if(el)el.value=JSON.stringify(refs);
    paintPickSummary(refs);
    return refs;
  }
  function clearSelectedRefs(){
    var el=ensureSelectedRefField();if(el)el.value='[]';
    paintPickSummary([]);
  }

  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('#qVL .nv-vr[data-range-key]'):null;
    if(t)setTimeout(syncSelectedRefs,0);
  });

  var pendingSelectedRefs=null;
  var baseGas=window.gas;
  if(typeof baseGas==='function'){
    window.gas=async function(fn){
      var args=Array.prototype.slice.call(arguments,1);
      var res=await baseGas.apply(this,[fn].concat(args));
      if(fn==='addQTPost'&&pendingSelectedRefs&&pendingSelectedRefs.length&&res&&res.id&&window.YeorinNative&&typeof window.YeorinNative.directRpc==='function'){
        try{
          await window.YeorinNative.directRpc('yeorin_set_qt_selected_refs',{p_post_id:String(res.id),p_refs:pendingSelectedRefs});
        }catch(err){
          console.error('[qt selected refs]',err);
        }
      }
      return res;
    };
  }

  var baseAddQT=window.addQT;
  if(typeof baseAddQT==='function'){
    window.addQT=async function(){
      var picker=byId('qVL');
      var refs=syncSelectedRefs();
      if(picker&&!refs.length){
        if(typeof showToast==='function')showToast('인상 깊은 구절을 하나 이상 선택해주세요','error');
        return;
      }
      pendingSelectedRefs=refs;
      try{return await baseAddQT.apply(this,arguments);}
      finally{pendingSelectedRefs=null;}
    };
  }

  setTimeout(function(){expandEndOptions();ensureSelectedRefField();syncSelectedRefs();},0);
  window.YeorinQtRef={format:formatRefs};
})();