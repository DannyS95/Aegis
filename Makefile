.PHONY: up down logs build sh migrate npx restart generate-jwt-keys

# ... your existing targets ...

# Run arbitrary npx commands inside the backend container
# Usage:
#   make npx cmd="prisma init"
#   make npx cmd="prisma migrate dev"
#   make npx cmd="eslint src"

restart:
	docker compose stop $(service)
	docker compose up -d $(service)

npx:
	docker compose exec backend npx $(cmd)

service ?= backend

up:
	docker compose up -d $(service)

down:
	docker compose down $(service)

logs:
	docker compose logs -f $(service)

build:
	docker compose build $(service)

generate-jwt-keys:
	bash backend/scripts/generate-jwt-keys.sh backend/.env

sh:
	docker compose exec $(service) sh

migrate:
	docker compose exec backend npx prisma migrate dev --name $(name) --schema=prisma/schema.prisma

redis-exec:
	docker compose exec redis sh -lc "$(cmd)"

redis-ping:
	docker compose exec redis sh -lc "redis-cli ping"

exec:
	docker compose exec backend $(cmd)

stack-up:
	docker compose up -d proxy backend

stack-down:
	docker compose down proxy backend

stack-restart:
	docker compose stop proxy backend
	docker compose up -d proxy backend
