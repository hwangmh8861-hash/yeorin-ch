/* 여린교회 성경/챌린지 프로필 사진 연동 */
(function(){
'use strict';
if(window.__YEORIN_BIBLE_AVATAR_HOTFIX__)return;
window.__YEORIN_BIBLE_AVATAR_HOTFIX__=true;

let timer=null;

function users(){
  const arr=[];
  try{if(typeof CU!=='undefined'&&CU)arr.push(CU)}catch(e){}
  try{if(typeof AD!=='undefined'&&AD&&Array.isArray(AD.users))arr.push(...AD.users)}catch(e){}
  const seen=new Set();
  return arr.filter(u=>u&&u.id&&!seen.has(String(u.id))&&seen.add(String(u.id)));
}
function userById(id){return users().find(u=>String(u.id)===String(id))||{id:String(id||''),name:''}}
function userByName(name){
  const t=String(name||'').trim();
  if(!t)return null;
  return users().find(u=>u.name&&t.includes(String(u.name)))||null;
}
function avatarHtml(u){
  try{return typeof window.YA==='function'?window.YA(u):''}catch(e){return''}
}
function avatarSig(u){
  try{return window.YeorinAvatar&&typeof window.YeorinAvatar.url==='function'?(window.YeorinAvatar.url(u&&u.id)||'default'):'default'}catch(e){return'default'}
}
function paintAvatar(el,u,size){
  if(!el||!u)return;
  const sig=avatarSig(u),px=size||28;
  if(el.dataset.yaLinked===sig&&el.dataset.yaUser===String(u.id||''))return;
  el.dataset.yaLinked=sig;
  el.dataset.yaUser=String(u.id||'');
  const html=avatarHtml(u);
  if(html)el.innerHTML=html;
  el.style.width=px+'px';
  el.style.height=px+'px';
  el.style.minWidth=px+'px';
  el.style.flex='0 0 '+px+'px';
  el.style.borderRadius='50%';
  el.style.overflow='hidden';
  el.style.display='inline-flex';
  el.style.alignItems='center';
  el.style.justifyContent='center';
  el.style.background='#f1f1f1';
  el.style.fontSize='0';
}
function paintName(el,u,label){
  if(!el||!u)return;
  const sig=avatarSig(u),key=sig+'|'+(label||u.name||'');
  if(el.dataset.yaLinkedName===key)return;
  el.dataset.yaLinkedName=key;
  el.innerHTML='<span class="ybav-mini"></span><span class="ybav-label"></span>';
  el.style.display='inline-flex';
  el.style.alignItems='center';
  el.style.gap='6px';
  el.style.minWidth='88px';
  el.style.whiteSpace='nowrap';
  const av=el.querySelector('.ybav-mini');
  const txt=el.querySelector('.ybav-label');
  paintAvatar(av,u,26);
  if(txt)txt.textContent=label||u.name||'';
}
function challengeByCard(card){
  try{
    const s=card&&card.getAttribute('onclick')||'';
    const m=s.match(/viewChId='([^']+)'/);
    if(!m||typeof AD==='undefined'||!AD||!Array.isArray(AD.challenges))return null;
    return AD.challenges.find(x=>String(x.id)===String(m[1]))||null;
  }catch(e){return null}
}
function decorateChallengeCards(root){
  root.querySelectorAll('.ch-card').forEach(card=>{
    const ch=challengeByCard(card);
    if(ch&&Array.isArray(ch.memberIds)){
      card.querySelectorAll('.ch-member-av').forEach((el,i)=>{
        const id=ch.memberIds[i];
        if(id)paintAvatar(el,userById(id),28);
      });
    }
    const pn=card.querySelector('.ch-progress .pname');
    if(pn&&/나\s*$/.test(pn.textContent||'')){
      try{if(typeof CU!=='undefined'&&CU)paintName(pn,CU,'나')}catch(e){}
    }
  });
}
function decorateChallengeDetail(root){
  root.querySelectorAll('.ch-progress .pname').forEach(pn=>{
    if(pn.querySelector('.ybav-mini'))return;
    const u=userByName(pn.textContent||'');
    if(u)paintName(pn,u,u.name||'');
  });
}
function decorateReadingRows(root){
  root.querySelectorAll('.member-row').forEach(row=>{
    const s=row.getAttribute('onclick')||'';
    const m=s.match(/showReadDetail\('([^']+)'\)/);
    if(!m)return;
    const u=userById(m[1]);
    const av=row.querySelector('.avatar');
    if(av)paintAvatar(av,u,28);
  });
}
function decorateMyReading(root){
  root.querySelectorAll('.card').forEach(card=>{
    const s=card.getAttribute('onclick')||'';
    if(!/showReadDetail\('/.test(s))return;
    const first=card.querySelector('div > div > div');
    if(!first||!String(first.textContent||'').includes('내 읽기 현황'))return;
    let u=null;try{u=typeof CU!=='undefined'?CU:null}catch(e){}
    if(!u)return;
    const sig=avatarSig(u);
    if(first.dataset.yaMyReading===sig)return;
    first.dataset.yaMyReading=sig;
    first.innerHTML='<span class="ybav-myread"></span><span>내 읽기 현황</span>';
    first.style.display='flex';first.style.alignItems='center';first.style.gap='7px';
    paintAvatar(first.querySelector('.ybav-myread'),u,26);
  });
}
function decorateReadPopup(){
  const popup=document.querySelector('#popupRoot .popup,#popupRoot');
  if(!popup||!String(popup.textContent||'').includes('님의 읽기 현황'))return;
  const title=[...popup.querySelectorAll('div')].find(el=>String(el.textContent||'').includes('님의 읽기 현황')&&String(el.textContent||'').length<40);
  const u=title?userByName(title.textContent||''):null;
  if(!u)return;
  const big=[...popup.querySelectorAll('div')].find(el=>String(el.getAttribute('style')||'').includes('font-size:36px'));
  if(big)paintAvatar(big,u,72);
}
function decorate(){
  try{
    const root=document.getElementById('page-bible');
    if(root){
      decorateChallengeCards(root);
      decorateChallengeDetail(root);
      decorateReadingRows(root);
      decorateMyReading(root);
    }
    decorateReadPopup();
  }catch(e){console.warn('[bible avatar hotfix]',e)}
}
function schedule(delay){clearTimeout(timer);timer=setTimeout(decorate,delay||0)}

const mo=new MutationObserver(()=>schedule(20));
mo.observe(document.documentElement,{childList:true,subtree:true});

const oldRender=window.renderBible;
if(typeof oldRender==='function')window.renderBible=function(){const r=oldRender.apply(this,arguments);schedule(0);return r};
const oldDetail=window.showReadDetail;
if(typeof oldDetail==='function')window.showReadDetail=function(){const r=oldDetail.apply(this,arguments);schedule(0);return r};

setTimeout(()=>{
  try{
    if(window.YeorinAvatar&&typeof window.YeorinAvatar.refresh==='function')Promise.resolve(window.YeorinAvatar.refresh()).then(()=>decorate()).catch(()=>decorate());
    else decorate();
  }catch(e){decorate()}
},250);
setTimeout(decorate,900);
setTimeout(decorate,2200);

console.log('[Yeorin] bible/challenge avatar hotfix ready');
})();
