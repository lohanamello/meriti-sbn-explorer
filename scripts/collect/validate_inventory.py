from __future__ import annotations

import argparse
from pathlib import Path

from collection_common import (
    COLLECTION_STATUSES,
    EVIDENCE_FAMILIES,
    ID_PATTERN,
    INVENTORY_FIELDS,
    INVENTORY_PATH,
    PROMOTION_STATUSES,
    read_inventory,
    relative_to_root,
    split_evidence_families,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Phase 1 dataset inventory.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    errors: list[str] = []
    warnings: list[str] = []

    if not INVENTORY_PATH.exists():
        raise SystemExit(f"Missing inventory: {INVENTORY_PATH}")

    header = INVENTORY_PATH.read_text(encoding="utf-8").splitlines()[0].split(",")
    if header != INVENTORY_FIELDS:
        errors.append("Inventory header does not match required Phase 1 schema.")

    rows = read_inventory()
    seen: set[str] = set()

    for index, row in enumerate(rows, start=2):
        dataset_id = row["id"]
        label = dataset_id or f"row {index}"

        if not dataset_id:
            errors.append(f"{label}: missing id")
            continue
        if dataset_id in seen:
            errors.append(f"{label}: duplicate id")
        seen.add(dataset_id)
        if not ID_PATTERN.match(dataset_id):
            errors.append(f"{label}: id must match family__dataset__period style")

        for field in INVENTORY_FIELDS:
            if field == "collected_at":
                continue
            if not row[field]:
                errors.append(f"{label}: missing required field {field}")

        if row["collection_status"] not in COLLECTION_STATUSES:
            errors.append(f"{label}: invalid collection_status {row['collection_status']}")
        if row["promotion_status"] not in PROMOTION_STATUSES:
            errors.append(f"{label}: invalid promotion_status {row['promotion_status']}")

        families = split_evidence_families(row["evidence_family"])
        if not families:
            errors.append(f"{label}: missing evidence_family")
        for family in families:
            if family not in EVIDENCE_FAMILIES:
                errors.append(f"{label}: unknown evidence_family {family}")

        raw_path = relative_to_root(row["raw_storage_path"])
        try:
            raw_path.relative_to(relative_to_root("data/raw"))
        except ValueError:
            errors.append(f"{label}: raw_storage_path must be under data/raw")

        if row["collection_status"] == "downloaded":
            if not raw_path.exists():
                errors.append(f"{label}: downloaded raw_storage_path does not exist")
            if not (raw_path / "provenance.json").exists():
                errors.append(f"{label}: downloaded source missing provenance.json")
            raw_files = [
                item
                for item in raw_path.iterdir()
                if item.is_file() and item.name not in {"README.md", "provenance.json", ".gitkeep"}
            ] if raw_path.exists() else []
            if not raw_files:
                errors.append(f"{label}: downloaded source has no raw file in storage path")

        if row["collection_status"] in {"manual_required", "blocked", "unavailable"}:
            note_text = f"{row['known_limitations']} {row['notes']}".strip()
            if len(note_text) < 20:
                errors.append(f"{label}: blocked/manual/unavailable source needs a useful note")

        if row["collection_status"] == "discovered" and row["promotion_status"] == "promoted":
            errors.append(f"{label}: discovered source cannot be promoted in Phase 1")

        if row["source_url"].startswith("http://") and "websempre.rio.rj.gov.br" not in row["source_url"]:
            warnings.append(f"{label}: source_url is HTTP, not HTTPS")

    if errors:
        print("Inventory validation failed:")
        for error in errors:
            print(f"- {error}")
    if warnings:
        print("Inventory validation warnings:")
        for warning in warnings:
            print(f"- {warning}")

    if errors or (warnings and args.strict):
        raise SystemExit(1)

    print(f"Inventory valid: {len(rows)} records")


if __name__ == "__main__":
    main()
