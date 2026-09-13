/* 여린교회 스토리 업로더: 갤러리 우선 + 안정적인 텍스트 편집 */
(function(){
'use strict';
if(window.__YEORIN_STORY_PICKER_UI__)return;
window.__YEORIN_STORY_PICKER_UI__=true;

let previewUrl='';
let overlay={text:'',x:50,y:45};
let dragging=null;
let finishingEditor=false;

function ensureStyle(){
  if(document.getElementById('yeorin-story-picker-style'))return;
  const style=document.createElement('style');
  style.id='yeorin-story-picker-style';
  style.textContent=`
#ysUpload.ys-sp{position:fixed;inset:0;z-index:1600;background:#050505;color:#fff;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden}
.ys-sp-top{height:calc(66px + env(safe-area-inset-top));padding:calc(12px + env(safe-area-inset-top)) 12px 10px;display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:8px;background:#050505;flex:0 0 auto;z-index:12}
.ys-sp-title{font-size:18px;font-weight:850;text-align:center;letter-spacing:-.35px;white-space:nowrap}.ys-sp-x,.ys-sp-tool{border:0;background:none;color:#fff;height:42px;padding:0;display:flex;align-items:center;justify-content:center}.ys-sp-x{font-size:34px;font-weight:250;line-height:1}.ys-sp-tools{display:flex;gap:7px;align-items:center}.ys-sp-tool{width:42px;border-radius:50%;background:rgba(255,255,255,.12);font-size:15px;font-weight:900}.ys-sp-tool.aa{font-family:Georgia,serif;font-size:18px}.ys-sp-tool:active{transform:scale(.96)}
.ys-sp-main{position:relative;flex:1;min-height:0;background:#0a0a0a;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none}.ys-sp-empty{text-align:center;padding:28px 24px;max-width:340px}.ys-sp-empty-ico{width:76px;height:76px;border:1.5px solid #515151;border-radius:24px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center}.ys-sp-empty-ico svg{width:34px;height:34px;stroke:#fff}.ys-sp-empty strong{display:block;font-size:17px;margin-bottom:7px}.ys-sp-empty p{margin:0 0 20px;font-size:12.5px;line-height:1.55;color:#9c9c9c}.ys-sp-pick{border:0;border-radius:12px;background:#2f6b47;color:#fff;padding:12px 18px;font-size:13px;font-weight:850}
.ys-sp-preview{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#090909}.ys-sp-preview img,.ys-sp-preview video{width:100%;height:100%;object-fit:contain;background:#090909;pointer-events:none}.ys-sp-preview video{outline:0}
.ys-sp-overlay{position:absolute;z-index:8;transform:translate(-50%,-50%);max-width:82%;min-width:70px;padding:7px 10px;border-radius:11px;background:rgba(0,0,0,.38);color:#fff;font-size:28px;line-height:1.2;font-weight:850;text-align:center;letter-spacing:-.6px;text-shadow:0 2px 6px rgba(0,0,0,.38);white-space:pre-wrap;overflow-wrap:anywhere;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:0 2px 12px rgba(0,0,0,.12)}
.ys-sp-overlay:active{box-shadow:0 0 0 2px rgba(255,255,255,.45),0 3px 18px rgba(0,0,0,.18)}
.ys-sp-text-editor{position:absolute;z-index:11;transform:translate(-50%,-50%);width:min(82%,360px);min-height:52px;max-height:190px;padding:9px 11px;border:2px solid rgba(255,255,255,.72);border-radius:12px;background:rgba(0,0,0,.42);color:#fff;caret-color:#fff;outline:none;resize:none;overflow:hidden;font-family:inherit;font-size:28px;line-height:1.2;font-weight:850;text-align:center;letter-spacing:-.6px;text-shadow:0 2px 6px rgba(0,0,0,.38);box-shadow:0 4px 22px rgba(0,0,0,.22);touch-action:auto;user-select:text;-webkit-user-select:text;-webkit-appearance:none}
.ys-sp-text-editor::placeholder{color:rgba(255,255,255,.58)}
.ys-sp-hint{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);z-index:7;padding:8px 12px;border-radius:999px;background:rgba(0,0,0,.48);font-size:11px;font-weight:750;color:#e5e5e5;pointer-events:none;opacity:0;transition:opacity .2s;white-space:nowrap}.ys-sp-hint.on{opacity:1}
.ys-sp-bottom{flex:0 0 auto;background:#0b0b0b;padding:12px 14px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #202020;display:flex;gap:10px;align-items:center}.ys-sp-change{height:50px;flex:0 0 auto;border:1px solid #343434;border-radius:16px;background:#161616;color:#e9e9e9;padding:0 15px;font-size:12px;font-weight:800}.ys-sp-upload{height:50px;flex:1;border:0;border-radius:16px;background:#2f6b47;color:#fff;font-size:14px;font-weight:850}.ys-sp-upload:disabled{opacity:.55}.ys-sp-file{position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-10px;top:-10px}
@media(min-width:620px){#ysUpload.ys-sp{left:50%;right:auto;width:min(100%,520px);transform:translateX(-50%);box-shadow:0 0 0 100vmax rgba(0,0,0,.72)}}
`;
  document.head.appendChild(style);
}

function revokePreview(){
  if(!previewUrl)return;
  try{URL.revokeObjectURL(previewUrl)}catch(e){}
  previewUrl='';
}

function resetOverlay(){
  overlay={text:'',x:50,y:45};
  document.getElementById('ysStoryOverlay')?.remove();
  document.getElementById('ysStoryTextEditor')?.remove();
  dragging=null;
}

function closeUploader(){
  revokePreview();
  resetOverlay();
  document.getElementById('ysUpload')?.remove();
}
window.closeStoryUploader=closeUploader;

function stage(){return document.getElementById('ysStoryMain')}
function overlayEl(){return document.getElementById('ysStoryOverlay')}
function editorEl(){return document.getElementById('ysStoryTextEditor')}

function normalizeText(v){
  return String(v||'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').slice(0,180);
}

function syncEditorText(){
  const ed=editorEl();
  if(ed)overlay.text=normalizeText(ed.value);
  return overlay.text;
}

function autoGrow(ed){
  if(!ed)return;
  ed.style.height='52px';
  ed.style.height=Math.min(190,Math.max(52,ed.scrollHeight))+'px';
}

function renderOverlay(){
  overlayEl()?.remove();
  if(!overlay.text.trim())return;
  const el=document.createElement('div');
  el.id='ysStoryOverlay';
  el.className='ys-sp-overlay';
  el.textContent=overlay.text.trim();
  el.style.left=overlay.x+'%';
  el.style.top=overlay.y+'%';
  stage()?.appendChild(el);
  bindOverlayDrag(el);
}

function finishTextEdit(){
  const ed=editorEl();
  if(!ed||finishingEditor)return;
  finishingEditor=true;
  overlay.text=normalizeText(ed.value).trim();
  ed.remove();
  renderOverlay();
  finishingEditor=false;
}
window.finishStoryTextEdit=finishTextEdit;

function editOverlay(){
  const preview=document.getElementById('ysStoryPreview');
  const host=stage();
  if(!host||!preview||preview.style.display==='none')return;

  const existing=editorEl();
  if(existing){
    existing.focus({preventScroll:true});
    return;
  }

  overlayEl()?.remove();
  const ed=document.createElement('textarea');
  ed.id='ysStoryTextEditor';
  ed.className='ys-sp-text-editor';
  ed.maxLength=180;
  ed.rows=1;
  ed.placeholder='텍스트 입력';
  ed.value=overlay.text;
  ed.style.left=overlay.x+'%';
  ed.style.top=overlay.y+'%';
  ed.setAttribute('aria-label','스토리 텍스트 입력');
  host.appendChild(ed);

  ed.addEventListener('input',()=>{syncEditorText();autoGrow(ed)});
  ed.addEventListener('blur',()=>setTimeout(()=>{if(document.body.contains(ed))finishTextEdit()},0));
  ed.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){
      e.preventDefault();
      finishTextEdit();
    }
  });
  ed.addEventListener('pointerdown',e=>e.stopPropagation());
  autoGrow(ed);

  try{ed.focus({preventScroll:true})}catch(e){ed.focus()}
  try{ed.setSelectionRange(ed.value.length,ed.value.length)}catch(e){}
}
window.editStoryOverlay=editOverlay;

function bindOverlayDrag(el){
  el.addEventListener('pointerdown',e=>{
    const host=stage();
    if(!host)return;
    e.preventDefault();
    dragging={id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};
    try{el.setPointerCapture(e.pointerId)}catch(_e){}
  });

  el.addEventListener('pointermove',e=>{
    if(!dragging||dragging.id!==e.pointerId)return;
    if(Math.abs(e.clientX-dragging.startX)+Math.abs(e.clientY-dragging.startY)>5)dragging.moved=true;
    if(!dragging.moved)return;
    const r=stage().getBoundingClientRect();
    overlay.x=Math.max(12,Math.min(88,(e.clientX-r.left)/r.width*100));
    overlay.y=Math.max(12,Math.min(86,(e.clientY-r.top)/r.height*100));
    el.style.left=overlay.x+'%';
    el.style.top=overlay.y+'%';
  });

  el.addEventListener('pointerup',e=>{
    if(!dragging||dragging.id!==e.pointerId)return;
    const moved=dragging.moved;
    dragging=null;
    if(!moved)editOverlay();
  });

  el.addEventListener('pointercancel',()=>{dragging=null});
}

function showHint(){
  const h=document.getElementById('ysStoryHint');
  if(!h)return;
  h.classList.add('on');
  clearTimeout(showHint.t);
  showHint.t=setTimeout(()=>h.classList.remove('on'),2200);
}

function renderSelected(file){
  const holder=document.getElementById('ysStoryPreview');
  const empty=document.getElementById('ysStoryEmpty');
  const bottom=document.getElementById('ysStoryBottom');
  if(!holder||!empty||!bottom||!file)return;

  revokePreview();
  resetOverlay();
  previewUrl=URL.createObjectURL(file);
  const isVideo=(file.type||'').startsWith('video/');
  holder.innerHTML=isVideo
    ?'<video src="'+previewUrl+'" autoplay muted loop playsinline preload="metadata"></video>'
    :'<img src="'+previewUrl+'" alt="선택한 스토리 미리보기">';
  empty.style.display='none';
  holder.style.display='flex';
  bottom.style.display='flex';
  document.getElementById('ysStoryTools').style.visibility='visible';
  showHint();
}

window.getStoryOverlayDraft=function(){
  syncEditorText();
  const text=normalizeText(overlay.text).trim();
  return text?{
    text,
    x:Number(overlay.x.toFixed(2)),
    y:Number(overlay.y.toFixed(2)),
    fontSize:28,
    color:'#ffffff',
    background:'dark'
  }:{};
};

window.openStoryUploader=function(){
  ensureStyle();
  closeUploader();
  overlay={text:'',x:50,y:45};

  const modal=document.createElement('div');
  modal.id='ysUpload';
  modal.className='ys-sp';
  modal.innerHTML=`
    <input id="ysFile" class="ys-sp-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm">
    <div class="ys-sp-top">
      <button class="ys-sp-x" type="button" aria-label="닫기" onclick="closeStoryUploader()">×</button>
      <div class="ys-sp-title">새 스토리</div>
      <div id="ysStoryTools" class="ys-sp-tools" style="visibility:hidden">
        <button class="ys-sp-tool aa" type="button" aria-label="텍스트 추가" onclick="editStoryOverlay()">Aa</button>
      </div>
    </div>
    <div id="ysStoryMain" class="ys-sp-main">
      <div id="ysStoryEmpty" class="ys-sp-empty">
        <div class="ys-sp-empty-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="3"></rect><circle cx="9" cy="10" r="2"></circle><path d="M5.5 17l4.2-4 3.2 3 2.1-2 3.5 3"></path></svg></div>
        <strong>사진 또는 영상을 선택해주세요</strong>
        <p>사진과 30초 이하 영상을 스토리로 올릴 수 있어요.</p>
        <button id="ysStoryPick" class="ys-sp-pick" type="button">갤러리에서 선택</button>
      </div>
      <div id="ysStoryPreview" class="ys-sp-preview" style="display:none"></div>
      <div id="ysStoryHint" class="ys-sp-hint">Aa로 글을 쓰고, 작성 후 글을 끌어 위치를 바꿔보세요</div>
    </div>
    <div id="ysStoryBottom" class="ys-sp-bottom" style="display:none">
      <button id="ysStoryChange" class="ys-sp-change" type="button">사진 변경</button>
      <button class="ys-primary ys-sp-upload" type="button" onclick="submitStory()">스토리 공유</button>
    </div>`;
  document.body.appendChild(modal);

  const host=stage();
  host.addEventListener('pointerdown',e=>{
    if(editorEl()&&!e.target.closest('#ysStoryTextEditor'))finishTextEdit();
  });

  const fileInput=document.getElementById('ysFile');
  const openPicker=()=>{
    finishTextEdit();
    fileInput.value='';
    fileInput.click();
  };
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files&&fileInput.files[0];
    if(file)renderSelected(file);
  });
  document.getElementById('ysStoryPick').addEventListener('click',openPicker);
  document.getElementById('ysStoryChange').addEventListener('click',openPicker);
  fileInput.click();
};

console.log('[Yeorin] story editor ready');
})();