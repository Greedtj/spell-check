from secrets import token_urlsafe
from urllib.parse import urlencode
import json
import urllib.request

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User, UserType


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def login_url(state: str) -> str:
    settings = get_settings()
    return GOOGLE_AUTH_URL + "?" + urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
        "state": state,
    })


def exchange_code(code: str) -> dict:
    settings = get_settings()
    body = urlencode({
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": settings.google_redirect_uri,
        "grant_type": "authorization_code",
    }).encode()
    req = urllib.request.Request(GOOGLE_TOKEN_URL, data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            token = json.loads(res.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(401, "Google token exchange failed") from exc
    if not token.get("access_token"):
        raise HTTPException(401, "Google login failed")
    return token


def google_profile(access_token: str) -> dict:
    req = urllib.request.Request(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.loads(res.read().decode("utf-8"))
    except Exception as exc:
        raise HTTPException(401, "Google profile lookup failed") from exc


def authorized_google_user(db: Session, profile: dict) -> User:
    email = str(profile.get("email") or "").strip().lower()
    if not email or profile.get("email_verified") not in (True, "true"):
        raise HTTPException(403, "Google account must have a verified email")
    user = db.query(User).filter(User.email == email, User.is_active == True).first()
    if not user or user.is_blocked:
        raise HTTPException(403, "Account is not authorized")
    return user


def dev_current_user(db: Session) -> User:
    settings = get_settings()
    email = settings.dev_user_email.lower()
    user_type = settings.dev_user_type.strip().upper()
    if user_type not in UserType.__members__:
        user_type = UserType.TEACHER.value
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, name=settings.dev_user_name, type=user_type, is_admin=settings.dev_user_is_admin)
        db.add(user)
    else:
        user.name = settings.dev_user_name
        user.type = user_type
        user.is_admin = settings.dev_user_is_admin
        user.is_active = True
        user.is_blocked = False
    db.commit()
    db.refresh(user)
    return user


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    settings = get_settings()
    if settings.environment == "dev" and settings.auth_mode == "dev":
        return dev_current_user(db)
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(401, "Login required")
    user = db.get(User, user_id)
    if not user or not user.is_active or user.is_blocked:
        raise HTTPException(403, "User is blocked")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Admin required")
    return user


def logout_url():
    return get_settings().frontend_url
