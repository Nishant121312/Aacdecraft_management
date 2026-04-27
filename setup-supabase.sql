create extension if not exists "pgcrypto";

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

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
