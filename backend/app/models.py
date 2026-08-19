import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Unicode, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class UserType(str, enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    STAFF = "STAFF"


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    DONE = "DONE"
    FAILED = "FAILED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(Unicode(320), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(Unicode(255))
    type: Mapped[UserType] = mapped_column(Unicode(20), default=UserType.TEACHER.value)
    is_admin: Mapped[bool] = mapped_column("isAdmin", Boolean, default=False)
    is_blocked: Mapped[bool] = mapped_column("isBlocked", Boolean, default=False)
    is_active: Mapped[bool] = mapped_column("isActive", Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column("createdBy", ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_by: Mapped[int | None] = mapped_column("updatedBy", ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column("updateAt", DateTime, server_default=func.now(), onupdate=func.now())

    jobs: Mapped[list["Job"]] = relationship(back_populates="user", foreign_keys="Job.user_id")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(Unicode(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column("userId", ForeignKey("users.id"), index=True)
    original_filename: Mapped[str] = mapped_column("originalFilename", Unicode(500))
    original_key: Mapped[str] = mapped_column("originalKey", Unicode(800))
    ocr_key: Mapped[str | None] = mapped_column("ocrKey", Unicode(800))
    report_key: Mapped[str | None] = mapped_column("reportKey", Unicode(800))
    excel_key: Mapped[str | None] = mapped_column("excelKey", Unicode(800))
    status: Mapped[JobStatus] = mapped_column(Unicode(20), default=JobStatus.PENDING.value, index=True)
    error_text: Mapped[str | None] = mapped_column("errorText", Unicode(1000))
    pages: Mapped[int | None] = mapped_column(Integer)
    elapsed_seconds: Mapped[int | None] = mapped_column("elapsedSeconds", Integer)
    is_active: Mapped[bool] = mapped_column("isActive", Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column("createdBy", ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now(), index=True)
    updated_by: Mapped[int | None] = mapped_column("updatedBy", ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column("updateAt", DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship(back_populates="jobs", foreign_keys=[user_id])


class DictionaryTerm(Base):
    __tablename__ = "dictionaryTerms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    wrong: Mapped[str] = mapped_column(Unicode(500), unique=True)
    correct: Mapped[str] = mapped_column(Unicode(500))
    is_active: Mapped[bool] = mapped_column("isActive", Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column("createdBy", ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_by: Mapped[int | None] = mapped_column("updatedBy", ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column("updateAt", DateTime, server_default=func.now(), onupdate=func.now())


class SpellcheckFinding(Base):
    __tablename__ = "spellcheckFindings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column("jobId", ForeignKey("jobs.id"), index=True)
    page: Mapped[str] = mapped_column(Unicode(50))
    found: Mapped[str] = mapped_column(Unicode(500), index=True)
    suggestion: Mapped[str] = mapped_column(Unicode(500), index=True)
    reason: Mapped[str] = mapped_column(Unicode(1000))
    is_active: Mapped[bool] = mapped_column("isActive", Boolean, default=True)
    created_by: Mapped[int | None] = mapped_column("createdBy", ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column("createdAt", DateTime, server_default=func.now())
    updated_by: Mapped[int | None] = mapped_column("updatedBy", ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column("updateAt", DateTime, server_default=func.now(), onupdate=func.now())
