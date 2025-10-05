# Aegis Backend

NestJS backend for the Aegis chat system. It exposes REST APIs, persists data with Postgres via Prisma, and uses Redis for ephemeral features. Auth is handled with locally issued JWTs signed via JOSE.

## Stack
- NestJS 10 (REST controllers, guards, dependency injection)
- Prisma ORM targeting Postgres 16
- Redis 7 for caching and transient chat state
- JOSE (local RSA JWTs)
- Docker Compose for local orchestration

## What Works Today
- Docker Compose stack with backend, Postgres, and Redis containers
- Prisma schema defined with models: `User`, `Conversation`, `Participant`, `Message`, `Emoji`
  - Explicit many-to-many: `User` ↔ `Conversation` via `Participant`
  - Implicit many-to-many: `Message` ↔ `Emoji`, `User` ↔ `BlockedUsers`
- First Prisma migration applied; schema matches the database
- `PrismaModule` and `PrismaService` registered in Nest DI
- `UsersModule` exposing `GET /users` backed by Prisma
- Local JWT guard securing protected endpoints (`JwtAuthGuard`)
- Token issuance endpoint `POST /auth/token`
- Optional credentialed login endpoint `POST /auth/login`
- Makefile helpers: `up`, `down`, `logs`, `exec`, `migrate`, `restart`

## Authentication Setup
1. Copy `.env.example` to `.env` if you have not already.
2. Generate a fresh RSA keypair (and inject it into `.env`) with `make generate-jwt-keys`.
3. Optionally set `LOCAL_AUTH_USERNAME` / `LOCAL_AUTH_PASSWORD` in `.env` to require credentials for `POST /auth/login`.
4. Restart the backend so Nest reloads the updated environment (`make restart`).
5. Issue a token by calling `POST /auth/login` or `POST /auth/token`, then use the returned `accessToken` as a bearer token on guarded routes (e.g. `GET /users/me`).

## Development Workflow
- Use `make up` to start the Docker stack (`docker-compose.yml`)
- The backend container already runs `npm run start:dev`, so hot reload happens automatically once the service is up
- Run migrations through Prisma: `make migrate` (creates & applies)
- Access a shell inside the backend container with `make exec` for ad-hoc commands
- Keep real secrets out of git; copy `.env.example` to `.env` or use Docker env overrides

## Environment Variables
The backend reads from `.env` (mounted into Docker). Set these before starting:

| Variable | Purpose |
| --- | --- |
| `PORT` | Nest listening port (defaults to `3000`) |
| `NODE_ENV` | Environment name (`development`, `test`, `production`) |
| `DATABASE_URL` | Postgres connection string for Prisma |
| `REDIS_URL` | Redis connection URI |
| `JWT_ISSUER` | Issuer claim embedded in locally minted tokens |
| `JWT_AUDIENCE` | Audience claim expected by the guard |
| `JWT_ACCESS_TOKEN_TTL` | Lifetime (seconds) for issued access tokens |
| `JWT_PRIVATE_KEY` | PEM-encoded RSA private key used for signing |
| `JWT_PUBLIC_KEY` | PEM-encoded RSA public key used for verification |
| `LOCAL_AUTH_USERNAME` | Optional username required by `POST /auth/login` |
| `LOCAL_AUTH_PASSWORD` | Optional password required by `POST /auth/login` |
| `LOCAL_AUTH_DEFAULT_SUBJECT` | Subject used when issuing tokens without credentials |

Refer to `.env.example` for placeholder values.

## Running Locally
1. Copy `.env.example` to `.env` and fill in real credentials.
2. `make up` (or `docker compose up`) to start Postgres, Redis, and the backend.
3. Inspect logs with `make logs backend` if you need to debug startup issues.
4. API will be available at `http://localhost:4000` (Docker maps host `4000` → container `3000`).

## Testing & Linting
- Unit tests: `npm run test`
- E2E tests: `npm run test:e2e`
- Coverage: `npm run test:cov`
- Lint: `npm run lint`

## Next Steps
1. Add `POST /users` for seeding new accounts.
2. Deliver conversation + message CRUD endpoints.
3. Replace frontend mocks with real REST calls (React Query).
4. Extend Redis usage for typing indicators and delivery receipts.
