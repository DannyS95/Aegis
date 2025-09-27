# Aegis Chat

A real-time chat application built with **Next.js (App Router)** and **NestJS (backend planned)**. This project is designed for **system design practice**, **portfolio showcase**, and **architecture exploration** (Layered → Event-driven → Hexagonal → CQRS).

---

## 🚀 Features (current UI)

- **Login page** with mock authentication
- **Conversations list** with unread badges, empty state, and skeleton loader
- **Chat window** with message bubbles (avatars, timestamps, read receipts), auto-scroll, typing indicator, empty state, and skeleton loader

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (TypeScript, App Router, Tailwind CSS)
- **State:** React hooks + Context API
- **Backend:** (planned) NestJS + Prisma ORM + PostgreSQL + Redis
- **Infra:** Docker Compose (to run all services)

---

## 📂 Project Structure

- `frontend/` → Next.js app
- `frontend/src/app/` → App Router pages
- `frontend/src/components/` → UI components
- `frontend/src/context/` → React contexts (e.g. `UserContext`)
- `backend/` → NestJS (to be added)
- `docker-compose.yml` → Planned multi-service orchestration

---

## ▶️ Getting Started

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```
2. **Run the dev server**
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

---

## 🔮 Next Steps

- Scaffold the NestJS backend (auth, conversations, messages, WebSocket gateway).
- Replace frontend mocks with real API calls and Socket.io events.
- Add Docker Compose with Next.js + NestJS + PostgreSQL + Redis.

---

## 📜 License

MIT — free to use, modify, and learn from.

