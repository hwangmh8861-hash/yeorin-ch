/* 프로필 수정 화면 정리: 이모지 선택 제거, 프로필 사진/소개만 유지 */
(function(){
'use strict';
if(window.__YEORIN_PROFILE_EDIT_CLEANUP__)return;
window.__YEORIN_PROFILE_EDIT_CLEANUP__=true;

function cleanProfilePopup(){
  const popup=document.querySelector('#popupRoot .popup');
  if(!popup)return;

  const grid=popup.querySelector('#editEmojiGrid');
  if(grid){
    const group=grid.closest('.fg');
    if(group)group.remove();
    else grid.remove();
  }

  const photoBtn=popup.querySelector('.ya-profile-btn');
  if(photoBtn)photoBtn.textContent='프로필 사진 바꾸기';
}

const oldEdit=window.editProfile;
if(typeof oldEdit==='function'){
  window.editProfile=function(){
    const r=oldEdit.apply(this,arguments);
    setTimeout(cleanProfilePopup,20);
    return r;
  };
}

console.log('[Yeorin] profile edit cleanup ready');
})();
