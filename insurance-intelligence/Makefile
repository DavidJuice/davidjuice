.PHONY: install api web test bench lint migrate seed

install:
	pip install -e 'services/api[dev]'
	cd apps/web && npm install

migrate:
	psql "$$DATABASE_URL" -f supabase/migrations/0001_init.sql
	psql "$$DATABASE_URL" -f supabase/migrations/0002_benefit_types_mvp.sql

seed:
	python scripts/seed_dev.py

api:
	uvicorn app.main:app --reload --app-dir services/api --port 8000

web:
	cd apps/web && npm run dev

test:
	python -m pytest

bench:
	python tests/benchmark/run_benchmark.py

lint:
	ruff check services/api tests scripts
