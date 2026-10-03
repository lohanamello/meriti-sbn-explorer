from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from collection_common import find_row, read_inventory, relative_to_root, write_inventory
from download_source import append_note, safe_filename


DEFAULT_MAX_BYTES = 500 * 1024 * 1024
USER_AGENT = "Rio-NBS-Explorer-Phase1/0.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download an Overpass API extract from a saved query.")
    parser.add_argument("dataset_id", help="Dataset id from data/catalog/dataset-inventory.csv.")
    parser.add_argument("--query-file", required=True, help="Path to the Overpass QL query file.")
    parser.add_argument("--filename", default="overpass_extract.json", help="Stored raw JSON filename.")
    parser.add_argument("--timeout", type=int, default=360)
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    parser.add_argument("--allow-large", action="store_true")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = read_inventory()
    row = find_row(rows, args.dataset_id)
    query_path = relative_to_root(args.query_file)
    query = query_path.read_text(encoding="utf-8")
    query_hash = hashlib.sha256(query.encode("utf-8")).hexdigest()

    storage_dir = relative_to_root(row["raw_storage_path"])
    storage_dir.mkdir(parents=True, exist_ok=True)
    target = storage_dir / safe_filename(args.filename)
    if target.exists() and not args.force:
        raise SystemExit(f"File already exists; use --force to overwrite: {target}")

    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    started = time.time()
    body = urlencode({"data": query}).encode("utf-8")
    request = Request(
        row["source_url"],
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )

    digest = hashlib.sha256()
    bytes_written = 0
    with urlopen(request, timeout=args.timeout) as response:
        content_type = response.headers.get("Content-Type")
        content_length_header = response.headers.get("Content-Length")
        content_length = int(content_length_header) if content_length_header else None
        if content_length and content_length > args.max_bytes and not args.allow_large:
            raise SystemExit(f"Refusing large download ({content_length} bytes). Use --allow-large if intentional.")

        temp = target.with_suffix(target.suffix + ".part")
        with temp.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > args.max_bytes and not args.allow_large:
                    temp.unlink(missing_ok=True)
                    raise SystemExit("Download exceeded max bytes. Use --allow-large if intentional.")
                digest.update(chunk)
                handle.write(chunk)
        os.replace(temp, target)

    finished_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
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
        "stored_filename": target.name,
        "content_type": content_type,
        "content_length_header": content_length,
        "bytes_written": bytes_written,
        "sha256": digest.hexdigest(),
        "query_path": str(query_path.relative_to(relative_to_root("."))).replace("\\", "/"),
        "query_sha256": query_hash,
    }
    (storage_dir / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    row["collection_status"] = "downloaded"
    row["access_status"] = "public"
    row["collected_at"] = finished_at
    row["notes"] = append_note(row["notes"], f"Downloaded {target.name}; Overpass query and sha256 in provenance.json")
    write_inventory(rows)

    print(f"downloaded {args.dataset_id}")
    print(f"stored {provenance['stored_path']}")
    print(f"sha256 {provenance['sha256']}")


if __name__ == "__main__":
    main()
