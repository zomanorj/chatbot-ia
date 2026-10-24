.DEFAULT_GOAL := help
UV := cd backend && uv run

.PHONY: help up watch down logs migrate revision test lint format

help: ## List available commands
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

up: ## Start the full stack in the background
	docker compose up -d --build

watch: ## Start the stack with live sync of backend code
	docker compose up --build --watch

down: ## Stop the stack
	docker compose down

logs: ## Follow API logs
	docker compose logs -f api

migrate: ## Apply database migrations
	docker compose run --rm migrate

revision: ## Create a migration: make revision m="add users"
	$(UV) alembic revision --autogenerate -m "$(m)"

test: ## Run backend tests
	$(UV) pytest

lint: ## Lint and check formatting
	$(UV) ruff check . && $(UV) ruff format --check .

format: ## Auto-format and fix lint issues
	$(UV) ruff format . && $(UV) ruff check --fix .
