/* 여린교회 나눔/프로필 UI 리프레시 */
(function(){
'use strict';
if(window.__YEORIN_NANUM_UI_REFRESH__)return;
window.__YEORIN_NANUM_UI_REFRESH__=true;

function injectStyle(){
  if(document.getElementById('yeorin-nanum-ui-refresh-style'))return;
  const s=document.createElement('style');
  s.id='yeorin-nanum-ui-refresh-style';
  s.textContent=`
/* 상단 날짜: 일자 가로 스크롤은 제거하고 월 이동만 남깁니다. */
.dstrip-track{display:none!important}
.dstrip-head{margin-top:12px!important;gap:9px!important}
.dstrip-arrow{width:34px!important;height:34px!important;background:rgba(255,255,255,.12)!important}
.dstrip-month{flex:0 1 auto!important;margin:0 auto!important;padding:7px 12px!important;border-radius:999px!important;background:rgba(255,255,255,.08)!important;font-size:14px!important;letter-spacing:-.2px!important}
.dstrip-today-btn{padding:7px 11px!important;background:rgba(255,255,255,.16)!important}

/* 나눔 보기: 입력창처럼 길던 UI를 컴팩트한 필터 칩으로 변경 */
#nanum-social-root .ys-head{padding:0 16px 13px!important}
#nanum-social-root .ys-viewbar{justify-content:flex-start!important;gap:8px!important;padding:4px 0 2px!important}
#nanum-social-root .ys-view{flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:calc(100% - 74px)!important;padding:10px 14px!important;gap:6px!important;border:1px solid #e0e7e2!important;border-radius:999px!important;background:#f8faf8!important;box-shadow:0 2px 9px rgba(26,38,32,.045)!important;font-size:12.5px!important;line-height:1!important;color:#445148!important}
#nanum-social-root .ys-view.on{border-color:#cfe0d4!important;background:var(--brand-soft)!important;color:var(--brand)!important}
#nanum-social-root .ys-view-ico{font-size:12px!important;opacity:.72!important}
#nanum-social-root .ys-view-clear{padding:9px 7px!important;color:#718078!important;font-size:11.5px!important}

/* 필터 날짜: 브라우저 기본 date picker를 노출하지 않습니다. */
#nanum-social-root .ys-pebdate{cursor:pointer!important;user-select:none!important}
#nanum-social-root .ys-pebdate input{pointer-events:none!important}

/* 나눔 전용 날짜 선택 바텀시트 */
.yn-date-modal{position:fixed;inset:0;z-index:1900;background:rgba(12,24,16,.44);display:flex;align-items:flex-end;justify-content:center;animation:ynFade .16s ease-out}
.yn-date-sheet{width:100%;max-width:var(--max);background:#fff;border-radius:28px 28px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -16px 40px rgba(12,29,18,.18);animation:ynUp .2s ease-out}
.yn-date-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}
.yn-date-kicker{font-size:11px;font-weight:800;color:#829087;margin-bottom:3px}
.yn-date-selected{font-size:22px;font-weight:900;color:#19261e;letter-spacing:-.6px;line-height:1.3}
.yn-date-close{width:38px;height:38px;border:0;border-radius:50%;background:#f3f6f4;color:#536158;font-size:23px;line-height:38px}
.yn-date-nav{height:44px;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin-bottom:8px}
.yn-date-nav strong{text-align:center;font-size:16px;font-weight:900;color:#233027}
.yn-date-nav button{width:36px;height:36px;margin:auto;border:1px solid #e6ebe7;border-radius:50%;background:#fff;color:var(--brand);font-size:21px;line-height:1}
.yn-date-week,.yn-date-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.yn-date-week{margin-bottom:5px}.yn-date-week span{text-align:center;padding:6px 0;font-size:11px;font-weight:800;color:#93a097}
.yn-date-week span:first-child{color:#c86b61}.yn-date-week span:last-child{color:#6781b4}
.yn-date-day{height:43px;border:0;border-radius:14px;background:transparent;color:#27342b;font-size:14px;font-weight:780;position:relative}
.yn-date-day.is-muted{color:#c5cdc8}.yn-date-day.is-today{box-shadow:inset 0 0 0 1.5px #c7dccf;color:var(--brand)}
.yn-date-day.is-selected{background:var(--brand)!important;color:#fff!important;box-shadow:0 6px 14px rgba(47,107,71,.22)}
.yn-date-actions{display:grid;grid-template-columns:1fr 2fr;gap:9px;margin-top:15px}
.yn-date-actions button{height:48px;border-radius:15px;font-size:13.5px;font-weight:850}
.yn-date-today{border:1px solid #e0e7e2;background:#fff;color:#5a685f}.yn-date-apply{border:0;background:var(--brand);color:#fff}
@keyframes ynFade{from{opacity:0}to{opacity:1}}@keyframes ynUp{from{transform:translateY(18px);opacity:.8}to{transform:none;opacity:1}}

/* 프로필 사진 선택: 기본 브라우저 파일 버튼 제거 */
#yaSheet #yaFile{position:fixed!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
.yn-avatar-preview-wrap{position:relative;width:96px;margin:6px auto 14px}
.yn-avatar-preview-wrap .ya-preview{margin:0!important}
.yn-avatar-camera{position:absolute;right:-3px;bottom:-3px;width:31px;height:31px;border:3px solid #fff;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 9px rgba(47,107,71,.24);padding:0}
.yn-avatar-camera svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.yn-avatar-pick{width:100%;height:46px;border:1px solid #d8e4dc;border-radius:14px;background:#f5faf7;color:var(--brand);font-size:13.5px;font-weight:850;margin:12px 0 8px;display:flex;align-items:center;justify-content:center;gap:7px}
.yn-avatar-pick svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.yn-avatar-file-name{font-size:11.5px;color:#87938b;text-align:center;min-height:18px;margin-bottom:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 8px}
#yaSheet .ya-primary{height:48px!important;padding:0 14px!important;border-radius:15px!important}
#yaSheet .ya-ghost{border-color:#e2e7e3!important;color:#66736b!important;border-radius:15px!important}
@media(prefers-reduced-motion:reduce){.yn-date-modal,.yn-date-sheet{animation:none}}
`;
  document.head.appendChild(s);
}

function pad(n){return String(n).padStart(2,'0')}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function parseDate(v){
  const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null
}
function sameDay(a,b){return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function dateTitle(d){return d.getFullYear()+'년 '+(d.getMonth()+1)+'월 '+d.getDate()+'일'}
function monthTitle(d){return d.getFullYear()+'년 '+(d.getMonth()+1)+'월'}

let filterPicker={selected:null,view:null};
function closeFilterPicker(){document.getElementById('ynFilterDateModal')?.remove()}
function renderFilterPicker(){
  const modal=document.getElementById('ynFilterDateModal');
  if(!modal||!filterPicker.selected||!filterPicker.view)return;
  modal.querySelector('.yn-date-selected').textContent=dateTitle(filterPicker.selected);
  modal.querySelector('.yn-date-nav strong').textContent=monthTitle(filterPicker.view);
  const grid=modal.querySelector('.yn-date-grid');
  grid.innerHTML='';
  const y=filterPicker.view.getFullYear(),m=filterPicker.view.getMonth();
  const first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=new Date();
  for(let i=0;i<42;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i);
    const b=document.createElement('button');
    b.type='button';b.className='yn-date-day';b.textContent=String(d.getDate());
    if(d.getMonth()!==m)b.classList.add('is-muted');
    if(sameDay(d,today))b.classList.add('is-today');
    if(sameDay(d,filterPicker.selected))b.classList.add('is-selected');
    b.onclick=function(){
      filterPicker.selected=new Date(d.getFullYear(),d.getMonth(),d.getDate());
      if(d.getMonth()!==m)filterPicker.view=new Date(d.getFullYear(),d.getMonth(),1);
      renderFilterPicker();
    };
    grid.appendChild(b)
  }
}
function openFilterPicker(){
  closeFilterPicker();
  const input=document.querySelector('#ysFilter .ys-pebdate input');
  const base=parseDate(input&&input.value)||new Date();
  filterPicker.selected=new Date(base.getFullYear(),base.getMonth(),base.getDate());
  filterPicker.view=new Date(base.getFullYear(),base.getMonth(),1);
  const modal=document.createElement('div');
  modal.id='ynFilterDateModal';modal.className='yn-date-modal';
  modal.innerHTML='<div class="yn-date-sheet">'
    +'<div class="yn-date-top"><div><div class="yn-date-kicker">날짜 선택</div><div class="yn-date-selected"></div></div><button class="yn-date-close" type="button" aria-label="닫기">×</button></div>'
    +'<div class="yn-date-nav"><button type="button" data-move="-1" aria-label="이전 달">‹</button><strong></strong><button type="button" data-move="1" aria-label="다음 달">›</button></div>'
    +'<div class="yn-date-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>'
    +'<div class="yn-date-grid"></div>'
    +'<div class="yn-date-actions"><button type="button" class="yn-date-today">오늘</button><button type="button" class="yn-date-apply">이 날짜 선택</button></div>'
    +'</div>';
  modal.onclick=function(e){if(e.target===modal)closeFilterPicker()};
  modal.querySelector('.yn-date-close').onclick=closeFilterPicker;
  modal.querySelectorAll('[data-move]').forEach(function(btn){btn.onclick=function(){filterPicker.view.setMonth(filterPicker.view.getMonth()+Number(btn.dataset.move));renderFilterPicker()}});
  modal.querySelector('.yn-date-today').onclick=function(){const t=new Date();filterPicker.selected=new Date(t.getFullYear(),t.getMonth(),t.getDate());filterPicker.view=new Date(t.getFullYear(),t.getMonth(),1);renderFilterPicker()};
  modal.querySelector('.yn-date-apply').onclick=function(){if(typeof window.draftDate==='function')window.draftDate(iso(filterPicker.selected));closeFilterPicker()};
  document.body.appendChild(modal);
  renderFilterPicker()
}

function decorateFilterDate(){
  document.querySelectorAll('#ysFilter .ys-pebdate').forEach(function(el){
    if(el.dataset.ynDateReady==='1')return;
    el.dataset.ynDateReady='1';el.setAttribute('role','button');el.setAttribute('tabindex','0');
    el.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openFilterPicker()}})
  })
}

function cameraSvg(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z"></path><circle cx="12" cy="13.5" r="3.2"></circle></svg>'}
function decorateAvatarSheet(){
  const sheet=document.getElementById('yaSheet'),input=document.getElementById('yaFile'),preview=document.getElementById('yaPreview');
  if(!sheet||!input||!preview||sheet.dataset.ynUiReady==='1')return;
  sheet.dataset.ynUiReady='1';
  let wrap=preview.parentElement;
  if(!wrap.classList.contains('yn-avatar-preview-wrap')){
    wrap=document.createElement('div');wrap.className='yn-avatar-preview-wrap';
    preview.parentNode.insertBefore(wrap,preview);wrap.appendChild(preview);
    const cam=document.createElement('button');cam.type='button';cam.className='yn-avatar-camera';cam.setAttribute('aria-label','프로필 사진 선택');cam.innerHTML=cameraSvg();cam.onclick=function(){input.click()};wrap.appendChild(cam)
  }
  const pick=document.createElement('button');pick.type='button';pick.className='yn-avatar-pick';pick.innerHTML=cameraSvg()+'<span>사진 선택</span>';pick.onclick=function(){input.click()};
  const fileName=document.createElement('div');fileName.className='yn-avatar-file-name';fileName.textContent='JPG · PNG · WEBP / 최대 5MB';
  input.insertAdjacentElement('afterend',pick);pick.insertAdjacentElement('afterend',fileName);
  input.addEventListener('change',function(){
    const f=input.files&&input.files[0];
    if(!f)return;
    const span=pick.querySelector('span');if(span)span.textContent='다른 사진 선택';
    fileName.textContent=f.name
  })
}

function patchAvatarOpen(){
  const avatar=window.YeorinAvatar;
  if(!avatar||avatar.__ynUiPatched||typeof avatar.open!=='function')return;
  avatar.__ynUiPatched=true;
  const oldOpen=avatar.open;
  avatar.open=function(){const r=oldOpen.apply(this,arguments);setTimeout(decorateAvatarSheet,0);return r}
}

function run(){injectStyle();patchAvatarOpen();decorateFilterDate();decorateAvatarSheet()}

document.addEventListener('click',function(e){
  const el=e.target&&e.target.closest?e.target.closest('#ysFilter .ys-pebdate'):null;
  if(!el)return;
  e.preventDefault();e.stopPropagation();openFilterPicker()
},true);

const mo=new MutationObserver(run);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){run();mo.observe(document.documentElement,{childList:true,subtree:true})});
else{run();mo.observe(document.documentElement,{childList:true,subtree:true})}

console.log('[Yeorin] nanum/profile UI refresh ready');
})();
