from __future__ import annotations

import argparse
import hashlib
import html.parser
import json
import os
import time
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener

from collection_common import find_row, read_inventory, relative_to_root, write_inventory
from download_source import append_note, safe_filename


USER_AGENT = "Rio-NBS-Explorer-Phase1/0.1"
DEFAULT_MAX_BYTES = 500 * 1024 * 1024


class DriveConfirmParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_form = False
        self.form_action = ""
        self.inputs: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        if tag == "form" and values.get("id") == "download-form":
            self.in_form = True
            self.form_action = values.get("action", "")
        elif tag == "input" and self.in_form:
            name = values.get("name")
            if name:
                self.inputs[name] = values.get("value", "")

    def handle_endtag(self, tag: str) -> None:
        if tag == "form":
            self.in_form = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download a public Google Drive file from an inventory row.")
    parser.add_argument("dataset_id", help="Dataset id from data/catalog/dataset-inventory.csv.")
    parser.add_argument("--filename", help="Stored filename.")
    parser.add_argument("--timeout", type=int, default=300, help="Network timeout in seconds.")
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    parser.add_argument("--allow-large", action="store_true")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def drive_file_id(url: str) -> str:
    parsed = urlparse(url)
    query_id = parse_qs(parsed.query).get("id")
    if query_id:
        return query_id[0]
    marker = "/file/d/"
    if marker in parsed.path:
        return parsed.path.split(marker, 1)[1].split("/", 1)[0]
    raise SystemExit(f"Could not infer Google Drive file id from URL: {url}")


def open_url(opener, url: str, timeout: int):
    request = Request(url, headers={"User-Agent": USER_AGENT})
    return opener.open(request, timeout=timeout)


def resolve_download_response(opener, source_url: str, timeout: int):
    file_id = drive_file_id(source_url)
    initial_url = f"https://drive.google.com/uc?{urlencode({'export': 'download', 'id': file_id})}"
    response = open_url(opener, initial_url, timeout)
    content_type = response.headers.get("Content-Type", "")
    if "text/html" not in content_type:
        return response

    body = response.read().decode("utf-8", errors="replace")
    parser = DriveConfirmParser()
    parser.feed(body)
    if not parser.form_action or not parser.inputs:
        raise SystemExit("Google Drive did not expose a public download confirmation form.")

    confirm_url = f"{parser.form_action}?{urlencode(parser.inputs)}"
    return open_url(opener, confirm_url, timeout)


def main() -> None:
    args = parse_args()
    rows = read_inventory()
    row = find_row(rows, args.dataset_id)
    storage_dir = relative_to_root(row["raw_storage_path"])
    storage_dir.mkdir(parents=True, exist_ok=True)

    opener = build_opener(HTTPCookieProcessor())
    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    started = time.time()

    response = resolve_download_response(opener, row["source_url"], args.timeout)
    content_type = response.headers.get("Content-Type")
    content_length_header = response.headers.get("Content-Length")
    content_length = int(content_length_header) if content_length_header else None
    if content_length and content_length > args.max_bytes and not args.allow_large:
        raise SystemExit(f"Refusing large download ({content_length} bytes). Use --allow-large if intentional.")

    filename = args.filename
    if not filename:
        disposition = response.headers.get("Content-Disposition", "")
        filename = row["id"] + ".bin"
        if "filename=" in disposition:
            filename = disposition.split("filename=", 1)[1].strip("\"'; ")

    target = storage_dir / safe_filename(filename)
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
