from __future__ import annotations

from collection_common import INVENTORY_PATH, ensure_phase1_directories, write_inventory


def main() -> None:
    ensure_phase1_directories()
    if not INVENTORY_PATH.exists():
        write_inventory([])
        print(f"created {INVENTORY_PATH.relative_to(INVENTORY_PATH.parents[2])}")
    else:
        print(f"exists {INVENTORY_PATH.relative_to(INVENTORY_PATH.parents[2])}")


if __name__ == "__main__":
    main()
