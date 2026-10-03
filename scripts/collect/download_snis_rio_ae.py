from __future__ import annotations

import argparse
import hashlib
import json
import time
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, Request, build_opener

from collection_common import find_row, read_inventory, relative_to_root, write_inventory
from download_source import append_note


BASE_URL = "https://app4.cidades.gov.br/serieHistorica"
USER_AGENT = "Rio-NBS-Explorer-Phase1/0.1"
FAMILY_IDS = ["1", "2", "3", "4", "5", "8", "9", "10", "11", "13"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download SNIS Serie Historica AE aggregate data for Rio de Janeiro.")
    parser.add_argument("dataset_id", help="Dataset id from data/catalog/dataset-inventory.csv.")
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def post_json(opener, url: str, data: dict[str, object] | list[tuple[str, str]], timeout: int) -> dict:
    body = urlencode(data, doseq=True).encode("utf-8")
    request = Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    with opener.open(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def get(opener, url: str, timeout: int) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with opener.open(request, timeout=timeout) as response:
        return response.read()


def flatten_select_options(value) -> list[str]:
    values: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            if isinstance(child, dict):
                values.extend(flatten_select_options(child))
            else:
                values.append(key.replace("xxx", ""))
    return values


def select_options(opener, element: str, dependencies: list[tuple[str, str]], timeout: int) -> dict:
    body: list[tuple[str, str]] = [
        ("ajax", "1"),
        ("action", ""),
        ("element", element),
    ]
    for key, value in dependencies:
        body.append((f"dependencies[{key}][]", value))
    return post_json(opener, f"{BASE_URL}/Agregado/getSelectOpt", body, timeout)


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
    raw_files = [item for item in storage_dir.iterdir() if item.is_file() and item.name != "provenance.json"]
    if raw_files and not args.force:
        raise SystemExit(f"Raw files already exist in {storage_dir}; use --force to overwrite.")

    opener = build_opener(HTTPCookieProcessor())
    started_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    started = time.time()

    get(opener, f"{BASE_URL}/aguaEsgoto/index", args.timeout)
    index_response = post_json(opener, f"{BASE_URL}/agregado/index", {"ajax": "1", "action": "index"}, args.timeout)

    years_response = select_options(opener, "ano_ref", [], args.timeout)
    years = sorted(flatten_select_options(years_response["arrSelect"]["ano_ref"]))

    psv_dependencies = [("sgl_est", "RJ")] + [("ano_ref", year) for year in years]
    psv_response = select_options(opener, "cod_psv", psv_dependencies, args.timeout)
    psv_options = psv_response["arrSelect"]["cod_psv"].get("Rio de Janeiro", {})
    provider_codes = [
        key.replace("xxx", "")
        for key, label in psv_options.items()
        if "Rio de Janeiro/RJ" in label
    ]

    glossary_dependencies = [("cod_fam_info", family_id) for family_id in FAMILY_IDS]
    glossary_response = select_options(opener, "fk_glossario", glossary_dependencies, args.timeout)
    glossary_codes = sorted(set(flatten_select_options(glossary_response["arrSelect"]["fk_glossario"])))

    serialized_items: list[tuple[str, str]] = []
    for year in years:
        serialized_items.append(("ShAgregados[ano_ref][]", year))
    serialized_items.append(("ShAgregados[sgl_est][]", "RJ"))
    for provider_code in provider_codes:
        serialized_items.append(("ShAgregados[cod_psv][]", provider_code))
    for family_id in FAMILY_IDS:
        serialized_items.append(("ShAgregados[cod_fam_info][]", family_id))
    for glossary_code in glossary_codes:
        serialized_items.append(("ShAgregados[fk_glossario][]", glossary_code))
    serialized = urlencode(serialized_items, doseq=True)

    search_id = f"rio-ae-{int(time.time())}"
    post_json(
        opener,
        f"{BASE_URL}/agregado/getGridConfig",
        {"data": serialized, "starting": "1", "search-id": search_id},
        args.timeout,
    )

    config_response = {}
    for _ in range(120):
        time.sleep(1)
        config_response = post_json(
            opener,
            f"{BASE_URL}/agregado/getGridConfig",
            {"search-id": search_id},
            args.timeout,
        )
        if config_response.get("isFinished"):
            break
    if not config_response.get("isFinished"):
        raise SystemExit("SNIS grid configuration did not finish in time.")

    rows_per_page = 100
    first_page = post_json(
        opener,
        f"{BASE_URL}/agregado/getGridData",
        {
            "page": "1",
            "rows": str(rows_per_page),
            "sidx": "a.sgl_est,a.nom_mun,a.ano_ref",
            "sord": "DESC",
            "data": serialized,
        },
        args.timeout,
    )
    if first_page.get("status") == "erro":
        raise SystemExit(f"SNIS grid data error: {first_page.get('msg')}")

    total_pages = int(first_page.get("total") or 1)
    page_responses = [first_page]
    for page in range(2, total_pages + 1):
        page_response = post_json(
            opener,
            f"{BASE_URL}/agregado/getGridData",
            {
                "page": str(page),
                "rows": str(rows_per_page),
                "sidx": "a.sgl_est,a.nom_mun,a.ano_ref",
                "sord": "DESC",
                "data": serialized,
            },
            args.timeout,
        )
        if page_response.get("status") == "erro":
            raise SystemExit(f"SNIS grid data error on page {page}: {page_response.get('msg')}")
        page_responses.append(page_response)

    grid_response = {
        "page_size": rows_per_page,
        "total_pages": total_pages,
        "records": first_page.get("records"),
        "pages": page_responses,
    }

    files = {
        "snis_rio_ae_index_response.json": index_response,
        "snis_rio_ae_year_options.json": years_response,
        "snis_rio_ae_provider_options.json": psv_response,
        "snis_rio_ae_glossary_options.json": glossary_response,
        "snis_rio_ae_grid_config.json": config_response,
        "snis_rio_ae_grid_data.json": grid_response,
        "snis_rio_ae_query.json": {
            "years": years,
            "provider_codes": provider_codes,
            "family_ids": FAMILY_IDS,
            "glossary_codes": glossary_codes,
            "serialized_query": serialized,
        },
    }

    written_files = []
    for filename, payload in files.items():
        path = storage_dir / filename
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written_files.append(path)

    finished_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    total_bytes = sum(path.stat().st_size for path in written_files)
    provenance = {
        "id": row["id"],
        "source_name": row["source_name"],
        "source_institution": row["source_institution"],
        "source_url": row["source_url"],
        "acquisition_route": row["acquisition_route"],
        "downloaded_at": finished_at,
        "started_at": started_at,
        "duration_seconds": round(time.time() - started, 3),
        "stored_path": str(storage_dir.relative_to(relative_to_root("."))).replace("\\", "/"),
        "stored_files": [str(path.relative_to(relative_to_root("."))).replace("\\", "/") for path in written_files],
        "bytes_written": total_bytes,
        "sha256_by_file": {path.name: sha256_file(path) for path in written_files},
        "query_summary": {
            "years": years,
            "provider_codes": provider_codes,
            "family_count": len(FAMILY_IDS),
            "glossary_code_count": len(glossary_codes),
            "grid_records": grid_response.get("records"),
            "grid_pages": total_pages,
        },
    }
    (storage_dir / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    row["collection_status"] = "downloaded"
    row["access_status"] = "public"
    row["collected_at"] = finished_at
    row["notes"] = append_note(
        row["notes"],
        f"Downloaded SNIS AE Rio JSON export; {grid_response.get('records')} grid records; sha256_by_file in provenance.json",
    )
    write_inventory(rows)

    print(f"downloaded {args.dataset_id}")
    print(f"stored {provenance['stored_path']}")
    print(f"records {grid_response.get('records')}")


if __name__ == "__main__":
    main()
