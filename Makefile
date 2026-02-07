.DEFAULT_GOAL := help

.PHONY: help bootstrap install env keys generate-jwt-keys db-prepare up down restart logs ps \
        stack-up stack-down stack-restart adminer-up shell exec npx \
        sh generate migrate migrate-deploy seed test build

# Defaults (service=... kept for backward compatibility)
service ?= backend
COMPOSE ?= docker compose

help:
	@echo "Aegis backend workflow"
	@echo ""
	@echo "First run"
	@echo "  make bootstrap      # one-shot setup: env, keys, stack-up, prisma generate, migrations, seed"
	@echo "  make install        # alias for bootstrap"
	@echo ""
	@echo "Daily use"
	@echo "  make up [service=backend]"
	@echo "  make down [service=backend]"
	@echo "  make restart [service=backend]"
	@echo "  make logs [service=backend]"
	@echo "  make shell [service=backend]"
	@echo "  make stack-up       # postgres + redis + backend + proxy"
	@echo "  make stack-down"
	@echo ""
	@echo "Database/backend"
	@echo "  make generate"
	@echo "  make migrate name=<migration_name>"
	@echo "  make migrate-deploy"
	@echo "  make seed"
	@echo "  make test"
	@echo ""
	@echo "Advanced"
	@echo "  make exec cmd=\"npm run lint\""
	@echo "  make npx cmd=\"prisma studio\""
	@echo "  make adminer-up"
	@echo "  make ps"

install: bootstrap

bootstrap: env keys stack-up db-prepare
	@echo "Bootstrap complete. API should be reachable at http://localhost:4000"

env:
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		echo "Created backend/.env from backend/.env.example"; \
	else \
		echo "backend/.env already exists"; \
	fi

keys:
	@if [ ! -f backend/.env ]; then \
		echo "backend/.env missing. Run 'make env' first."; \
		exit 1; \
	fi
	@if [ "$(force)" = "1" ] || ! grep -q '^JWT_PRIVATE_KEY=' backend/.env || grep -q '^JWT_PRIVATE_KEY=.*\\.\\.\\.' backend/.env || ! grep -q '^JWT_PUBLIC_KEY=' backend/.env || grep -q '^JWT_PUBLIC_KEY=.*\\.\\.\\.' backend/.env; then \
		echo "Generating JWT keys..."; \
		bash backend/scripts/generate-jwt-keys.sh backend/.env; \
	else \
		echo "JWT keys already set. Use 'make keys force=1' to regenerate."; \
	fi

generate-jwt-keys: keys

db-prepare: generate migrate-deploy seed

ps:
	$(COMPOSE) ps

up:
	$(COMPOSE) up -d $(service)

down:
	$(COMPOSE) stop $(service)

restart:
	$(COMPOSE) restart $(service)

logs:
	$(COMPOSE) logs -f $(service)

stack-up:
	$(COMPOSE) up -d postgres redis backend proxy

stack-down:
	$(COMPOSE) down

stack-restart:
	$(COMPOSE) stop proxy backend redis postgres
	$(COMPOSE) up -d postgres redis backend proxy

adminer-up:
	$(COMPOSE) up -d adminer

shell:
	$(COMPOSE) exec $(service) sh

sh: shell

exec:
	@test -n "$(cmd)" || (echo "Usage: make exec cmd=\"<command>\"" && exit 1)
	$(COMPOSE) exec backend sh -lc "$(cmd)"

npx:
	@test -n "$(cmd)" || (echo "Usage: make npx cmd=\"<npx command>\"" && exit 1)
	$(COMPOSE) exec backend npx $(cmd)

build:
	$(COMPOSE) build $(service)

generate:
	$(COMPOSE) exec backend npx prisma generate --schema=prisma/schema.prisma

migrate:
	@test -n "$(name)" || (echo "Usage: make migrate name=<migration_name>" && exit 1)
	$(COMPOSE) exec backend npx prisma migrate dev --name $(name) --schema=prisma/schema.prisma

migrate-deploy:
	$(COMPOSE) exec backend npx prisma migrate deploy --schema=prisma/schema.prisma

seed:
	$(COMPOSE) exec backend npm run seed

test:
	$(COMPOSE) exec backend npm test -- --runInBand
