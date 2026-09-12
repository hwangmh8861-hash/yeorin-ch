create table if not exists public.bible_verses (
  source_key text primary key,
  book_abbr text not null,
  chapter integer not null check (chapter > 0),
  verse_from integer not null check (verse_from > 0),
  verse_to integer not null check (verse_to >= verse_from),
  verse_label text not null,
  text text not null
);

create index if not exists bible_verses_book_chapter_idx
  on public.bible_verses(book_abbr, chapter, verse_from, verse_to);

alter table public.bible_verses enable row level security;
revoke all on table public.bible_verses from anon, authenticated;

create or replace function public.yeorin_bible_chapter(p_book text, p_chapter integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'unauthorized';
  end if;
  if p_book is null or btrim(p_book) = '' or p_chapter is null or p_chapter < 1 then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'v', verse_from,
        'to', verse_to,
        'label', verse_label,
        'key', verse_label,
        't', text
      )
      order by verse_from, verse_to
    )
    from public.bible_verses
    where book_abbr = p_book and chapter = p_chapter
  ), '[]'::jsonb);
end
$function$;

revoke all on function public.yeorin_bible_chapter(text, integer) from public, anon;
grant execute on function public.yeorin_bible_chapter(text, integer) to authenticated;
