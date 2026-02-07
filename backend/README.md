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
   make bootstrap           # one-shot setup (env + keys + stack + prisma + migrations + seed)
   make up service=adminer  # (optional) launch Adminer at http://localhost:8080
   make logs                # tail backend logs (Ctrl+C to stop)
   ```

   If you prefer explicit steps instead of one-shot bootstrap:
   ```bash
   cp backend/.env.example backend/.env
   make keys
   make stack-up
   make db-prepare
   ```

   > Adminer connects to the same Postgres instance (default credentials `aegis` / `aegis`). Start it only when you need a browser UI on http://localhost:8080.

   > **Tip:** After schema changes run `make generate` and restart your TypeScript server/IDE so the new Prisma types are picked up. If hints still look stale, remove `backend/node_modules/.prisma`, reinstall, then generate again.

   Seeded accounts via `make seed`:
   - `alice@example.com` (username `alice`, role `user`)
   - `bob@example.com` (username `bob`, role `user`)
   - `charlie@example.com` (username `charlie`, role `user`)
   - `admin@example.com` (username `admin`, role `admin`)

3. **Verify the API is up**
   - Backend listens inside Docker on port `3000`
   - Docker maps that to `http://localhost:4000`
   - Hit `GET http://localhost:4000/users/me` with a valid token (steps below)

4. **Tear down when finished**
   ```bash
   make stack-down
   ```

> **Heads up:** `make stack-up` now starts the entire stack (Postgres, Redis, Nest backend, and the nginx proxy). Use `make up service=backend` or `service=proxy` when you only need to bounce Node or nginx without touching the databases.

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
| NestJS app | HTTP controllers + dependency injection | `backend/src` |
| Security | Cross-cutting guards + JWT key material | `backend/src/security` |
| Auth | Token issuance & domain policies | `backend/src/auth` |
| Conversations | REST APIs for conversation lifecycle | `backend/src/conversations` |
| Prisma | Type-safe database access for Postgres | `backend/prisma` |
| Redis | Caching/ephemeral state (ready for chat features) | Docker service |

Helpful Nest concepts (no deep dive required):

- **Controllers** handle HTTP routes (e.g. `AuthController`, `UsersController`).
- **Services** hold business logic (issued tokens, load users, etc.).
- **Guards** run before controllers and allow/deny requests (for example, `JwtAuthGuard` under `security/guards`).
- **Modules** group related controllers/services and wire up dependencies.

### Architectural boundaries

We follow a light Domain-Driven Design approach so each bounded context owns its concerns:

- **Security context** encapsulates cross-cutting concerns (JWT key management and request guards).
- **Auth context** focuses on issuing tokens for trusted actors.
- **Users context** handles profile lookup and domain data access.

Shared infrastructure (Prisma, Redis, HTTP) lives in their own layers so contexts stay decoupled.

### How we build and evolve APIs here

1. **Identify the bounded context.** New behaviour lives inside the domain that owns it (for example, token issuance stays in `auth/`, user read models stay in `users/`). Cross-cutting concerns belong in `security/` or shared utilities.
2. **Model the module.** Each context exposes a Nest module (`*.module.ts`) that assembles its controllers, services, and any Prisma dependencies. Modules are the only units other contexts import.
3. **Design the contract.** Controllers define HTTP routes and simple DTOs, delegating to services for real work. Services encapsulate business rules and talk to Prisma or other providers injected via Nest.
4. **Secure first.** Guards from `security/guards` sit in front of controllers to enforce authentication/authorization. They rely on shared providers like `JwtKeyProvider` so every route validates tokens consistently.
5. **Keep concerns isolated.** When a feature spans contexts (e.g. auth issuing tokens for users), communicate through injected services rather than reaching into another context’s files.
6. **Document and test.** Update this README when architecture changes, and add focused unit tests alongside the controller/service being touched.

Following this flow keeps the codebase aligned with our DDD-lite structure while making it obvious where new APIs should live and how they should be wired.

---

## 3. How Authentication Works

1. **Key material**
   - `make keys` (alias: `make generate-jwt-keys`) uses OpenSSL to generate an RSA keypair.
   - Keys are written into `.env` as escaped strings (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`).
   - `JwtKeyProvider` (in `security/jwt`) loads the PEMs once at boot so both token issuance and guards reuse the same material.
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
| `make stack-up` | Start proxy + backend + Postgres + Redis with one command |
| `make stack-down` | Stop the entire stack (proxy, backend, Postgres, Redis) |
| `make bootstrap` | One-shot first run: create env, generate JWT keys, start stack, generate Prisma client, run migrations, seed users |
| `make up` | Start only the selected service (defaults to backend) |
| `make down` | Stop only the selected service (defaults to backend) |
| `make restart` | Restart the selected service (defaults to backend) |
| `make logs service=backend` | Stream Docker logs for a service |
| `make exec cmd="bash"` | Open a shell inside the backend container |
| `make shell` | Open `sh` inside the selected service container |
| `make migrate name=create_users` | Run `prisma migrate dev` inside Docker |
| `make generate` | Run `prisma generate` inside the backend container |
| `make migrate-deploy` | Apply all pending migrations in the current database |
| `make seed` | Run `prisma db seed` to populate dev users |
| `make keys` | Generate RSA keys and update `.env` |
| `make ps` | Show compose service status |

Behind the scenes the backend container runs `./scripts/dev-entrypoint.sh`, which installs deps when lockfile changes, runs Prisma generate, and starts Nest in watch/debug mode.

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

You can regenerate keys anytime with `make keys force=1`; just remember to restart the backend afterwards.

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

## 7. Conversations API Quick Reference

| Endpoint | Description | Auth |
| --- | --- | --- |
| `POST /conversations` | Create a new DM or group conversation. | Bearer token |
| `GET /conversations` | List conversations for the current user (cursor pagination via `cursor` + `take`). | Bearer token |
| `GET /conversations/:id` | Retrieve conversation metadata and participants. | Bearer token |
| `POST /conversations/:id/participants` | Owners add one or more participants to a group conversation. | Bearer token |
| `DELETE /conversations/:id/participants/:participantId` | Remove a participant (owners remove others; members can leave themselves). | Bearer token |

Rules of thumb:
- Direct messages are limited to two unique participants; we prevent duplicate pairs.
- Group conversations auto-assign the creator as owner and accept an optional title.
- Every route uses `JwtAuthGuard` and checks membership via `@CurrentUser()`.
- Only owners can invite or remove other members; members may only remove themselves.

Future work (tracked in the blueprint) covers PATCH/DELETE, Redis presence, and richer message previews.

---

## 8. Users API Quick Reference

| Endpoint | Description | Auth |
| --- | --- | --- |
| `GET /users` | List all users with basic profile details (admin only). | Bearer token |
| `GET /users/me` | Return the current authenticated user's record. | Bearer token |

Both routes require a valid JWT. The list endpoint is restricted to tokens that carry the `admin` role and returns id/username/email/avatar metadata ordered by creation time.

---

## 9. Architecture Roadmap

- Add a `POST /users` endpoint to seed accounts.
- Flesh out conversation/message CRUD and hook Redis into real-time features.
- Replace frontend mocks with REST calls (React Query integration).
- Expand auth once real user identities are introduced (e.g. reset flows, refresh tokens, external IdP).

Questions? Open an issue or ping the team. Happy hacking!
