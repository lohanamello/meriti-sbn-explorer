from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import time
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from collection_common import find_row, read_inventory, relative_to_root, write_inventory
from download_source import append_note, safe_filename


USER_AGENT = "Rio-NBS-Explorer-Phase1/0.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Resume a large direct HTTP download from an inventory row.")
    parser.add_argument("dataset_id", help="Dataset id from data/catalog/dataset-inventory.csv.")
    parser.add_argument("--filename", required=True, help="Stored filename.")
    parser.add_argument("--timeout", type=int, default=600)
    parser.add_argument("--retries", type=int, default=20)
    parser.add_argument("--force", action="store_true", help="Delete an existing target and restart.")
    return parser.parse_args()


def parse_total_size(headers) -> int | None:
    content_range = headers.get("Content-Range")
    if content_range and "/" in content_range:
        total = content_range.rsplit("/", 1)[1]
        if total.isdigit():
            return int(total)
    content_length = headers.get("Content-Length")
    if content_length and content_length.isdigit():
        return int(content_length)
    return None


def sha256_file(path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    rows = read_inventory()
    row = find_row(rows, args.dataset_id)
    storage_dir = relative_to_root(row["raw_storage_path"])
    storage_dir.mkdir(parents=True, exist_ok=True)
    target = storage_dir / safe_filename(args.filename)

    if args.force and target.exists():
        target.unlink()

    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    started = time.time()
    total_size: int | None = None
    content_type = None
    content_encoding = None
    attempts = 0

    while attempts < args.retries:
        current_size = target.stat().st_size if target.exists() else 0
        headers = {"User-Agent": USER_AGENT}
        if current_size:
            headers["Range"] = f"bytes={current_size}-"

        request = Request(row["source_url"], headers=headers)
        try:
            with urlopen(request, timeout=args.timeout) as response:
                status = getattr(response, "status", None)
                content_type = response.headers.get("Content-Type")
                content_encoding = response.headers.get("Content-Encoding")
                response_total = parse_total_size(response.headers)

                if current_size and status == 200:
                    raise SystemExit("Server ignored Range request; refusing to append to existing file.")
                if status == 206 and response_total:
                    total_size = response_total
                elif status == 200 and response_total:
                    total_size = response_total

                mode = "ab" if current_size else "wb"
                before = current_size
                with target.open(mode) as handle:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        handle.write(chunk)

                current_size = target.stat().st_size
                if total_size and current_size >= total_size:
                    break
                if current_size == before:
                    attempts += 1
                else:
                    attempts = 0
        except (TimeoutError, URLError, http.client.IncompleteRead) as exc:
            attempts += 1
            if attempts >= args.retries:
                raise SystemExit(f"Download failed after {attempts} retries: {exc}") from exc
            time.sleep(min(10, attempts))

    final_size = target.stat().st_size if target.exists() else 0
    if total_size and final_size != total_size:
        raise SystemExit(f"Download incomplete: expected {total_size} bytes, got {final_size}")

    finished_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    digest = sha256_file(target)
    provenance = {
        "id": row["id"],
        "source_name": row["source_name"],
        "source_institution": row["source_institution"],
        "source_url": row["source_url"],
        "acquisition_route": row["acquisition_route"],
        "downloaded_at": finished_at,
        "started_at": started_at,
        "duration_seconds": round(time.time() - started, 3),
        "stored_path": str(target.relative_to(relative_to_root("."))).replace("\\", "/"),
        "original_filename": os.path.basename(urlparse(row["source_url"]).path) or None,
        "stored_filename": target.name,
        "content_type": content_type,
        "content_encoding": content_encoding,
        "content_length_header": total_size,
        "bytes_written": final_size,
        "sha256": digest,
        "resumable": True,
    }
    (storage_dir / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    row["collection_status"] = "downloaded"
    row["access_status"] = "public"
    row["collected_at"] = finished_at
    row["notes"] = append_note(row["notes"], f"Downloaded {target.name}; sha256 in provenance.json")
    write_inventory(rows)

    print(f"downloaded {args.dataset_id}")
    print(f"stored {provenance['stored_path']}")
    print(f"sha256 {provenance['sha256']}")


if __name__ == "__main__":
    main()
