/* 여린교회 성경 본문 읽기
 * - 성경 탭의 읽기표/챌린지 아래에 성경 읽기 진입 카드 추가
 * - 66권/장 선택 후 Supabase bible_verses 본문 읽기
 * - 마지막 읽던 장 기억 + 이어 읽기
 * - 기존 읽기표의 장 체크와 연동
 */
(function(){
  'use strict';
  if(window.__YEORIN_BIBLE_READER)return;
  window.__YEORIN_BIBLE_READER=true;

  const LAST_KEY='yeorin_bible_reader_last';
  let reqSeq=0;
  let state={bookIndex:0,chapter:1,view:'books'};
  let bodyOverflow='';

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }

  function lastRead(){
    try{
      const v=JSON.parse(localStorage.getItem(LAST_KEY)||'null');
      if(v&&Number.isInteger(v.bookIndex)&&BIBLE[v.bookIndex]&&Number(v.chapter)>=1&&Number(v.chapter)<=BIBLE[v.bookIndex].c){
        return {bookIndex:v.bookIndex,chapter:Number(v.chapter)};
      }
    }catch(e){}
    return null;
  }

  function saveLast(bookIndex,chapter){
    try{localStorage.setItem(LAST_KEY,JSON.stringify({bookIndex:Number(bookIndex),chapter:Number(chapter),ts:Date.now()}));}catch(e){}
  }

  function ensureStyles(){
    if(document.getElementById('yb-reader-style'))return;
    const s=document.createElement('style');
    s.id='yb-reader-style';
    s.textContent=`
.yb-reader-card{background:#fff;border-radius:22px;padding:20px;margin:14px 0;box-shadow:var(--shadow);border:1px solid var(--line);}
.yb-reader-card-top{display:flex;align-items:flex-start;gap:12px;}
.yb-reader-icon{width:42px;height:42px;border-radius:14px;background:var(--brand-soft);color:var(--brand);display:flex;align-items:center;justify-content:center;flex:0 0 42px;}
.yb-reader-title{font-size:17px;font-weight:850;letter-spacing:-.4px;color:var(--ink);}
.yb-reader-desc{font-size:12.5px;color:var(--ink3);font-weight:600;margin-top:3px;line-height:1.55;}
.yb-reader-last{margin-top:13px;background:#F7F9F7;border-radius:14px;padding:10px 12px;font-size:12.5px;color:var(--ink2);font-weight:650;}
.yb-reader-actions{display:flex;gap:8px;margin-top:14px;}
.yb-reader-actions button{height:46px;border-radius:14px;border:none;font-size:13.5px;font-weight:800;flex:1;}
.yb-reader-primary{background:var(--brand);color:#fff;}
.yb-reader-secondary{background:var(--brand-soft);color:var(--brand);}
#bibleReaderRoot{position:fixed;inset:0;z-index:900;background:var(--bg);width:100%;max-width:var(--max);margin:0 auto;left:50%;transform:translateX(-50%);overflow-y:auto;overscroll-behavior:contain;padding-bottom:calc(24px + env(safe-area-inset-bottom));}
.yb-reader-head{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);backdrop-filter:blur(14px);border-bottom:1px solid var(--line);padding:calc(12px + env(safe-area-inset-top)) 16px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
.yb-reader-head-title{font-size:17px;font-weight:850;letter-spacing:-.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.yb-reader-head button{border:none;background:var(--brand-soft);color:var(--brand);height:38px;padding:0 13px;border-radius:12px;font-size:13px;font-weight:800;}
.yb-reader-wrap{padding:18px 18px 24px;}
.yb-reader-guide{font-size:13px;color:var(--ink3);font-weight:600;margin:2px 2px 14px;}
.yb-book-group{background:#fff;border-radius:20px;padding:17px 15px;margin-bottom:12px;box-shadow:var(--shadow-sm);}
.yb-book-group-title{font-size:14px;font-weight:850;margin-bottom:11px;color:var(--brand);}
.yb-book-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}
.yb-book-btn{min-height:42px;border:none;border-radius:12px;background:#F7F6F2;color:var(--ink2);font-size:12.5px;font-weight:700;padding:7px 5px;line-height:1.25;}
.yb-chapter-title{font-size:20px;font-weight:900;letter-spacing:-.6px;margin:4px 2px 3px;}
.yb-chapter-sub{font-size:12.5px;color:var(--ink3);margin:0 2px 15px;font-weight:600;}
.yb-chapter-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;background:#fff;border-radius:20px;padding:15px;box-shadow:var(--shadow-sm);}
.yb-chapter-btn{height:42px;border:none;border-radius:12px;background:#F7F9F7;color:var(--ink2);font-size:13px;font-weight:750;}
.yb-reader-selects{display:grid;grid-template-columns:1.45fr .75fr;gap:8px;margin-bottom:10px;}
.yb-reader-selects select{height:46px;border:1px solid var(--line2);border-radius:14px;background:#fff;padding:0 12px;font-size:14px;font-weight:750;color:var(--ink);outline:none;}
.yb-nav-row{display:flex;gap:8px;margin-bottom:14px;}
.yb-nav-row button{flex:1;height:42px;border:none;border-radius:13px;background:#fff;color:var(--brand);font-size:13px;font-weight:800;box-shadow:var(--shadow-sm);}
.yb-scripture{background:#fff;border-radius:22px;padding:22px 19px;box-shadow:var(--shadow-sm);}
.yb-scripture-title{font-size:22px;font-weight:900;letter-spacing:-.7px;margin-bottom:18px;color:var(--ink);}
.yb-verse{display:flex;align-items:flex-start;gap:9px;margin-bottom:14px;font-size:16px;line-height:1.9;color:#303A34;letter-spacing:-.15px;}
.yb-verse:last-child{margin-bottom:0;}
.yb-verse-no{font-size:11px;color:var(--brand2);font-weight:850;min-width:26px;padding-top:5px;line-height:1.3;}
.yb-loading{background:#fff;border-radius:22px;padding:46px 18px;text-align:center;color:var(--ink3);font-size:13px;font-weight:650;box-shadow:var(--shadow-sm);}
.yb-read-complete{width:100%;height:52px;border:none;border-radius:16px;background:var(--brand);color:#fff;font-size:15px;font-weight:850;margin-top:14px;box-shadow:0 6px 18px rgba(47,107,71,.16);}
.yb-read-complete.done{background:var(--brand-soft);color:var(--brand);box-shadow:none;}
.yb-error{color:var(--red);font-weight:700;}
@media(max-width:360px){.yb-book-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.yb-chapter-grid{grid-template-columns:repeat(5,minmax(0,1fr));}}
`;
    document.head.appendChild(s);
  }

  function cardHtml(){
    const last=lastRead();
    const icon=(typeof ico==='function'?ico('book',22):'📖');
    let lastHtml='';
    let actions='';
    if(last){
      const bk=BIBLE[last.bookIndex];
      lastHtml='<div class="yb-reader-last">최근 읽던 말씀&nbsp; <strong>'+esc(bk.n)+' '+last.chapter+'장</strong></div>';
      actions='<div class="yb-reader-actions"><button class="yb-reader-secondary" onclick="openBibleReaderBooks()">성경책 열기</button><button class="yb-reader-primary" onclick="continueBibleReader()">이어 읽기</button></div>';
    }else{
      actions='<div class="yb-reader-actions"><button class="yb-reader-primary" onclick="openBibleReaderBooks()">성경책 열기</button></div>';
    }
    return '<div class="yb-reader-card" id="ybReaderCard">'
      +'<div class="yb-reader-card-top"><div class="yb-reader-icon">'+icon+'</div><div>'
      +'<div class="yb-reader-title">성경 읽기</div>'
      +'<div class="yb-reader-desc">원하는 성경책과 장을 선택해서 바로 읽어보세요.</div>'
      +'</div></div>'+lastHtml+actions+'</div>';
  }

  function injectCard(){
    ensureStyles();
    const page=document.getElementById('page-bible');
    if(!page)return;
    const old=document.getElementById('ybReaderCard');if(old)old.remove();
    if(typeof selBook!=='undefined'&&selBook!==null)return;
    if(typeof viewChId!=='undefined'&&viewChId)return;
    const tabs=page.querySelector('.sub-tabs');
    if(!tabs)return;
    tabs.insertAdjacentHTML('afterend',cardHtml());
  }

  function root(){
    let el=document.getElementById('bibleReaderRoot');
    if(!el){
      el=document.createElement('div');el.id='bibleReaderRoot';document.body.appendChild(el);
    }
    return el;
  }

  function lockBody(){
    if(!document.getElementById('bibleReaderRoot'))bodyOverflow=document.body.style.overflow||'';
    document.body.style.overflow='hidden';
  }

  function closeReader(){
    reqSeq++;
    const el=document.getElementById('bibleReaderRoot');if(el)el.remove();
    document.body.style.overflow=bodyOverflow;
    injectCard();
  }

  function head(title,backAction){
    return '<div class="yb-reader-head"><button onclick="'+backAction+'">← 뒤로</button><div class="yb-reader-head-title">'+esc(title)+'</div><button onclick="closeBibleReader()">닫기</button></div>';
  }

  function renderBooks(){
    lockBody();state.view='books';
    const cats=(typeof CATS!=='undefined'&&Array.isArray(CATS))?CATS:Array.from(new Set(BIBLE.map(function(b){return b.cat;})));
    let groups='';
    cats.forEach(function(cat){
      const items=[];
      BIBLE.forEach(function(b,i){if(b.cat===cat)items.push('<button class="yb-book-btn" onclick="selectBibleReaderBook('+i+')">'+esc(b.n)+'</button>');});
      if(items.length)groups+='<div class="yb-book-group"><div class="yb-book-group-title">'+esc(cat)+'</div><div class="yb-book-grid">'+items.join('')+'</div></div>';
    });
    root().innerHTML=head('성경책 선택','closeBibleReader()')+'<div class="yb-reader-wrap"><div class="yb-reader-guide">읽을 성경책을 선택해주세요.</div>'+groups+'</div>';
    root().scrollTop=0;
  }

  function renderChapters(bookIndex){
    lockBody();state.view='chapters';state.bookIndex=Number(bookIndex)||0;
    const bk=BIBLE[state.bookIndex];if(!bk)return renderBooks();
    let buttons='';
    for(let ch=1;ch<=bk.c;ch++)buttons+='<button class="yb-chapter-btn" onclick="openBibleReaderChapter('+state.bookIndex+','+ch+')">'+ch+'</button>';
    root().innerHTML=head(bk.n,'openBibleReaderBooks()')+'<div class="yb-reader-wrap"><div class="yb-chapter-title">'+esc(bk.n)+'</div><div class="yb-chapter-sub">읽을 장을 선택해주세요.</div><div class="yb-chapter-grid">'+buttons+'</div></div>';
    root().scrollTop=0;
  }

  function bookOptions(selected){
    return BIBLE.map(function(b,i){return '<option value="'+i+'"'+(i===selected?' selected':'')+'>'+esc(b.n)+'</option>';}).join('');
  }

  function chapterOptions(bookIndex,selected){
    const b=BIBLE[bookIndex];let out='';for(let i=1;i<=b.c;i++)out+='<option value="'+i+'"'+(i===selected?' selected':'')+'>'+i+'장</option>';return out;
  }

  function readKey(bookIndex,chapter){return String(bookIndex)+'-'+String(Number(chapter)-1);}
  function isRead(bookIndex,chapter){return !!(window.AD&&Array.isArray(AD.myBibleProgress)&&AD.myBibleProgress.indexOf(readKey(bookIndex,chapter))>-1);}

  function readerShell(bookIndex,chapter,body){
    const bk=BIBLE[bookIndex];
    const prevDisabled=(bookIndex===0&&chapter===1);
    const nextDisabled=(bookIndex===BIBLE.length-1&&chapter===bk.c);
    const done=isRead(bookIndex,chapter);
    return head(bk.n+' '+chapter+'장','openBibleReaderBooks()')
      +'<div class="yb-reader-wrap">'
      +'<div class="yb-reader-selects"><select onchange="bibleReaderBookChanged(this.value)">'+bookOptions(bookIndex)+'</select><select onchange="bibleReaderChapterChanged(this.value)">'+chapterOptions(bookIndex,chapter)+'</select></div>'
      +'<div class="yb-nav-row"><button '+(prevDisabled?'disabled style="opacity:.35"':'')+' onclick="bibleReaderMove(-1)">← 이전 장</button><button '+(nextDisabled?'disabled style="opacity:.35"':'')+' onclick="bibleReaderMove(1)">다음 장 →</button></div>'
      +body
      +'<button id="ybReadDone" class="yb-read-complete'+(done?' done':'')+'" '+(done?'disabled':'onclick="markBibleReaderChapterRead()"')+'>'+(done?'읽음 완료 ✓':'이 장 읽음 완료')+'</button>'
      +'</div>';
  }

  async function openChapter(bookIndex,chapter){
    bookIndex=Number(bookIndex);chapter=Number(chapter);
    if(!BIBLE[bookIndex])return renderBooks();
    if(!Number.isInteger(chapter)||chapter<1||chapter>BIBLE[bookIndex].c)chapter=1;
    lockBody();state={bookIndex:bookIndex,chapter:chapter,view:'reader'};saveLast(bookIndex,chapter);
    const seq=++reqSeq;
    root().innerHTML=readerShell(bookIndex,chapter,'<div class="yb-loading">말씀을 불러오고 있어요.</div>');
    root().scrollTop=0;
    try{
      if(!window.YeorinBible||typeof window.YeorinBible.getChapter!=='function')throw new Error('bible_provider_not_ready');
      const rows=await window.YeorinBible.getChapter(BIBLE[bookIndex].n,chapter);
      if(seq!==reqSeq||state.bookIndex!==bookIndex||state.chapter!==chapter)return;
      let verses='';
      (rows||[]).forEach(function(v){verses+='<div class="yb-verse"><span class="yb-verse-no">'+esc(v.label||v.v)+'</span><span>'+esc(v.t||'')+'</span></div>';});
      const body=rows&&rows.length?'<div class="yb-scripture"><div class="yb-scripture-title">'+esc(BIBLE[bookIndex].n)+' '+chapter+'장</div>'+verses+'</div>':'<div class="yb-loading">본문이 없습니다.</div>';
      root().innerHTML=readerShell(bookIndex,chapter,body);
      root().scrollTop=0;
    }catch(e){
      if(seq!==reqSeq)return;
      root().innerHTML=readerShell(bookIndex,chapter,'<div class="yb-loading yb-error">말씀을 불러오지 못했어요.<br><button style="margin-top:12px;border:none;background:var(--brand);color:#fff;padding:10px 16px;border-radius:12px;font-weight:800" onclick="openBibleReaderChapter('+bookIndex+','+chapter+')">다시 불러오기</button></div>');
    }
  }

  function move(delta){
    let bi=state.bookIndex,ch=state.chapter;
    if(delta<0){if(ch>1)ch--;else if(bi>0){bi--;ch=BIBLE[bi].c;}else return;}
    else{if(ch<BIBLE[bi].c)ch++;else if(bi<BIBLE.length-1){bi++;ch=1;}else return;}
    openChapter(bi,ch);
  }

  function markRead(){
    const bi=state.bookIndex,ch=state.chapter;
    if(isRead(bi,ch)){updateDone();return;}
    if(typeof window.toggleCh==='function')window.toggleCh(bi,ch-1);
    else if(typeof toggleCh==='function')toggleCh(bi,ch-1);
    else return;
    setTimeout(updateDone,0);
  }

  function updateDone(){
    const btn=document.getElementById('ybReadDone');if(!btn)return;
    if(isRead(state.bookIndex,state.chapter)){btn.classList.add('done');btn.disabled=true;btn.removeAttribute('onclick');btn.textContent='읽음 완료 ✓';}
  }

  const baseRenderBible=window.renderBible;
  if(typeof baseRenderBible==='function'){
    window.renderBible=function(){
      const r=baseRenderBible.apply(this,arguments);
      try{injectCard();}catch(e){console.warn('[bible reader card]',e);}
      return r;
    };
  }

  window.openBibleReaderBooks=renderBooks;
  window.continueBibleReader=function(){const l=lastRead();l?openChapter(l.bookIndex,l.chapter):renderBooks();};
  window.selectBibleReaderBook=renderChapters;
  window.openBibleReaderChapter=openChapter;
  window.closeBibleReader=closeReader;
  window.bibleReaderMove=move;
  window.bibleReaderBookChanged=function(v){const bi=Number(v);if(BIBLE[bi])openChapter(bi,1);};
  window.bibleReaderChapterChanged=function(v){openChapter(state.bookIndex,Number(v));};
  window.markBibleReaderChapterRead=markRead;

  ensureStyles();
  try{injectCard();}catch(e){}
  console.log('[Yeorin] Bible reader ready');
})();
