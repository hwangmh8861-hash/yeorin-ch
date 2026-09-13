/* 여린교회 프로필 이미지 공용 헬퍼 */
(function(){
'use strict';
if(window.YeorinAvatar)return;
const SB='https://putqauaiboychaalgyew.supabase.co',KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV',BUCKET='avatars';
let map={},decorateTimer=null;
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const rpc=(name,body)=>window.YeorinNative.directRpc(name,body||{});
function token(){return window.YeorinNative&&window.YeorinNative.session&&window.YeorinNative.session.access_token||'';}
function authUid(){try{const t=token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return String(JSON.parse(atob(t+'='.repeat((4-t.length%4)%4))).sub||'')}catch(e){return''}}
function headers(extra){return Object.assign({'apikey':KEY,'Authorization':'Bearer '+token()},extra||{});}
function enc(p){return String(p||'').split('/').map(encodeURIComponent).join('/');}
function uuid(){return crypto&&crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});}
function publicUrl(path){return SB+'/storage/v1/object/public/'+BUCKET+'/'+enc(path);}
function me(){return(typeof CU!=='undefined'&&CU)||{};}
function users(){return(typeof AD!=='undefined'&&AD&&AD.users)||[];}
function userById(id){if(!id)return null;if(me().id===id)return me();return users().find(u=>String(u.id)===String(id))||{id:id,emoji:'🌿',name:''};}
function userByName(name){if(!name)return null;if(me().name===name)return me();return users().find(u=>u.name===name)||null;}
function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html;}
function style(){if(document.getElementById('yeorin-avatar-style'))return;const s=document.createElement('style');s.id='yeorin-avatar-style';s.textContent=`
.ya-img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.ya-chip{display:inline-block;width:15px;height:15px;border-radius:50%;overflow:hidden;font-size:12px;line-height:15px;text-align:center;vertical-align:-3px}
.ya-preview{width:96px;height:96px;border-radius:50%;margin:6px auto 14px;background:var(--brand-soft);display:flex;align-items:center;justify-content:center;font-size:40px;overflow:hidden}
.ya-modal{position:fixed;inset:0;z-index:1400;background:rgba(18,24,20,.55);display:flex;align-items:flex-end;justify-content:center}
.ya-sheet{width:100%;max-width:var(--max);background:#fff;border-radius:24px 24px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom))}
.ya-sheet h3{font-size:18px;margin-bottom:14px}.ya-close{float:right;border:0;background:none;font-size:24px}.ya-primary{width:100%;border:0;border-radius:14px;background:var(--brand);color:#fff;padding:14px;font-size:14px;font-weight:850}.ya-ghost{width:100%;border:1px solid var(--line2);border-radius:14px;background:#fff;padding:13px;font-size:13px;font-weight:800;margin-top:8px}.ya-profile-btn{width:100%;border:1px solid var(--line2);border-radius:14px;background:var(--brand-soft);color:var(--brand);padding:12px;font-size:13px;font-weight:850;margin-bottom:14px}
`;document.head.appendChild(s)}
window.YA=function(user,fallback){const id=user&&typeof user==='object'?(user.id||user.authorId||''):String(user||''),p=id&&map[id];if(p)return '<img class="ya-img" src="'+esc(publicUrl(p))+'" alt="" loading="lazy">';const e=(user&&typeof user==='object'&&user.emoji)||fallback||'🌿';return esc(e)};
window.YAchip=function(user,fallback){return '<span class="ya-chip">'+window.YA(user,fallback)+'</span>'};
async function refresh(){try{map=await rpc('yeorin_avatars',{})||{}}catch(e){console.error('[avatar]',e)}decorate();return map}
function applyMap(m){map=m||{};decorate()}
function pathOf(id){return map[id]||''}
async function removeFile(path){if(!path)return;try{const r=await fetch(SB+'/storage/v1/object/'+BUCKET+'/'+enc(path),{method:'DELETE',headers:headers()});if(!r.ok)console.error('[avatar cleanup] delete_'+r.status)}catch(e){console.error('[avatar cleanup]',e)}}
function idFromOnclick(el,fn){const s=el&&el.getAttribute('onclick')||'',m=s.match(new RegExp(fn+"\\('([^']*)'\\)"));return m&&m[1]||''}
function decorate(){clearTimeout(decorateTimer);decorateTimer=setTimeout(()=>{try{
  const mine=me();
  const myAv=document.querySelector('#page-mypage .my-avatar');if(myAv&&mine.id){setHtml(myAv,window.YA(mine,'🌿'));myAv.style.overflow='hidden'}
  document.querySelectorAll('#nanum-social-root .ys-av').forEach(el=>{const id=idFromOnclick(el,'socialPerson');if(id)setHtml(el,window.YA(userById(id),'🌿'))});
  document.querySelectorAll('#nanum-social-root .ys-person').forEach(el=>{const id=idFromOnclick(el,'socialPerson');if(!id)return;const u=userById(id);setHtml(el,window.YAchip(u,u.emoji||'🌿')+' '+esc(u.name||''))});
  document.querySelectorAll('#nanum-social-root .ys-story').forEach(el=>{let id=idFromOnclick(el,'openStoryUser');if(!id&&/openStoryUploader/.test(el.getAttribute('onclick')||''))id=mine.id||'';const face=el.querySelector('.ys-face');if(id&&face)setHtml(face,window.YA(userById(id),'🌿'))});
  const top=document.querySelector('#ysStoryView .ys-story-top');if(top){const nm=top.querySelector('.nm'),face=top.querySelector('.face'),name=(nm&&nm.textContent||'').split(' · ')[0].trim(),u=userByName(name);if(face&&u)setHtml(face,window.YA(u,'🌿'))}
}catch(e){console.error('[avatar decorate]',e)}},0)}
function repaint(){try{if(typeof refreshSocialFeed==='function')refreshSocialFeed()}catch(e){}try{if(typeof renderMyPage==='function')renderMyPage()}catch(e){}decorate()}
window.YeorinAvatar={
  refresh:refresh,applyMap:applyMap,url:function(id){const p=pathOf(id);return p?publicUrl(p):''},
  open:function(){style();const mine=me(),cur=window.YA({id:mine.id||'',emoji:mine.emoji||'🌿'});const m=document.createElement('div');m.className='ya-modal';m.id='yaSheet';m.onclick=e=>{if(e.target===m)m.remove()};m.innerHTML='<div class="ya-sheet"><button class="ya-close" onclick="yaSheet.remove()">×</button><h3>프로필 사진</h3><div class="ya-preview" id="yaPreview">'+cur+'</div><div style="font-size:12px;color:var(--ink3)">5MB 이하 JPG · PNG · WEBP</div><input id="yaFile" type="file" accept="image/jpeg,image/png,image/webp" style="margin:12px 0;width:100%"><button class="ya-primary" onclick="YeorinAvatar.save()">사진 저장</button>'+(pathOf(mine.id)?'<button class="ya-ghost" onclick="YeorinAvatar.clear()">사진 지우고 이모지로 돌아가기</button>':'')+'</div>';document.body.appendChild(m);const f=document.getElementById('yaFile');f.onchange=()=>{const file=f.files&&f.files[0];if(!file)return;const u=URL.createObjectURL(file),preview=document.getElementById('yaPreview');if(preview)setHtml(preview,'<img class="ya-img" src="'+u+'">')}},
  save:async function(){const file=document.getElementById('yaFile')?.files?.[0];if(!file){showToast('사진을 선택해주세요');return}if(file.size>5*1024*1024){showToast('5MB 이하 파일만 올릴 수 있어요','error');return}const btn=document.querySelector('#yaSheet .ya-primary');btn.disabled=true;btn.textContent='업로드 중...';const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-zA-Z0-9]/g,''),path=authUid()+'/'+uuid()+'.'+ext;let uploaded=false;try{const up=await fetch(SB+'/storage/v1/object/'+BUCKET+'/'+enc(path),{method:'POST',headers:headers({'Content-Type':file.type,'x-upsert':'false','cache-control':'3600'}),body:file});if(!up.ok)throw new Error('upload_'+up.status);uploaded=true;const r=await rpc('yeorin_set_avatar',{p_path:path});await removeFile(r&&r.previous);await refresh();document.getElementById('yaSheet')?.remove();showToast('프로필 사진을 바꿨어요','success');repaint()}catch(e){console.error(e);if(uploaded){let committed=false;try{const cur=await rpc('yeorin_avatars',{});committed=!!(cur&&cur[me().id]===path);if(committed){map=cur;document.getElementById('yaSheet')?.remove();showToast('프로필 사진을 바꿨어요','success');repaint();return}}catch(_e){}await removeFile(path);showToast('저장에 실패해서 올린 사진을 되돌렸어요','error')}else showToast('사진 업로드 실패','error');btn.disabled=false;btn.textContent='사진 저장'}},
  clear:async function(){try{const r=await rpc('yeorin_set_avatar',{p_path:''});await removeFile(r&&r.previous);await refresh();document.getElementById('yaSheet')?.remove();showToast('이모지로 돌아갔어요','success');repaint()}catch(e){console.error(e);showToast('변경 실패','error')}}
};
function patchProfileUi(){if(window.__YEORIN_AVATAR_PROFILE_PATCH__)return;window.__YEORIN_AVATAR_PROFILE_PATCH__=true;const oldEdit=window.editProfile;if(typeof oldEdit==='function')window.editProfile=function(){const r=oldEdit.apply(this,arguments);setTimeout(()=>{const popup=document.querySelector('#popupRoot .popup');if(!popup||popup.querySelector('.ya-profile-btn'))return;const btn=document.createElement('button');btn.className='ya-profile-btn';btn.textContent='📷 프로필 사진 바꾸기';btn.onclick=function(){try{if(typeof closePopup==='function')closePopup()}catch(e){}window.YeorinAvatar.open()};const h3=popup.querySelector('h3');if(h3)h3.insertAdjacentElement('afterend',btn);else popup.prepend(btn)},0);return r};const oldMy=window.renderMyPage;if(typeof oldMy==='function')window.renderMyPage=function(){const r=oldMy.apply(this,arguments);decorate();return r};const oldSwitch=window.switchTab;if(typeof oldSwitch==='function')window.switchTab=function(tab){const r=oldSwitch.apply(this,arguments);if(tab==='nanum'||tab==='mypage')setTimeout(()=>refresh(),80);return r}}
style();patchProfileUi();const mo=new MutationObserver(()=>decorate());mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>refresh(),400);console.log('[Yeorin] avatar helper ready');
})();