-- AceHR :: initial schema, multi-tenant HR SaaS
-- Postgres 15 / Supabase

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  slug                   text not null unique,
  plan                   text not null default 'starter'
                           check (plan in ('starter','growth','enterprise')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  branches               text[] not null default
                           array['Federal Way','Lynnwood','Tacoma','Los Angeles','HQ'],
  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users (mirror of auth.users, carries tenancy + role)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users (id) on delete cascade,
  org_id     uuid not null references public.organizations (id) on delete cascade,
  full_name  text not null default '',
  email      text,
  role       text not null default 'employee'
               check (role in ('admin','manager','employee')),
  created_at timestamptz not null default now()
);
create index if not exists users_org_id_idx on public.users (org_id);

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table if not exists public.employees (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid references public.users (id) on delete set null,
  full_name        text not null,
  email            text,
  branch           text,
  position         text,
  hire_date        date,
  pto_balance_days numeric(6,2) not null default 15,
  hourly_rate      numeric(10,2),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists employees_org_id_idx      on public.employees (org_id);
create index if not exists employees_created_at_idx  on public.employees (org_id, created_at desc);
create unique index if not exists employees_org_email_idx
  on public.employees (org_id, lower(email)) where email is not null;

-- ---------------------------------------------------------------------------
-- vacation_requests
-- ---------------------------------------------------------------------------
create table if not exists public.vacation_requests (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organizations (id) on delete cascade,
  employee_id    uuid not null references public.employees (id) on delete cascade,
  type           text not null default 'annual'
                   check (type in ('annual','sick','personal','unpaid')),
  start_date     date not null,
  end_date       date not null,
  days_requested numeric(5,2) not null default 0,
  status         text not null default 'pending'
                   check (status in ('pending','approved','rejected')),
  reviewed_by    uuid references public.users (id) on delete set null,
  reviewed_at    timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  constraint vacation_requests_date_order check (end_date >= start_date)
);
create index if not exists vacation_requests_org_idx     on public.vacation_requests (org_id, created_at desc);
create index if not exists vacation_requests_emp_idx     on public.vacation_requests (employee_id);
create index if not exists vacation_requests_range_idx   on public.vacation_requests (org_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- work_logs
-- NOTE: Postgres forbids a generated column referencing another generated
-- column, so the overtime flag repeats the hours expression instead of
-- referencing hours_worked.
-- ---------------------------------------------------------------------------
create table if not exists public.work_logs (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  employee_id  uuid not null references public.employees (id) on delete cascade,
  log_date     date not null,
  check_in     timestamptz,
  check_out    timestamptz,
  hours_worked numeric generated always as
                 (extract(epoch from (check_out - check_in)) / 3600.0) stored,
  is_overtime  boolean generated always as
                 ((extract(epoch from (check_out - check_in)) / 3600.0) > 8) stored,
  notes        text,
  created_at   timestamptz not null default now()
);
create unique index if not exists work_logs_emp_date_idx on public.work_logs (employee_id, log_date);
create index if not exists work_logs_org_date_idx on public.work_logs (org_id, log_date desc);

-- ---------------------------------------------------------------------------
-- overtime_records
-- ---------------------------------------------------------------------------
create table if not exists public.overtime_records (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  employee_id     uuid not null references public.employees (id) on delete cascade,
  week_start      date not null,
  regular_hours   numeric(6,2) not null default 0,
  overtime_hours  numeric(6,2) not null default 0,
  ot_pay_estimate numeric(10,2) not null default 0,
  status          text not null default 'pending'
                    check (status in ('pending','approved','paid')),
  created_at      timestamptz not null default now()
);
create unique index if not exists overtime_records_emp_week_idx
  on public.overtime_records (employee_id, week_start);
create index if not exists overtime_records_org_idx
  on public.overtime_records (org_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tenancy helpers (SECURITY DEFINER so policies on public.users do not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

grant execute on function public.current_org_id()    to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations    enable row level security;
alter table public.users            enable row level security;
alter table public.employees        enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.work_logs        enable row level security;
alter table public.overtime_records enable row level security;

-- organizations ------------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (true);  -- signup creates the org before the user row exists

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (id = public.current_org_id())
  with check (id = public.current_org_id());

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete to authenticated
  using (id = public.current_org_id() and public.current_user_role() = 'admin');

-- users ---------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (id = auth.uid() or org_id = public.current_org_id());

drop policy if exists users_insert on public.users;
create policy users_insert on public.users
  for insert to authenticated
  with check (id = auth.uid() or org_id = public.current_org_id());

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists users_delete on public.users;
create policy users_delete on public.users
  for delete to authenticated
  using (org_id = public.current_org_id() and public.current_user_role() = 'admin');

-- employees -----------------------------------------------------------------
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees
  for select to authenticated using (org_id = public.current_org_id());

drop policy if exists employees_insert on public.employees;
create policy employees_insert on public.employees
  for insert to authenticated with check (org_id = public.current_org_id());

drop policy if exists employees_update on public.employees;
create policy employees_update on public.employees
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists employees_delete on public.employees;
create policy employees_delete on public.employees
  for delete to authenticated using (org_id = public.current_org_id());

-- vacation_requests ---------------------------------------------------------
drop policy if exists vacation_requests_select on public.vacation_requests;
create policy vacation_requests_select on public.vacation_requests
  for select to authenticated using (org_id = public.current_org_id());

drop policy if exists vacation_requests_insert on public.vacation_requests;
create policy vacation_requests_insert on public.vacation_requests
  for insert to authenticated with check (org_id = public.current_org_id());

drop policy if exists vacation_requests_update on public.vacation_requests;
create policy vacation_requests_update on public.vacation_requests
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists vacation_requests_delete on public.vacation_requests;
create policy vacation_requests_delete on public.vacation_requests
  for delete to authenticated using (org_id = public.current_org_id());

-- work_logs -----------------------------------------------------------------
drop policy if exists work_logs_select on public.work_logs;
create policy work_logs_select on public.work_logs
  for select to authenticated using (org_id = public.current_org_id());

drop policy if exists work_logs_insert on public.work_logs;
create policy work_logs_insert on public.work_logs
  for insert to authenticated with check (org_id = public.current_org_id());

drop policy if exists work_logs_update on public.work_logs;
create policy work_logs_update on public.work_logs
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists work_logs_delete on public.work_logs;
create policy work_logs_delete on public.work_logs
  for delete to authenticated using (org_id = public.current_org_id());

-- overtime_records ----------------------------------------------------------
drop policy if exists overtime_records_select on public.overtime_records;
create policy overtime_records_select on public.overtime_records
  for select to authenticated using (org_id = public.current_org_id());

drop policy if exists overtime_records_insert on public.overtime_records;
create policy overtime_records_insert on public.overtime_records
  for insert to authenticated with check (org_id = public.current_org_id());

drop policy if exists overtime_records_update on public.overtime_records;
create policy overtime_records_update on public.overtime_records
  for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists overtime_records_delete on public.overtime_records;
create policy overtime_records_delete on public.overtime_records
  for delete to authenticated using (org_id = public.current_org_id());

-- ---------------------------------------------------------------------------
-- PTO ledger: approving a request debits the employee's balance once,
-- rejecting/reverting an approved request credits it back.
-- ---------------------------------------------------------------------------
create or replace function public.apply_pto_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status <> 'approved' and new.status = 'approved' then
      update public.employees
         set pto_balance_days = pto_balance_days - new.days_requested
       where id = new.employee_id and new.type in ('annual','personal');
    elsif old.status = 'approved' and new.status <> 'approved' then
      update public.employees
         set pto_balance_days = pto_balance_days + old.days_requested
       where id = old.employee_id and old.type in ('annual','personal');
    end if;
  elsif tg_op = 'INSERT' and new.status = 'approved' then
    update public.employees
       set pto_balance_days = pto_balance_days - new.days_requested
     where id = new.employee_id and new.type in ('annual','personal');
  end if;
  return new;
end;
$$;

drop trigger if exists vacation_requests_pto on public.vacation_requests;
create trigger vacation_requests_pto
  after insert or update of status on public.vacation_requests
  for each row execute function public.apply_pto_balance();

-- ---------------------------------------------------------------------------
-- Weekly overtime rollup: recompute a week's overtime_records row whenever a
-- work log for that week changes.
-- ---------------------------------------------------------------------------
create or replace function public.rollup_overtime()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp      uuid := coalesce(new.employee_id, old.employee_id);
  v_org      uuid := coalesce(new.org_id, old.org_id);
  v_week     date := date_trunc('week', coalesce(new.log_date, old.log_date))::date;
  v_total    numeric := 0;
  v_regular  numeric := 0;
  v_ot       numeric := 0;
  v_rate     numeric := 0;
begin
  select coalesce(sum(hours_worked), 0) into v_total
    from public.work_logs
   where employee_id = v_emp
     and log_date >= v_week
     and log_date < v_week + 7;

  v_regular := least(v_total, 40);
  v_ot      := greatest(v_total - 40, 0);

  select coalesce(hourly_rate, 0) into v_rate
    from public.employees where id = v_emp;

  if v_total = 0 then
    delete from public.overtime_records
     where employee_id = v_emp and week_start = v_week and status = 'pending';
    return coalesce(new, old);
  end if;

  insert into public.overtime_records
    (org_id, employee_id, week_start, regular_hours, overtime_hours, ot_pay_estimate)
  values
    (v_org, v_emp, v_week, round(v_regular, 2), round(v_ot, 2), round(v_ot * v_rate * 1.5, 2))
  on conflict (employee_id, week_start) do update
    set regular_hours   = excluded.regular_hours,
        overtime_hours  = excluded.overtime_hours,
        ot_pay_estimate = excluded.ot_pay_estimate
    where public.overtime_records.status = 'pending';

  return coalesce(new, old);
end;
$$;

drop trigger if exists work_logs_overtime_rollup on public.work_logs;
create trigger work_logs_overtime_rollup
  after insert or update or delete on public.work_logs
  for each row execute function public.rollup_overtime();
