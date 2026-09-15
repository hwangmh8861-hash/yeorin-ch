const CACHE='yeorin-shell-v10';
const APP_ICONS=['/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-touch-icon.png','/favicon-32.png'];
const SHELL=['/','/manifest.json',...APP_ICONS,'/icons/notification-badge.png'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('/')));
    return;
  }
  if(url.pathname==='/manifest.json'){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>caches.match(req)));
    return;
  }
  if(APP_ICONS.includes(url.pathname)||url.pathname.startsWith('/icons/')){
    event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>caches.match(req)));
  }
});

self.addEventListener('push',event=>{
  let p={};try{p=event.data?event.data.json():{};}catch(e){try{p={body:event.data.text()};}catch(_e){}}
  const title=p.title||'여린교회';
  const opts={
    body:p.body||'새로운 소식이 있어요',
    icon:p.icon||'/icon-192.png',
    badge:p.badge||'/icons/notification-badge.png',
    tag:p.tag||undefined,
    renotify:false,
    data:p.data||{},
    vibrate:[80,45,80]
  };
  event.waitUntil(self.registration.showNotification(title,opts));
});

function pushUrl(data){
  const u=new URL('/',self.location.origin);
  if(data&&data.tab)u.searchParams.set('pushTab',String(data.tab));
  if(data&&data.sub)u.searchParams.set('pushSub',String(data.sub));
  if(data&&data.date)u.searchParams.set('pushDate',String(data.date));
  if(data&&data.postId)u.searchParams.set('pushPost',String(data.postId));
  if(data&&data.challengeId)u.searchParams.set('pushChallenge',String(data.challengeId));
  if(data&&data.authorId)u.searchParams.set('pushAuthor',String(data.authorId));
  if(data&&data.storyId)u.searchParams.set('pushStory',String(data.storyId));
  return u.toString();
}

self.addEventListener('notificationclick',event=>{
  event.notification.close();const data=event.notification.data||{};
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).origin===self.location.origin){
        await client.focus();client.postMessage({type:'YEORIN_PUSH_NAV',data});return;
      }
    }
    await self.clients.openWindow(pushUrl(data));
  })());
});
