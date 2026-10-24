.DEFAULT_GOAL := help
-include .env
POSTGRES_PORT ?= 5432
UV := cd backend && uv run
TEST_DATABASE_URL ?= postgresql+asyncpg://mpanampy:mpanampy@localhost:$(POSTGRES_PORT)/mpanampy_test

.PHONY: help up watch down logs migrate revision test lint format web web-types eval

help: ## List available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

up: ## Start the full stack in the background
	docker compose up -d --build

watch: ## Start the stack with live sync of backend code
	docker compose up --build --watch

down: ## Stop the stack
	docker compose down

logs: ## Follow API and worker logs
	docker compose logs -f api worker

migrate: ## Apply database migrations
	docker compose run --rm migrate

revision: ## Create a migration: make revision m="add users"
	$(UV) alembic revision --autogenerate -m "$(m)"

test: ## Run backend (needs the db container) and frontend tests
	cd backend && TEST_DATABASE_URL=$(TEST_DATABASE_URL) uv run pytest
	cd frontend && npm test

lint: ## Lint, type-check and check formatting
	$(UV) ruff check . && $(UV) ruff format --check .
	cd frontend && npm run lint && npm run typecheck && npm run format:check

format: ## Auto-format and fix lint issues
	$(UV) ruff format . && $(UV) ruff check --fix .
	cd frontend && npm run format

web: ## Start the Next.js dev server on port 3000
	cd frontend && npm run dev

web-types: ## Regenerate frontend API types from the running backend
	cd frontend && npm run api:types

eval: ## Evaluate RAG quality on the sample business (needs GROQ_API_KEY)
	$(UV) python -m eval.run
