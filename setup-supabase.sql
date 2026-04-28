create extension if not exists "pgcrypto";

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  employee_id text unique,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.employees add column if not exists employee_id text;
update public.employees
set employee_id = coalesce(employee_id, 'EMP-' || upper(substr(replace(id::text, '-', ''), 1, 8)))
where employee_id is null or employee_id = '';

alter table public.employees alter column employee_id set not null;
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'department'
  ) then
    alter table public.employees drop column department;
  end if;
end $$;

alter table public.employees
drop constraint if exists employees_employee_id_key;
alter table public.employees
add constraint employees_employee_id_key unique (employee_id);

create table if not exists public.phones (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  imei text not null unique,
  notes text default '',
  employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sims (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  sim_number text not null unique,
  mobile_number text default '',
  employee_id uuid references public.employees(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;
alter table public.phones enable row level security;
alter table public.sims enable row level security;

drop policy if exists "employees for authenticated users" on public.employees;
create policy "employees for authenticated users"
on public.employees
for all
to authenticated
using (true)
with check (true);

drop policy if exists "phones for authenticated users" on public.phones;
create policy "phones for authenticated users"
on public.phones
for all
to authenticated
using (true)
with check (true);

drop policy if exists "sims for authenticated users" on public.sims;
create policy "sims for authenticated users"
on public.sims
for all
to authenticated
using (true)
with check (true);
