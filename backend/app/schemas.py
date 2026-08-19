from datetime import datetime

from pydantic import BaseModel

from .models import JobStatus, UserType


class MeOut(BaseModel):
    email: str
    name: str | None
    type: UserType
    is_admin: bool


class JobOut(BaseModel):
    id: str
    original_filename: str
    status: JobStatus
    error_text: str | None
    pages: int | None
    elapsed_seconds: int | None
    finding_count: int
    created_at: datetime
    updated_at: datetime
    user_email: str


class SpellcheckFindingOut(BaseModel):
    id: int
    page: str
    found: str
    suggestion: str
    reason: str


class TextCheckIn(BaseModel):
    text: str


class DictionaryIn(BaseModel):
    wrong: str
    correct: str


class DictionaryOut(DictionaryIn):
    id: int


class UserAdminOut(BaseModel):
    id: int
    email: str
    name: str | None
    type: UserType
    is_admin: bool
    is_blocked: bool


class UserPatch(BaseModel):
    type: UserType | None = None
    is_admin: bool | None = None
    is_blocked: bool | None = None
