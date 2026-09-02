# Support Hub — common development commands
# Usage: make <target>   (run `make help` for the list)

.DEFAULT_GOAL := help

NPM  ?= npm
NPX  ?= npx
VITE ?= $(NPX) vite

.PHONY: help install setup env \
	dev start serve preview \
	build build-dev build-widget \
	lint lint-eslint lint-biome lint-tabs lint-pane lint-all \
	format format-check format-md format-md-check fix fix-unsafe \
	quality-gate quality-gate-check \
	typecheck \
	test test-watch test-coverage test-ui \
	ui-guards \
	e2e e2e-ui \
	docs-api generate generate-openapi generate-edge-functions sync-noddi-schema \
	supabase-start supabase-stop supabase-status supabase-reset supabase-functions \
	check ci clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nTargets:\n"} \
		/^[a-zA-Z0-9_.-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@printf "\n"

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

install: ## Install npm dependencies
	$(NPM) ci --legacy-peer-deps

setup: install env ## Install deps and ensure .env exists

env: ## Create .env from .env.example if missing
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example — fill in Supabase values."; \
	else \
		echo ".env already exists."; \
	fi

# ---------------------------------------------------------------------------
# App / service
# ---------------------------------------------------------------------------

dev: ## Start Vite dev server
	$(NPM) run dev

start: dev ## Alias for dev

serve: dev ## Alias for dev

preview: ## Preview production build (run build first)
	$(NPM) run preview

build: ## Production build
	$(NPM) run build

build-dev: ## Development-mode build
	$(NPM) run build:dev

build-widget: ## Build embeddable widget bundle
	$(VITE) build --config vite.widget.config.ts

# ---------------------------------------------------------------------------
# Linters / formatters
# Hybrid: Biome (JS/TS/JSON format + most lint) + Prettier (Markdown; Biome
# does not format .md yet) + thin ESLint (hooks/refresh + domain rule) +
# domain scripts (tabs/pane).
# ---------------------------------------------------------------------------

lint: ## Biome (error-level) + thin ESLint
	$(NPM) run lint

lint-eslint: ## Thin ESLint only (hooks + domain AST rule)
	$(NPM) run lint:eslint

lint-biome: ## Biome check (error-level; warnings allowed)
	$(NPM) run lint:biome

lint-tabs: ## Lint unsafe tab/button overflow patterns
	$(NPM) run lint:tabs

lint-pane: ## Lint pane scroll layout anti-patterns
	$(NPM) run lint:pane

lint-all: lint lint-tabs lint-pane ## Biome + ESLint + domain linters

format: ## Format JS/TS via Biome + Markdown via Prettier
	$(NPM) run format

format-check: ## Check Biome + Markdown formatting without writing (CI)
	$(NPM) run format:check

format-md: ## Format Markdown/MDX with Prettier only
	$(NPM) run format:md

format-md-check: ## Check Markdown/MDX formatting only
	$(NPM) run format:md:check

fix: ## Apply safe autofixes (Biome + ESLint + Prettier Markdown)
	$(NPM) run fix

fix-unsafe: ## Apply autofixes including Biome --unsafe rewrites
	$(NPM) run fix:unsafe

quality-gate: ## Autofix then format-check + lint + ui-guards (pre-commit/push)
	$(NPM) run quality:gate

quality-gate-check: ## Verify only (no writes): format-check + lint + ui-guards
	$(NPM) run quality:gate:check

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

typecheck: ## TypeScript check (no emit)
	$(NPM) run typecheck

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

test: ## Run unit/integration tests (Vitest)
	$(NPM) run test

test-watch: ## Run Vitest in watch mode
	$(NPM) run test:watch

test-coverage: ## Run tests with coverage
	$(NPM) run test:coverage

test-ui: ## Run long-labels / tabs UI regression tests
	$(NPM) run test:tabs

ui-guards: ## Pre-commit UI guardrails (tabs lint + long-labels)
	$(NPM) run ui:guards

e2e: ## Run Playwright end-to-end tests
	$(NPX) playwright test

e2e-ui: ## Run Playwright with interactive UI
	$(NPX) playwright test --ui

# ---------------------------------------------------------------------------
# Codegen / docs
# ---------------------------------------------------------------------------

docs-api: generate-openapi ## Generate OpenAPI docs (alias)

generate: generate-openapi generate-edge-functions ## Regenerate OpenAPI + edge-function manifest

generate-openapi: ## Generate OpenAPI spec into src/data
	$(NPM) run docs:api

generate-edge-functions: ## Generate edge-functions manifest
	$(NPX) tsx scripts/generate-edge-functions-manifest.ts

sync-noddi-schema: ## Sync Noddi API schema types
	$(NPX) tsx scripts/sync-noddi-schema.ts

# ---------------------------------------------------------------------------
# Supabase (local)
# ---------------------------------------------------------------------------

supabase-start: ## Start local Supabase stack
	supabase start

supabase-stop: ## Stop local Supabase stack
	supabase stop

supabase-status: ## Show local Supabase status
	supabase status

supabase-reset: ## Reset local DB (re-apply migrations)
	supabase db reset

supabase-functions: ## Serve edge functions locally
	supabase functions serve

# ---------------------------------------------------------------------------
# Aggregate / cleanup
# ---------------------------------------------------------------------------

check: lint-all format-check typecheck test ui-guards ## Full local quality gate

ci: lint format-check typecheck ui-guards test build ## Approximate local CI gate

clean: ## Remove build artifacts and caches
	rm -rf dist coverage storybook-static playwright-report test-results
	rm -rf node_modules/.vite node_modules/.cache
