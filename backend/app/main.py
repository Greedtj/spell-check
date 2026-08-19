from pathlib import Path
from secrets import token_urlsafe
from tempfile import NamedTemporaryFile, TemporaryDirectory
import logging
import uuid

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from .auth import admin_user, authorized_google_user, current_user, exchange_code, google_profile, login_url, logout_url
from .config import get_settings
from .db import get_db
from sqlalchemy import func

from .models import DictionaryTerm, Job, JobStatus, SpellcheckFinding, User
from .pipeline import create_highlighted_pdf, is_reportable_finding, text_check_findings
from .schemas import DictionaryIn, JobOut, MeOut, SpellcheckFindingOut, TextCheckIn, UserAdminOut, UserPatch
from .storage import delete_file, download_file, local_path, object_metadata, upload_file

settings = get_settings()
logger = logging.getLogger(__name__)
allowed_origins = [settings.frontend_url]
if settings.environment == "dev":
    allowed_origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])
allowed_origins = list(dict.fromkeys(allowed_origins))
app = FastAPI(title=settings.app_name)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    max_age=settings.session_max_age_seconds,
    same_site="lax",
    https_only=settings.frontend_url.startswith("https://"),
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Path(settings.local_storage_path).mkdir(parents=True, exist_ok=True)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/auth/login")
def auth_login(request: Request):
    state = token_urlsafe(32)
    request.session["oauth_state"] = state
    return RedirectResponse(login_url(state))


@app.get("/auth/callback")
def auth_callback(request: Request, code: str | None = None, state: str | None = None, db: Session = Depends(get_db)):
    try:
        if not code or not state or state != request.session.pop("oauth_state", None):
            raise HTTPException(401, "Login failed")
        token = exchange_code(code)
        user = authorized_google_user(db, google_profile(token["access_token"]))
        request.session["user_id"] = user.id
        return RedirectResponse(settings.frontend_url)
    except HTTPException as exc:
        logger.warning("Google login failed: %s", exc.detail)
    except Exception:
        logger.exception("Google login failed unexpectedly")
    request.session.clear()
    return RedirectResponse(f"{settings.frontend_url}?login=failed")


@app.get("/auth/logout")
def auth_logout(request: Request):
    request.session.clear()
    return RedirectResponse(logout_url())


@app.get("/api/me", response_model=MeOut)
def me(user: User = Depends(current_user)):
    return user


@app.post("/api/text-check", response_model=list[SpellcheckFindingOut])
def check_text(item: TextCheckIn, _: User = Depends(current_user), db: Session = Depends(get_db)):
    text = item.text.strip()
    if not text:
        raise HTTPException(400, "กรุณาใส่ข้อความที่ต้องการตรวจ")
    if len(text) > 500:
        raise HTTPException(400, "ข้อความยาวเกิน 500 ตัวอักษร")
    fixes = db.query(DictionaryTerm.wrong, DictionaryTerm.correct).filter(DictionaryTerm.is_active == True).all()
    return text_check_findings(text, fixes)


def job_out(job: Job, db: Session) -> JobOut:
    active_findings = db.query(
        SpellcheckFinding.found,
        SpellcheckFinding.suggestion,
    ).filter(
        SpellcheckFinding.job_id == job.id,
        SpellcheckFinding.is_active == True,
    ).all()
    return JobOut(
        id=job.id,
        original_filename=job.original_filename,
        status=job.status,
        error_text=job.error_text,
        pages=job.pages,
        elapsed_seconds=job.elapsed_seconds,
        finding_count=sum(is_reportable_finding(found, suggestion) for found, suggestion in active_findings),
        created_at=job.created_at,
        updated_at=job.updated_at,
        user_email=job.user.email,
    )


def visible_job(job_id: str, user: User, db: Session) -> Job:
    job = db.get(Job, job_id)
    if not job or not job.is_active or (job.user_id != user.id and not user.is_admin):
        raise HTTPException(404, "Job not found")
    return job


@app.post("/api/jobs", response_model=JobOut)
def upload_job(file: UploadFile = File(...), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "PDF only")
    with NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file.file.read())
        tmp_path = Path(tmp.name)
    job_id = str(uuid.uuid4())
    key = f"jobs/{job_id}/{file.filename}"
    upload_file(tmp_path, key, "application/pdf")
    job = Job(id=job_id, user_id=user.id, original_filename=file.filename, original_key=key, created_by=user.id, updated_by=user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_out(job, db)


@app.get("/api/jobs", response_model=list[JobOut])
def list_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Job).join(Job.user).filter(Job.is_active == True)
    if not user.is_admin:
        q = q.filter(Job.user_id == user.id)
    return [job_out(job, db) for job in q.order_by(Job.created_at.desc()).limit(200)]


@app.get("/api/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return job_out(visible_job(job_id, user, db), db)


@app.get("/api/jobs/{job_id}/download/{kind}")
def download(job_id: str, kind: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = visible_job(job_id, user, db)
    if kind == "highlighted":
        if job.status != JobStatus.DONE.value:
            raise HTTPException(409, "Job is not ready")
        key = f"jobs/{job.id}/highlighted.pdf"
        metadata = object_metadata(key)
        if not metadata or not {"matched-findings", "total-findings"} <= metadata.keys():
            findings = db.query(SpellcheckFinding).filter(
                SpellcheckFinding.job_id == job.id,
                SpellcheckFinding.is_active == True,
            ).all()
            findings = [item for item in findings if is_reportable_finding(item.found, item.suggestion)]
            # ponytail: synchronous MVP; move to the worker if large PDFs block the API.
            with TemporaryDirectory() as tmp:
                source = Path(tmp) / "original.pdf"
                highlighted = Path(tmp) / "highlighted.pdf"
                download_file(job.original_key, source)
                annotations, matched = create_highlighted_pdf(source, findings, highlighted)
                if not annotations:
                    raise HTTPException(422, "ไม่พบคำผิดใน text layer ของ PDF จึงยังสร้างไฟล์ไฮไลต์ไม่ได้")
                metadata = {
                    "annotations": annotations,
                    "matched-findings": matched,
                    "total-findings": len(findings),
                }
                upload_file(highlighted, key, "application/pdf", metadata)
        matched = int(metadata["matched-findings"])
        total = int(metadata["total-findings"])
        return {
            "url": f"{settings.api_public_url}/api/jobs/{job_id}/file/highlighted",
            "matched_findings": matched,
            "total_findings": total,
            "partial": matched < total,
        }
    key = {"original": job.original_key, "ocr": job.ocr_key, "report": job.report_key, "excel": job.excel_key}.get(kind)
    if not key:
        raise HTTPException(404, "File not ready")
    return {"url": f"{settings.api_public_url}/api/jobs/{job_id}/file/{kind}"}


@app.get("/api/jobs/{job_id}/file/{kind}")
def download_file_response(job_id: str, kind: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = visible_job(job_id, user, db)
    key = f"jobs/{job.id}/highlighted.pdf" if kind == "highlighted" else {
        "original": job.original_key,
        "ocr": job.ocr_key,
        "report": job.report_key,
        "excel": job.excel_key,
    }.get(kind)
    if not key:
        raise HTTPException(404, "File not ready")
    path = local_path(key)
    if not path.is_file():
        raise HTTPException(404, "File not ready")
    media_type = {
        "original": "application/pdf",
        "highlighted": "application/pdf",
        "ocr": "text/markdown",
        "report": "text/markdown",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }[kind]
    return FileResponse(
        path,
        media_type=media_type,
        filename=path.name,
        content_disposition_type="inline" if kind in {"original", "highlighted"} else "attachment",
    )


@app.get("/api/jobs/{job_id}/findings", response_model=list[SpellcheckFindingOut])
def job_findings(job_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    visible_job(job_id, user, db)
    findings = db.query(SpellcheckFinding).filter(SpellcheckFinding.job_id == job_id, SpellcheckFinding.is_active == True).order_by(SpellcheckFinding.id).all()
    return [item for item in findings if is_reportable_finding(item.found, item.suggestion)]


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    job = visible_job(job_id, user, db)
    status = job.status.value if isinstance(job.status, JobStatus) else job.status
    if status == JobStatus.PROCESSING.value:
        raise HTTPException(409, "Cannot delete a processing job")
    job.is_active = False
    job.updated_by = user.id
    db.query(SpellcheckFinding).filter(SpellcheckFinding.job_id == job.id).update(
        {SpellcheckFinding.is_active: False, SpellcheckFinding.updated_by: user.id, SpellcheckFinding.updated_at: func.now()},
        synchronize_session=False,
    )
    db.commit()
    try:
        delete_file(f"jobs/{job.id}/highlighted.pdf")
    except Exception:
        # ponytail: cache cleanup must not turn a completed DB deletion into a user-visible failure.
        logger.exception("Failed to delete highlighted PDF cache for job %s", job.id)
    return {"ok": True}


@app.get("/api/admin/users", response_model=list[UserAdminOut])
def users(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_active == True).order_by(User.email).all()


@app.patch("/api/admin/users/{user_id}", response_model=UserAdminOut)
def update_user(user_id: int, patch: UserPatch, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(404, "User not found")
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    user.updated_by = admin.id
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/admin/dictionary")
def dictionary(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    return db.query(DictionaryTerm).filter(DictionaryTerm.is_active == True).order_by(DictionaryTerm.wrong).all()


@app.post("/api/admin/dictionary")
def add_dictionary(item: DictionaryIn, user: User = Depends(admin_user), db: Session = Depends(get_db)):
    wrong = item.wrong.strip()
    term = db.query(DictionaryTerm).filter(DictionaryTerm.wrong == wrong).first()
    if term:
        term.correct = item.correct.strip()
        term.is_active = True
        term.updated_by = user.id
    else:
        term = DictionaryTerm(wrong=wrong, correct=item.correct.strip(), created_by=user.id, updated_by=user.id)
        db.add(term)
    db.commit()
    db.refresh(term)
    return term


@app.get("/api/admin/finding-stats")
def finding_stats(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = [
        {"found": found, "suggestion": suggestion, "count": count}
        for found, suggestion, count in db.query(
            SpellcheckFinding.found,
            SpellcheckFinding.suggestion,
            func.count(SpellcheckFinding.id),
        ).filter(SpellcheckFinding.is_active == True)
        .group_by(SpellcheckFinding.found, SpellcheckFinding.suggestion)
        .order_by(func.count(SpellcheckFinding.id).desc())
        .limit(100)
        .all()
    ]
    return [row for row in rows if is_reportable_finding(row["found"], row["suggestion"])]


@app.patch("/api/admin/dictionary/{item_id}")
def update_dictionary(item_id: int, item: DictionaryIn, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    term = db.get(DictionaryTerm, item_id)
    if not term or not term.is_active:
        raise HTTPException(404, "Term not found")
    term.wrong = item.wrong.strip()
    term.correct = item.correct.strip()
    term.updated_by = _.id
    db.commit()
    db.refresh(term)
    return term


@app.delete("/api/admin/dictionary/{item_id}")
def delete_dictionary(item_id: int, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    term = db.get(DictionaryTerm, item_id)
    if not term or not term.is_active:
        raise HTTPException(404, "Term not found")
    term.is_active = False
    term.updated_by = _.id
    db.commit()
    return {"ok": True}
