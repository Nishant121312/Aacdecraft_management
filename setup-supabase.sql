create extension if not exists "pgcrypto";

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  employee_id text not null unique,
  email text default '',
  department text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists employee_id text;
alter table public.employees add column if not exists email text default '';
alter table public.employees add column if not exists department text default '';
alter table public.employees add column if not exists notes text default '';

update public.employees
set employee_id = coalesce(employee_id, 'EMP-' || upper(substr(replace(id::text, '-', ''), 1, 8)))
where employee_id is null or employee_id = '';

alter table public.employees alter column employee_id set not null;
alter table public.employees drop constraint if exists employees_employee_id_key;
alter table public.employees add constraint employees_employee_id_key unique (employee_id);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  asset_name text not null,
  serial_number text not null unique,
  status text not null default 'Available',
  assigned_employee_id uuid references public.employees(id) on delete set null,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.assets add column if not exists category text;
alter table public.assets add column if not exists asset_name text;
alter table public.assets add column if not exists serial_number text;
alter table public.assets add column if not exists status text default 'Available';
alter table public.assets add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null;
alter table public.assets add column if not exists notes text default '';
alter table public.assets add column if not exists created_at timestamptz not null default now();

update public.assets
set status = case
  when assigned_employee_id is null then 'Available'
  else 'Assigned'
end
where status is null or status = '';

alter table public.assets alter column category set not null;
alter table public.assets alter column asset_name set not null;
alter table public.assets alter column serial_number set not null;

alter table public.assets drop constraint if exists assets_serial_number_key;
alter table public.assets add constraint assets_serial_number_key unique (serial_number);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  notes text default ''
);

alter table public.assignments add column if not exists asset_id uuid references public.assets(id) on delete cascade;
alter table public.assignments add column if not exists employee_id uuid references public.employees(id) on delete cascade;
alter table public.assignments add column if not exists assigned_at timestamptz not null default now();
alter table public.assignments add column if not exists released_at timestamptz;
alter table public.assignments add column if not exists notes text default '';

alter table public.employees enable row level security;
alter table public.assets enable row level security;
alter table public.assignments enable row level security;

drop policy if exists "employees for authenticated users" on public.employees;
create policy "employees for authenticated users"
on public.employees
for all
to authenticated
using (true)
with check (true);

drop policy if exists "assets for authenticated users" on public.assets;
create policy "assets for authenticated users"
on public.assets
for all
to authenticated
using (true)
with check (true);

drop policy if exists "assignments for authenticated users" on public.assignments;
create policy "assignments for authenticated users"
on public.assignments
for all
to authenticated
using (true)
with check (true);
