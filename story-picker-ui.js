/* 여린교회 스토리 업로더: 네이티브 갤러리 우선 UX */
(function(){
'use strict';
if(window.__YEORIN_STORY_PICKER_UI__)return;
window.__YEORIN_STORY_PICKER_UI__=true;

let previewUrl='';

function ensureStyle(){
  if(document.getElementById('yeorin-story-picker-style'))return;
  const style=document.createElement('style');
  style.id='yeorin-story-picker-style';
  style.textContent=`
#ysUpload.ys-sp{position:fixed;inset:0;z-index:1600;background:#050505;color:#fff;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden}
.ys-sp-top{height:calc(66px + env(safe-area-inset-top));padding:calc(12px + env(safe-area-inset-top)) 16px 10px;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;gap:8px;background:#050505;flex:0 0 auto}
.ys-sp-title{font-size:20px;font-weight:850;text-align:center;letter-spacing:-.35px;white-space:nowrap}.ys-sp-x,.ys-sp-change{border:0;background:none;color:#fff;height:42px;padding:0;display:flex;align-items:center;justify-content:center}.ys-sp-x{font-size:35px;font-weight:250;line-height:1}.ys-sp-change{font-size:12px;font-weight:800;color:#d9dedb;white-space:nowrap}
.ys-sp-main{position:relative;flex:1;min-height:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;overflow:hidden}.ys-sp-empty{text-align:center;padding:28px 24px;max-width:340px}.ys-sp-empty-ico{width:76px;height:76px;border:1.5px solid #515151;border-radius:24px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center}.ys-sp-empty-ico svg{width:34px;height:34px;stroke:#fff}.ys-sp-empty strong{display:block;font-size:17px;margin-bottom:7px}.ys-sp-empty p{margin:0 0 20px;font-size:12.5px;line-height:1.55;color:#9c9c9c}.ys-sp-pick{border:0;border-radius:12px;background:#2f6b47;color:#fff;padding:12px 18px;font-size:13px;font-weight:850}
.ys-sp-preview{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#090909}.ys-sp-preview img,.ys-sp-preview video{width:100%;height:100%;object-fit:contain;background:#090909}.ys-sp-preview video{outline:0}
.ys-sp-bottom{flex:0 0 auto;background:#111;padding:13px 16px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #252525}.ys-sp-caption{box-sizing:border-box;width:100%;height:48px;border:1px solid #343434;border-radius:14px;background:#1b1b1b;color:#fff;padding:0 14px;font-size:13.5px;outline:0;margin-bottom:10px}.ys-sp-caption::placeholder{color:#777}.ys-sp-caption:focus{border-color:#5f7f6c}.ys-sp-upload{width:100%;height:50px;border:0;border-radius:14px;background:#2f6b47;color:#fff;font-size:14px;font-weight:850}.ys-sp-upload:disabled{opacity:.55}.ys-sp-file{position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px}
@media(min-width:620px){#ysUpload.ys-sp{left:50%;right:auto;width:min(100%,520px);transform:translateX(-50%);box-shadow:0 0 0 100vmax rgba(0,0,0,.72)}}
`;
  document.head.appendChild(style);
}

function revokePreview(){
  if(!previewUrl)return;
  try{URL.revokeObjectURL(previewUrl)}catch(e){}
  previewUrl='';
}

function closeUploader(){
  revokePreview();
  document.getElementById('ysUpload')?.remove();
}
window.closeStoryUploader=closeUploader;

function renderSelected(file){
  const holder=document.getElementById('ysStoryPreview');
  const empty=document.getElementById('ysStoryEmpty');
  const bottom=document.getElementById('ysStoryBottom');
  if(!holder||!empty||!bottom||!file)return;
  revokePreview();
  previewUrl=URL.createObjectURL(file);
  const isVideo=(file.type||'').startsWith('video/');
  holder.innerHTML=isVideo
    ?'<video src="'+previewUrl+'" controls playsinline preload="metadata"></video>'
    :'<img src="'+previewUrl+'" alt="선택한 스토리 미리보기">';
  empty.style.display='none';
  holder.style.display='flex';
  bottom.style.display='block';
  document.getElementById('ysStoryChange').style.visibility='visible';
}

window.openStoryUploader=function(){
  ensureStyle();
  closeUploader();
  const modal=document.createElement('div');
  modal.id='ysUpload';
  modal.className='ys-sp';
  modal.innerHTML=`
    <input id="ysFile" class="ys-sp-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm">
    <div class="ys-sp-top">
      <button class="ys-sp-x" type="button" aria-label="닫기" onclick="closeStoryUploader()">×</button>
      <div class="ys-sp-title">스토리에 추가</div>
      <button id="ysStoryChange" class="ys-sp-change" type="button" style="visibility:hidden">다시 선택</button>
    </div>
    <div class="ys-sp-main">
      <div id="ysStoryEmpty" class="ys-sp-empty">
        <div class="ys-sp-empty-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="M5.5 17l4.2-4 3.2 3 2.1-2 3.5 3"></path></svg></div>
        <strong>사진 또는 영상을 선택해주세요</strong>
        <p>사진과 30초 이하 영상을 스토리로 올릴 수 있어요.</p>
        <button id="ysStoryPick" class="ys-sp-pick" type="button">갤러리에서 선택</button>
      </div>
      <div id="ysStoryPreview" class="ys-sp-preview" style="display:none"></div>
    </div>
    <div id="ysStoryBottom" class="ys-sp-bottom" style="display:none">
      <input id="ysCaption" class="ys-sp-caption" maxlength="500" placeholder="한 줄 남기기 (선택)">
      <button class="ys-primary ys-sp-upload" type="button" onclick="submitStory()">스토리 올리기</button>
    </div>`;
  document.body.appendChild(modal);

  const fileInput=document.getElementById('ysFile');
  const openPicker=()=>{fileInput.value='';fileInput.click()};
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files&&fileInput.files[0];
    if(file)renderSelected(file);
  });
  document.getElementById('ysStoryPick').addEventListener('click',openPicker);
  document.getElementById('ysStoryChange').addEventListener('click',openPicker);

  // 사용자가 스토리 추가를 누른 즉시 Android/iOS의 실제 사진 선택기를 엽니다.
  // 브라우저/PWA는 보안상 기기 갤러리를 웹 화면 안에서 임의로 열람할 수 없으므로,
  // 네이티브 사진 선택기를 바로 호출하는 방식이 가장 실제 앱에 가까운 동작입니다.
  fileInput.click();
};

const originalSubmit=window.submitStory;
if(typeof originalSubmit==='function'){
  window.submitStory=async function(){
    const result=await originalSubmit.apply(this,arguments);
    if(!document.getElementById('ysUpload'))revokePreview();
    return result;
  };
}

console.log('[Yeorin] native gallery-first story picker ready');
})();