# Aegis Backend

Welcome to the NestJS service that powers the Aegis chat system. Even if you have never touched Nest before, this guide should be enough to get you running, understand the moving parts, and issue authenticated requests.

---

## 1. Quick Start

1. **Prerequisites**
   - Docker + Docker Compose
   - Make (comes with most UNIX-like systems)
   - OpenSSL & Python 3 (used by the key-generation script)

2. **Bootstrap the environment**
   ```bash
   cp backend/.env.example backend/.env
   make generate-jwt-keys   # create RSA keys and store them in .env
   make stack-up            # start nginx proxy + backend + Postgres + Redis
   make generate            # generate Prisma client inside the container
   make migrate-deploy      # apply pending Prisma migrations
   make seed                # populate dev users (alice, bob, charlie)
   make up service=adminer  # (optional) launch Adminer at http://localhost:8080
   make logs                # tail backend logs (Ctrl+C to stop)
   ```

   > Adminer connects to the same Postgres instance (default credentials `aegis` / `aegis`). Start it only when you need a browser UI on http://localhost:8080.

3. **Verify the API is up**
   - Backend listens inside Docker on port `3000`
   - Docker maps that to `http://localhost:4000`
   - Hit `GET http://localhost:4000/users/me` with a valid token (steps below)

4. **Tear down when finished**
   ```bash
   make stack-down
   ```

> **Heads up:** `make stack-up` ensures the nginx proxy runs. If you only run `make up`, the backend listens on port 3000 but `http://localhost:4000` (through nginx) will fail.

### If something looks stuck

When the proxy or Prisma client gets out of sync (e.g. login stops working), recycle the stack and regenerate the client:
```bash
make stack-down
make stack-up
make generate
```
Give Nest a few seconds to boot, then retry your request.

---

## 2. Project at a Glance

| Piece | Description | Where |
| --- | --- | --- |
| NestJS app | HTTP controllers + guards + dependency injection | `backend/src` |
| Prisma | Type-safe database access for Postgres | `backend/prisma` |
| Redis | Caching/ephemeral state (ready for chat features) | Docker service |
| Auth | Locally signed RSA JWTs (no external provider) | `backend/src/auth` |

Helpful Nest concepts (no deep dive required):

- **Controllers** handle HTTP routes (e.g. `AuthController`, `UsersController`).
- **Services** hold business logic (issued tokens, load users, etc.).
- **Guards** run before controllers and allow/deny requests (for example, `JwtAuthGuard` under `auth/framework/nest/guards`).
- **Modules** group related controllers/services and wire up dependencies.

---

## 3. How Authentication Works

1. **Key material**
   - `make generate-jwt-keys` uses OpenSSL to generate an RSA keypair.
   - Keys are written into `.env` as escaped strings (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`).
   - `make restart` reloads the environment so Nest picks up the new values.

2. **Issuing tokens**
   - `POST /auth/login`
     - Sends `{ "username": "alice" }` or `{ "email": "alice@example.com" }`.
     - Users must exist in Postgres (seeded via `make seed`).
     - Successful login issues a JWT with `sub=<user.id>` and includes username/email in the claims.
   - `POST /auth/token`
     - For service-to-service access.
     - Protected behind the reverse proxy; requires Basic auth credentials.
       - Configure via `TOKEN_PROXY_USER` / `TOKEN_PROXY_PASS` environment variables before starting Docker (defaults: `internal` / `changeme`).
         ```bash
         export TOKEN_PROXY_USER=internal
         export TOKEN_PROXY_PASS='changeme'
         docker compose up -d proxy backend
         ```
       - Include an `Authorization: Basic ...` header on requests to `/auth/token` using those credentials.
     - You can supply `subject`, `scope`, and `role`; otherwise the service issues a token with sensible defaults (`sub=service:local`, `scope=internal`).

3. **Token structure**
   - Signed with RS256 (private key from `.env`).
   - Includes issuer (`JWT_ISSUER`), audience (`JWT_AUDIENCE`), and expiry (`JWT_ACCESS_TOKEN_TTL`).
   - Guard verifies signature + claims, then exposes `request.user` to controllers (`id`, `role`, `scope`, plus any additional claims).

4. **Using the token**
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"alice"}' \
     | jq -r '.accessToken')

   curl http://localhost:4000/users/me \
     -H "Authorization: Bearer $TOKEN"
   ```

---

## 4. Common Make Targets

| Command | Purpose |
| --- | --- |
| `make stack-up` | Start nginx proxy + backend (Postgres/Redis start via dependencies) |
| `make stack-down` | Stop nginx proxy + backend (and the dependent services) |
| `make up` | Start only the selected service (defaults to backend) |
| `make down` | Stop only the selected service |
| `make restart` | Restart the selected service (defaults to backend) |
| `make logs service=backend` | Stream Docker logs for a service |
| `make exec cmd="bash"` | Open a shell inside the backend container |
| `make migrate name=create_users` | Run `prisma migrate dev` inside Docker |
| `make generate` | Run `prisma generate` inside the backend container |
| `make migrate-deploy` | Apply all pending migrations in the current database |
| `make seed` | Run `prisma db seed` to populate dev users |
| `make generate-jwt-keys` | Generate RSA keys and update `.env` |

Behind the scenes the backend container runs `npm run start:dev`, so code changes refresh automatically.

---

## 5. Environment Variables Reference

| Variable | Purpose |
| --- | --- |
| `PORT` | Nest listen port inside the container (`3000` default) |
| `NODE_ENV` | Runtime mode (`development`, `production`, `test`) |
| `FRONTEND_ORIGIN` | Allowed origin for browser requests (defaults to `http://localhost:3000`) |
| `DATABASE_URL` | Postgres connection string for Prisma |
| `REDIS_URL` | Redis connection URI |
| `JWT_ISSUER` | `iss` claim for new tokens |
| `JWT_AUDIENCE` | `aud` claim enforced by the guard |
| `JWT_ACCESS_TOKEN_TTL` | Token lifetime in seconds |
| `JWT_PRIVATE_KEY` | RSA private key (escaped PEM) |
| `JWT_PUBLIC_KEY` | RSA public key (escaped PEM) |

You can regenerate keys anytime with `make generate-jwt-keys`; just remember to restart the backend afterwards.

---

## 6. Testing & Quality Checks

| Command | Description |
| --- | --- |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Execute e2e suite (if present) |
| `npm run test:cov` | Unit tests with coverage |
| `npm run lint` | ESLint with autofix (`--fix`) |

> **Heads-up:** ESLint currently complains about a missing `test/app.e2e-spec.ts` in the tsconfig. Either add the file or adjust the lint config before relying on CI linting.

---

## 7. Architecture Roadmap

- Add a `POST /users` endpoint to seed accounts.
- Flesh out conversation/message CRUD and hook Redis into real-time features.
- Replace frontend mocks with REST calls (React Query integration).
- Expand auth once real user identities are introduced (e.g. reset flows, refresh tokens, external IdP).

Questions? Open an issue or ping the team. Happy hacking!
