.PHONY: up down logs build sh migrate migrate-deploy npx generate-jwt-keys stack-up stack-down stack-restart generate seed start-debug

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

generate:
	docker compose run --rm backend sh -lc "npx prisma generate --schema=prisma/schema.prisma"

migrate-deploy:
	docker compose exec backend npx prisma migrate deploy --schema=prisma/schema.prisma

seed:
	docker compose exec backend npm run seed

start-debug:
	docker compose exec backend sh -lc "npx prisma generate && npm run build && PORT=4000 node --inspect=0.0.0.0:9229 dist/main.js"

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

test:
	cd backend && npm test -- --runInBand
