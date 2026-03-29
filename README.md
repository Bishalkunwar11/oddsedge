# OddsEdge — Football Odds Analysis

Real-time football odds analysis, arbitrage detection, and value bet scanning.

## Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS v4, Zustand |
| **Backend** | FastAPI, SQLAlchemy (async), Pydantic v2, Redis |
| **Database** | PostgreSQL 16 (asyncpg) |
| **Cache** | Redis 7 |
| **Infra** | Docker Compose |

## Quick Start

```bash
# Start all services (Postgres, Redis, Backend, Frontend)
docker compose up --build

# Frontend  → http://localhost:3000
# Backend   → http://localhost:8000
# API Docs  → http://localhost:8000/docs
```

### Local Development (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | Upcoming fixtures with latest odds |
| GET | `/api/value-bets` | Value bets above edge threshold |
| GET | `/api/arbitrage` | Arbitrage opportunities |
| POST | `/api/calculate-parlay` | Parlay/accumulator calculator |
| WS | `/ws/live-odds` | Real-time odds streaming |

## Project Structure

```
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py       # App entry point + lifespan
│   │   ├── models.py     # SQLAlchemy ORM models
│   │   ├── schemas.py    # Pydantic request/response schemas
│   │   ├── config.py     # Settings (DB, Redis, domain constants)
│   │   ├── database.py   # Async engine + session factory
│   │   ├── cache.py      # Redis caching helpers
│   │   ├── routers/      # REST + WebSocket endpoints
│   │   └── services/     # Business logic (analysis, calculator)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # Layout + odds components
│   │   ├── hooks/        # useLiveOdds WebSocket hook
│   │   ├── lib/          # API client
│   │   └── store/        # Zustand bet slip store
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml    # Full-stack orchestration
```

## Environment Variables

See `backend/.env.example` for configuration options:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `DEBUG` — Enable debug mode

## License

Private