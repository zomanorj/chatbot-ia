# Mpanampy

[![CI](https://github.com/zomanorj/chatbot-ia/actions/workflows/ci.yml/badge.svg?branch=v2)](https://github.com/zomanorj/chatbot-ia/actions/workflows/ci.yml)

**An AI sales assistant for small businesses, trained on their own catalogue and answering customers in French, Malagasy and English, on their website and on Facebook Messenger.**

*Mpanampy* means "helper" in Malagasy.

> **Status:** under active development (v2). The previous version, a streaming chat interface, is live at [chatbot-ia-gilt.vercel.app](https://chatbot-ia-gilt.vercel.app) and its source is on the `main` branch.

## The problem

In Madagascar and across francophone Africa, most small businesses sell through Facebook. Owners spend hours answering the same questions (prices, stock, delivery areas, opening hours) and lose sales outside business hours.

## The solution

1. The business uploads its catalogue, price list or FAQ (PDF, DOCX, CSV, XLSX).
2. Mpanampy indexes the content with retrieval-augmented generation (RAG).
3. The assistant answers customers through an embeddable website widget and Facebook Messenger, and cites its sources.
4. The owner sees captured leads and unanswered questions in a dashboard, and can improve the assistant in one click.

## Architecture

```
            ┌──────────────┐      ┌──────────────┐
            │  Dashboard   │      │    Widget    │◄── customer websites
            │  (Next.js)   │      │  (Vite, TS)  │
            └──────┬───────┘      └──────┬───────┘
                   │      HTTPS / SSE    │          Facebook Messenger
                   ▼                     ▼                 │ webhooks
            ┌─────────────────────────────────────┐        │
            │              FastAPI                │◄───────┘
            └──────┬──────────────┬───────────────┘
                   │              │ jobs
                   ▼              ▼
       ┌───────────────────┐  ┌────────┐  ┌──────────────────┐
       │ PostgreSQL        │  │ Redis  │◄─┤ Ingestion worker │
       │ + pgvector        │  └────────┘  └──────────────────┘
       └───────────────────┘
```

## Tech stack

| Layer | Technologies |
|-------|--------------|
| API | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Data | PostgreSQL 18, pgvector, Redis 8 |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query |
| Tooling | uv, Ruff, pytest, Vitest, ESLint, Prettier, Docker Compose, GitHub Actions, pre-commit |

## Repository layout

```
.
├── backend/              FastAPI service
│   ├── app/
│   │   ├── api/          HTTP routes and dependencies
│   │   ├── core/         Settings, security, errors, rate limiting
│   │   ├── db/           SQLAlchemy base, session and column types
│   │   ├── models/       ORM models
│   │   ├── schemas/      Request and response models
│   │   └── services/     Business logic: auth, bots, chat, LLM provider
│   ├── alembic/          Database migrations
│   └── tests/
├── frontend/             Next.js dashboard and landing page
│   └── src/
│       ├── app/          Routes: landing, auth, dashboard, assistants
│       ├── components/   UI, chat and dashboard components
│       ├── hooks/        Data and chat state hooks
│       └── lib/          Typed API client, SSE parser
├── compose.yaml          Local stack: Postgres, Redis, migrations, API
└── Makefile              Common commands
```

## Getting started

**Requirements:** Docker with Compose v2, Node.js 24, and [uv](https://docs.astral.sh/uv/getting-started/installation/) to run tooling outside containers.

```bash
cp backend/.env.example backend/.env       # then set SECRET_KEY and GROQ_API_KEY
make up                                   # API, PostgreSQL, Redis

(cd frontend && cp .env.example .env.local && npm install)
make web                                  # dashboard on http://localhost:3000
```

The API listens on `http://localhost:8000`, with interactive documentation at `/docs` (disabled in production). If a port is already taken on your machine, copy `.env.example` to `.env` at the repository root and change `POSTGRES_PORT`, `REDIS_PORT` or `API_PORT`.

Set `GROQ_API_KEY` in `backend/.env` to enable chat ([get a key](https://console.groq.com/keys)). Open `http://localhost:3000`, create an account, then an assistant, and test it in its **Tester** tab.

### API overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/register` | Create an account and its organization |
| `POST /api/v1/auth/login` | Open a session |
| `POST /api/v1/auth/refresh` | Rotate the refresh cookie and get a new access token |
| `POST /api/v1/auth/logout` | Revoke the session |
| `GET  /api/v1/auth/me` | Current user and organizations |
| `GET, POST /api/v1/bots` | List or create assistants |
| `GET, PATCH, DELETE /api/v1/bots/{id}` | Read, update or delete an assistant |
| `GET  /api/v1/bots/{id}/conversations` | Latest conversations of an assistant |
| `GET, DELETE /api/v1/bots/{id}/conversations/{cid}` | Read or delete a conversation |
| `POST /api/v1/bots/{id}/chat` | Send a message and stream the reply (SSE) |
| `GET  /api/v1/chat/models` | Available language models |
| `GET  /api/v1/health`, `/health/ready` | Liveness and readiness probes |

### Authentication and tenancy

- Passwords are hashed with Argon2 ([pwdlib](https://frankie567.github.io/pwdlib/)). Unknown emails still run a hash check, so response times do not reveal which accounts exist.
- Access tokens are short-lived JWTs (15 minutes) kept in memory by the dashboard and sent as `Authorization: Bearer`.
- Refresh tokens are opaque, single-use, stored as SHA-256 hashes and delivered in an `httpOnly` cookie scoped to `/api/v1/auth`. Replaying a used token revokes every session of the user. The dashboard serializes refreshes across tabs with the Web Locks API.
- Every resource belongs to an organization. Requests are scoped to the caller's organization (or the one named in `X-Organization-ID`), and resources of other organizations answer `404`, never `403`, so their existence is not disclosed.

### Streaming protocol

`POST /api/v1/bots/{id}/chat` takes `{"content": "...", "conversation_id": null, "model": null}`. Without `conversation_id`, a new conversation is created. The user message is stored before streaming starts, and the reply is stored when it ends, including partial replies when the client disconnects. Events:

| Event | Payload | Meaning |
|-------|---------|---------|
| `conversation` | `{"id": "...", "title": "..."}` | Conversation the turn belongs to |
| `token` | `{"text": "..."}` | Next fragment of the reply |
| `done` | `{"model": "...", "message_id": "..."}` | Reply completed and stored |
| `error` | `{"code": "...", "message": "..."}` | Provider failure, the stream ends |

Errors raised before streaming starts use HTTP status codes and a single envelope:

```json
{ "error": { "code": "rate_limited", "message": "Too many requests. Please try again later." } }
```

| Status | Codes |
|--------|-------|
| 401 | `not_authenticated`, `invalid_credentials`, `invalid_session` |
| 403 | `organization_forbidden` |
| 404 | `bot_not_found`, `conversation_not_found` |
| 409 | `email_taken` |
| 422 | `validation_error`, `unknown_model` |
| 429 | `rate_limited`, with `Retry-After` |
| 503 | `llm_not_configured` |

### Design system

The interface uses [Geist](https://vercel.com/font) for text and code, and a palette defined as OKLCH tokens in `frontend/src/app/globals.css`, with light and dark variants:

| Token | Role |
|-------|------|
| `primary` | Emerald, brand and primary actions |
| `highlight` | Vanilla amber, positive signals such as new leads |
| `muted`, `accent` | Neutrals tinted toward the brand hue |
| `success`, `destructive` | System states |

Icons come from [Lucide](https://lucide.dev).

### Development

```bash
make watch      # live code sync into the API container
make test       # backend tests run against PostgreSQL (database mpanampy_test, created automatically)
make lint       # Ruff lint and format check
make revision m="describe change"   # new Alembic migration
make web-types  # regenerate typed API client after backend changes
```

Install the git hooks once with `uvx pre-commit install`.

## Roadmap

- [x] Foundations: monorepo, containers, health checks, CI
- [x] Streaming chat API
- [x] Next.js dashboard
- [x] Accounts and multi-tenant isolation
- [ ] Document ingestion and RAG with source citations
- [ ] Embeddable website widget
- [ ] Facebook Messenger integration
- [ ] Analytics: leads and unanswered questions
- [ ] Production deployment

## License

MIT
