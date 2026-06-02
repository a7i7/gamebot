# Gamebot Arena

A competitive coding platform where you write bots in Python, JavaScript, Java, or C++ to play board games against each other.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 20+ (for frontend dev server)
- [Python](https://www.python.org/) 3.11+ (for backend dev server)

---

## Running with Docker (recommended)

Builds and starts everything — Postgres, backend, and frontend:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

Tables are created automatically on first startup. To reset the database:

```bash
docker compose down -v   # removes the postgres volume
docker compose up --build
```

---

## Running locally (development)

### 1. Start Postgres

```bash
docker compose up postgres
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

DATABASE_URL=postgresql+asyncpg://gamebot:gamebot@localhost:5432/gamebot \
SECRET_KEY=dev-secret \
uvicorn api.app:app --reload
```

Tables are created automatically when the server starts.

### 3. Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Running tests

```bash
cd backend
source .venv/bin/activate
pytest
```

---

## Games

| Game | Status |
|------|--------|
| Tic-Tac-Toe | Live |
| Connect 4 | Coming soon |
| Chess | Coming soon |

---

## Running a match manually (CLI)

Build the Docker images for the bot runners first:

```bash
docker build -f docker/python/Dockerfile -t gamebot-python:latest .
docker build -f docker/javascript/Dockerfile -t gamebot-javascript:latest .
docker build -f docker/java/Dockerfile -t gamebot-java:latest .
```

Then run a match:

```bash
cd backend
PYTHONPATH=. python -m referee.main \
  --game tictactoe \
  --bot1-file examples/tictactoe/python/random_bot.py --bot1-lang python \
  --bot2-file examples/tictactoe/javascript/random_bot.js --bot2-lang javascript
```

---

## Project structure

```
gamebot/
├── backend/
│   ├── api/          # FastAPI routes and models
│   ├── auth/         # JWT and password hashing
│   ├── db/           # SQLAlchemy models and repos
│   ├── games/        # Game logic (tictactoe, ...)
│   ├── referee/      # Match orchestration
│   └── examples/     # Sample bots
├── frontend/         # Next.js app
└── docker/           # Bot runner Dockerfiles
```
