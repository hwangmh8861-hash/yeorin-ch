/* 여린교회 나눔 통합 필터: 날짜 + 사람 + 종류 */
(function(){
'use strict';
if(window.__YEORIN_FILTER_CONTROL_POLISH__)return;
window.__YEORIN_FILTER_CONTROL_POLISH__=true;

let draft={selected:null,view:null,authors:[],kind:'all'};

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function pad(n){return String(n).padStart(2,'0')}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDate(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null}
function sameDay(a,b){return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function monthTitle(d){return d.getFullYear()+'년 '+(d.getMonth()+1)+'월'}
function dateTitle(d){const w=['일','월','화','수','목','금','토'][d.getDay()];return (d.getMonth()+1)+'월 '+d.getDate()+'일 ('+w+')'}
function kindName(k){return{all:'전체',qt:'나눔',prayer:'기도'}[k]||'전체'}
function currentNanumDate(){try{if(typeof nanumDate!=='undefined'&&nanumDate)return nanumDate}catch(e){}return iso(new Date())}
function allUsers(){
  let list=[];
  try{list=((typeof AD!=='undefined'&&AD&&AD.users)||[]).slice()}catch(e){}
  try{if(typeof CU!=='undefined'&&CU&&CU.id&&!list.some(u=>String(u.id)===String(CU.id)))list.push(CU)}catch(e){}
  return list.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'))
}
function chipAvatar(u){try{return typeof YAchip==='function'?YAchip(u):''}catch(e){return''}}

function inject(){
  if(document.getElementById('yeorin-filter-control-polish-style'))return;
  const s=document.createElement('style');
  s.id='yeorin-filter-control-polish-style';
  s.textContent=`
/* 별도 필터 버튼은 제거하고 상단 월 선택을 통합 필터 진입점으로 사용 */
#nanum-social-root .ys-viewbar{display:none!important}
#nanum-social-root .ys-head{padding-bottom:10px!important}
.dstrip-month{box-shadow:0 4px 14px rgba(0,0,0,.06)!important}

.yn-unified-modal{position:fixed;inset:0;z-index:1950;background:rgba(12,24,16,.46);display:flex;align-items:flex-end;justify-content:center;animation:ynuFade .16s ease-out}
.yn-unified-sheet{width:100%;max-width:var(--max);max-height:91vh;overflow:auto;background:#fff;border-radius:28px 28px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 44px rgba(12,29,18,.2);animation:ynuUp .2s ease-out}
.yn-unified-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.yn-unified-top small{display:block;color:#87948c;font-size:11px;font-weight:800;margin-bottom:3px}
.yn-unified-top h3{margin:0;color:#19261e;font-size:21px;font-weight:900;letter-spacing:-.5px}
.yn-unified-close{width:38px;height:38px;flex:0 0 38px;border:0;border-radius:50%;background:#f2f6f3;color:#516057;font-size:23px;line-height:38px}
.yn-unified-date-summary{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;margin-bottom:8px;border-radius:16px;background:#f5faf7;border:1px solid #e0ebe3}
.yn-unified-date-summary span{font-size:11px;color:#819088;font-weight:800}.yn-unified-date-summary strong{font-size:15px;color:var(--brand);font-weight:900}
.yn-unified-nav{height:42px;display:grid;grid-template-columns:40px 1fr 40px;align-items:center;margin:3px 0 7px}
.yn-unified-nav strong{text-align:center;font-size:15px;font-weight:900;color:#26342b}.yn-unified-nav button{width:34px;height:34px;margin:auto;border:1px solid #e4eae6;border-radius:50%;background:#fff;color:var(--brand);font-size:20px;line-height:1}
.yn-unified-week,.yn-unified-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.yn-unified-week{margin-bottom:4px}.yn-unified-week span{text-align:center;padding:6px 0;font-size:10.5px;font-weight:850;color:#94a198}.yn-unified-week span:first-child{color:#c96d64}.yn-unified-week span:last-child{color:#6d85b5}
.yn-unified-day{height:41px;border:0;border-radius:13px;background:transparent;color:#26332a;font-size:13.5px;font-weight:780}.yn-unified-day.muted{color:#c6cec8}.yn-unified-day.today{box-shadow:inset 0 0 0 1.5px #c8dccf;color:var(--brand)}.yn-unified-day.sel{background:var(--brand)!important;color:#fff!important;box-shadow:0 5px 13px rgba(47,107,71,.22)}
.yn-unified-section{padding-top:15px;margin-top:15px;border-top:1px solid #eef1ef}.yn-unified-label{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.yn-unified-label strong{font-size:12.5px;color:#536158;font-weight:900}.yn-unified-label span{font-size:10.5px;color:#9aa49e;font-weight:750}
.yn-unified-chips{display:flex;gap:7px;flex-wrap:wrap}.yn-unified-chip{display:inline-flex;align-items:center;gap:5px;min-height:36px;border:1px solid #e4e9e5;border-radius:999px;background:#f7f9f7;color:#4f5d54;padding:8px 12px;font-size:12px;font-weight:800;white-space:nowrap}.yn-unified-chip.on{background:var(--brand);border-color:var(--brand);color:#fff;box-shadow:0 3px 9px rgba(47,107,71,.18)}.yn-unified-chip .ya-chip{width:16px;height:16px}
.yn-unified-actions{display:grid;grid-template-columns:1fr 2fr;gap:9px;margin-top:18px}.yn-unified-actions button{height:48px;border-radius:15px;font-size:13.5px;font-weight:900}.yn-unified-reset{border:1px solid #e1e7e3;background:#fff;color:#657168}.yn-unified-apply{border:0;background:var(--brand);color:#fff}
@keyframes ynuFade{from{opacity:0}to{opacity:1}}@keyframes ynuUp{from{transform:translateY(18px);opacity:.82}to{transform:none;opacity:1}}
@media(prefers-reduced-motion:reduce){.yn-unified-modal,.yn-unified-sheet{animation:none}}
`;
  document.head.appendChild(s)
}

function close(){document.getElementById('ynUnifiedFilter')?.remove()}
function render(){
  const modal=document.getElementById('ynUnifiedFilter');if(!modal||!draft.selected||!draft.view)return;
  modal.querySelector('#ynuDateStrong').textContent=dateTitle(draft.selected);
  modal.querySelector('#ynuMonth').textContent=monthTitle(draft.view);
  const grid=modal.querySelector('#ynuGrid');grid.innerHTML='';
  const y=draft.view.getFullYear(),m=draft.view.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=new Date();
  for(let i=0;i<42;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),b=document.createElement('button');
    b.type='button';b.className='yn-unified-day';b.textContent=String(d.getDate());
    if(d.getMonth()!==m)b.classList.add('muted');if(sameDay(d,today))b.classList.add('today');if(sameDay(d,draft.selected))b.classList.add('sel');
    b.onclick=function(){draft.selected=new Date(d.getFullYear(),d.getMonth(),d.getDate());if(d.getMonth()!==m)draft.view=new Date(d.getFullYear(),d.getMonth(),1);render()};grid.appendChild(b)
  }
  modal.querySelectorAll('[data-kind]').forEach(function(b){b.classList.toggle('on',b.dataset.kind===draft.kind)});
  modal.querySelectorAll('[data-author]').forEach(function(b){const id=b.dataset.author;b.classList.toggle('on',id==='__all__'?!draft.authors.length:draft.authors.indexOf(id)>=0)});
  const count=modal.querySelector('#ynuPeopleCount');if(count)count.textContent=draft.authors.length?draft.authors.length+'명 선택':'전체'
}

function openUnified(){
  close();
  const cur=typeof window.getUnifiedSocialFilter==='function'?window.getUnifiedSocialFilter():{kind:'all',date:'',authors:[]};
  const base=parseDate(cur.date||currentNanumDate())||new Date();
  draft={selected:new Date(base.getFullYear(),base.getMonth(),base.getDate()),view:new Date(base.getFullYear(),base.getMonth(),1),authors:Array.isArray(cur.authors)?cur.authors.slice():[],kind:cur.kind||'all'};
  const users=allUsers();
  const people='<button type="button" class="yn-unified-chip" data-author="__all__">전체</button>'+users.map(function(u){return '<button type="button" class="yn-unified-chip" data-author="'+esc(u.id)+'">'+chipAvatar(u)+esc(u.name||'')+'</button>'}).join('');
  const modal=document.createElement('div');modal.id='ynUnifiedFilter';modal.className='yn-unified-modal';
  modal.innerHTML='<div class="yn-unified-sheet">'
    +'<div class="yn-unified-top"><div><small>나눔 피드</small><h3>날짜와 사람 선택</h3></div><button type="button" class="yn-unified-close" aria-label="닫기">×</button></div>'
    +'<div class="yn-unified-date-summary"><span>선택한 날짜</span><strong id="ynuDateStrong"></strong></div>'
    +'<div class="yn-unified-nav"><button type="button" data-move="-1">‹</button><strong id="ynuMonth"></strong><button type="button" data-move="1">›</button></div>'
    +'<div class="yn-unified-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div><div class="yn-unified-grid" id="ynuGrid"></div>'
    +'<div class="yn-unified-section"><div class="yn-unified-label"><strong>종류</strong><span>원하는 글만 보기</span></div><div class="yn-unified-chips"><button type="button" class="yn-unified-chip" data-kind="all">전체</button><button type="button" class="yn-unified-chip" data-kind="qt">나눔</button><button type="button" class="yn-unified-chip" data-kind="prayer">기도</button></div></div>'
    +'<div class="yn-unified-section"><div class="yn-unified-label"><strong>사람</strong><span id="ynuPeopleCount"></span></div><div class="yn-unified-chips">'+people+'</div></div>'
    +'<div class="yn-unified-actions"><button type="button" class="yn-unified-reset">오늘 · 전체</button><button type="button" class="yn-unified-apply">적용하기</button></div>'
    +'</div>';
  modal.onclick=function(e){if(e.target===modal)close()};modal.querySelector('.yn-unified-close').onclick=close;
  modal.querySelectorAll('[data-move]').forEach(function(b){b.onclick=function(){draft.view.setMonth(draft.view.getMonth()+Number(b.dataset.move));render()}});
  modal.querySelectorAll('[data-kind]').forEach(function(b){b.onclick=function(){draft.kind=b.dataset.kind;render()}});
  modal.querySelectorAll('[data-author]').forEach(function(b){b.onclick=function(){const id=b.dataset.author;if(id==='__all__')draft.authors=[];else{const i=draft.authors.indexOf(id);if(i>=0)draft.authors.splice(i,1);else draft.authors.push(id)}render()}});
  modal.querySelector('.yn-unified-reset').onclick=function(){const t=new Date();draft.selected=new Date(t.getFullYear(),t.getMonth(),t.getDate());draft.view=new Date(t.getFullYear(),t.getMonth(),1);draft.authors=[];draft.kind='all';render()};
  modal.querySelector('.yn-unified-apply').onclick=function(){
    const date=iso(draft.selected);
    try{if(typeof selectNanumDate==='function')selectNanumDate(date,true)}catch(e){console.error('[unified filter date]',e)}
    if(typeof window.applyUnifiedSocialFilter==='function')window.applyUnifiedSocialFilter({date:date,authors:draft.authors.slice(),kind:draft.kind});
    close()
  };
  document.body.appendChild(modal);render()
}

function run(){inject();window.openDatePicker=openUnified}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();

console.log('[Yeorin] unified date/person filter ready');
})();
