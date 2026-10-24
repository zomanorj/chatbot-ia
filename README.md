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
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Tooling | uv, Ruff, pytest, Docker Compose, GitHub Actions, pre-commit |

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
├── frontend/             Web dashboard (migration to Next.js in progress)
├── compose.yaml          Local stack: Postgres, Redis, migrations, API
└── Makefile              Common commands
```

## Getting started

**Requirements:** Docker with Compose v2, and [uv](https://docs.astral.sh/uv/getting-started/installation/) to run tooling outside containers.

```bash
cp backend/.env.example backend/.env
make up
```

| Endpoint | Description |
|----------|-------------|
| `GET  /api/v1/health` | Liveness probe |
| `GET  /api/v1/health/ready` | Readiness probe, checks PostgreSQL and Redis (503 when degraded) |
| `GET  /docs` | Interactive OpenAPI documentation (disabled in production) |

The API listens on `http://localhost:8000`. If a port is already taken on your machine, copy `.env.example` to `.env` at the repository root and change `POSTGRES_PORT`, `REDIS_PORT` or `API_PORT`.

### Development

```bash
make watch      # live code sync into the API container
make test       # run the test suite
make lint       # Ruff lint and format check
make revision m="describe change"   # new Alembic migration
```

Install the git hooks once with `uvx pre-commit install`.

## Roadmap

- [x] Foundations: monorepo, containers, health checks, CI
- [ ] Streaming chat API
- [ ] Next.js dashboard
- [ ] Accounts and multi-tenant isolation
- [ ] Document ingestion and RAG with source citations
- [ ] Embeddable website widget
- [ ] Facebook Messenger integration
- [ ] Analytics: leads and unanswered questions
- [ ] Production deployment

## License

MIT
