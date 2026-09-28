-- App-managed student profile fields used by the registration form.
-- Existing imported roster rows remain unchanged and use safe defaults.
alter table public.students
  add column if not exists guardian_name text not null default '',
  add column if not exists guardian_phone text not null default '',
  add column if not exists belt_level text,
  add column if not exists admission_date date,
  add column if not exists monthly_fee numeric(10, 2) not null default 0,
  add column if not exists status text not null default 'active',
  add column if not exists photo_url text,
  add column if not exists source_imported boolean not null default true,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.students
  add constraint students_belt_level_check
    check (belt_level is null or belt_level in ('White', 'Yellow', 'Green', 'Blue', 'Red', 'Black')),
  add constraint students_status_check
    check (status in ('active', 'suspended', 'left'));

create index if not exists students_group_roll_idx on public.students (group_id, roll_no);
