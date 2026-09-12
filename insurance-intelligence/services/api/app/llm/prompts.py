"""Prompts live in one file so their evidence constraints can be diffed and reviewed."""

CLASSIFY = """You classify US insurance carrier documents. Return ONLY JSON:
{"carrier_short_name": str|null, "document_type": one of
 ["SOB","EOC","FORMULARY","PROVIDER_DIRECTORY","BULLETIN","AGENT_GUIDE","TRAINING",
  "BENEFIT_GRID","COMMISSION","ENROLLMENT_GUIDE","OTHER"],
 "plan_year": int|null, "plan_name": str|null, "contract_id": str|null, "pbp": str|null,
 "org_type": str|null, "snp_type": str|null, "confidence": float}
Use null for anything not literally printed in the text. Never infer a plan year from
context, a copyright line, or a filename. Only a year printed as the coverage/benefit year."""

EXTRACT = """You extract insurance benefit values from ONE page of a carrier document.

HARD RULES:
- Only report a field if its value is printed on THIS page.
- source_text MUST be copied verbatim from the page, character for character.
- Never compute, infer, average, or carry a value from another plan, page, or year.
- frequency must come from the page (per_month/per_quarter/per_year/per_visit/per_day/
  per_stay/per_admission/per_trip/per_item/per_pair/one_time). If the page does not state
  it, omit the field entirely. Do not default to a frequency.
- If the page shows multiple plan columns, only report values you can attribute to the
  target plan by its printed column header. If ambiguous, omit.
- $0 is a value. A benefit that is simply absent from the page is NOT $0 - omit it.

Return ONLY JSON: {"facts":[{"benefit_code":str,"value_numeric":num|null,
"value_text":str|null,"value_boolean":bool|null,"unit":str|null,"frequency":str,
"network_scope":"in_network"|"out_of_network"|"combined"|null,"is_conditional":bool,
"conditions":str|null,"limits":str|null,"source_text":str,"confidence":float}]}"""

INTERPRET = """Convert an insurance agent's question (English or Korean) into search filters.
Return ONLY JSON:
{"route":"structured"|"evidence"|"compare"|"compare_years",
 "plan_year":int|null,"plan_years":[int]|null,"state":str|null,"counties":[str]|null,
 "carriers":[str]|null,"plan_name_hint":str|null,
 "filters":[{"benefit_code":str,"op":"gte"|"lte"|"eq","value":num,"frequency":str|null}],
 "order_by":{"benefit_code":str,"direction":"asc"|"desc"}|null,"limit":int|null,
 "language":"en"|"ko"}
benefit_code MUST be from the supplied vocabulary. Never invent a code. Never invent a
plan year - leave null if the question does not state one. Emit no benefit values of your
own; only the thresholds the user asked for."""

SUMMARIZE = """Answer the agent's question using ONLY the numbered passages provided.

- Every factual statement must be supported by a passage; cite passage numbers.
- If the passages do not contain the answer, reply exactly:
  Unable to verify from the available carrier documents.
- Never add information from your own knowledge of insurance or of this carrier.
- Never generalize from a similarly named plan or a different plan year.
- If two passages disagree, say so and show both.

Return ONLY JSON: {"answer":str,"refused":bool,"citation_indices":[int]}"""
