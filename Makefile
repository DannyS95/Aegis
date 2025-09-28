.PHONY: up down logs build sh migrate npx restart

# ... your existing targets ...

# Run arbitrary npx commands inside the backend container
# Usage:
#   make npx cmd="prisma init"
#   make npx cmd="prisma migrate dev"
#   make npx cmd="eslint src"

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

restart:
	docker compose restart $(service)

sh:
	docker compose exec $(service) sh

migrate:
	docker compose exec backend npx prisma migrate dev --name $(name) --schema=prisma/schema.prisma

exec:
	docker compose exec backend $(cmd)