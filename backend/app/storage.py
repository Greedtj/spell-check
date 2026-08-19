import json
import shutil
from pathlib import Path

from .config import get_settings


def local_path(key: str) -> Path:
    root = Path(get_settings().local_storage_path).resolve()
    path = (root / key).resolve()
    if root != path and root not in path.parents:
        raise ValueError("Invalid storage key")
    return path


def metadata_path(key: str) -> Path:
    return local_path(f"{key}.metadata.json")


def upload_file(path: Path, key: str, content_type: str = "application/octet-stream", metadata: dict | None = None):
    destination = local_path(key)
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, destination)
    if metadata:
        metadata_path(key).write_text(json.dumps({name: str(value) for name, value in metadata.items()}), encoding="utf-8")


def download_file(key: str, path: Path):
    source = local_path(key)
    if not source.is_file():
        raise FileNotFoundError(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, path)


def object_metadata(key: str) -> dict | None:
    path = metadata_path(key)
    return json.loads(path.read_text(encoding="utf-8")) if path.is_file() else None


def delete_file(key: str):
    local_path(key).unlink(missing_ok=True)
    metadata_path(key).unlink(missing_ok=True)
