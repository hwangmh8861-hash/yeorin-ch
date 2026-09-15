/* 여린교회 나눔/프로필 UI 리프레시
 * 성능 원칙:
 * - document 전체를 감시하는 MutationObserver를 사용하지 않습니다.
 * - 통합 필터(filter-control-polish.js)와 중복되던 구형 날짜 선택기 코드는 제거합니다.
 * - 동적으로 생기는 프로필 사진 시트만 YeorinAvatar.open 시점에 직접 보정합니다.
 */
(function(){
'use strict';
if(window.__YEORIN_NANUM_UI_REFRESH__)return;
window.__YEORIN_NANUM_UI_REFRESH__=true;

function injectStyle(){
  if(document.getElementById('yeorin-nanum-ui-refresh-style'))return;
  const s=document.createElement('style');
  s.id='yeorin-nanum-ui-refresh-style';
  s.textContent=`
/* 상단 날짜 */
.dstrip-track{display:none!important}
.dstrip-head{margin-top:12px!important;gap:9px!important}
.dstrip-arrow{width:34px!important;height:34px!important;background:rgba(255,255,255,.12)!important}
.dstrip-month{flex:0 1 auto!important;margin:0 auto!important;padding:7px 12px!important;border-radius:999px!important;background:rgba(255,255,255,.08)!important;font-size:14px!important;letter-spacing:-.2px!important}
.dstrip-today-btn{padding:7px 11px!important;background:rgba(255,255,255,.16)!important}

/* 나눔 헤더 */
#nanum-social-root .ys-head{padding:0 16px 13px!important}
#nanum-social-root .ys-viewbar{justify-content:flex-start!important;gap:8px!important;padding:4px 0 2px!important}
#nanum-social-root .ys-view{flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:calc(100% - 74px)!important;padding:10px 14px!important;gap:6px!important;border:1px solid #e0e7e2!important;border-radius:999px!important;background:#f8faf8!important;box-shadow:0 2px 9px rgba(26,38,32,.045)!important;font-size:12.5px!important;line-height:1!important;color:#445148!important}
#nanum-social-root .ys-view.on{border-color:#cfe0d4!important;background:var(--brand-soft)!important;color:var(--brand)!important}
#nanum-social-root .ys-view-ico{font-size:12px!important;opacity:.72!important}
#nanum-social-root .ys-view-clear{padding:9px 7px!important;color:#718078!important;font-size:11.5px!important}

/* 말씀 카드 */
#nanum-social-root .ys-ref{margin:14px 0 3px!important;padding:13px 15px 12px!important;border:1px solid #dce9e0!important;border-radius:16px!important;background:linear-gradient(145deg,#f4faf6 0%,#fbfdfb 100%)!important;color:var(--brand)!important;font-size:14px!important;font-weight:900!important;line-height:1.35!important;letter-spacing:-.2px!important;box-shadow:0 3px 12px rgba(47,107,71,.045)!important}
#nanum-social-root .ys-ref::before{content:'성경 구절';display:block;margin-bottom:5px;color:#809287;font-size:10.5px;font-weight:850;line-height:1.2;letter-spacing:.1px}
#nanum-social-root .ys-ref-title{font-size:14px!important;font-weight:900!important;color:var(--brand)!important;line-height:1.4!important;letter-spacing:-.2px!important;word-break:keep-all!important}
#nanum-social-root .ys-verse{position:relative!important;margin-top:8px!important}
#nanum-social-root .ys-verse-text{max-height:calc(1.75em * 4)!important;overflow:hidden!important;font-size:13.5px!important;font-weight:600!important;line-height:1.75!important;letter-spacing:-.1px!important;color:#33453a!important;word-break:break-word!important}
#nanum-social-root .ys-verse.is-open .ys-verse-text{max-height:none!important}
#nanum-social-root .ys-verse-fade{display:none;position:absolute;left:0;right:0;bottom:0;height:2.1em;pointer-events:none;background:linear-gradient(to bottom,rgba(249,252,250,0) 0%,rgba(249,252,250,.85) 58%,#f9fcfa 100%)}
#nanum-social-root .ys-verse.is-clamped .ys-verse-fade{display:block}
#nanum-social-root .ys-verse.is-open .ys-verse-fade{display:none}
#nanum-social-root .ys-verse-more{display:block!important;margin-top:7px!important;padding:2px 0!important;border:0!important;background:none!important;font-family:inherit!important;font-size:12.5px!important;font-weight:850!important;letter-spacing:-.1px!important;color:var(--brand)!important}
#nanum-social-root .ys-verse-more[hidden]{display:none!important}

/* 프로필 사진 선택 */
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
`;
  document.head.appendChild(s);
}

function cameraSvg(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3l1.4-2h7.2l1.4 2h3v10H4z"></path><circle cx="12" cy="13.5" r="3.2"></circle></svg>';
}

function decorateAvatarSheet(){
  const sheet=document.getElementById('yaSheet');
  const input=document.getElementById('yaFile');
  const preview=document.getElementById('yaPreview');
  if(!sheet||!input||!preview||sheet.dataset.ynUiReady==='1')return;
  sheet.dataset.ynUiReady='1';

  let wrap=preview.parentElement;
  if(!wrap.classList.contains('yn-avatar-preview-wrap')){
    wrap=document.createElement('div');
    wrap.className='yn-avatar-preview-wrap';
    preview.parentNode.insertBefore(wrap,preview);
    wrap.appendChild(preview);
    const cam=document.createElement('button');
    cam.type='button';
    cam.className='yn-avatar-camera';
    cam.setAttribute('aria-label','프로필 사진 선택');
    cam.innerHTML=cameraSvg();
    cam.onclick=function(){input.click()};
    wrap.appendChild(cam);
  }

  const pick=document.createElement('button');
  pick.type='button';
  pick.className='yn-avatar-pick';
  pick.innerHTML=cameraSvg()+'<span>사진 선택</span>';
  pick.onclick=function(){input.click()};

  const fileName=document.createElement('div');
  fileName.className='yn-avatar-file-name';
  fileName.textContent='JPG · PNG · WEBP / 최대 5MB';
  input.insertAdjacentElement('afterend',pick);
  pick.insertAdjacentElement('afterend',fileName);

  input.addEventListener('change',function(){
    const f=input.files&&input.files[0];
    if(!f)return;
    const span=pick.querySelector('span');
    if(span)span.textContent='다른 사진 선택';
    fileName.textContent=f.name;
  });
}

function patchAvatarOpen(){
  const avatar=window.YeorinAvatar;
  if(!avatar||avatar.__ynUiPatched||typeof avatar.open!=='function')return;
  avatar.__ynUiPatched=true;
  const oldOpen=avatar.open;
  avatar.open=function(){
    const r=oldOpen.apply(this,arguments);
    requestAnimationFrame(decorateAvatarSheet);
    return r;
  };
}

function run(){
  injectStyle();
  patchAvatarOpen();
  decorateAvatarSheet();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
else run();

console.log('[Yeorin] nanum/profile UI refresh ready');
})();
