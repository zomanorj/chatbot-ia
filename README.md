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
                   │              │ rate limits
                   ▼              ▼
       ┌───────────────────┐  ┌────────┐
       │ PostgreSQL        │  │ Redis  │
       │ + pgvector        │  └────────┘
       └─────────▲─────────┘
                 │ job queue (SKIP LOCKED)
       ┌─────────┴─────────┐
       │ Ingestion worker  │  extract, chunk, embed (E5, ONNX)
       └───────────────────┘
```

## Tech stack

| Layer | Technologies |
|-------|--------------|
| API | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2 (async), Alembic |
| Data | PostgreSQL 18, pgvector (HNSW), Redis 8 |
| AI | Groq (gpt-oss), multilingual E5 embeddings via fastembed (ONNX, runs locally) |
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
│   │   ├── services/     Business logic: auth, bots, chat, RAG pipeline, LLM provider
│   │   └── workers/      Document ingestion worker
│   ├── eval/             RAG evaluation: sample business, questions, runner
│   ├── alembic/          Database migrations
│   └── tests/
├── frontend/             Next.js dashboard and landing page
│   └── src/
│       ├── app/          Routes: landing, auth, dashboard, assistants
│       ├── components/   UI, chat and dashboard components
│       ├── hooks/        Data and chat state hooks
│       └── lib/          Typed API client, SSE parser
├── compose.yaml          Local stack: Postgres, Redis, migrations, API, worker
└── Makefile              Common commands
```

## Getting started

**Requirements:** Docker with Compose v2, Node.js 24, and [uv](https://docs.astral.sh/uv/getting-started/installation/) to run tooling outside containers.

```bash
cp backend/.env.example backend/.env       # then set SECRET_KEY and GROQ_API_KEY
make up                                   # API, worker, PostgreSQL, Redis

(cd frontend && cp .env.example .env.local && npm install)
make web                                  # dashboard on http://localhost:3000
```

The first start downloads the embedding model (about 470 MB) into a Docker volume. The API listens on `http://localhost:8000`, with interactive documentation at `/docs` (disabled in production). If a port is already taken on your machine, copy `.env.example` to `.env` at the repository root and change `POSTGRES_PORT`, `REDIS_PORT` or `API_PORT`.

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
| `GET, POST /api/v1/bots/{id}/documents` | List or upload knowledge documents (multipart) |
| `POST /api/v1/bots/{id}/documents/text` | Add knowledge typed in the dashboard |
| `POST /api/v1/bots/{id}/documents/{did}/retry` | Re-queue a failed document |
| `DELETE /api/v1/bots/{id}/documents/{did}` | Remove a document and its passages |
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

### Knowledge base and retrieval

1. **Upload.** PDF, DOCX, XLSX, CSV, TXT and Markdown, up to 10 MB. The extension must match the file signature. Originals are kept so documents can be re-indexed.
2. **Indexing** runs in a separate worker that claims documents from a PostgreSQL queue (`FOR UPDATE SKIP LOCKED`), so several workers can run safely and a crashed job is picked up again.
3. **Structure-aware chunking.** Table rows (a product, a price line) and Markdown sections (an FAQ entry) become standalone passages; running text is split into overlapping chunks of about 700 characters.
4. **Embeddings** with [`intfloat/multilingual-e5-small`](https://huggingface.co/intfloat/multilingual-e5-small) (MIT, 94 languages including Malagasy), run locally with ONNX through [fastembed](https://github.com/qdrant/fastembed), stored in pgvector with an HNSW cosine index.
5. **Query rewriting.** A fast model rewrites each customer message into a standalone search query in French and English, which bridges Malagasy questions and French documents, resolves follow-ups such as "and in size M?", and skips search for small talk.
6. **Grounded answer.** The best passages go into the prompt; those above the confidence threshold are returned as sources. Customer phone numbers and emails are saved as leads, and questions without a confident passage are logged for the owner.

#### Evaluation

`make eval` runs the production pipeline on a sample shop (`backend/eval/fixtures`) against 30 questions in French, Malagasy and English, including questions the documents cannot answer and small talk.

| Configuration | Correct answers | Right document found (answerable) |
|---------------|-----------------|-----------------------------------|
| Whole-document chunks, no rewriting | 19 / 30 | 13 / 25 |
| Structure-aware chunks, no rewriting | 26 / 30 | 22 / 25 |
| **Structure-aware chunks + query rewriting** | **30 / 30** | **25 / 25** |

Known limit: E5 similarity scores of answerable and off-topic questions overlap (0.846 vs 0.855 in this set), so the score alone cannot flag every unanswered question. The model still declines correctly; detecting these cases reliably is planned with an LLM judge.

### Streaming protocol

`POST /api/v1/bots/{id}/chat` takes `{"content": "...", "conversation_id": null, "model": null}`. Without `conversation_id`, a new conversation is created. The user message is stored before streaming starts, and the reply is stored when it ends, including partial replies when the client disconnects. Events:

| Event | Payload | Meaning |
|-------|---------|---------|
| `conversation` | `{"id": "...", "title": "..."}` | Conversation the turn belongs to |
| `sources` | `{"sources": [{"document_id": "...", "title": "..."}]}` | Documents the reply relies on |
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
| 404 | `bot_not_found`, `conversation_not_found`, `document_not_found` |
| 409 | `email_taken`, `document_limit`, `document_not_failed` |
| 413 | `file_too_large` |
| 415 | `unsupported_type`, `corrupted_file` |
| 422 | `validation_error`, `unknown_model`, `empty_file` |
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
make eval       # measure RAG quality (needs GROQ_API_KEY)
```

Install the git hooks once with `uvx pre-commit install`.

## Roadmap

- [x] Foundations: monorepo, containers, health checks, CI
- [x] Streaming chat API
- [x] Next.js dashboard
- [x] Accounts and multi-tenant isolation
- [x] Document ingestion and RAG with source citations
- [ ] Embeddable website widget
- [ ] Facebook Messenger integration
- [ ] Analytics: leads and unanswered questions
- [ ] Production deployment

## License

MIT
