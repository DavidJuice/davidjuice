-- AceHR :: local development seed.
-- Creates one org, one admin login, 5 employees, 10 vacation requests and a
-- week of work logs. LOCAL ONLY -- never run against a production project.
--
--   login: admin@acehr.test  /  Password123!

begin;

-- --- auth user ------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated',
  'admin@acehr.test',
  crypt('Password123!', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Dana Reyes"}'::jsonb
) on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@acehr.test"}'::jsonb,
  'email', now(), now(), now()
) on conflict (provider_id, provider) do nothing;

-- --- org + app user -------------------------------------------------------
insert into public.organizations (id, name, slug, plan, created_at)
values ('22222222-2222-2222-2222-222222222222',
        'Ace Insurance Group', 'ace-insurance-group', 'growth', now() - interval '90 days')
on conflict (id) do nothing;

insert into public.users (id, org_id, full_name, email, role)
values ('11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'Dana Reyes', 'admin@acehr.test', 'admin')
on conflict (id) do nothing;

-- --- employees ------------------------------------------------------------
insert into public.employees
  (id, org_id, user_id, full_name, email, branch, position, hire_date,
   pto_balance_days, hourly_rate, is_active, created_at)
values
  ('33333333-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111','Dana Reyes','admin@acehr.test','HQ',
   'Operations Director','2021-03-15', 18.0, 52.00, true, now() - interval '80 days'),
  ('33333333-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222',
   null,'Marcus Hale','marcus.hale@acehr.test','Federal Way',
   'Senior Agent','2022-01-10', 12.5, 34.00, true, now() - interval '70 days'),
  ('33333333-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222',
   null,'Priya Raman','priya.raman@acehr.test','Lynnwood',
   'Claims Specialist','2023-06-01', 15.0, 29.50, true, now() - interval '60 days'),
  ('33333333-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222',
   null,'Elena Cruz','elena.cruz@acehr.test','Tacoma',
   'Account Manager','2020-09-21', 7.5, 38.75, true, now() - interval '50 days'),
  ('33333333-0000-0000-0000-000000000005','22222222-2222-2222-2222-222222222222',
   null,'Tobias Kim','tobias.kim@acehr.test','Los Angeles',
   'Producer','2024-02-05', 15.0, 31.00, true, now() - interval '40 days')
on conflict (id) do nothing;

-- --- vacation requests (10) ----------------------------------------------
-- Trigger-driven PTO debiting is disabled for the seed so the balances above
-- stay exactly as written.
alter table public.vacation_requests disable trigger vacation_requests_pto;

insert into public.vacation_requests
  (org_id, employee_id, type, start_date, end_date, days_requested, status,
   reviewed_by, reviewed_at, notes, created_at)
values
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000002',
   'annual', current_date + 3, current_date + 7, 5, 'pending', null, null,
   'Family trip to Bend.', now() - interval '2 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000003',
   'sick', current_date - 1, current_date - 1, 1, 'approved',
   '11111111-1111-1111-1111-111111111111', now() - interval '1 day',
   'Flu.', now() - interval '3 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000004',
   'annual', current_date + 14, current_date + 18, 5, 'pending', null, null,
   'Anniversary.', now() - interval '4 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000005',
   'personal', current_date + 1, current_date + 1, 1, 'approved',
   '11111111-1111-1111-1111-111111111111', now() - interval '2 days',
   'DMV appointment.', now() - interval '5 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000002',
   'unpaid', current_date + 30, current_date + 34, 5, 'rejected',
   '11111111-1111-1111-1111-111111111111', now() - interval '6 days',
   'Coverage gap in Federal Way that week.', now() - interval '7 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000001',
   'annual', current_date - 20, current_date - 16, 5, 'approved',
   '11111111-1111-1111-1111-111111111111', now() - interval '25 days',
   'Q2 break.', now() - interval '28 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000003',
   'annual', current_date + 45, current_date + 52, 6, 'pending', null, null,
   'Wedding abroad.', now() - interval '8 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000004',
   'sick', current_date - 10, current_date - 9, 2, 'approved',
   '11111111-1111-1111-1111-111111111111', now() - interval '10 days',
   null, now() - interval '11 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000005',
   'annual', current_date + 2, current_date + 4, 3, 'pending', null, null,
   'Long weekend.', now() - interval '9 days'),
  ('22222222-2222-2222-2222-222222222222','33333333-0000-0000-0000-000000000001',
   'personal', current_date, current_date, 1, 'approved',
   '11111111-1111-1111-1111-111111111111', now() - interval '12 hours',
   'Home closing.', now() - interval '13 days');

alter table public.vacation_requests enable trigger vacation_requests_pto;

-- --- work logs for the current week ---------------------------------------
insert into public.work_logs (org_id, employee_id, log_date, check_in, check_out, notes)
select
  '22222222-2222-2222-2222-222222222222',
  e.id,
  d::date,
  (d::date + time '09:00') at time zone 'America/Los_Angeles',
  (d::date + time '09:00' + (h || ' hours')::interval) at time zone 'America/Los_Angeles',
  null
from public.employees e
cross join lateral generate_series(
  date_trunc('week', current_date)::date,
  date_trunc('week', current_date)::date + 4,
  interval '1 day') as d
cross join lateral (
  select case when e.branch = 'Federal Way' then 9.5 else 8 end as h
) as hrs
where e.org_id = '22222222-2222-2222-2222-222222222222'
on conflict (employee_id, log_date) do nothing;

commit;
