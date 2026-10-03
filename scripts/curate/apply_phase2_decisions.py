"""Apply Phase 2 promotion decisions to data/catalog/dataset-inventory.csv."""

from __future__ import annotations

import csv
import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
INVENTORY_PATH = PROJECT_ROOT / "data" / "catalog" / "dataset-inventory.csv"
DECISIONS_PATH = PROJECT_ROOT / "scripts" / "curate" / "phase2_decisions.json"
PHASE2_MARKER = " | Phase 2:"


def main() -> None:
    decisions = json.loads(DECISIONS_PATH.read_text(encoding="utf-8"))["decisions"]

    with INVENTORY_PATH.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        fieldnames = reader.fieldnames

    if not fieldnames:
        raise ValueError("Inventory CSV has no header")

    inventory_ids = {row["id"] for row in rows}
    missing = sorted(set(decisions) - inventory_ids)
    if missing:
        raise ValueError(f"Phase 2 decisions missing inventory rows: {missing}")

    for row in rows:
        decision = decisions.get(row["id"])
        if not decision:
            continue

        row["promotion_status"] = decision["promotion_status"]
        base_notes = row.get("notes", "").split(PHASE2_MARKER, 1)[0].strip()
        phase2_note = (
            f"{decision['promotion_status']} - "
            f"{decision['curated_use']} Reason: {decision['phase2_reason']} "
            f"Limitation: {decision['phase2_limitations']}"
        )
        row["notes"] = f"{base_notes}{PHASE2_MARKER} {phase2_note}".strip()

    with INVENTORY_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Applied {len(decisions)} Phase 2 inventory decisions.")


if __name__ == "__main__":
    main()
