from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest import TestCase, main as unittest_main
from unittest.mock import patch

from app import storage


class LocalStorageTest(TestCase):
    def test_stores_downloads_metadata_and_deletes_inside_local_root(self):
        with TemporaryDirectory() as tmp:
            source = Path(tmp) / "source.pdf"
            copied = Path(tmp) / "copied.pdf"
            source.write_bytes(b"pdf")
            settings = SimpleNamespace(local_storage_path=tmp)
            with patch.object(storage, "get_settings", return_value=settings):
                storage.upload_file(source, "jobs/one/original.pdf", metadata={"pages": 1})
                self.assertEqual(storage.object_metadata("jobs/one/original.pdf"), {"pages": "1"})
                storage.download_file("jobs/one/original.pdf", copied)
                storage.delete_file("jobs/one/original.pdf")
            self.assertEqual(copied.read_bytes(), b"pdf")
            self.assertFalse((Path(tmp) / "jobs/one/original.pdf").exists())


if __name__ == "__main__":
    unittest_main()
