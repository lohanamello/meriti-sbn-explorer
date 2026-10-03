from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen

from collection_common import find_row, read_inventory, relative_to_root, write_inventory


DEFAULT_MAX_BYTES = 500 * 1024 * 1024
USER_AGENT = "Rio-NBS-Explorer-Phase1/0.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download one inventory source and record provenance.")
    parser.add_argument("dataset_id", help="Dataset id from data/catalog/dataset-inventory.csv.")
    parser.add_argument("--filename", help="Stored filename. Defaults to URL/content-type inference.")
    parser.add_argument(
        "--allow-large",
        action="store_true",
        help="Allow downloads larger than the default 500 MB safety limit.",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=DEFAULT_MAX_BYTES,
        help="Maximum bytes unless --allow-large is used.",
    )
    parser.add_argument("--timeout", type=int, default=120, help="Network timeout in seconds.")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing stored file.")
    return parser.parse_args()


def infer_filename(url: str, content_type: str | None, dataset_id: str) -> str:
    parsed = urlparse(url)
    name = Path(unquote(parsed.path)).name
    if name and "." in name:
        return safe_filename(name)

    extension = ".bin"
    if content_type:
        guessed = mimetypes.guess_extension(content_type.split(";", 1)[0].strip())
        if guessed:
            extension = guessed
        elif "json" in content_type:
            extension = ".json"
        elif "html" in content_type:
            extension = ".html"

    return safe_filename(f"{dataset_id}{extension}")


def safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned or "download.bin"


def append_note(existing: str, note: str) -> str:
    if not existing:
        return note
    if note in existing:
        return existing
    return f"{existing} | {note}"


def download(row: dict[str, str], args: argparse.Namespace) -> dict[str, object]:
    source_url = row["source_url"]
    if not source_url.startswith(("http://", "https://")):
        raise SystemExit(f"source_url is not downloadable: {source_url}")

    storage_dir = relative_to_root(row["raw_storage_path"])
    storage_dir.mkdir(parents=True, exist_ok=True)

    request = Request(source_url, headers={"User-Agent": USER_AGENT})
    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    started = time.time()

    try:
        with urlopen(request, timeout=args.timeout) as response:
            content_type = response.headers.get("Content-Type")
            content_length_header = response.headers.get("Content-Length")
            content_length = int(content_length_header) if content_length_header else None
            if content_length and content_length > args.max_bytes and not args.allow_large:
                raise SystemExit(
                    "Refusing large download "
                    f"({content_length} bytes). Re-run with --allow-large if intentional."
                )

            filename = args.filename or infer_filename(source_url, content_type, row["id"])
            target = storage_dir / filename
            if target.exists() and not args.force:
                raise SystemExit(f"File already exists; use --force to overwrite: {target}")

            temp = target.with_suffix(target.suffix + ".part")
            digest = hashlib.sha256()
            bytes_written = 0
            with temp.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    bytes_written += len(chunk)
                    if bytes_written > args.max_bytes and not args.allow_large:
                        temp.unlink(missing_ok=True)
                        raise SystemExit(
                            "Download exceeded max bytes. Re-run with --allow-large if intentional."
                        )
                    digest.update(chunk)
                    handle.write(chunk)
            if content_length is not None and bytes_written != content_length:
                temp.unlink(missing_ok=True)
                raise SystemExit(
                    "Downloaded byte count does not match Content-Length: "
                    f"expected {content_length}, got {bytes_written}"
                )
            os.replace(temp, target)
    except HTTPError as exc:
        raise SystemExit(f"HTTP error for {row['id']}: {exc.code} {exc.reason}") from exc
    except URLError as exc:
        raise SystemExit(f"Network error for {row['id']}: {exc.reason}") from exc

    finished_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "id": row["id"],
        "source_name": row["source_name"],
        "source_institution": row["source_institution"],
        "source_url": source_url,
        "acquisition_route": row["acquisition_route"],
        "downloaded_at": finished_at,
        "started_at": started_at,
        "duration_seconds": round(time.time() - started, 3),
        "stored_path": str(target.relative_to(relative_to_root("."))).replace("\\", "/"),
        "original_filename": Path(urlparse(source_url).path).name or None,
        "stored_filename": target.name,
        "content_type": content_type,
        "content_encoding": response.headers.get("Content-Encoding"),
        "content_length_header": content_length,
        "bytes_written": bytes_written,
        "sha256": digest.hexdigest(),
    }


def main() -> None:
    args = parse_args()
    rows = read_inventory()
    row = find_row(rows, args.dataset_id)
    provenance = download(row, args)

    storage_dir = relative_to_root(row["raw_storage_path"])
    provenance_path = storage_dir / "provenance.json"
    provenance_path.write_text(json.dumps(provenance, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    row["collection_status"] = "downloaded"
    row["access_status"] = "public"
    row["collected_at"] = str(provenance["downloaded_at"])
    row["notes"] = append_note(row["notes"], f"Downloaded {provenance['stored_filename']}; sha256 in provenance.json")
    write_inventory(rows)

    print(f"downloaded {args.dataset_id}")
    print(f"stored {provenance['stored_path']}")
    print(f"sha256 {provenance['sha256']}")


if __name__ == "__main__":
    main()
