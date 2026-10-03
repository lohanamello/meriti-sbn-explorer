from __future__ import annotations

import argparse
import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from urllib.request import Request, urlopen

from collection_common import find_row, read_inventory, relative_to_root, write_inventory


USER_AGENT = "Rio-NBS-Explorer-Phase1/0.1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download a complete ArcGIS layer query using objectId batches."
    )
    parser.add_argument("dataset_id", help="Dataset id from data/catalog/dataset-inventory.csv.")
    parser.add_argument("--filename", required=True, help="Stored JSON filename.")
    parser.add_argument("--batch-size", type=int, default=500, help="Object ids per request.")
    parser.add_argument("--timeout", type=int, default=120, help="Network timeout in seconds.")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing stored file.")
    return parser.parse_args()


def append_note(existing: str, note: str) -> str:
    if not existing:
        return note
    if note in existing:
        return existing
    return f"{existing} | {note}"


def single_value_params(query: str) -> dict[str, str]:
    parsed = parse_qs(query, keep_blank_values=True)
    return {key: values[-1] if values else "" for key, values in parsed.items()}


def request_json(url: str, params: dict[str, str], timeout: int) -> dict[str, object]:
    data = urlencode(params).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        payload = response.read()
    decoded = json.loads(payload.decode("utf-8"))
    if "error" in decoded:
        raise SystemExit(f"ArcGIS error: {decoded['error']}")
    return decoded


def chunks(values: list[int], size: int) -> list[list[int]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def download(row: dict[str, str], args: argparse.Namespace) -> dict[str, object]:
    parsed = urlparse(row["source_url"])
    if parsed.scheme not in {"http", "https"} or not parsed.path.endswith("/query"):
        raise SystemExit("source_url must be an ArcGIS layer /query URL")

    query_url = urlunparse(parsed._replace(query="", fragment=""))
    base_params = single_value_params(parsed.query)
    base_params.setdefault("where", "1=1")
    base_params.setdefault("outFields", "*")
    base_params.setdefault("returnGeometry", "true")
    base_params["f"] = "json"

    storage_dir = relative_to_root(row["raw_storage_path"])
    storage_dir.mkdir(parents=True, exist_ok=True)
    target = storage_dir / args.filename
    if target.exists() and not args.force:
        raise SystemExit(f"File already exists; use --force to overwrite: {target}")

    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    started = time.time()

    id_params = {
        "f": "json",
        "where": base_params["where"],
        "returnIdsOnly": "true",
        "returnGeometry": "false",
    }
    id_response = request_json(query_url, id_params, args.timeout)
    object_id_field = str(id_response.get("objectIdFieldName") or "OBJECTID")
    object_ids = [int(value) for value in id_response.get("objectIds") or []]
    object_ids.sort()

    responses: list[dict[str, object]] = []
    for batch in chunks(object_ids, args.batch_size):
        batch_params = dict(base_params)
        batch_params["objectIds"] = ",".join(str(value) for value in batch)
        response = request_json(query_url, batch_params, args.timeout)
        responses.append(response)

    payload = {
        "phase1_arcgis_capture": {
            "source_url": row["source_url"],
            "query_url": query_url,
            "request_params": base_params,
            "object_id_field": object_id_field,
            "object_id_count": len(object_ids),
            "batch_size": args.batch_size,
            "batch_count": len(responses),
            "downloaded_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        },
        "object_ids": object_ids,
        "responses": responses,
    }

    encoded = json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(encoded).hexdigest()
    temp = target.with_suffix(target.suffix + ".part")
    temp.write_bytes(encoded)
    os.replace(temp, target)

    finished_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
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
        "content_type": "application/json",
        "bytes_written": target.stat().st_size,
        "sha256": digest,
        "object_id_field": object_id_field,
        "object_id_count": len(object_ids),
        "batch_size": args.batch_size,
        "batch_count": len(responses),
    }


def main() -> None:
    args = parse_args()
    if args.batch_size < 1:
        raise SystemExit("--batch-size must be positive")

    rows = read_inventory()
    row = find_row(rows, args.dataset_id)
    provenance = download(row, args)

    storage_dir = relative_to_root(row["raw_storage_path"])
    provenance_path = storage_dir / "provenance.json"
    provenance_path.write_text(json.dumps(provenance, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    row["collection_status"] = "downloaded"
    row["access_status"] = "public"
    row["collected_at"] = str(provenance["downloaded_at"])
    row["notes"] = append_note(
        row["notes"],
        f"Downloaded {provenance['stored_filename']}; {provenance['object_id_count']} objectIds; sha256 in provenance.json",
    )
    write_inventory(rows)

    print(f"downloaded {args.dataset_id}")
    print(f"stored {provenance['stored_path']}")
    print(f"objectIds {provenance['object_id_count']}")
    print(f"sha256 {provenance['sha256']}")


if __name__ == "__main__":
    main()
