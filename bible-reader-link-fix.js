/* 여린교회 성경읽기표 ↔ 성경 본문 읽기 연동 보강
 * - 성경책/장 선택 화면에 기존 읽기표 진도를 그대로 표시
 * - 본문 화면에서 현재 장의 읽음 상태와 책별 진도를 즉시 표시
 * - '이 장 읽음 완료'를 Supabase 확정 저장 후 읽기표에 반영
 */
(function(){
'use strict';
if(window.__YEORIN_BIBLE_READER_LINK_FIX__)return;
window.__YEORIN_BIBLE_READER_LINK_FIX__=true;

let paintTimer=null;
let savingKey='';

function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(ch){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
  });
}
function progressSet(){
  try{return new Set((typeof AD!=='undefined'&&AD&&Array.isArray(AD.myBibleProgress))?AD.myBibleProgress:[]);}catch(e){return new Set();}
}
function keyOf(bookIndex,chapter){return String(bookIndex)+'-'+String(Number(chapter)-1);}
function bookProgress(bookIndex,set){
  const b=(typeof BIBLE!=='undefined'&&BIBLE[bookIndex])?BIBLE[bookIndex]:null;
  if(!b)return{read:0,total:0,pct:0};
  let read=0;
  for(let ch=1;ch<=Number(b.c||0);ch++)if(set.has(keyOf(bookIndex,ch)))read++;
  return{read:read,total:Number(b.c||0),pct:b.c?Math.round(read/Number(b.c)*100):0};
}
function currentChapter(){
  const root=document.getElementById('bibleReaderRoot');
  if(!root)return null;
  const sels=root.querySelectorAll('.yb-reader-selects select');
  if(sels.length<2)return null;
  const bookIndex=Number(sels[0].value),chapter=Number(sels[1].value);
  if(!Number.isInteger(bookIndex)||!Number.isInteger(chapter)||chapter<1||typeof BIBLE==='undefined'||!BIBLE[bookIndex])return null;
  return{bookIndex:bookIndex,chapter:chapter,key:keyOf(bookIndex,chapter),book:BIBLE[bookIndex]};
}
function uniq(arr){return Array.from(new Set(Array.isArray(arr)?arr:[]));}

function ensureStyle(){
  if(document.getElementById('yb-reader-link-style'))return;
  const s=document.createElement('style');
  s.id='yb-reader-link-style';
  s.textContent=`
#bibleReaderRoot .yb-book-btn{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;text-align:left;padding:8px 10px;}
#bibleReaderRoot .yb-book-btn .yb-link-book-name{position:relative;z-index:1;font-size:12.5px;line-height:1.2;}
#bibleReaderRoot .yb-book-btn .yb-link-book-count{position:relative;z-index:1;font-size:10px;font-weight:800;color:var(--brand);opacity:.82;line-height:1.15;}
#bibleReaderRoot .yb-book-btn .yb-link-book-bar{position:absolute;left:0;bottom:0;height:3px;background:var(--brand3);border-radius:0 3px 3px 0;}
#bibleReaderRoot .yb-book-btn.is-complete{background:var(--brand)!important;color:#fff!important;}
#bibleReaderRoot .yb-book-btn.is-complete .yb-link-book-count{color:#fff;opacity:.9;}
#bibleReaderRoot .yb-book-btn.is-complete .yb-link-book-bar{background:rgba(255,255,255,.72);}
#bibleReaderRoot .yb-book-btn.is-partial{background:var(--brand-soft)!important;color:var(--brand)!important;}
#bibleReaderRoot .yb-chapter-btn.is-read{background:var(--brand)!important;color:#fff!important;font-weight:850!important;box-shadow:0 3px 9px rgba(47,107,71,.15);}
#bibleReaderRoot .yb-link-summary{background:#fff;border:1px solid #e2ebe5;border-radius:16px;padding:12px 14px;margin:0 0 13px;box-shadow:var(--shadow-sm);}
#bibleReaderRoot .yb-link-summary-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:850;color:var(--brand);}
#bibleReaderRoot .yb-link-summary-sub{font-size:11.5px;color:var(--ink3);font-weight:650;margin-top:5px;}
#bibleReaderRoot .yb-link-progress{height:5px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:8px;}
#bibleReaderRoot .yb-link-progress>i{display:block;height:100%;border-radius:inherit;background:var(--brand);}
#bibleReaderRoot .yb-link-status{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff;border:1px solid #e3eae5;border-radius:15px;padding:11px 13px;margin:-1px 0 10px;box-shadow:var(--shadow-sm);}
#bibleReaderRoot .yb-link-status-main{min-width:0;}
#bibleReaderRoot .yb-link-status-label{font-size:10.5px;font-weight:850;color:#809087;margin-bottom:2px;}
#bibleReaderRoot .yb-link-status-text{font-size:12.5px;font-weight:800;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
#bibleReaderRoot .yb-link-status-badge{flex:0 0 auto;padding:6px 9px;border-radius:999px;background:#f1f4f2;color:#7c8880;font-size:10.5px;font-weight:850;}
#bibleReaderRoot .yb-link-status.is-read{border-color:#cfe0d4;background:var(--brand-soft);}
#bibleReaderRoot .yb-link-status.is-read .yb-link-status-badge{background:var(--brand);color:#fff;}
#bibleReaderRoot .yb-link-note{font-size:11.5px;color:var(--ink3);font-weight:650;text-align:center;margin:8px 2px 0;line-height:1.45;}
#ybReaderCard .yb-link-card-progress{margin-top:12px;padding:10px 12px;border-radius:13px;background:var(--brand-soft);color:var(--brand);font-size:12px;font-weight:800;}
#ybReaderCard .yb-link-card-progress small{display:block;color:var(--ink3);font-size:10.5px;font-weight:650;margin-top:2px;}
@media(max-width:360px){#bibleReaderRoot .yb-book-btn{padding:8px 9px}.yb-link-status{align-items:flex-start!important}}
`;
  document.head.appendChild(s);
}

function decorateReaderCard(){
  const card=document.getElementById('ybReaderCard');
  if(!card||typeof BIBLE==='undefined')return;
  const set=progressSet(),read=set.size,total=(typeof TC!=='undefined'&&TC)?Number(TC):BIBLE.reduce(function(a,b){return a+Number(b.c||0);},0);
  const pct=total?Math.round(read/total*100):0;
  let box=card.querySelector('.yb-link-card-progress');
  if(!box){
    box=document.createElement('div');box.className='yb-link-card-progress';
    const actions=card.querySelector('.yb-reader-actions');
    card.insertBefore(box,actions||null);
  }
  const sig=read+'/'+total+'/'+pct;
  if(box.dataset.ybLinkSig!==sig){box.dataset.ybLinkSig=sig;box.innerHTML='읽기표 연동 · '+read+' / '+total+'장 ('+pct+'%)<small>본문에서 읽음 완료를 누르면 읽기표에 바로 반영됩니다.</small>';}
}

function decorateBookPicker(root){
  if(!root||typeof BIBLE==='undefined')return;
  const set=progressSet();
  root.querySelectorAll('.yb-book-btn').forEach(function(btn){
    const m=String(btn.getAttribute('onclick')||'').match(/selectBibleReaderBook\((\d+)\)/);
    if(!m)return;
    const bi=Number(m[1]),b=BIBLE[bi];if(!b)return;
    const p=bookProgress(bi,set),sig=p.read+'/'+p.total;
    if(btn.dataset.ybLinkSig===sig)return;
    btn.dataset.ybLinkSig=sig;
    btn.classList.toggle('is-complete',p.total>0&&p.read===p.total);
    btn.classList.toggle('is-partial',p.read>0&&p.read<p.total);
    btn.innerHTML='<span class="yb-link-book-name">'+esc(b.n)+'</span>'
      +(p.read?'<span class="yb-link-book-count">'+p.read+'/'+p.total+(p.read===p.total?' ✓':'')+'</span>':'')
      +(p.read&&p.read<p.total?'<i class="yb-link-book-bar" style="width:'+p.pct+'%"></i>':'');
  });
}

function decorateChapterPicker(root){
  if(!root||typeof BIBLE==='undefined')return;
  const set=progressSet();
  let bi=null;
  root.querySelectorAll('.yb-chapter-btn').forEach(function(btn){
    const m=String(btn.getAttribute('onclick')||'').match(/openBibleReaderChapter\((\d+),(\d+)\)/);
    if(!m)return;
    const bidx=Number(m[1]),ch=Number(m[2]);if(bi===null)bi=bidx;
    const read=set.has(keyOf(bidx,ch)),sig=(read?'1':'0');
    if(btn.dataset.ybLinkSig!==sig){
      btn.dataset.ybLinkSig=sig;
      btn.classList.toggle('is-read',read);
      btn.setAttribute('aria-label',BIBLE[bidx].n+' '+ch+'장'+(read?' 읽음 완료':''));
      btn.textContent=String(ch)+(read?' ✓':'');
    }
  });
  if(bi===null||!BIBLE[bi])return;
  const p=bookProgress(bi,set),grid=root.querySelector('.yb-chapter-grid');if(!grid)return;
  let sum=root.querySelector('.yb-link-summary');
  if(!sum){sum=document.createElement('div');sum.className='yb-link-summary';grid.parentNode.insertBefore(sum,grid);}
  const sumSig=p.read+'/'+p.total+'/'+p.pct;
  if(sum.dataset.ybLinkSig!==sumSig){
    sum.dataset.ybLinkSig=sumSig;
    sum.innerHTML='<div class="yb-link-summary-top"><span>읽기표 연동</span><span>'+p.read+'/'+p.total+'장</span></div>'
      +'<div class="yb-link-summary-sub">완료한 장은 초록색으로 표시됩니다.</div>'
      +'<div class="yb-link-progress"><i style="width:'+p.pct+'%"></i></div>';
  }
}

function decorateReadingView(root){
  const cur=currentChapter();if(!root||!cur)return;
  const set=progressSet(),read=set.has(cur.key),p=bookProgress(cur.bookIndex,set);
  const selects=root.querySelector('.yb-reader-selects');if(!selects)return;
  let status=root.querySelector('.yb-link-status');
  if(!status){status=document.createElement('div');status.className='yb-link-status';selects.insertAdjacentElement('afterend',status);}
  const statusSig=[cur.bookIndex,cur.chapter,read?1:0,p.read,p.total].join('/');
  if(status.dataset.ybLinkSig!==statusSig){
    status.dataset.ybLinkSig=statusSig;
    status.classList.toggle('is-read',read);
    status.innerHTML='<div class="yb-link-status-main"><div class="yb-link-status-label">읽기표 연동</div>'
      +'<div class="yb-link-status-text">'+esc(cur.book.n)+' '+p.read+'/'+p.total+'장 읽음</div></div>'
      +'<span class="yb-link-status-badge">'+(read?'이 장 읽음':'아직 완료 전')+'</span>';
  }
  const done=document.getElementById('ybReadDone');
  if(done){
    let note=root.querySelector('.yb-link-note');
    if(!note){note=document.createElement('div');note.className='yb-link-note';done.insertAdjacentElement('afterend',note);}
    const noteText=read?'이 장은 성경읽기표에 반영되어 있습니다.':'완료 버튼을 누르면 성경읽기표에 자동 반영됩니다.';
    if(note.textContent!==noteText)note.textContent=noteText;
  }
}

function decorateAll(){
  ensureStyle();
  decorateReaderCard();
  const root=document.getElementById('bibleReaderRoot');if(!root)return;
  decorateBookPicker(root);
  decorateChapterPicker(root);
  decorateReadingView(root);
}
function schedulePaint(){clearTimeout(paintTimer);paintTimer=setTimeout(decorateAll,20);}
function setButton(state){
  const btn=document.getElementById('ybReadDone');if(!btn)return;
  if(state==='saving'){
    btn.disabled=true;btn.classList.remove('done');btn.removeAttribute('onclick');btn.textContent='읽음 저장 중...';
  }else if(state==='done'){
    btn.disabled=true;btn.classList.add('done');btn.removeAttribute('onclick');btn.textContent='읽음 완료 ✓';
  }else{
    btn.disabled=false;btn.classList.remove('done');btn.setAttribute('onclick','markBibleReaderChapterRead()');btn.textContent='이 장 읽음 완료';
  }
}
function clearLightCache(){
  try{Object.keys(localStorage).forEach(function(k){if(k.indexOf('yeorin_native_light_')===0)localStorage.removeItem(k);});}catch(e){}
}
function refreshMainProgress(){
  try{if(typeof renderBible==='function')renderBible();}catch(e){}
  try{if(typeof renderHero==='function')renderHero();}catch(e){}
  decorateAll();
}

/* 기존 완료 저장 보정을 한 번 더 확실하게 고정합니다.
   쓰기는 토글이 아니라 checked=true 배치 RPC로 직접 확정합니다. */
window.markBibleReaderChapterRead=async function(){
  const cur=currentChapter();
  if(!cur){if(typeof showToast==='function')showToast('현재 읽는 장을 확인하지 못했어요','error');return;}
  if(typeof AD==='undefined'||!AD||typeof CU==='undefined'||!CU){if(typeof showToast==='function')showToast('로그인 정보를 확인해주세요','error');return;}
  if(savingKey===cur.key)return;

  const before=uniq(AD.myBibleProgress);
  if(before.indexOf(cur.key)>-1){setButton('done');decorateAll();return;}

  savingKey=cur.key;setButton('saving');
  try{
    let result=null;
    if(window.YeorinNative&&typeof window.YeorinNative.directRpc==='function'){
      result=await window.YeorinNative.directRpc('yeorin_toggle_bible_batch',{p_items:[{key:cur.key,checked:true}]});
    }else if(typeof gas==='function'){
      result=await gas('toggleBibleChapters',CU.id,[{key:cur.key,checked:true}]);
    }else throw new Error('bible_progress_api_not_ready');
    if(result&&result.success===false)throw new Error('bible_progress_save_failed');

    let serverProgress=null;
    try{
      if(window.YeorinNative&&typeof window.YeorinNative.directRpc==='function'){
        const light=await window.YeorinNative.directRpc('yeorin_light_payload',{});
        if(light&&Array.isArray(light.myBibleProgress))serverProgress=light.myBibleProgress;
      }
    }catch(_e){}

    AD.myBibleProgress=serverProgress?uniq(serverProgress):uniq(before.concat(cur.key));
    AD.allBibleProgress=AD.allBibleProgress||{};
    AD.allBibleProgress[CU.id]=uniq((AD.allBibleProgress[CU.id]||[]).concat(cur.key));
    clearLightCache();
    setButton('done');
    refreshMainProgress();
    if(typeof showToast==='function')showToast('성경읽기표에 반영했어요','success');
  }catch(e){
    AD.myBibleProgress=before;
    setButton('ready');
    decorateAll();
    console.warn('[bible reader link save]',e);
    if(typeof showToast==='function')showToast('읽음 저장에 실패했어요. 다시 눌러주세요','error');
  }finally{savingKey='';}
};

/* renderBible이 다시 그려질 때 진입 카드의 연동 현황도 갱신합니다. */
const baseRenderBible=window.renderBible;
if(typeof baseRenderBible==='function')window.renderBible=function(){const r=baseRenderBible.apply(this,arguments);schedulePaint();return r;};

const mo=new MutationObserver(function(){if(document.getElementById('bibleReaderRoot')||document.getElementById('ybReaderCard'))schedulePaint();});
mo.observe(document.documentElement,{childList:true,subtree:true});

setTimeout(decorateAll,0);
setTimeout(decorateAll,500);
console.log('[Yeorin] Bible reader ↔ reading table link ready');
})();