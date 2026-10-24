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
│   │   ├── core/         Settings
│   │   ├── db/           SQLAlchemy base and session
│   │   └── schemas/      Pydantic models
│   ├── alembic/          Database migrations
│   └── tests/
├── frontend/             Next.js dashboard and landing page
│   └── src/
│       ├── app/          Routes: landing, dashboard, playground
│       ├── components/   UI, chat and dashboard components
│       ├── hooks/        Data and chat state hooks
│       └── lib/          Typed API client, SSE parser
├── compose.yaml          Local stack: Postgres, Redis, migrations, API
└── Makefile              Common commands
```

## Getting started

**Requirements:** Docker with Compose v2, Node.js 24, and [uv](https://docs.astral.sh/uv/getting-started/installation/) to run tooling outside containers.

```bash
cp backend/.env.example backend/.env
make up                                   # API, PostgreSQL, Redis

cd frontend && cp .env.example .env.local && npm install
make web                                  # dashboard on http://localhost:3000
```

| Endpoint | Description |
|----------|-------------|
| `GET  /api/v1/health` | Liveness probe |
| `GET  /api/v1/health/ready` | Readiness probe, checks PostgreSQL and Redis (503 when degraded) |
| `GET  /api/v1/chat/models` | Available language models and the default one |
| `POST /api/v1/chat/stream` | Streams an assistant reply over Server-Sent Events |
| `GET  /docs` | Interactive OpenAPI documentation (disabled in production) |

The API listens on `http://localhost:8000`. If a port is already taken on your machine, copy `.env.example` to `.env` at the repository root and change `POSTGRES_PORT`, `REDIS_PORT` or `API_PORT`.

Set `GROQ_API_KEY` in `backend/.env` to enable chat ([get a key](https://console.groq.com/keys)), then:

```bash
curl -N http://localhost:8000/api/v1/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Salama!"}]}'
```

### Streaming protocol

`POST /api/v1/chat/stream` accepts up to 50 messages (4,000 characters each, 16,000 in total). The last message must come from the user. The response is a stream of named events:

| Event | Payload | Meaning |
|-------|---------|---------|
| `token` | `{"text": "..."}` | Next fragment of the reply |
| `done` | `{"model": "..."}` | Reply completed |
| `error` | `{"code": "...", "message": "..."}` | Provider failure, the stream ends |

Errors raised before streaming starts use HTTP status codes and a single envelope:

```json
{ "error": { "code": "rate_limited", "message": "Too many requests. Please try again later." } }
```

| Status | Code | Cause |
|--------|------|-------|
| 422 | `validation_error`, `unknown_model` | Invalid payload or model not allowed |
| 429 | `rate_limited` | Per-IP limit reached (`CHAT_RATE_LIMIT`), see `Retry-After` |
| 503 | `llm_not_configured` | No provider API key on the server |

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
make test       # run the test suite
make lint       # Ruff lint and format check
make revision m="describe change"   # new Alembic migration
make web-types  # regenerate typed API client after backend changes
```

Install the git hooks once with `uvx pre-commit install`.

## Roadmap

- [x] Foundations: monorepo, containers, health checks, CI
- [x] Streaming chat API
- [x] Next.js dashboard
- [ ] Accounts and multi-tenant isolation
- [ ] Document ingestion and RAG with source citations
- [ ] Embeddable website widget
- [ ] Facebook Messenger integration
- [ ] Analytics: leads and unanswered questions
- [ ] Production deployment

## License

MIT
