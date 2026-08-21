from types import SimpleNamespace
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase, main as unittest_main
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app import main
from app.schemas import TextCheckIn
from app.models import JobStatus


class FakeDeleteQuery:
    def __init__(self, db, model):
        self.db = db
        self.model = model

    def filter(self, *_):
        return self

    def delete(self, **_):
        self.db.deleted_children.append(self.model.__name__)

    def update(self, *_args, **_kwargs):
        self.db.deleted_children.append(self.model.__name__)


class FakeDb:
    def __init__(self, job):
        self.job = job
        self.deleted = None
        self.deleted_children = []
        self.committed = False

    def get(self, *_):
        return self.job

    def query(self, model):
        return FakeDeleteQuery(self, model)

    def delete(self, job):
        self.deleted = job

    def add(self, _):
        pass

    def commit(self):
        self.committed = True

    def rollback(self):
        pass


class JobApiTest(TestCase):
    def test_pdf_download_is_inline_for_preview(self):
        job = SimpleNamespace(id="job-1", user_id=7, is_active=True, original_filename="doc.pdf", original_key="jobs/job-1/original.pdf", ocr_key=None, report_key=None, excel_key=None)
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "original.pdf"
            path.touch()
            with (
                patch.object(main, "visible_job", return_value=job),
                patch.object(main, "local_path", return_value=path),
            ):
                response = main.download_file_response("job-1", "original", SimpleNamespace(id=7, is_admin=False), MagicMock())
        self.assertTrue(response.headers["content-disposition"].startswith("inline"))

    def test_text_check_enforces_limit_and_uses_active_dictionary(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [("บุคคลากร", "บุคลากร")]
        with patch.object(main, "text_check_findings", return_value=[]) as check:
            self.assertEqual(main.check_text(TextCheckIn(text="บุคคลากร"), SimpleNamespace(), db), [])
        check.assert_called_once_with("บุคคลากร", [("บุคคลากร", "บุคลากร")])
        with self.assertRaises(HTTPException) as ctx:
            main.check_text(TextCheckIn(text="x" * 501), SimpleNamespace(), db)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_delete_job_deletes_children_first(self):
        job = SimpleNamespace(id="job-1", user_id=7, status=JobStatus.DONE, is_active=True, original_filename="doc.pdf")
        db = FakeDb(job)

        with patch.object(main, "delete_file") as delete_file:
            self.assertEqual(main.delete_job("job-1", SimpleNamespace(id=7, is_admin=False), db), {"ok": True})
        delete_file.assert_any_call("jobs/job-1/highlighted.pdf")
        delete_file.assert_any_call("jobs/job-1/highlighted.docx")
        self.assertEqual(delete_file.call_count, 2)
        self.assertEqual(db.deleted_children, ["SpellcheckFinding"])
        self.assertFalse(job.is_active)
        self.assertTrue(db.committed)

    def test_delete_processing_job_is_rejected(self):
        job = SimpleNamespace(id="job-1", user_id=7, status=JobStatus.PROCESSING, is_active=True)
        db = FakeDb(job)

        with self.assertRaises(HTTPException) as ctx:
            main.delete_job("job-1", SimpleNamespace(id=7, is_admin=False), db)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertFalse(db.committed)

    def test_highlight_download_returns_partial_coverage(self):
        job = SimpleNamespace(
            id="job-1",
            user_id=7,
            status=JobStatus.DONE,
            is_active=True,
            original_filename="doc.pdf",
            original_key="jobs/job-1/original.pdf",
        )
        finding = SimpleNamespace(found="wrong", suggestion="right", page="1", reason="spelling")
        unmatched = SimpleNamespace(found="mistkae", suggestion="mistake", page="1", reason="spelling")
        db = FakeDb(job)
        db.query = lambda _model: SimpleNamespace(filter=lambda *_: SimpleNamespace(all=lambda: [finding, unmatched]))

        with (
            patch.object(main, "object_metadata", return_value=None),
            patch.object(main, "download_file"),
            patch.object(main, "create_highlighted_pdf", return_value=(3, 1)),
            patch.object(main, "upload_file") as upload_file,
        ):
            result = main.download("job-1", "highlighted", SimpleNamespace(id=7, is_admin=False), db)

        self.assertEqual(result, {
            "url": f"{main.settings.api_public_url}/api/jobs/{job.id}/file/highlighted",
            "matched_findings": 1,
            "total_findings": 2,
            "partial": True,
        })
        self.assertEqual(upload_file.call_args.args[3]["matched-findings"], 1)

    def test_highlight_download_reuses_cached_coverage(self):
        job = SimpleNamespace(id="job-1", user_id=7, status=JobStatus.DONE, is_active=True, original_filename="doc.pdf")
        db = FakeDb(job)
        metadata = {"annotations": "8", "matched-findings": "3", "total-findings": "5"}

        with (
            patch.object(main, "object_metadata", return_value=metadata),
            patch.object(main, "download_file") as download_file,
        ):
            result = main.download("job-1", "highlighted", SimpleNamespace(id=7, is_admin=False), db)

        self.assertTrue(result["partial"])
        self.assertEqual((result["matched_findings"], result["total_findings"]), (3, 5))
        download_file.assert_not_called()


if __name__ == "__main__":
    unittest_main()
