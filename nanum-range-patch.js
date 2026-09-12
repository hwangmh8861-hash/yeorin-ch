/* 여린교회 QT 다중 장 선택 보정
 * - 시작 장 / 끝 장(최대 3장) 선택
 * - 선택 범위 본문을 장별로 이어서 표시
 * - 인상 깊은 구절은 여러 장에 걸쳐 선택 가능
 * - 저장되는 읽은 범위는 시작 장 1절 ~ 끝 장 마지막 절로 유지
 */
(function(){
  'use strict';
  if(window.__YEORIN_QT_MULTI_CHAPTER__)return;
  window.__YEORIN_QT_MULTI_CHAPTER__=true;

  var baseRender=window.renderQt;
  if(typeof baseRender!=='function')return;

  var style=document.createElement('style');
  style.id='qt-multi-chapter-style';
  style.textContent=[
    '.nvr-book-row{display:flex;gap:8px;margin-top:8px}',
    '.nvr-range-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}',
    '.nvr-range-col label{display:block;font-size:11px;color:var(--ink3);margin:0 0 4px 2px}',
    '.nvr-summary{margin-top:10px;background:var(--brand-soft);border-radius:13px;padding:11px 13px;color:var(--brand);font-size:13px;font-weight:600;line-height:1.55}',
    '.nvr-summary small{display:block;color:var(--ink3);font-size:11.5px;font-weight:500;margin-top:2px}',
    '.nvr-chapter{border:1px solid var(--line);border-radius:13px;overflow:hidden;margin-bottom:10px;background:#fff}',
    '.nvr-chapter:last-child{margin-bottom:0}',
    '.nvr-chapter-head{padding:10px 12px;background:#F0F6F2;color:var(--brand);font-size:13px;font-weight:700;position:sticky;top:0;z-index:1}',
    '.nvr-chapter .nv-vr{border-radius:0;border-left:none;border-top:1px solid #F3F5F3}',
    '.nvr-chapter .nv-vr:first-of-type{border-top:none}',
    '.nvr-chapter .nv-vr.on{border-left:3px solid var(--brand)}',
    '.nvr-limit{font-size:11.5px;color:var(--ink3);margin-top:7px}',
    '@media(max-width:360px){.nvr-range-row{grid-template-columns:1fr}.nvr-book-row{display:block}}'
  ].join('\n');
  document.head.appendChild(style);

  var picked=[];
  var verseMap={};

  function byId(id){return document.getElementById(id);}
  function setVal(id,v){var el=byId(id);if(el)el.value=v==null?'':String(v);}
  function bookInfo(name){
    try{return (typeof BIBLE!=='undefined'?BIBLE:[]).find(function(x){return x.n===name;})||null;}catch(e){return null;}
  }
  function options(max,selected,min){
    min=min||1;var h='<option value="">장 선택</option>';
    for(var i=min;i<=max;i++)h+='<option value="'+i+'"'+(String(selected)===String(i)?' selected':'')+'>'+i+'장</option>';
    return h;
  }
  function endOptions(max,start,selected){
    if(!start)return '<option value="">끝 장</option>';
    var last=Math.min(max,start+2);var val=Number(selected);
    if(!val||val<start||val>last)val=start;
    var h='';for(var i=start;i<=last;i++)h+='<option value="'+i+'"'+(i===val?' selected':'')+'>'+i+'장</option>';
    return h;
  }
  function summary(book,start,end){
    var el=byId('qRangeSummary');if(!el)return;
    if(!start){el.innerHTML='시작 장을 선택해주세요.<small>한 번에 최대 3장까지 이어서 불러올 수 있어요.</small>';return;}
    end=end||start;
    el.innerHTML=(start===end?book+' '+start+'장':book+' '+start+'장 ~ '+end+'장')
      +'<small>'+(end-start+1)+'개 장 · 원하는 절은 여러 개 선택할 수 있어요.</small>';
  }
  function resetVerseState(keepExisting){
    picked=[];verseMap={};
    if(!keepExisting)setVal('qBV','');
    var hint=byId('qVH');if(hint)hint.textContent='마음에 닿은 절을 탭하면 인상 깊은 구절로 담겨요';
  }
  function selectedText(){
    return picked.map(function(k){return verseMap[k];}).filter(Boolean).map(function(x){return x.t||'';}).join('\n\n');
  }
  function updatePicked(){
    picked.sort(function(a,b){
      var x=verseMap[a],y=verseMap[b];
      return (x.ch-y.ch)||(Number(x.v)-Number(y.v));
    });
    setVal('qBV',selectedText());
    var hint=byId('qVH');
    if(hint)hint.innerHTML=picked.length
      ?'<span style="color:var(--brand);font-weight:600">'+picked.length+'개 구절 담김</span> · 다시 탭하면 빠져요'
      :'마음에 닿은 절을 탭하면 인상 깊은 구절로 담겨요';
  }
  function renderChapters(book,groups){
    var list=byId('qVL');if(!list)return;
    verseMap={};
    list.innerHTML=groups.map(function(g){
      var rows=(g.verses||[]).map(function(v){
        var local=String(v.key||v.label||v.v),key=g.ch+'|'+local;
        verseMap[key]={key:key,ch:g.ch,v:Number(v.v),to:Number(v.to||v.v),t:String(v.t||''),label:String(v.label||v.v)};
        return '<div class="nv-vr" data-range-key="'+key+'"><div class="nv-vn">'+(v.label||v.v)+'</div><div class="nv-vt">'+escapeHtml(String(v.t||''))+'</div></div>';
      }).join('');
      return '<div class="nvr-chapter"><div class="nvr-chapter-head">'+escapeHtml(book)+' '+g.ch+'장</div>'+rows+'</div>';
    }).join('');
    list.querySelectorAll('[data-range-key]').forEach(function(row){
      row.addEventListener('click',function(){
        var key=row.getAttribute('data-range-key');var i=picked.indexOf(key);
        if(i>=0){picked.splice(i,1);row.classList.remove('on');}
        else{picked.push(key);row.classList.add('on');}
        updatePicked();
      });
    });
  }
  async function loadRange(book,start,end,keepExisting){
    var list=byId('qVL');if(!list||!window.YeorinBible||!start)return;
    end=end||start;
    resetVerseState(!!keepExisting);
    list.innerHTML='<div style="padding:16px;color:var(--ink3);font-size:13px">본문을 불러오는 중</div>';
    var chapters=[];for(var c=start;c<=end;c++)chapters.push(c);
    try{
      var all=await Promise.all(chapters.map(function(ch){return window.YeorinBible.getChapter(book,ch).then(function(v){return{ch:ch,verses:v||[]};});}));
      if(!all.some(function(g){return g.verses.length;})){
        list.innerHTML='<div style="padding:16px;color:var(--ink3);font-size:13px">본문을 찾지 못했어요.</div>';return;
      }
      renderChapters(book,all);
      var firstGroup=all.find(function(g){return g.verses.length;});
      var lastGroup=all.slice().reverse().find(function(g){return g.verses.length;});
      var first=firstGroup&&firstGroup.verses[0];
      var last=lastGroup&&lastGroup.verses[lastGroup.verses.length-1];
      setVal('qVF',first?first.v:'1');
      setVal('qVT',last?(last.to||last.v):'1');
      setVal('qCT',end);
    }catch(e){
      console.warn('[qt multi chapter]',e);
      list.innerHTML='<div style="padding:16px;color:var(--ink3);font-size:13px">본문을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>';
    }
  }
  function enhanceForm(){
    var bookOld=byId('qB'),startOld=byId('qCF'),endHidden=byId('qCT'),list=byId('qVL');
    if(!bookOld||!startOld||!endHidden||!list||byId('qCTSelect'))return;

    var bookVal=bookOld.value;
    var startVal=startOld.value;
    var endVal=endHidden.value||startVal;
    var existingBV=byId('qBV')?byId('qBV').value:'';

    var fg=bookOld.closest('.fg');
    if(!fg)return;
    var label=fg.querySelector('.q-label');
    fg.innerHTML='';
    if(label){var lb=label.cloneNode(true);fg.appendChild(lb);}

    var bookRow=document.createElement('div');bookRow.className='nvr-book-row';
    var book=bookOld.cloneNode(true);book.id='qB';book.value=bookVal;book.style.width='100%';book.style.flex='1';
    bookRow.appendChild(book);fg.appendChild(bookRow);

    var info=bookInfo(book.value),max=info?Number(info.c):0;
    var range=document.createElement('div');range.className='nvr-range-row';
    range.innerHTML='<div class="nvr-range-col"><label>시작 장</label><select class="select-field" id="qCF">'+options(max,startVal,1)+'</select></div>'
      +'<div class="nvr-range-col"><label>끝 장</label><select class="select-field" id="qCTSelect">'+endOptions(max,Number(startVal),endVal)+'</select></div>';
    fg.appendChild(range);
    var limit=document.createElement('div');limit.className='nvr-limit';limit.textContent='최대 3장까지 선택할 수 있습니다.';fg.appendChild(limit);
    var sum=document.createElement('div');sum.id='qRangeSummary';sum.className='nvr-summary';fg.appendChild(sum);

    var start=byId('qCF'),end=byId('qCTSelect');
    summary(book.value,Number(start.value),Number(end.value));

    function rebuildForBook(){
      var i=bookInfo(book.value),m=i?Number(i.c):0;
      start.innerHTML=options(m,'',1);end.innerHTML='<option value="">끝 장</option>';
      setVal('qCT','');setVal('qVF','');setVal('qVT','');setVal('qBV','');
      list.innerHTML='<div style="padding:14px;color:var(--ink3);font-size:13px">장을 선택하면 본문을 자동으로 불러와요</div>';
      summary(book.value,0,0);resetVerseState(false);
    }
    function onStart(){
      var i=bookInfo(book.value),m=i?Number(i.c):0,s=Number(start.value)||0;
      end.innerHTML=endOptions(m,s,s);var e=Number(end.value)||s;
      setVal('qCT',e||'');summary(book.value,s,e);
      if(s)loadRange(book.value,s,e,false);
    }
    function onEnd(){
      var s=Number(start.value)||0,e=Number(end.value)||s;
      setVal('qCT',e||'');summary(book.value,s,e);
      if(s)loadRange(book.value,s,e,false);
    }

    book.addEventListener('change',rebuildForBook);
    start.addEventListener('change',onStart);
    end.addEventListener('change',onEnd);

    if(start.value){
      var s=Number(start.value),e=Number(end.value)||s;setVal('qCT',e);
      loadRange(book.value,s,e,!!existingBV).then(function(){if(existingBV)setVal('qBV',existingBV);});
    }
  }

  window.renderQt=function(){
    var r=baseRender.apply(this,arguments);
    try{if(typeof sqf!=='undefined'&&sqf)enhanceForm();}catch(e){console.warn('[qt multi chapter enhance]',e);}
    return r;
  };

  try{if(typeof sqf!=='undefined'&&sqf)enhanceForm();}catch(e){}
  window.YeorinQtRange={enhance:enhanceForm,load:loadRange};
})();
