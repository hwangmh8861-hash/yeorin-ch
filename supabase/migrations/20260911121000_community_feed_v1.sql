-- 여린교회 커뮤니티 피드 v1
-- Production에 적용된 community_feed_v1_hardening / community_feed_rpc_v1 내용을 저장소에도 기록합니다.

alter table public.community_posts drop constraint if exists community_post_has_content;
alter table public.community_posts drop constraint if exists community_post_content_length;
alter table public.community_posts add constraint community_post_content_length check (length(content) <= 5000);

create index if not exists community_posts_created_at_idx on public.community_posts (is_pinned desc, created_at desc);

create or replace function public.yeorin_community_feed(p_page integer default 0, p_per_page integer default 10)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'public'
as $$
declare
  v_uid text := public.yeorin_profile_id();
  v_total int;
  v_posts jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select count(*) into v_total from public.community_posts;

  with selected as (
    select p.*
    from public.community_posts p
    order by p.is_pinned desc, p.created_at desc
    offset greatest(p_page,0) * greatest(p_per_page,1)
    limit least(greatest(p_per_page,1),20)
  ), payload as (
    select s.id,
      jsonb_build_object(
        'id', s.id::text,
        'authorId', s.author_id,
        'author', jsonb_build_object('id',pr.id,'name',pr.name,'emoji',pr.emoji,'bio',pr.bio),
        'content', s.content,
        'pinned', s.is_pinned,
        'createdAt', s.created_at,
        'updatedAt', s.updated_at,
        'mine', s.author_id=v_uid,
        'media', coalesce((select jsonb_agg(jsonb_build_object('id',m.id::text,'storagePath',m.storage_path,'type',m.media_type,'sortOrder',m.sort_order) order by m.sort_order) from public.community_media m where m.post_id=s.id),'[]'::jsonb),
        'reactions', coalesce((select jsonb_object_agg(x.reaction_key,x.users) from (select r.reaction_key,jsonb_agg(r.user_id order by r.created_at) users from public.reactions r where r.target_type='community' and r.target_id=s.id::text group by r.reaction_key)x),'{}'::jsonb),
        'comments', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'authorId',c.author_id,'author',jsonb_build_object('id',cp.id,'name',cp.name,'emoji',cp.emoji,'bio',cp.bio),'text',c.text,'date',c.comment_date,'createdAt',c.created_at) order by c.created_at) from public.comments c left join public.profiles cp on cp.id=c.author_id where c.target_type='community' and c.target_id=s.id::text),'[]'::jsonb)
      ) obj
    from selected s
    join public.profiles pr on pr.id=s.author_id
  )
  select coalesce(jsonb_agg(obj order by (obj->>'pinned')::boolean desc, obj->>'createdAt' desc),'[]'::jsonb) into v_posts from payload;
  return jsonb_build_object('posts',v_posts,'total',v_total,'hasMore',(greatest(p_page,0)+1)*least(greatest(p_per_page,1),20)<v_total);
end $$;

create or replace function public.yeorin_community_create(p_post_id uuid, p_content text, p_media_paths text[] default array[]::text[])
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  v_uid text := public.yeorin_profile_id();
  v_auth text := auth.uid()::text;
  v_path text;
  v_i int := 0;
begin
  if v_uid is null or v_auth is null then raise exception 'unauthorized'; end if;
  if length(trim(coalesce(p_content,'')))=0 and coalesce(array_length(p_media_paths,1),0)=0 then raise exception 'empty_post'; end if;
  if length(coalesce(p_content,''))>5000 then raise exception 'content_too_long'; end if;
  if coalesce(array_length(p_media_paths,1),0)>5 then raise exception 'too_many_images'; end if;
  foreach v_path in array coalesce(p_media_paths,array[]::text[]) loop
    if v_path not like v_auth||'/'||p_post_id::text||'/%' then raise exception 'invalid_media_path'; end if;
  end loop;
  insert into public.community_posts(id,author_id,content) values(p_post_id,v_uid,trim(coalesce(p_content,'')));
  foreach v_path in array coalesce(p_media_paths,array[]::text[]) loop
    insert into public.community_media(post_id,uploader_id,storage_path,media_type,sort_order) values(p_post_id,v_uid,v_path,'image',v_i);
    v_i:=v_i+1;
  end loop;
  return jsonb_build_object('success',true,'id',p_post_id::text);
end $$;

create or replace function public.yeorin_community_update(p_post_id uuid, p_content text)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare v_uid text:=public.yeorin_profile_id(); v_author text; v_media int;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select author_id into v_author from public.community_posts where id=p_post_id;
  if v_author is null then raise exception 'not_found'; end if;
  if v_author<>v_uid then raise exception 'forbidden'; end if;
  select count(*) into v_media from public.community_media where post_id=p_post_id;
  if length(trim(coalesce(p_content,'')))=0 and v_media=0 then raise exception 'empty_post'; end if;
  if length(coalesce(p_content,''))>5000 then raise exception 'content_too_long'; end if;
  update public.community_posts set content=trim(coalesce(p_content,'')),updated_at=now() where id=p_post_id;
  return jsonb_build_object('success',true);
end $$;

create or replace function public.yeorin_community_delete(p_post_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare v_uid text:=public.yeorin_profile_id(); v_author text;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select author_id into v_author from public.community_posts where id=p_post_id;
  if v_author is null then return jsonb_build_object('success',true); end if;
  if v_author<>v_uid then raise exception 'forbidden'; end if;
  delete from public.reactions where target_type='community' and target_id=p_post_id::text;
  delete from public.comments where target_type='community' and target_id=p_post_id::text;
  delete from public.community_posts where id=p_post_id;
  return jsonb_build_object('success',true);
end $$;

create or replace function public.yeorin_community_add_comment(p_post_id uuid,p_text text)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare v_uid text:=public.yeorin_profile_id(); v_id text; v_c jsonb;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  if length(trim(coalesce(p_text,'')))=0 then raise exception 'empty_comment'; end if;
  if length(p_text)>1000 then raise exception 'comment_too_long'; end if;
  if not exists(select 1 from public.community_posts where id=p_post_id) then raise exception 'not_found'; end if;
  insert into public.comments(target_type,target_id,author_id,text,comment_date) values('community',p_post_id::text,v_uid,trim(p_text),current_date) returning id into v_id;
  select jsonb_build_object('id',c.id,'authorId',c.author_id,'author',jsonb_build_object('id',p.id,'name',p.name,'emoji',p.emoji,'bio',p.bio),'text',c.text,'date',c.comment_date,'createdAt',c.created_at) into v_c from public.comments c join public.profiles p on p.id=c.author_id where c.id=v_id;
  return jsonb_build_object('success',true,'comment',v_c);
end $$;

create or replace function public.yeorin_community_delete_comment(p_comment_id text)
returns jsonb
language plpgsql
security invoker
set search_path to 'public'
as $$
declare v_uid text:=public.yeorin_profile_id(); v_author text; v_type text;
begin
  if v_uid is null then raise exception 'unauthorized'; end if;
  select author_id,target_type into v_author,v_type from public.comments where id=p_comment_id;
  if v_author is null then return jsonb_build_object('success',true); end if;
  if v_type<>'community' or v_author<>v_uid then raise exception 'forbidden'; end if;
  delete from public.comments where id=p_comment_id;
  return jsonb_build_object('success',true);
end $$;
