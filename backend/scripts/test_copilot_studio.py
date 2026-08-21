#!/usr/bin/env python3
"""Minimal, standalone connectivity test for a published Copilot Studio agent
via the Direct Line 3.0 API (Web Channel Security secret).

Does NOT touch the existing OpenRouter pipeline (app/pipeline.py, app/main.py)
and is not imported by the FastAPI app or the worker.

Usage:
    COPILOT_STUDIO_SECRET=... python backend/scripts/test_copilot_studio.py

The secret is read only from the environment and is never printed or logged.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

DIRECTLINE_BASE = "https://directline.botframework.com/v3/directline"
TEST_MESSAGE = "สวัสดีครับ นี่คือข้อความทดสอบระบบ"
USER_ID = "backend-test-user"
POLL_TIMEOUT_SECONDS = 20


def call(method: str, path: str, secret: str, body: dict | None = None) -> dict:
    url = f"{DIRECTLINE_BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    secret = os.environ.get("COPILOT_STUDIO_SECRET")
    if not secret:
        print("ERROR: environment variable COPILOT_STUDIO_SECRET is not set", file=sys.stderr)
        return 1

    try:
        conversation = call("POST", "/conversations", secret)
        conversation_id = conversation["conversationId"]

        call(
            "POST",
            f"/conversations/{conversation_id}/activities",
            secret,
            body={"type": "message", "from": {"id": USER_ID}, "text": TEST_MESSAGE, "locale": "th-TH"},
        )

        watermark = None
        reply_texts: list[str] = []
        deadline = time.time() + POLL_TIMEOUT_SECONDS
        while time.time() < deadline and not reply_texts:
            time.sleep(1.5)
            path = f"/conversations/{conversation_id}/activities"
            if watermark:
                path += f"?watermark={watermark}"
            payload = call("GET", path, secret)
            watermark = payload.get("watermark") or watermark
            for activity in payload.get("activities", []):
                if activity.get("type") == "message" and activity.get("from", {}).get("id") != USER_ID and activity.get("text"):
                    reply_texts.append(activity["text"])
    except urllib.error.HTTPError as exc:
        print(f"ERROR: Direct Line API returned HTTP {exc.code} {exc.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"ERROR: could not reach Direct Line API: {exc.reason}", file=sys.stderr)
        return 1

    if not reply_texts:
        print("ไม่ได้รับคำตอบจาก agent ภายในเวลาที่กำหนด")
        return 2

    for text in reply_texts:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
