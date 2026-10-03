from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
INVENTORY_PATH = ROOT / "data" / "catalog" / "dataset-inventory.csv"

INVENTORY_FIELDS = [
    "id",
    "source_name",
    "source_institution",
    "source_url",
    "acquisition_route",
    "access_status",
    "license",
    "spatial_coverage",
    "spatial_resolution",
    "temporal_coverage",
    "format",
    "crs",
    "evidence_family",
    "potential_use",
    "known_limitations",
    "raw_storage_path",
    "collection_status",
    "promotion_status",
    "collected_at",
    "notes",
]

COLLECTION_STATUSES = {
    "discovered",
    "downloaded",
    "manual_required",
    "blocked",
    "unavailable",
    "superseded",
}

PROMOTION_STATUSES = {
    "not_reviewed",
    "candidate",
    "promoted",
    "rejected",
    "deferred",
}

EVIDENCE_FAMILIES = {
    "Vulnerability, demographics, and social conditions",
    "Sanitation and drainage",
    "Flooding, inundation, and urban water risk",
    "Vegetation cover and green infrastructure",
    "Impervious surface and land use",
    "Public facilities, public land, and intervention opportunity spaces",
    "Temporal evidence",
    "Administrative boundaries and territorial reference layers",
    "Supporting context",
}

RAW_FOLDERS = [
    "_manual",
    "_snapshots",
    "ibge",
    "ana",
    "data-rio",
    "ipp",
    "inea",
    "mapbiomas",
    "alerta-rio",
    "snis",
    "sgb-cprm",
    "osm",
    "academic",
    "ceperj",
    "sinisa",
]

ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*__[a-z0-9]+(?:_[a-z0-9]+)*__[a-z0-9]+(?:_[a-z0-9]+)*$")


def read_inventory(path: Path = INVENTORY_PATH) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [normalize_row(row) for row in reader]


def write_inventory(rows: Iterable[dict[str, str]], path: Path = INVENTORY_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=INVENTORY_FIELDS, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow(normalize_row(row))


def normalize_row(row: dict[str, str | None]) -> dict[str, str]:
    return {field: (row.get(field) or "").strip() for field in INVENTORY_FIELDS}


def find_row(rows: list[dict[str, str]], dataset_id: str) -> dict[str, str]:
    for row in rows:
        if row["id"] == dataset_id:
            return row
    raise SystemExit(f"Dataset id not found in inventory: {dataset_id}")


def relative_to_root(path_text: str) -> Path:
    path = Path(path_text)
    if path.is_absolute():
        try:
            path.relative_to(ROOT)
        except ValueError as exc:
            raise SystemExit(f"Path must stay inside project root: {path}") from exc
        return path
    return ROOT / path


def ensure_phase1_directories() -> None:
    for relative in [
        "data/catalog",
        "docs/sources",
        "docs/methodology",
        "scripts/collect",
    ]:
        (ROOT / relative).mkdir(parents=True, exist_ok=True)

    for folder in RAW_FOLDERS:
        path = ROOT / "data" / "raw" / folder
        path.mkdir(parents=True, exist_ok=True)
        keep = path / ".gitkeep"
        if not keep.exists():
            keep.write_text("\n", encoding="utf-8")


def split_evidence_families(value: str) -> list[str]:
    return [part.strip() for part in value.split(";") if part.strip()]
