from __future__ import annotations

import argparse
from datetime import datetime, timezone

from collection_common import INVENTORY_FIELDS, find_row, read_inventory, write_inventory


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Append or update one Phase 1 inventory record.")
    parser.add_argument("--id", required=True, help="Stable dataset id.")
    parser.add_argument(
        "--set",
        dest="updates",
        action="append",
        default=[],
        metavar="FIELD=VALUE",
        help="Field assignment. Can be repeated.",
    )
    parser.add_argument(
        "--touch-collected-at",
        action="store_true",
        help="Set collected_at to the current UTC timestamp.",
    )
    return parser.parse_args()


def parse_updates(assignments: list[str]) -> dict[str, str]:
    updates: dict[str, str] = {}
    for assignment in assignments:
        if "=" not in assignment:
            raise SystemExit(f"Invalid --set assignment: {assignment}")
        field, value = assignment.split("=", 1)
        field = field.strip()
        if field not in INVENTORY_FIELDS:
            raise SystemExit(f"Unknown inventory field: {field}")
        updates[field] = value.strip()
    return updates


def main() -> None:
    args = parse_args()
    rows = read_inventory()
    try:
        row = find_row(rows, args.id)
    except SystemExit:
        row = {field: "" for field in INVENTORY_FIELDS}
        row["id"] = args.id
        rows.append(row)

    row.update(parse_updates(args.updates))
    if args.touch_collected_at:
        row["collected_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")

    write_inventory(rows)
    print(f"registered {args.id}")


if __name__ == "__main__":
    main()
