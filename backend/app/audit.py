import logging

from sqlalchemy.orm import Session

from .models import AuditEvent, AuditLog

logger = logging.getLogger(__name__)


def record_audit(
    db: Session,
    event: AuditEvent,
    actor_user_id: int | None = None,
    target_user_id: int | None = None,
    job_id: str | None = None,
    detail: str | None = None,
) -> None:
    """Append one audit log row and commit it as its own transaction.

    Never raises: a failure to write the audit trail must not break the
    business action it's attached to. Only short, non-sensitive metadata
    belongs in `detail` -- never document content, OCR text, AI prompts/
    responses, secrets, tokens, or full stack traces.
    """
    try:
        db.add(AuditLog(
            event=event.value,
            actor_user_id=actor_user_id,
            target_user_id=target_user_id,
            job_id=job_id,
            detail=(detail or "")[:500] or None,
        ))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Failed to record audit log event=%s", event.value)
