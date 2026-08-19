# Spell Check

An isolated beta fork of the University of Phayao Thai PDF spell-check app. It uses Google OAuth, SQL Server, local file storage, and OpenRouter. The production app at this repository's root is not used or changed.

## Before you start

- Docker Desktop with Docker Compose
- Access to a SQL Server instance
- `sqlcmd` on the machine that will create the schema
- A Google OAuth client configured with the callback URL `http://localhost:8010/auth/callback`
- An OpenRouter API key

Do not commit `.env`. Start from [`.env.example`](.env.example); it contains placeholders only.

## Quick start

```sh
cd spell-check
cp .env.example .env
```

Edit `.env` with the real beta-only values. For local SQL Server running on the same Docker host, use `DB_HOST=host.docker.internal`. Do not use `localhost`: inside the API container it points to the container itself.

Create the beta database and schema. Run this from a shell that can reach SQL Server; replace the values below with the database server address and beta SQL user:

```sh
sqlcmd -S "YOUR_SQL_HOST,1433" -U "YOUR_SQLSERVER_USER" -d master -i deploy/spell-check-schema.sql
```

The script creates and selects `spellCheckBeta` if it does not exist. It is the only schema source for this beta; the API intentionally does not call SQLAlchemy `create_tables()`.

Create the first allowed Google user before login:

```sql
USE spellCheckBeta;

INSERT dbo.users (email, name, type, isAdmin, isBlocked, isActive)
VALUES (N'user@example.com', N'Beta User', N'TEACHER', 0, 0, 1);
```

Use the exact, verified Google email in lowercase. Set `isAdmin` to `1` only for an administrator.

Start all services:

```sh
docker compose up --build
```

Open <http://localhost:5183>. The API runs at <http://localhost:8010>; its health check is <http://localhost:8010/health>.

## Configure the app

`.env.example` is the complete configuration template. These are the values needed for a normal Google login:

| Variable | Purpose |
| --- | --- |
| `AUTH_MODE=google` | Enables cookie-based Google login. |
| `SESSION_SECRET` | Long random secret for signed session cookies. |
| `FRONTEND_URL` | Public web URL; `http://localhost:5183` for local use. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client credentials. |
| `GOOGLE_REDIRECT_URI` | Must exactly match the Google console callback URL. |
| `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Beta SQL Server connection. |
| `DB_NAME=spellCheckBeta` | Dedicated beta database. |
| `OPEN_ROUTER_API_KEY`, `OPENROUTER_MODEL` | Thai spellcheck provider. |
| `USE_PYMUPDF=true` | Default PDF text extraction mode. |

For a dev-bypass smoke test only, use `ENVIRONMENT=dev` and `AUTH_MODE=dev`. This bypass creates or updates `DEV_USER_EMAIL`; it is not a Google-login test.

## Sign in with Google

The app requests `openid email profile`. Google email must be verified and must already exist in `dbo.users` with `isActive=1` and `isBlocked=0`. Login never creates users and does not assign a role automatically. `ALLOW_USER_TYPES`, Microsoft Entra ID, and SmartUP are not used by beta.

## Use the app

### Check a PDF

1. Upload a PDF from the dashboard.
2. The worker extracts text with PyMuPDF, checks spelling with OpenRouter, and creates report outputs.
3. Open the job findings or use **Manage** to open the source PDF, highlighted PDF, or Excel report.

Original and highlighted PDFs open as protected browser previews. Excel and Markdown outputs download normally. The table shows each completed job's finding count and duration.

### Check text directly

Use **ตรวจข้อความ** from the dashboard or main menu. Paste up to 500 characters and submit. The check uses the same dictionary and OpenRouter logic as PDF jobs, but is synchronous: it creates no job, file, or database record.

The browser keeps the three most recent direct-text checks in local storage for 24 hours. This history is local to that browser and is not stored in SQL Server.

## Storage and data lifecycle

All uploaded PDFs and generated artifacts live under `tmp/`, mounted into API and worker containers at `/app/tmp`. There is no S3/MinIO and no automatic cleanup.

Do not delete files from `tmp/` unless they are no longer needed. Jobs and findings remain in SQL Server, but a deleted original/OCR/report/Excel artifact returns `File not ready`. A highlighted PDF can regenerate only when its metadata file is also absent and its original PDF still exists.

## Beta scope

- Google OAuth replaces Microsoft Entra ID.
- Local `tmp/` storage replaces S3/MinIO.
- OpenRouter is the active spellcheck provider until a compatible university Copilot endpoint is available.
- Retry and database-backed log viewer are removed; worker progress and tracebacks go to container logs.
- Dictionary and finding-stat backend data remain, but their UI/navigation are hidden.

## Common commands

```sh
# Start or rebuild all beta services
docker compose up -d --build

# Follow API or worker logs
docker compose logs -f api
docker compose logs -f worker

# Rebuild only a changed frontend
docker compose up -d --build --force-recreate web

# Rebuild only a changed API
docker compose up -d --build --force-recreate api

# Stop beta services without deleting SQL data or tmp files
docker compose down
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Google login returns to `?login=failed` | Confirm callback URL, Google credentials, and that the verified email exists in active, unblocked `dbo.users`. |
| API log says `HYT00 Login timeout expired` | SQL Server is unreachable from Docker. For a local host database, use `DB_HOST=host.docker.internal`; then recreate API and worker. |
| New UI change is not visible | Rebuild and recreate `web`, then hard refresh the browser. |
| PDF preview/download returns `File not ready` | The corresponding artifact is missing from `tmp/`; re-upload if the original is gone. |

## Development checks

Run the copied backend tests with the beta API image:

```sh
docker compose run --rm --no-deps \
  -v "$(pwd)/backend:/work" -w /work api \
  python -m unittest test_pipeline.py test_jobs_api.py test_auth_callback.py test_storage.py
```

The frontend build is part of the web image build:

```sh
docker compose build web
```
