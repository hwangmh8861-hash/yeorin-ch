create or replace function public.yeorin_contacts_payload()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', name,
        'phone', coalesce(phone,''),
        'birthday', coalesce(birthday::text,''),
        'birthdayType', coalesce(birthday_type,'solar'),
        'role', coalesce(role,''),
        'family', coalesce(family,''),
        'address', coalesce(address,''),
        'email', coalesce(email,''),
        'memo', coalesce(memo,''),
        'createdBy', coalesce(created_by,''),
        'createdAt', coalesce(created_at::text,''),
        'updatedAt', coalesce(updated_at::text,'')
      ) order by name
    ),
    '[]'::jsonb
  )
  from public.contacts;
$$;

grant execute on function public.yeorin_contacts_payload() to authenticated;
