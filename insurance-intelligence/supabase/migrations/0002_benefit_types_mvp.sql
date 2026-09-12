-- MVP ontology: the 20 fields from spec §35. Everything else waits for Stage 2 (§36).
-- label_ko exists so the UI can render Korean WITHOUT a parallel factual database (§4).

insert into benefit_types
 (code, category, label_en, label_ko, value_kind, default_unit, frequency_required, is_mvp, sort_order, notes)
values
 ('plan_type',                'plan',         'Plan Type',                  '플랜 유형',        'text',           null,  false, true, 10,  'HMO / HMO-POS / PPO / PFFS'),
 ('snp_type',                 'plan',         'SNP Type',                   'SNP 유형',         'text',           null,  false, true, 20,  'NONE / DSNP / CSNP / ISNP'),
 ('monthly_premium',          'cost',         'Monthly Plan Premium',       '월 보험료',        'currency',       'USD', true,  true, 30,  'per_month'),
 ('part_b_giveback',          'cost',         'Part B Premium Reduction',   'Part B 환급',      'currency',       'USD', true,  true, 40,  'absent on most plans; absence is a fact, not a zero'),
 ('moop_in_network',          'cost',         'MOOP (In-Network)',          '본인부담 상한 (네트워크 내)','currency','USD', true,  true, 50,  'per_year'),
 ('drug_deductible',          'rx',           'Part D Drug Deductible',     '약제 공제액',      'currency',       'USD', true,  true, 60,  'per_year; may be $0 or tier-limited'),
 ('pcp_copay',                'medical',      'Primary Care Copay',         '주치의 진료비',    'copay_or_coins', 'USD', true,  true, 70,  'per_visit'),
 ('specialist_copay',         'medical',      'Specialist Copay',           '전문의 진료비',    'copay_or_coins', 'USD', true,  true, 80,  'per_visit'),
 ('urgent_care_copay',        'medical',      'Urgent Care Copay',          '긴급진료 비용',    'copay_or_coins', 'USD', true,  true, 90,  'per_visit'),
 ('emergency_room_copay',     'medical',      'Emergency Room Copay',       '응급실 비용',      'copay_or_coins', 'USD', true,  true, 100, 'per_visit; waived if admitted - capture in limits'),
 ('inpatient_hospital',       'medical',      'Inpatient Hospital',         '입원 비용',        'copay_or_coins', 'USD', true,  true, 110, 'per_day vs per_stay is the classic unit error'),
 ('outpatient_hospital',      'medical',      'Outpatient Hospital',        '외래 병원 비용',   'copay_or_coins', 'USD', true,  true, 120, 'per_visit'),
 ('dental_comprehensive_max', 'supplemental', 'Comprehensive Dental Max',   '종합 치과 한도',   'currency',       'USD', true,  true, 130, 'allowance max, NOT the network benefit schedule'),
 ('vision_eyewear_allowance', 'supplemental', 'Eyewear Allowance',          '안경 보조금',      'currency',       'USD', true,  true, 140, 'per_year or per_2_years - capture in limits'),
 ('hearing_aid_allowance',    'supplemental', 'Hearing Aid Allowance',      '보청기 보조금',    'currency',       'USD', true,  true, 150, 'per_ear vs per_pair matters'),
 ('otc_allowance',            'supplemental', 'OTC Allowance',              'OTC 보조금',       'currency',       'USD', true,  true, 160, 'distinct from flex and food. never alias.'),
 ('transportation_trips',     'supplemental', 'Transportation Trips',       '교통 지원 횟수',   'count',          'trip',true,  true, 170, 'one-way vs round trip goes in limits'),
 ('fitness_benefit',          'supplemental', 'Fitness Benefit',            '피트니스 혜택',    'text',           null,  false, true, 180, 'program name e.g. Renew Active / SilverSneakers'),
 ('rx_tier1_preferred_30',    'rx',           'Tier 1 - 30d Preferred',     '1등급 30일 선호약국','copay_or_coins','USD',true,  true, 190, 'per 30-day supply, preferred retail'),
 ('rx_tier2_preferred_30',    'rx',           'Tier 2 - 30d Preferred',     '2등급 30일 선호약국','copay_or_coins','USD',true,  true, 200, 'per 30-day supply, preferred retail')
on conflict (code) do nothing;

-- Stage 2 codes reserved now so no one invents a synonym later (spec §36, §22).
insert into benefit_types (code, category, label_en, label_ko, value_kind, default_unit, frequency_required, is_mvp, sort_order)
values
 ('flex_allowance',  'supplemental', 'Flex Card Allowance', '플렉스 카드 보조금', 'currency','USD', true, false, 1000),
 ('food_allowance',  'supplemental', 'Food/Grocery Benefit','식료품 보조금',      'currency','USD', true, false, 1010),
 ('dental_preventive','supplemental','Preventive Dental',   '예방 치과',          'text',    null,  false,false, 1020)
on conflict (code) do nothing;
