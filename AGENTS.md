# Spell Check Beta Memory

- Work only inside `spell-check-beta/`; root `backend/`, `frontend/`, and root Compose files are production.
- Phase 1 uses `spellCheckBeta`, created only by `deploy/spell-check-schema.sql`. Do not re-enable ORM `create_tables()`.
- Beta ports: web `5183`, API `8010`. Compose project/container names start with `spell-check-beta`.
- `ENVIRONMENT=dev` plus `AUTH_MODE=dev` uses dev-user bypass. To test Google, set `AUTH_MODE=google`; Google users must already be active and unblocked in DB. Do not restore `ALLOW_USER_TYPES`.
- If SQL Server runs on the Docker host, use `DB_HOST=host.docker.internal`, not `localhost`; a timeout means the beta API cannot read users or complete Google login.
- Phase 3 stores artifacts at `tmp/` via `LOCAL_STORAGE_PATH`; use protected job download routes, not public file paths. Keep OpenRouter until university gives a compatible Copilot endpoint; `USE_PYMUPDF=true`.
- Phase 4 removed retry and database log UI/API. Worker messages go to container stdout. Dictionary and finding-stat backend data stay, but their UI/nav are hidden.
- Phase 5 has `/api/text-check`: authenticated synchronous checking of up to 500 characters. It uses `text_check_findings()` and never creates jobs, files, or DB rows. UI history is browser localStorage only: max 3 records, expires after 24 hours.
- Dashboard has a `ตรวจข้อความ` action. Job tables show `Duration` after finding amount using auto-sized columns.
- Original and highlighted PDFs use inline protected responses for browser preview; Excel/Markdown stay downloads. Rebuild/recreate `api` after backend changes and `web` after frontend changes.
- `tmp/` is source of all job artifacts. DB keeps jobs/findings if files are removed. Missing original/OCR/report/Excel returns `File not ready`. Highlight can regenerate only when its metadata is also gone and original exists; if only PDF is deleted while its `.metadata.json` remains, preview returns `File not ready`.
- Keep secrets out of version control; `.env` contains beta placeholders only.
- `.env.example` is the complete placeholder template. Never read or overwrite a user's real `.env`.
