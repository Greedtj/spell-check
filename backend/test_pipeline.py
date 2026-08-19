import json
import urllib.error
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest import TestCase, main as unittest_main
from unittest.mock import ANY, MagicMock, call, patch

import fitz

from app.models import JobStatus
from app.pipeline import clean_report, create_highlighted_pdf, error_summary, has_unicode_artifacts, is_reportable_finding, log as write_job_log, normalize_thai, openrouter_check, process_page, run_job, text_check_findings


class NormalizeThaiTest(TestCase):
    def test_repairs_sara_am_from_pdf_text_layers(self):
        self.assertEqual(
            normalize_thai("ค าสั่ง ประจ า น้ า สม่ าเสมอ ค ํา ค ำ ภาษา ไทย"),
            "คำสั่ง ประจำ น้ำ สม่ำเสมอ คำ คำ ภาษา ไทย",
        )

    def test_repairs_spaces_before_thai_combining_marks(self):
        self.assertEqual(normalize_thai("รองศาสตราจารย ์ ใช ้"), "รองศาสตราจารย์ ใช้")

    def test_filters_findings_that_only_differ_by_thai_mark_spacing(self):
        self.assertEqual(
            clean_report("- `รองศาสตราจารย ์` -> `รองศาสตราจารย์` : ไม้ทัณฑฆาตผิดรูป"),
            "ไม่พบคำผิดชัดเจน",
        )

    def test_detects_pdf_private_use_and_invisible_artifacts(self):
        self.assertTrue(has_unicode_artifacts("กำหนด\ue000ที่"))
        self.assertTrue(has_unicode_artifacts("ปั\u200bจจุบัน"))
        self.assertTrue(has_unicode_artifacts("ข้อความ\ufffd"))
        self.assertFalse(has_unicode_artifacts("กำหนดที่ ปัจจุบัน เทคนิคการแพทย์บัณฑิต"))

    def test_detects_malformed_repeated_thai_marks(self):
        self.assertTrue(has_unicode_artifacts("ถูกต้้อง"))
        self.assertTrue(has_unicode_artifacts("่อ่าน"))
        self.assertFalse(has_unicode_artifacts("เกื้อกูล น้ำ เพื่อ"))

    def test_filters_findings_caused_by_pdf_unicode_artifacts(self):
        report = "\n".join(
            [
                "- `กำหนด\ue000ที่` -> `กำหนดที่` : สะกดผิด",
                "- `เทคนิคการแพทย์บัณฑิต\u200b` -> `เทคนิคการแพทย์บัณฑิต` : ตัวอักษรเกิน",
                "- `อนุญาติ` -> `อนุญาต` : ใช้รูปคำมาตรฐาน",
            ]
        )
        self.assertEqual(
            clean_report(report),
            "- `อนุญาติ` -> `อนุญาต` : ใช้รูปคำมาตรฐาน",
        )

    def test_historical_findings_use_the_same_quality_gate(self):
        self.assertFalse(is_reportable_finding("กำหนด\ue000ที่", "กำหนดที่"))
        self.assertFalse(is_reportable_finding("เทคนิคการแพทย์บัณฑิต\u200b", "เทคนิคการแพทย์บัณฑิต"))
        self.assertTrue(is_reportable_finding("อนุญาติ", "อนุญาต"))

    def test_filters_findings_too_long_for_the_database(self):
        report = f"- `{'x' * 501}` -> `correct` : malformed model response"
        self.assertEqual(clean_report(report), "ไม่พบคำผิดชัดเจน")

    def test_rolls_back_before_recording_a_failed_job(self):
        db = MagicMock()
        job = SimpleNamespace(id="job-1", user_id=1, original_filename="test.pdf", original_key="jobs/job-1/test.pdf")
        with (
            patch("app.pipeline.download_file", side_effect=RuntimeError("download failed")),
            patch("app.pipeline.log"),
        ):
            run_job(db, job)
        db.rollback.assert_called_once_with()
        self.assertEqual(job.status, JobStatus.FAILED.value)

    def test_logs_human_message_before_technical_page_error(self):
        db = MagicMock()
        job = SimpleNamespace(id="job-1", user_id=1, original_filename="test.pdf", original_key="jobs/job-1/test.pdf")
        reader = MagicMock(pages=[object()])
        with (
            patch("app.pipeline.download_file"),
            patch("app.pipeline.PdfReader", return_value=reader),
            patch("app.pipeline.process_page", side_effect=RuntimeError("upstream failed")),
            patch("app.pipeline.log") as write_log,
        ):
            run_job(db, job)
        write_log.assert_has_calls(
            [
                call(db, job, "ประมวลผลหน้า 1 ไม่สำเร็จ: เกิดข้อผิดพลาดระหว่างประมวลผล: RuntimeError", "ERROR", ANY),
                call(db, job, "Error processing page 1: upstream failed", "ERROR"),
            ]
        )
        self.assertIn("RuntimeError: upstream failed", write_log.call_args_list[1].args[4])

    def test_summarizes_database_and_api_errors(self):
        truncated = RuntimeError("String or binary data would be truncated in table 'dbo.x', column 'found'.")
        http_error = urllib.error.HTTPError("https://example.test", 500, "Internal Server Error", None, None)
        self.assertEqual(error_summary(truncated), "บันทึกข้อมูลไม่สำเร็จ: ข้อมูลยาวเกินขนาดคอลัมน์ฐานข้อมูล found")
        self.assertEqual(error_summary(http_error), "ติดต่อ API ภายนอกไม่สำเร็จ: HTTP 500 Internal Server Error")

    def test_log_detail_identifies_job_file_and_uploader(self):
        db = MagicMock()
        job = SimpleNamespace(id="job-1", user_id=7, original_filename="หลักสูตร.pdf", user=SimpleNamespace(email="teacher@example.test"))
        with patch("app.pipeline.logger") as logger:
            write_job_log(db, job, "เริ่มประมวลผลเอกสาร")
        detail = logger.log.call_args.args[3]
        self.assertIn("job_id: job-1", detail)
        self.assertIn("ไฟล์: หลักสูตร.pdf", detail)
        self.assertIn("ผู้อัปโหลด: teacher@example.test", detail)

    def test_openrouter_uses_openai_compatible_client(self):
        response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="ไม่พบคำผิดชัดเจน"))])
        client = MagicMock()
        client.chat.completions.create.return_value = response
        settings = SimpleNamespace(open_router_api_key="secret", openrouter_model="test-model")
        with (
            patch("app.pipeline.get_settings", return_value=settings),
            patch("app.pipeline.OpenAI", return_value=client),
        ):
            self.assertEqual(openrouter_check("ข้อความ", 1), "ไม่พบคำผิดชัดเจน")
        client.chat.completions.create.assert_called_once()

    def test_text_check_uses_dictionary_and_same_llm_cleaning(self):
        with patch("app.pipeline.openrouter_check", return_value="- `คลอบคลุม` -> `ครอบคลุม` : สะกดผิด"):
            findings = text_check_findings("บุคคลากร และ คลอบคลุม", [("บุคคลากร", "บุคลากร")])
        self.assertEqual(findings, [
            {"id": 1, "page": "ข้อความ", "found": "บุคคลากร", "suggestion": "บุคลากร", "reason": "dictionary"},
            {"id": 2, "page": "ข้อความ", "found": "คลอบคลุม", "suggestion": "ครอบคลุม", "reason": "สะกดผิด"},
        ])

    def test_creates_searchable_pdf_highlights(self):
        with TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.pdf"
            output = Path(tmp) / "highlighted.pdf"
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((72, 72), "wrong word and wrong word")
            doc.save(source)
            doc.close()

            finding = SimpleNamespace(page="1", found="wrong", suggestion="right", reason="spelling")
            self.assertEqual(create_highlighted_pdf(source, [finding], output), (2, 1))

            result = fitz.open(output)
            annotations = list(result[0].annots())
            self.assertEqual(len(annotations), 2)
            self.assertEqual(annotations[0].info["content"], "wrong -> right\nspelling")
            result.close()

    def test_pymupdf_mode_never_calls_ocr(self):
        settings = SimpleNamespace(use_pymupdf=True)
        with (
            patch("app.pipeline.smart_extract_page", return_value="กำหนด\ue000ที่"),
            patch("app.pipeline.ocr_page") as ocr_page,
            patch("app.pipeline.openrouter_check", return_value="ไม่พบคำผิดชัดเจน"),
        ):
            process_page(Path("unused.pdf"), 16, 51, settings, [])
        ocr_page.assert_not_called()


if __name__ == "__main__":
    unittest_main()
