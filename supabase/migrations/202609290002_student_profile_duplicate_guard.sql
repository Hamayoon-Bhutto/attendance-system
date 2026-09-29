-- Prevent duplicate app-managed profiles even when registrations race each other.
-- Existing duplicate rows are preserved; the trigger blocks new duplicates.
create or replace function public.prevent_duplicate_student_profile()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists students_prevent_duplicate_profile on public.students;
create trigger students_prevent_duplicate_profile
before insert or update of name, guardian_phone, is_deleted on public.students
for each row execute function public.prevent_duplicate_student_profile();
