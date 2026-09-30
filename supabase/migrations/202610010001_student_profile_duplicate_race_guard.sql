-- Serialize duplicate checks for app-managed student profiles.
create or replace function public.prevent_duplicate_student_profile()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.guardian_phone, '') <> '' then
    perform pg_advisory_xact_lock(hashtextextended(
      lower(trim(new.name)) || ':' || regexp_replace(new.guardian_phone, '[^0-9]', '', 'g'), 0
    ));
  end if;

  if coalesce(new.guardian_phone, '') <> '' and exists (
    select 1
    from public.students existing
    where existing.id is distinct from new.id
      and coalesce(existing.is_deleted, false) = false
      and lower(trim(existing.name)) = lower(trim(new.name))
      and regexp_replace(coalesce(existing.guardian_phone, ''), '[^0-9]', '', 'g')
        = regexp_replace(new.guardian_phone, '[^0-9]', '', 'g')
  ) then
    raise exception 'A student with this name and guardian phone number already exists.'
      using errcode = '23505';
  end if;
  return new;
end;
$$;
