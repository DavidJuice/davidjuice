-- Verifies the invariants that live in the schema itself, not in application code.
-- Run against a scratch database with both migrations applied:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -f tests/integration/schema_guarantees.sql
-- Every block labeled MUST FAIL should print an ERROR. A silent success is a regression.

begin;
insert into agencies (id,name) values ('11111111-1111-1111-1111-111111111111','Test Agency');
insert into app_users (id,agency_id,email,role) values
 ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','r@test','reviewer');
insert into carriers (id,name,short_name) values
 ('33333333-3333-3333-3333-333333333333','UnitedHealthcare','UHC_TEST');
insert into plans (id,carrier_id,plan_name,contract_id,pbp,plan_id_ext,plan_year) values
 ('44444444-4444-4444-4444-444444444444','33333333-3333-3333-3333-333333333333','Choice 2','H9999','001','H9999-001-000',2026),
 ('55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333','Choice 2','H9999','001','H9999-001-000',2027);
commit;

\echo '== plan identity includes plan_year: both rows exist'
select plan_year, plan_id_ext from plans where contract_id = 'H9999' order by plan_year;

\echo '== MUST FAIL: fact plan_year disagrees with its plan row'
insert into extracted_facts (agency_id,plan_id,plan_year,benefit_code,value_numeric,frequency)
values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
        2027,'specialist_copay',35,'per_visit');

\echo '== MUST FAIL: frequency-required benefit stored without a frequency'
insert into extracted_facts (agency_id,plan_id,plan_year,benefit_code,value_numeric)
values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
        2026,'specialist_copay',35);

\echo '== MUST FAIL: fact carrying no value of any kind'
insert into extracted_facts (agency_id,plan_id,plan_year,benefit_code,frequency)
values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
        2026,'specialist_copay','per_visit');

\echo '== MUST SUCCEED: a well-formed verified fact'
insert into extracted_facts (agency_id,plan_id,plan_year,benefit_code,value_numeric,
                             frequency,network_scope,verification_status)
values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
        2026,'specialist_copay',35,'per_visit','in_network','verified');

\echo '== MUST FAIL: a second live verified fact for the same plan/year/benefit/scope'
insert into extracted_facts (agency_id,plan_id,plan_year,benefit_code,value_numeric,
                             frequency,network_scope,verification_status)
values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
        2026,'specialist_copay',45,'per_visit','in_network','verified');

\echo '== MUST SUCCEED: the same benefit at a different network scope is a separate fact'
insert into extracted_facts (agency_id,plan_id,plan_year,benefit_code,value_numeric,
                             frequency,network_scope,verification_status)
values ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444',
        2026,'specialist_copay',60,'per_visit','out_of_network','verified');

\echo '== MUST FAIL: a chunk whose plan_year disagrees with its plan'
insert into document_chunks (document_id,agency_id,page_number,chunk_index,text,plan_id,plan_year)
select null,'11111111-1111-1111-1111-111111111111',1,0,'x',
       '44444444-4444-4444-4444-444444444444',2027;

\echo '== plan_benefits exposes only verified, non-superseded facts'
select benefit_code, value_numeric, frequency, network_scope
from plan_benefits where plan_id = '44444444-4444-4444-4444-444444444444'
order by network_scope;

\echo '== cleanup'
delete from extracted_facts where plan_id = '44444444-4444-4444-4444-444444444444';
delete from plans where contract_id = 'H9999';
delete from app_users where agency_id = '11111111-1111-1111-1111-111111111111';
delete from carriers where short_name = 'UHC_TEST';
delete from agencies where id = '11111111-1111-1111-1111-111111111111';
