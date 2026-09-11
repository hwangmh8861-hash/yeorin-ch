import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-yeorin-cron',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json; charset=utf-8'}});
const URL=Deno.env.get('SUPABASE_URL')??'';
const SECRET=(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'') || (()=>{try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')??'{}').default??''}catch{return''}})();
const admin=createClient(URL,SECRET,{auth:{autoRefreshToken:false,persistSession:false}});

type PushConfig={publicKey:string,privateKey:string,cronSecret:string};

async function profileFromReq(req:Request){
  const h=req.headers.get('authorization')||'';
  const token=h.replace(/^Bearer\s+/i,'').trim();
  if(!token)return null;
  const {data,error}=await admin.auth.getUser(token);
  if(error||!data.user)return null;
  const {data:p}=await admin.from('profiles').select('id,name').eq('auth_user_id',data.user.id).maybeSingle();
  if(!p)return null;
  return {user:data.user,profile:p};
}

async function getConfig(create=true):Promise<PushConfig|null>{
  const {data}=await admin.from('push_private_config').select('key,value').in('key',['vapid_public','vapid_private','cron_secret']);
  const m=new Map((data||[]).map((r:any)=>[r.key,r.value]));
  if(m.get('vapid_public')&&m.get('vapid_private')&&m.get('cron_secret'))return {publicKey:m.get('vapid_public')!,privateKey:m.get('vapid_private')!,cronSecret:m.get('cron_secret')!};
  if(!create)return null;
  const keys=webpush.generateVAPIDKeys();
  const cronSecret=crypto.randomUUID()+'-'+crypto.randomUUID();
  const rows=[
    {key:'vapid_public',value:keys.publicKey,updated_at:new Date().toISOString()},
    {key:'vapid_private',value:keys.privateKey,updated_at:new Date().toISOString()},
    {key:'cron_secret',value:cronSecret,updated_at:new Date().toISOString()}
  ];
  const {error}=await admin.from('push_private_config').upsert(rows,{onConflict:'key'});
  if(error)throw error;
  await admin.from('notification_outbox').update({sent_at:new Date().toISOString(),processing_at:null}).is('sent_at',null);
  return {publicKey:keys.publicKey,privateKey:keys.privateKey,cronSecret};
}

async function subscribe(req:Request,b:any){
  const auth=await profileFromReq(req);if(!auth)return json({success:false,error:'unauthorized'},401);
  const s=b.subscription||{};const keys=s.keys||{};
  if(!s.endpoint||!keys.p256dh||!keys.auth)return json({success:false,error:'invalid_subscription'},400);
  await getConfig(true);
  const row={profile_id:auth.profile.id,auth_user_id:auth.user.id,endpoint:String(s.endpoint),p256dh:String(keys.p256dh),auth:String(keys.auth),user_agent:String(req.headers.get('user-agent')||''),enabled:true,updated_at:new Date().toISOString()};
  const {error}=await admin.from('push_subscriptions').upsert(row,{onConflict:'endpoint'});
  if(error)return json({success:false,error:error.message},500);
  return json({success:true});
}

async function unsubscribe(req:Request,b:any){
  const auth=await profileFromReq(req);if(!auth)return json({success:false,error:'unauthorized'},401);
  const endpoint=String(b.endpoint||'');
  if(endpoint)await admin.from('push_subscriptions').delete().eq('profile_id',auth.profile.id).eq('endpoint',endpoint);
  else await admin.from('push_subscriptions').update({enabled:false,updated_at:new Date().toISOString()}).eq('profile_id',auth.profile.id);
  return json({success:true});
}

async function config(req:Request){
  const auth=await profileFromReq(req);if(!auth)return json({success:false,error:'unauthorized'},401);
  const c=await getConfig(true);
  const {count}=await admin.from('push_subscriptions').select('*',{count:'exact',head:true}).eq('profile_id',auth.profile.id).eq('enabled',true);
  return json({success:true,publicKey:c!.publicKey,subscribed:(count||0)>0});
}

async function dispatch(req:Request){
  const c=await getConfig(false);if(!c)return json({success:false,error:'push_not_initialized'},409);
  if((req.headers.get('x-yeorin-cron')||'')!==c.cronSecret)return json({success:false,error:'forbidden'},403);
  webpush.setVapidDetails('mailto:admin@yeorin.local',c.publicKey,c.privateKey);
  try{await admin.rpc('yeorin_enqueue_calendar_notifications');}catch(e){console.error('[calendar enqueue]',e);}

  const nowIso=new Date().toISOString();
  const stale=new Date(Date.now()-5*60*1000).toISOString();
  const {data:rows,error}=await admin.from('notification_outbox').select('*').is('sent_at',null).lte('not_before',nowIso).or(`processing_at.is.null,processing_at.lt.${stale}`).order('id',{ascending:true}).limit(100);
  if(error)return json({success:false,error:error.message},500);
  let sent=0,removed=0,events=0;
  for(const row of rows||[]){
    const claimAt=new Date().toISOString();
    const {data:claimed}=await admin.from('notification_outbox').update({processing_at:claimAt}).eq('id',row.id).is('sent_at',null).select('id').maybeSingle();
    if(!claimed)continue;
    let q=admin.from('push_subscriptions').select('id,profile_id,endpoint,p256dh,auth').eq('enabled',true);
    if(row.target_profile_id)q=q.eq('profile_id',row.target_profile_id);
    else if(row.actor_profile_id)q=q.neq('profile_id',row.actor_profile_id);
    const {data:subs}=await q;
    const payload=JSON.stringify({title:row.title||'여린교회',body:row.body,icon:'/icons/icon-192.png',badge:'/icons/notification-badge.png',tag:row.dedupe_key,data:row.data||{}});
    for(const s of subs||[]){
      try{
        await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:86400,urgency:'normal'} as any);
        sent++;
      }catch(e:any){
        const status=Number(e?.statusCode||e?.status||0);
        if(status===404||status===410){await admin.from('push_subscriptions').delete().eq('id',s.id);removed++;}
        else console.error('[push send]',status,e?.message||e);
      }
    }
    await admin.from('notification_outbox').update({sent_at:new Date().toISOString(),processing_at:null}).eq('id',row.id);
    events++;
  }
  return json({success:true,events,sent,removed});
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({success:false,error:'method_not_allowed'},405);
  try{
    const b=await req.json().catch(()=>({}));
    const action=String(b.action||'');
    if(action==='config')return config(req);
    if(action==='subscribe')return subscribe(req,b);
    if(action==='unsubscribe')return unsubscribe(req,b);
    if(action==='dispatch')return dispatch(req);
    return json({success:false,error:'unsupported_action'},400);
  }catch(e:any){console.error(e);return json({success:false,error:e?.message||'push_error'},500);}
});