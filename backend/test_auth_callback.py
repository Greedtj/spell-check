from types import SimpleNamespace
from unittest import TestCase, main as unittest_main
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app import main


class AuthCallbackTest(TestCase):
    def test_failed_login_returns_to_login(self):
        request = SimpleNamespace(session={"user_id": 1, "oauth_state": "expected"})
        with patch.object(main, "exchange_code", side_effect=HTTPException(401, "denied")):
            response = main.auth_callback(request, code="bad", state="expected", db=object())
        self.assertEqual(response.status_code, 307)
        self.assertEqual(response.headers["location"], f"{main.settings.frontend_url}?login=failed")
        self.assertEqual(request.session, {})

    def test_login_stores_oauth_state(self):
        request = SimpleNamespace(session={})
        with patch.object(main, "token_urlsafe", return_value="state"), patch.object(main, "login_url", return_value="https://google.test/login"):
            response = main.auth_login(request)
        self.assertEqual(response.headers["location"], "https://google.test/login")
        self.assertEqual(request.session["oauth_state"], "state")

    def test_google_callback_requires_matching_state_and_active_user(self):
        request = SimpleNamespace(session={"oauth_state": "state"})
        user = SimpleNamespace(id=7)
        with (
            patch.object(main, "exchange_code", return_value={"access_token": "token"}),
            patch.object(main, "google_profile", return_value={"email": "user@example.test", "email_verified": True}),
            patch.object(main, "authorized_google_user", return_value=user),
        ):
            response = main.auth_callback(request, code="code", state="state", db=MagicMock())
        self.assertEqual(response.headers["location"], main.settings.frontend_url)
        self.assertEqual(request.session, {"user_id": 7})


if __name__ == "__main__":
    unittest_main()
