/* 여린교회 나눔 소셜피드 + 24시간 스토리 */
(function(){
'use strict';
if(window.__YEORIN_SOCIAL_FEED__)return;window.__YEORIN_SOCIAL_FEED__=true;
const SB='https://putqauaiboychaalgyew.supabase.co',KEY='sb_publishable_u2DS4ojwca6PYqBZl5LwbQ_Lse_EiPV',BUCKET='story-media';
let state={kind:'all',authors:[],date:'',page:0,posts:[],hasMore:false,stories:[],loading:false,active:true};
let draft=null;
let viewer={groups:[],g:0,idx:0,timer:null};
let seen=new Set(),io=null;
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const rpc=(name,body)=>window.YeorinNative.directRpc(name,body||{});
function token(){return window.YeorinNative&&window.YeorinNative.session&&window.YeorinNative.session.access_token||'';}
function authUid(){try{const t=token().split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return String(JSON.parse(atob(t+'='.repeat((4-t.length%4)%4))).sub||'')}catch(e){return''}}
function uid(){try{return CU&&CU.id||''}catch(e){return''}}
function rel(v){const d=new Date(v),s=Math.max(0,Math.floor((Date.now()-d)/1000));if(s<60)return'방금 전';if(s<3600)return Math.floor(s/60)+'분 전';if(s<86400)return Math.floor(s/3600)+'시간 전';if(s<604800)return Math.floor(s/86400)+'일 전';return(d.getMonth()+1)+'월 '+d.getDate()+'일';}
function uuid(){return crypto&&crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});}
function headers(extra){return Object.assign({'apikey':KEY,'Authorization':'Bearer '+token()},extra||{});}
function enc(p){return String(p||'').split('/').map(encodeURIComponent).join('/');}
function pkey(p){return p.kind+':'+p.id}
function face(u){return typeof YA==='function'?YA(u):''}
async function signed(path){const r=await fetch(SB+'/storage/v1/object/sign/'+BUCKET+'/'+enc(path),{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({expiresIn:3600})});if(!r.ok)throw new Error('story_sign_'+r.status);const j=await r.json(),u=j.signedURL||j.signedUrl||'';return /^https?:/.test(u)?u:SB+'/storage/v1'+u;}
function inject(){if(document.getElementById('yeorin-social-style'))return;const s=document.createElement('style');s.id='yeorin-social-style';s.textContent=`
#nanum-social-root{margin:-2px -20px -110px;background:#fff;min-height:70vh;padding-bottom:120px}.ys-head{padding:0 16px 12px}.ys-stories{display:flex;gap:11px;overflow-x:auto;padding:7px 1px 11px;scrollbar-width:none}.ys-stories::-webkit-scrollbar{display:none}.ys-story{width:64px;flex:0 0 64px;text-align:center;border:0;background:none;padding:0}.ys-ring{width:58px;height:58px;border-radius:50%;padding:3px;background:linear-gradient(145deg,#78b88e,#2f6b47);margin:auto;position:relative}.ys-story.seen .ys-ring,.ys-ring.empty{background:#dfe5e1}.ys-face{width:100%;height:100%;border-radius:50%;background:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:24px;overflow:hidden}.ys-plus{position:absolute;right:-2px;bottom:-2px;width:22px;height:22px;border-radius:50%;background:var(--brand);color:#fff;border:2px solid #fff;font-size:14px;line-height:18px;cursor:pointer}.ys-name{font-size:10.5px;font-weight:700;color:var(--ink2);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ys-viewbar{display:flex;align-items:center;gap:8px;padding:2px 0 12px}.ys-view{flex:1;display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:999px;background:#fff;padding:10px 15px;font-size:12.5px;font-weight:800;color:var(--ink2);text-align:left}.ys-view.on{border-color:var(--brand2);background:var(--brand-soft);color:var(--brand)}.ys-view-ico{font-size:12px;opacity:.7}.ys-view-clear{flex:0 0 auto;border:0;background:none;padding:10px 2px;font-size:11.5px;font-weight:800;color:var(--ink3)}
.ys-fsheet{max-height:82vh;overflow-y:auto}.ys-fhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.ys-fhead h3{margin:0}.ys-fgroup{padding:14px 0 4px;border-top:1px solid #f1f3f1}.ys-fgroup:first-child{border-top:0}.ys-flabel{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:850;color:var(--ink2);margin-bottom:10px}.ys-fcount{font-size:11px;font-weight:750;color:var(--ink3)}.ys-pebs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.ys-pebs.wrap{flex-wrap:wrap;overflow:visible}.ys-pebs::-webkit-scrollbar{display:none}
.ys-peb{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;border:1px solid #e6eae7;border-radius:999px;background:#f5f7f5;color:var(--ink2);padding:9px 15px;font-size:12.5px;font-weight:780;white-space:nowrap;box-shadow:inset 0 -1px 0 rgba(0,0,0,.03);transition:background .12s,color .12s,border-color .12s}.ys-peb.on{background:var(--brand);border-color:var(--brand);color:#fff;box-shadow:0 2px 8px rgba(47,107,71,.22)}.ys-peb.on .ya-chip{filter:none}.ys-pebdate{position:relative;overflow:hidden}.ys-pebdate input{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;padding:0;margin:0}
.ys-frow{display:flex;gap:9px;margin-top:18px}.ys-fghost{flex:1;border:1px solid var(--line2);border-radius:14px;background:#fff;padding:14px;font-size:13.5px;font-weight:800;color:var(--ink2)}@media(prefers-reduced-motion:reduce){.ys-peb{transition:none}}.ys-feed{border-top:1px solid #f0f1f0}.ys-post{padding:17px 17px 14px;border-bottom:8px solid #f5f6f5}.ys-author{display:flex;align-items:center;gap:10px}.ys-av{width:38px;height:38px;border-radius:50%;background:#f1f1f1;display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden}.ys-meta{flex:1}.ys-user{font-size:14px;font-weight:850}.ys-time{font-size:11px;color:var(--ink3);font-weight:650}.ys-type{font-size:10.5px;font-weight:850;border-radius:999px;padding:4px 8px;background:var(--brand-soft);color:var(--brand)}.ys-body{font-size:14.5px;line-height:1.72;color:var(--ink);margin-top:12px;white-space:pre-wrap}.ys-ref{font-size:12px;color:var(--brand);font-weight:800;margin-top:9px}.ys-actions{display:flex;gap:18px;margin-top:11px}.ys-act{border:0;background:none;padding:4px 0;font-size:12px;font-weight:750;color:var(--ink2)}.ys-comment{font-size:12.5px;line-height:1.5;padding:3px 0}.ys-comment b{margin-right:5px}.ys-commentbox{display:flex;gap:7px;margin-top:8px;background:#f4f6f4;border-radius:16px;padding:5px 6px 5px 11px}.ys-commentbox input{flex:1;border:0;background:none;outline:0;font-size:12.5px}.ys-send{border:0;border-radius:12px;background:var(--brand);color:#fff;font-size:11px;font-weight:800;padding:7px 10px}.ys-sentinel{height:56px;display:flex;align-items:center;justify-content:center}.ys-sentinel i{width:19px;height:19px;border-radius:50%;border:2px solid #e3e7e4;border-top-color:var(--brand);display:block;animation:ys-spin .7s linear infinite}.ys-sentinel.idle i{visibility:hidden}.ys-end{padding:26px 20px 34px;text-align:center;color:var(--ink3);font-size:12px;font-weight:700}@keyframes ys-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.ys-sentinel i{animation-duration:2s}}.ys-write{position:fixed;bottom:94px;right:22px;z-index:170;width:56px;height:56px;border:0;border-radius:19px;background:linear-gradient(145deg,var(--brand2),var(--brand));color:#fff;font-size:25px;box-shadow:0 8px 22px rgba(47,107,71,.3)}@media(min-width:520px){.ys-write{right:calc(50% - var(--max)/2 + 22px)}}
.ys-modal{position:fixed;inset:0;z-index:1300;background:rgba(18,24,20,.55);display:flex;align-items:flex-end;justify-content:center}.ys-sheet{width:100%;max-width:var(--max);background:#fff;border-radius:24px 24px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom))}.ys-sheet h3{font-size:18px;margin-bottom:14px}.ys-sheet button.choice{width:100%;border:0;border-radius:15px;padding:14px;margin:5px 0;background:#f3f5f3;font-size:14px;font-weight:800;text-align:left}.ys-close{float:right;border:0;background:none;font-size:24px}.ys-caption{width:100%;border:1px solid var(--line2);border-radius:14px;padding:11px;font-size:13px;margin:10px 0}.ys-primary{width:100%;border:0;border-radius:14px;background:var(--brand);color:#fff;padding:14px;font-size:14px;font-weight:850}.ys-story-view{position:fixed;inset:0;z-index:1500;background:#080b09;display:flex;justify-content:center}.ys-story-stage{width:100%;max-width:var(--max);height:100%;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}.ys-story-media{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}.ys-progress{position:absolute;top:calc(10px + env(safe-area-inset-top));left:10px;right:10px;display:flex;gap:4px;z-index:4}.ys-prog{height:3px;flex:1;background:rgba(255,255,255,.3);border-radius:3px;overflow:hidden}.ys-prog i{display:block;height:100%;background:#fff;width:0}.ys-story-top{position:absolute;top:calc(22px + env(safe-area-inset-top));left:14px;right:14px;z-index:4;color:#fff;display:flex;align-items:center;gap:8px}.ys-story-top .face{width:34px;height:34px;border-radius:50%;background:#f1f1f1;color:#222;display:flex;align-items:center;justify-content:center;overflow:hidden}.ys-story-top .nm{font-size:13px;font-weight:800;flex:1}.ys-story-close{border:0;background:none;color:#fff;font-size:27px}.ys-story-caption{position:absolute;bottom:calc(34px + env(safe-area-inset-bottom));left:18px;right:18px;color:#fff;text-shadow:0 1px 5px #000;font-size:14px;z-index:4}.ys-hit{position:absolute;top:0;bottom:0;width:45%;z-index:3}.ys-hit.left{left:0}.ys-hit.right{right:0}
`;document.head.appendChild(s)}
function root(){return document.getElementById('nanum-social-root')}
function ensureRoot(){inject();const page=document.getElementById('page-nanum');if(!page)return null;let r=root();if(!r){r=document.createElement('div');r.id='nanum-social-root';page.insertBefore(r,page.firstChild)}document.getElementById('nanum-tabs').style.display=state.active?'none':'';document.getElementById('page-qt').style.display=state.active?'none':'block';document.getElementById('page-prayer').style.display='none';return r}

/* ---------- 데이터 로딩 ---------- */
async function load(reset){
  if(state.loading)return;
  if(reset){state.page=0}
  state.loading=true;
  if(reset&&!root())ensureRoot();
  if(reset)render();else busy(true);
  try{
    const tasks=[rpc('yeorin_social_feed',{p_kind:state.kind,p_author_ids:state.authors.length?state.authors:null,p_page:state.page,p_per_page:15,p_date:state.date||null})];
    if(reset){tasks.push(rpc('yeorin_story_feed',{}));tasks.push(rpc('yeorin_avatars',{}).catch(()=>null))}
    const res=await Promise.all(tasks),f=res[0]||{},incoming=f.posts||[];
    if(reset){state.stories=res[1]||[];if(res[2]&&window.YeorinAvatar)YeorinAvatar.applyMap(res[2])}
    state.hasMore=!!f.hasMore;
    if(reset){
      state.posts=incoming;
      seen=new Set(incoming.map(pkey));
      render();
    }else{
      const fresh=incoming.filter(p=>!seen.has(pkey(p)));
      fresh.forEach(p=>seen.add(pkey(p)));
      state.posts=state.posts.concat(fresh);
      appendPosts(fresh);
      if(!fresh.length&&incoming.length)state.hasMore=false;
    }
  }catch(e){
    console.error('[social feed]',e);
    if(!reset)state.page=Math.max(0,state.page-1);
    if(typeof showToast==='function')showToast('나눔 피드를 불러오지 못했어요','error')
  }finally{state.loading=false;busy(false);syncObserver()}
}
function busy(on){const s=document.getElementById('ysSentinel');if(s)s.classList.toggle('idle',!on)}

/* ---------- 무한스크롤 ---------- */
function syncObserver(){
  if(io)io.disconnect();
  const s=document.getElementById('ysSentinel');
  if(!s)return;
  if(!state.hasMore){s.style.display='none';return}
  s.style.display='';
  if(!io)io=new IntersectionObserver(entries=>{
    for(const e of entries){
      if(e.isIntersecting&&state.active&&state.hasMore&&!state.loading){window.loadMoreSocial();break}
    }
  },{root:null,rootMargin:'420px 0px'});
  io.observe(s)
}
function appendPosts(list){
  if(!list.length)return;
  const feed=document.querySelector('#nanum-social-root .ys-feed');
  if(!feed)return;
  const holder=document.createElement('div');
  holder.innerHTML=list.map(postHtml).join('');
  const sent=document.getElementById('ysSentinel'),end=document.getElementById('ysEnd'),anchor=sent||end||null;
  while(holder.firstChild)feed.insertBefore(holder.firstChild,anchor);
  if(feed.querySelector('.ys-empty'))feed.querySelector('.ys-empty').remove()
}
function replacePost(p){
  const el=document.getElementById('social-'+p.kind+'-'+p.id);
  if(!el)return;
  const holder=document.createElement('div');
  holder.innerHTML=postHtml(p);
  el.replaceWith(holder.firstElementChild)
}

/* ---------- 스토리 정렬/그룹 ---------- */
function groupedStories(){const m=new Map();state.stories.forEach(x=>{if(!m.has(x.authorId))m.set(x.authorId,[]);m.get(x.authorId).push(x)});return m}
function storyOrder(){
  const g=groupedStories(),me=uid();
  const mk=id=>({authorId:id,list:g.get(id).slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))});
  const latest=x=>x.list.reduce((a,s)=>Math.max(a,+new Date(s.createdAt)),0);
  const out=[];
  if(g.has(me))out.push(mk(me));
  const rest=[...g.keys()].filter(id=>id!==me).map(mk);
  const unseen=rest.filter(x=>x.list.some(s=>!s.viewed)).sort((a,b)=>latest(b)-latest(a));
  const done=rest.filter(x=>x.list.every(s=>s.viewed)).sort((a,b)=>latest(b)-latest(a));
  return out.concat(unseen,done)
}
function storyStrip(){
  const order=storyOrder(),me=uid(),mine=order.find(x=>x.authorId===me),myFace=(typeof YA==='function'?YA({id:me}):'');
  let h='<div class="ys-stories">';
  if(mine){
    const allSeen=mine.list.every(s=>s.viewed);
    h+='<button class="ys-story'+(allSeen?' seen':'')+'" onclick="openStoryUser(\''+esc(me)+'\')"><div class="ys-ring"><div class="ys-face">'+myFace+'</div><span class="ys-plus" onclick="event.stopPropagation();openStoryUploader()">+</span></div><div class="ys-name">내 스토리</div></button>'
  }else{
    h+='<button class="ys-story" onclick="openStoryUploader()"><div class="ys-ring empty"><div class="ys-face">'+myFace+'</div><span class="ys-plus">+</span></div><div class="ys-name">내 스토리</div></button>'
  }
  order.filter(x=>x.authorId!==me).forEach(x=>{
    const a=(x.list[0]&&x.list[0].author)||{},allSeen=x.list.every(s=>s.viewed);
    h+='<button class="ys-story'+(allSeen?' seen':'')+'" onclick="openStoryUser(\''+esc(x.authorId)+'\')"><div class="ys-ring"><div class="ys-face">'+face(a)+'</div></div><div class="ys-name">'+esc(a.name||'')+'</div></button>'
  });
  return h+'</div>'
}
function refreshStrip(){const el=document.querySelector('#nanum-social-root .ys-stories');if(el)el.outerHTML=storyStrip()}

/* ---------- 렌더 ---------- */
function dateLabel(v){if(!v)return'날짜 선택';const p=String(v).split('-');return Number(p[1])+'월 '+Number(p[2])+'일'}
function allUsers(){return((typeof AD!=='undefined'&&AD&&AD.users)||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ko'))}
function kindName(k){return{all:'전체',qt:'나눔',prayer:'기도'}[k]||'전체'}
function filterLabel(){
  const bits=[];
  if(state.kind!=='all')bits.push(kindName(state.kind));
  if(state.authors.length)bits.push(state.authors.length+'명');
  if(state.date)bits.push(dateLabel(state.date));
  return bits.length?'보기 · '+bits.join(' · '):'보기'
}
function viewBar(){
  const on=state.kind!=='all'||state.authors.length||state.date;
  return '<div class="ys-viewbar"><button class="ys-view'+(on?' on':'')+'" onclick="openSocialFilter()"><span class="ys-view-ico">☰</span>'+esc(filterLabel())+'</button>'+(on?'<button class="ys-view-clear" onclick="resetSocialFilter()">초기화</button>':'')+'</div>'
}
function pebble(label,active,onclick,extra){
  return '<button class="ys-peb'+(active?' on':'')+'" onclick="'+onclick+'"'+(extra||'')+'>'+label+'</button>'
}
function filterBody(){
  let h='<div class="ys-fgroup"><div class="ys-flabel">종류</div><div class="ys-pebs">';
  ['all','qt','prayer'].forEach(k=>{h+=pebble(kindName(k),draft.kind===k,"draftKind('"+k+"')")});
  h+='</div></div>';
  h+='<div class="ys-fgroup"><div class="ys-flabel">날짜</div><div class="ys-pebs">';
  h+=pebble('전체 기간',!draft.date,"draftDate('')");
  h+='<span class="ys-peb ys-pebdate'+(draft.date?' on':'')+'">📅 '+esc(dateLabel(draft.date))+'<input type="date" value="'+esc(draft.date)+'" onchange="draftDate(this.value)"></span>';
  h+='</div></div>';
  const users=allUsers();
  h+='<div class="ys-fgroup"><div class="ys-flabel">사람<span class="ys-fcount">'+(draft.authors.length?draft.authors.length+'명 선택':'전체')+'</span></div><div class="ys-pebs wrap">';
  users.forEach(u=>{
    const on=draft.authors.indexOf(u.id)>=0;
    h+='<button class="ys-peb'+(on?' on':'')+'" onclick="draftPerson(\''+esc(u.id)+'\')">'+(typeof YAchip==='function'?YAchip(u):'')+' '+esc(u.name)+'</button>'
  });
  h+='</div></div>';
  return h
}
function paintFilter(){const b=document.getElementById('ysFilterBody');if(b)b.innerHTML=filterBody()}
window.openSocialFilter=function(){
  draft={kind:state.kind,date:state.date,authors:state.authors.slice()};
  const m=document.createElement('div');m.className='ys-modal';m.id='ysFilter';
  m.onclick=e=>{if(e.target===m)m.remove()};
  m.innerHTML='<div class="ys-sheet ys-fsheet"><div class="ys-fhead"><h3>보기</h3><button class="ys-close" onclick="ysFilter.remove()">×</button></div><div id="ysFilterBody">'+filterBody()+'</div><div class="ys-frow"><button class="ys-fghost" onclick="draftReset()">초기화</button><button class="ys-primary" style="flex:2" onclick="applySocialFilter()">적용하기</button></div></div>';
  document.body.appendChild(m)
};
window.draftKind=k=>{draft.kind=k;paintFilter()};
window.draftDate=v=>{draft.date=v||'';paintFilter()};
window.draftPerson=id=>{const i=draft.authors.indexOf(id);if(i>=0)draft.authors.splice(i,1);else draft.authors.push(id);paintFilter()};
window.draftReset=()=>{draft={kind:'all',date:'',authors:[]};paintFilter()};
window.applySocialFilter=function(){
  document.getElementById('ysFilter')?.remove();
  const same=draft.kind===state.kind&&draft.date===state.date&&draft.authors.length===state.authors.length&&draft.authors.every(x=>state.authors.indexOf(x)>=0);
  state.kind=draft.kind;state.date=draft.date;state.authors=draft.authors.slice();
  if(same){render();return}
  load(true)
};
window.resetSocialFilter=function(){
  if(state.kind==='all'&&!state.date&&!state.authors.length)return;
  state.kind='all';state.date='';state.authors=[];load(true)
};
function bodyText(p){if(p.kind==='qt'){const a=[p.shareContent,p.applyContent].filter(Boolean).join('\n\n');return esc(a||p.bestVerse||'').replace(/\n/g,'<br>')}return esc(p.situation||'').replace(/\n/g,'<br>')}
function refText(p){if(p.kind!=='qt'||!p.book)return'';let s=p.book;if(p.chFrom)s+=' '+p.chFrom+(p.vsFrom?':'+p.vsFrom:'');if(p.chTo&&String(p.chTo)!==String(p.chFrom))s+=' ~ '+p.chTo+(p.vsTo?':'+p.vsTo:'');return s}
function reactions(p){const r=p.reactions||{},n=Object.values(r).reduce((a,x)=>a+(Array.isArray(x)?x.length:0),0),mine=Object.values(r).some(x=>Array.isArray(x)&&x.includes(uid()));return '<button class="ys-act" onclick="socialReact(\''+p.kind+'\',\''+p.id+'\')">'+(mine?'❤️':'♡')+' '+n+'</button><span class="ys-act">댓글 '+((p.comments||[]).length)+'</span>'}
function postHtml(p){const cs=(p.comments||[]).slice(-3).map(c=>'<div class="ys-comment"><b>'+esc(c.author&&c.author.name||'')+'</b>'+esc(c.text)+'</div>').join('');return '<article class="ys-post" id="social-'+p.kind+'-'+p.id+'"><div class="ys-author"><button class="ys-av" style="border:0" onclick="socialPerson(\''+esc(p.authorId)+'\')">'+face(p.author)+'</button><div class="ys-meta"><div class="ys-user">'+esc(p.author&&p.author.name||'')+'</div><div class="ys-time">'+rel(p.createdAt||p.date)+'</div></div><span class="ys-type">'+(p.kind==='qt'?'나눔':'기도')+'</span></div>'+(refText(p)?'<div class="ys-ref">'+esc(refText(p))+'</div>':'')+'<div class="ys-body">'+bodyText(p)+'</div><div class="ys-actions">'+reactions(p)+'</div><div>'+cs+'</div><div class="ys-commentbox"><input id="sc-'+p.kind+'-'+p.id+'" placeholder="댓글 남기기"><button class="ys-send" onclick="socialComment(\''+p.kind+'\',\''+p.id+'\')">등록</button></div></article>'}
function render(){
  const r=ensureRoot();if(!r)return;
  const posts=state.posts.length?state.posts.map(postHtml).join(''):'<div class="ys-empty" style="padding:55px 20px;text-align:center;color:var(--ink3);font-size:13px">아직 표시할 글이 없어요.</div>';
  r.innerHTML='<div class="ys-head">'+storyStrip()+viewBar()+'</div><div class="ys-feed">'+posts+'<div id="ysSentinel" class="ys-sentinel idle"><i></i></div></div><button class="ys-write" onclick="openSocialWrite()">＋</button>';
  syncObserver()
}

/* ---------- 필터 / 액션 ---------- */
window.socialKind=k=>{if(state.kind===k)return;state.kind=k;load(true)};
window.socialPerson=id=>{const a=id?[id]:[];if(a.length===state.authors.length&&a.every(x=>state.authors.indexOf(x)>=0))return;state.authors=a;load(true)};
window.socialDate=v=>{const d=v||'';if(state.date===d)return;state.date=d;load(true)};
window.loadMoreSocial=()=>{if(state.loading||!state.hasMore)return;state.page++;load(false)};
window.refreshSocialFeed=()=>load(true);
window.socialReact=async function(kind,id){
  const p=state.posts.find(x=>x.kind===kind&&String(x.id)===String(id));if(!p)return;
  try{
    await gas('toggleReaction',kind,id,'heart',uid());
    const r=p.reactions||(p.reactions={}),arr=Array.isArray(r.heart)?r.heart:(r.heart=[]),i=arr.indexOf(uid());
    if(i>=0)arr.splice(i,1);else arr.push(uid());
    replacePost(p)
  }catch(e){console.error(e);showToast('공감 저장 실패','error')}
};
window.socialComment=async function(kind,id){
  const input=document.getElementById('sc-'+kind+'-'+id),text=input&&input.value.trim();if(!text)return;
  input.disabled=true;
  try{
    await gas('addComment',kind,id,uid(),text);
    const p=state.posts.find(x=>x.kind===kind&&String(x.id)===String(id));
    if(p){
      if(!Array.isArray(p.comments))p.comments=[];
      p.comments.push({id:uuid(),authorId:uid(),author:{id:uid(),name:(typeof CU!=='undefined'&&CU&&CU.name)||''},text:text,date:new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()});
      replacePost(p)
    }else if(input)input.value=''
  }catch(e){console.error(e);showToast('댓글 저장 실패','error');if(input)input.disabled=false}
};
window.openSocialWrite=function(){const m=document.createElement('div');m.className='ys-modal';m.id='ysWrite';m.onclick=e=>{if(e.target===m)m.remove()};m.innerHTML='<div class="ys-sheet"><button class="ys-close" onclick="ysWrite.remove()">×</button><h3>새로 작성하기</h3><button class="choice" onclick="socialLegacyWrite(\'qt\')">📖 나눔 작성</button><button class="choice" onclick="socialLegacyWrite(\'prayer\')">🙏 기도 작성</button><button class="choice" onclick="ysWrite.remove();openStoryUploader()">📷 24시간 스토리</button></div>';document.body.appendChild(m)};

/* ---------- 기존 나눔 작성 화면 연동 (유지) ---------- */
const oldSwitchNanum=window.switchNanum;
window.socialLegacyWrite=function(kind){document.getElementById('ysWrite')?.remove();state.active=false;if(io)io.disconnect();ensureRoot();root().style.display='none';document.getElementById('nanum-tabs').style.display='flex';try{if(kind==='qt')sqf=true;else spf=true}catch(e){}oldSwitchNanum(kind);if(kind==='qt'&&typeof renderQt==='function')renderQt();if(kind==='prayer'&&typeof renderPrayer==='function')renderPrayer()};
window.returnSocialFeed=function(){state.active=true;const r=ensureRoot();r.style.display='block';load(true)};
const oldAddQT=window.addQT;if(typeof oldAddQT==='function')window.addQT=async function(){const r=await oldAddQT.apply(this,arguments);setTimeout(()=>window.returnSocialFeed(),250);return r};
const oldAddPrayer=window.addPrayer;if(typeof oldAddPrayer==='function')window.addPrayer=async function(){const r=await oldAddPrayer.apply(this,arguments);setTimeout(()=>window.returnSocialFeed(),250);return r};
const oldSwitchTab=window.switchTab;if(typeof oldSwitchTab==='function')window.switchTab=function(tab){const r=oldSwitchTab.apply(this,arguments);if(tab==='nanum'){state.active=true;setTimeout(()=>{ensureRoot();root().style.display='block';load(true)},0)}else if(io)io.disconnect();return r};

/* ---------- 스토리 업로드 ---------- */
window.openStoryUploader=function(){const m=document.createElement('div');m.className='ys-modal';m.id='ysUpload';m.onclick=e=>{if(e.target===m)m.remove()};m.innerHTML='<div class="ys-sheet"><button class="ys-close" onclick="ysUpload.remove()">×</button><h3>스토리 올리기</h3><div style="font-size:12px;color:var(--ink3)">사진 또는 30초 이하 영상 · 24시간 뒤 자동 삭제</div><input id="ysFile" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" style="margin:14px 0;width:100%"><input id="ysCaption" class="ys-caption" maxlength="500" placeholder="한 줄 남기기 (선택)"><button class="ys-primary" onclick="submitStory()">스토리 올리기</button></div>';document.body.appendChild(m)};
function videoDuration(file){return new Promise((ok,no)=>{const v=document.createElement('video'),u=URL.createObjectURL(file);v.preload='metadata';v.onloadedmetadata=()=>{const d=v.duration;URL.revokeObjectURL(u);ok(d)};v.onerror=()=>{URL.revokeObjectURL(u);no(new Error('video_metadata'))};v.src=u})}
async function removeMedia(path){try{const r=await fetch(SB+'/storage/v1/object/'+BUCKET+'/'+enc(path),{method:'DELETE',headers:headers()});if(!r.ok)console.error('[story rollback] delete_'+r.status)}catch(e){console.error('[story rollback]',e)}}
window.submitStory=async function(){
  const file=document.getElementById('ysFile')?.files?.[0],cap=document.getElementById('ysCaption')?.value||'';
  if(!file){showToast('사진이나 영상을 선택해주세요');return}
  if(file.size>30*1024*1024){showToast('30MB 이하 파일만 올릴 수 있어요','error');return}
  const isVideo=file.type.startsWith('video/');
  let dur=null;
  if(isVideo){
    try{dur=await videoDuration(file)}catch(e){showToast('영상 정보를 읽지 못했어요','error');return}
    if(dur>30.5){showToast('영상은 30초 이하만 올릴 수 있어요','error');return}
  }
  const id=uuid(),ext=(file.name.split('.').pop()||(isVideo?'mp4':'jpg')).replace(/[^a-zA-Z0-9]/g,''),path=authUid()+'/'+id+'/story.'+ext;
  const btn=document.querySelector('#ysUpload .ys-primary');
  btn.disabled=true;btn.textContent='업로드 중...';
  let uploaded=false;
  try{
    const up=await fetch(SB+'/storage/v1/object/'+BUCKET+'/'+enc(path),{method:'POST',headers:headers({'Content-Type':file.type,'x-upsert':'false','cache-control':'3600'}),body:file});
    if(!up.ok)throw new Error('upload_'+up.status);
    uploaded=true;
    await rpc('yeorin_story_create',{p_story_id:id,p_media_path:path,p_media_type:isVideo?'video':'image',p_caption:cap,p_duration_seconds:dur});
    document.getElementById('ysUpload')?.remove();
    showToast('스토리를 올렸어요','success');
    await load(true)
  }catch(e){
    console.error(e);
    if(uploaded){await removeMedia(path);showToast('스토리 저장에 실패해서 올린 파일을 되돌렸어요','error')}
    else showToast('스토리 업로드 실패','error');
    btn.disabled=false;btn.textContent='스토리 올리기'
  }
};

/* ---------- 스토리 뷰어 ---------- */
window.openStoryUser=async function(authorId){
  const order=storyOrder();
  const g=order.findIndex(x=>x.authorId===authorId);
  if(g<0)return;
  viewer.groups=order;viewer.g=g;
  const list=order[g].list,f=list.findIndex(x=>!x.viewed);
  viewer.idx=f<0?0:f;
  await showStory()
};
function curGroup(){return viewer.groups[viewer.g]}
async function showStory(){
  clearTimeout(viewer.timer);
  const grp=curGroup();
  if(!grp){closeStory();return}
  const x=grp.list[viewer.idx];
  if(!x){closeStory();return}
  let url;
  try{url=await signed(x.mediaPath)}catch(e){showToast('스토리를 불러오지 못했어요','error');return}
  document.getElementById('ysStoryView')?.remove();
  const d=document.createElement('div');d.id='ysStoryView';d.className='ys-story-view';
  const bars=grp.list.map((_,i)=>'<span class="ys-prog"><i style="width:'+(i<viewer.idx?'100':'0')+'%"></i></span>').join('');
  const media=x.mediaType==='video'?'<video id="ysStoryMedia" class="ys-story-media" src="'+esc(url)+'" autoplay playsinline></video>':'<img class="ys-story-media" src="'+esc(url)+'">';
  d.innerHTML='<div class="ys-story-stage"><div class="ys-progress">'+bars+'</div><div class="ys-story-top"><span class="face">'+face(x.author)+'</span><span class="nm">'+esc(x.author.name)+' · '+rel(x.createdAt)+'</span><button class="ys-story-close" onclick="closeStory()">×</button></div>'+media+'<div class="ys-hit left" onclick="prevStory()"></div><div class="ys-hit right" onclick="nextStory()"></div>'+(x.caption?'<div class="ys-story-caption">'+esc(x.caption)+'</div>':'')+'</div>';
  document.body.appendChild(d);
  rpc('yeorin_story_mark_viewed',{p_story_id:x.id}).catch(()=>{});
  x.viewed=true;
  const current=d.querySelectorAll('.ys-prog i')[viewer.idx];
  if(current)setTimeout(()=>{current.style.transition='width '+(x.mediaType==='video'?Math.max(1,Number(x.durationSeconds)||10):6)+'s linear';current.style.width='100%'},30);
  if(x.mediaType==='video'){const v=document.getElementById('ysStoryMedia');if(v)v.onended=()=>nextStory()}
  else viewer.timer=setTimeout(()=>nextStory(),6000)
}
window.nextStory=function(){
  const grp=curGroup();
  if(!grp){closeStory();return}
  if(viewer.idx+1<grp.list.length){viewer.idx++;showStory();return}
  if(viewer.g+1<viewer.groups.length){viewer.g++;viewer.idx=0;showStory();return}
  closeStory()
};
window.prevStory=function(){
  if(viewer.idx>0){viewer.idx--;showStory();return}
  if(viewer.g>0){viewer.g--;const prev=viewer.groups[viewer.g];viewer.idx=Math.max(0,prev.list.length-1);showStory();return}
  showStory()
};
window.closeStory=function(){
  clearTimeout(viewer.timer);
  document.getElementById('ysStoryView')?.remove();
  viewer.groups=[];viewer.g=0;viewer.idx=0;
  refreshStrip()
};

setTimeout(()=>{if(typeof curTab!=='undefined'&&curTab==='nanum'){ensureRoot();load(true)}},700);
console.log('[Yeorin] social nanum feed + stories ready');
})();