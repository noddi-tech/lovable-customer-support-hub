# Support Hub — common development commands
# Usage: make <target>   (run `make help` for the list)

.DEFAULT_GOAL := help

BUN  ?= bun
BUNX ?= bunx
VITE ?= $(BUNX) vite

RUN_DIR   := .run
VITE_PID  := $(RUN_DIR)/vite.pid
VITE_LOG  := $(RUN_DIR)/vite.log
VITE_PORT ?= 8080

.PHONY: help install setup env \
	up down \
	dev start serve preview \
	build build-dev build-widget \
	lint lint-core lint-eslint lint-biome lint-tabs lint-pane lint-all \
	lint-knip lint-deps lint-secrets lint-dupes lint-semgrep lint-audit lint-strict \
	format format-check format-md format-md-check fix fix-unsafe \
	quality-gate quality-gate-check \
	typecheck \
	test test-watch test-coverage test-ui \
	ui-guards \
	e2e e2e-ui \
	docs-api generate generate-openapi generate-edge-functions sync-noddi-schema \
	supabase-start supabase-stop supabase-status supabase-reset supabase-functions \
	supabase-link supabase-db-push supabase-deploy-functions supabase-deploy-function supabase-deploy \
	check ci clean

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "\nTargets:\n"} \
		/^[a-zA-Z0-9_.-]+:.*?##/ { printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@printf "\n"

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

install: ## Install bun dependencies (frozen lockfile)
	$(BUN) install --frozen-lockfile

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

up: ## Start local Supabase + Vite (background)
	@mkdir -p $(RUN_DIR)
	@echo "→ Starting Supabase…"
	@supabase start
	@if [ -f "$(VITE_PID)" ] && kill -0 $$(cat "$(VITE_PID)") 2>/dev/null; then \
		echo "→ Vite already running (pid $$(cat "$(VITE_PID)"))"; \
	else \
		echo "→ Starting Vite on http://localhost:$(VITE_PORT)…"; \
		( $(BUN) run dev >"$(VITE_LOG)" 2>&1 & echo $$! >"$(VITE_PID)" ); \
		sleep 1; \
		if [ -f "$(VITE_PID)" ] && kill -0 $$(cat "$(VITE_PID)") 2>/dev/null; then \
			echo "→ Vite started (pid $$(cat "$(VITE_PID)"), log $(VITE_LOG))"; \
		else \
			echo "× Vite failed to start — see $(VITE_LOG)" >&2; \
			rm -f "$(VITE_PID)"; \
			exit 1; \
		fi; \
	fi
	@echo ""
	@echo "Stack is up:"
	@echo "  App:      http://localhost:$(VITE_PORT)"
	@echo "  Supabase: http://127.0.0.1:54323  (Studio)"
	@echo "  API:      http://127.0.0.1:54321"
	@echo "Stop with:  make down"

down: ## Stop Vite + local Supabase
	@if [ -f "$(VITE_PID)" ]; then \
		pid=$$(cat "$(VITE_PID)"); \
		echo "→ Stopping Vite (pid $$pid)…"; \
		kill $$pid 2>/dev/null || true; \
		pkill -P $$pid 2>/dev/null || true; \
		rm -f "$(VITE_PID)"; \
	fi
	@# Fallback: anything still bound to the Vite port
	@if command -v lsof >/dev/null 2>&1; then \
		ports=$$(lsof -tiTCP:$(VITE_PORT) -sTCP:LISTEN 2>/dev/null || true); \
		if [ -n "$$ports" ]; then \
			echo "→ Freeing port $(VITE_PORT)…"; \
			kill $$ports 2>/dev/null || true; \
		fi; \
	fi
	@echo "→ Stopping Supabase…"
	@supabase stop || true
	@echo "Stack is down."

dev: ## Start Vite dev server (foreground)
	$(BUN) run dev

start: dev ## Alias for dev

serve: dev ## Alias for dev

preview: ## Preview production build (run build first)
	$(BUN) run preview

build: ## Production build
	$(BUN) run build

build-dev: ## Development-mode build
	$(BUN) run build:dev

build-widget: ## Build embeddable widget bundle
	$(VITE) build --config vite.widget.config.ts

# ---------------------------------------------------------------------------
# Linters / formatters
# Hybrid: Biome (JS/TS/JSON format + most lint) + Prettier (Markdown; Biome
# does not format .md yet) + thin ESLint (hooks/refresh + domain rule) +
# domain scripts (tabs/pane).
# ---------------------------------------------------------------------------

lint: ## All linters (Biome, ESLint, tabs, pane, knip, deps, secrets, dupes, semgrep, audit)
	$(BUN) run lint

lint-core: ## Fast path: Biome + ESLint only (warnings fail)
	$(BUN) run lint:core

lint-eslint: ## ESLint only (hooks, react, import-x, type-aware; max-warnings=0)
	$(BUN) run lint:eslint

lint-biome: ## Biome check (warnings fail)
	$(BUN) run lint:biome

lint-tabs: ## Lint unsafe tab/button overflow patterns
	$(BUN) run lint:tabs

lint-pane: ## Lint pane scroll layout anti-patterns
	$(BUN) run lint:pane

lint-all: ## Biome + ESLint + domain linters (tabs/pane)
	$(BUN) run lint:all

lint-knip: ## Unused files / dependencies (Knip)
	$(BUN) run lint:knip

lint-deps: ## Architecture boundaries (dependency-cruiser)
	$(BUN) run lint:deps

lint-secrets: ## Secret scanning (gitleaks or secretlint)
	$(BUN) run lint:secrets

lint-dupes: ## Copy-paste detection (jscpd)
	$(BUN) run lint:dupes

lint-semgrep: ## SAST patterns (semgrep; skips if not installed)
	$(BUN) run lint:semgrep

lint-audit: ## bun audit (critical+)
	$(BUN) run lint:audit

lint-strict: ## Alias for make lint (full suite; kept for older docs/hooks)
	$(BUN) run lint:strict

format: ## Format JS/TS via Biome + Markdown via Prettier
	$(BUN) run format

format-check: ## Check Biome + Markdown formatting without writing (CI)
	$(BUN) run format:check

format-md: ## Format Markdown/MDX with Prettier only
	$(BUN) run format:md

format-md-check: ## Check Markdown/MDX formatting only
	$(BUN) run format:md:check

fix: ## Apply safe autofixes (Biome + ESLint + Prettier Markdown)
	$(BUN) run fix

fix-unsafe: ## Apply autofixes including Biome --unsafe rewrites
	$(BUN) run fix:unsafe

quality-gate: ## Autofix then format-check + lint:core + ui-guards (pre-push)
	$(BUN) run quality:gate

quality-gate-check: ## Verify only (no writes): format-check + lint:core + ui-guards
	$(BUN) run quality:gate:check

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

typecheck: ## TypeScript check (no emit)
	$(BUN) run typecheck

# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

test: ## Run unit/integration tests (Vitest)
	$(BUN) run test

test-watch: ## Run Vitest in watch mode
	$(BUN) run test:watch

test-coverage: ## Run tests with coverage
	$(BUN) run test:coverage

test-ui: ## Run long-labels / tabs UI regression tests
	$(BUN) run test:tabs

ui-guards: ## Pre-commit UI guardrails (tabs lint + long-labels)
	$(BUN) run ui:guards

e2e: ## Run Playwright end-to-end tests
	$(BUNX) playwright test

e2e-ui: ## Run Playwright with interactive UI
	$(BUNX) playwright test --ui

# ---------------------------------------------------------------------------
# Codegen / docs
# ---------------------------------------------------------------------------

docs-api: generate-openapi ## Generate OpenAPI docs (alias)

generate: generate-openapi generate-edge-functions ## Regenerate OpenAPI + edge-function manifest

generate-openapi: ## Generate OpenAPI spec into src/data
	$(BUN) run docs:api

generate-edge-functions: ## Generate edge-functions manifest
	$(BUNX) tsx scripts/generate-edge-functions-manifest.ts

sync-noddi-schema: ## Sync Noddi API schema types
	$(BUNX) tsx scripts/sync-noddi-schema.ts

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
# Supabase (remote deploy)
# Bypasses Lovable's publisher — deploy edge functions + DB migrations
# straight to the linked project from your terminal.
# Requires: supabase CLI installed + `supabase login` done once.
# ---------------------------------------------------------------------------

SUPABASE_PROJECT_REF ?= qgfaycwsangsqzpveoup

supabase-link: ## Link local repo to the remote Supabase project (run once)
	supabase link --project-ref $(SUPABASE_PROJECT_REF)

supabase-db-push: ## Push local migrations to the remote database
	supabase db push

supabase-deploy-functions: ## Deploy ALL edge functions to the remote project
	supabase functions deploy --project-ref $(SUPABASE_PROJECT_REF)

supabase-deploy-function: ## Deploy ONE edge function: make supabase-deploy-function FUNCTION=send-email
	@if [ -z "$(FUNCTION)" ]; then \
		echo "× Set FUNCTION=<name>, e.g. make supabase-deploy-function FUNCTION=send-email" >&2; \
		exit 1; \
	fi
	supabase functions deploy $(FUNCTION) --project-ref $(SUPABASE_PROJECT_REF)

supabase-deploy: supabase-db-push supabase-deploy-functions ## Deploy migrations + all edge functions to remote

# ---------------------------------------------------------------------------
# Aggregate / cleanup
# ---------------------------------------------------------------------------

check: lint-all format-check typecheck test ui-guards ## Full local quality gate

ci: quality-gate-check typecheck test lint-strict ## Approximate local CI (gate + strict suite)

clean: ## Remove build artifacts and caches
	rm -rf dist coverage storybook-static playwright-report test-results
	rm -rf node_modules/.vite node_modules/.cache
