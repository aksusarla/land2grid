#!/usr/bin/env python3
"""Pull project data from a shared Google Sheet into data/projects.json.

WHY THIS EXISTS
----------------
The "Find Projects" map (dashboard.html) reads its project list from
data/projects.json at page-load time. That file is the source of truth
in the repo and can always be hand-edited directly. This script is an
optional convenience on top of that: if your team would rather update
project status in a shared Google Sheet than edit JSON, run this script
to regenerate data/projects.json from that sheet, then commit and push
as usual. Nothing on the live site changes until you do.

ONE-TIME SHEET SETUP
---------------------
1. Create a Google Sheet with exactly these column headers in row 1
   (order doesn't matter, names must match):

     State | Project Name | Capacity MW | Stage | Stage Done |
     Land Status | Connectivity Status | PPA Status |
     Latitude | Longitude | Last Updated | Documents

   - "Stage" is the short badge shown on the card (e.g. "Early stage",
     "Load application pending", "LFS completed").
   - "Stage Done" marks a badge that should render green: put TRUE,
     Yes, or 1 in that column (anything else is treated as not done).
   - "Latitude"/"Longitude" are the real coordinates of the site. This
     script converts them into the map's own drawing coordinates, so
     use real-world lat/lon, not anything from the map itself.
   - "Last Updated" is a date like 2026-11-20. If you leave it blank,
     this script fills in today's date.
   - "Documents" links files for signed-in partners to see on the
     card (blurred out until then). One or more entries per cell,
     each "Name | URL", separated by semicolons, e.g.:
       Term sheet | https://drive.google.com/file/d/abc/view ; Land survey | https://drive.google.com/file/d/xyz/view
     Leave it blank for "no documents shared yet". Links can point
     anywhere you already host the file (Drive, Dropbox, etc.) —
     this script doesn't upload anything, it just records the link.

2. One row per project. A state with several projects just gets
   several rows with the same State value.

3. File > Share > Publish to web > choose the sheet tab > CSV > Publish.
   Copy the link it gives you (ends in "output=csv"). Treat this link
   as the data source for the dashboard: anyone with it can read (not
   edit) your sheet's current values, so only publish the sheet you
   intend to share this way.

RUNNING IT
----------
    python3 scripts/sync_from_sheet.py "<published-csv-url>"

Or, to test against a CSV file you already have on disk:

    python3 scripts/sync_from_sheet.py path/to/export.csv

This overwrites data/projects.json. Review the diff (git diff
data/projects.json), then commit and push like any other change:

    git add data/projects.json
    git commit -m "Sync project data from sheet"
    git push origin main

This script never pushes or commits on its own.
"""

import csv
import io
import json
import re
import sys
import urllib.request
from collections import OrderedDict
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "data" / "projects.json"

# Same equirectangular projection used to draw the state map in
# dashboard.html. Keep these in sync if the map SVG is ever redrawn.
MINX, MAXY = 68.1005, 37.077
SCALE = 20.4869
PAD = 10


def project(lon, lat):
    x = (lon - MINX) * SCALE + PAD
    y = (MAXY - lat) * SCALE + PAD
    return [round(x, 1), round(y, 1)]


def truthy(value):
    return str(value).strip().lower() in ("true", "yes", "y", "1", "done")


def parse_documents(raw, row_num, name, warnings):
    """Turn a "Name | URL ; Name | URL" cell into [{"name", "url"}, ...]."""
    docs = []
    raw = (raw or "").strip()
    if not raw:
        return docs
    for j, piece in enumerate(raw.split(";"), start=1):
        piece = piece.strip()
        if not piece:
            continue
        parts = piece.split("|", 1)
        if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
            warnings.append(
                f"Row {row_num} ({name}): Documents entry {j} ('{piece}') isn't "
                "'Name | URL' — skipped."
            )
            continue
        docs.append({"name": parts[0].strip(), "url": parts[1].strip()})
    return docs


def fetch_csv_text(source):
    if re.match(r"^https?://", source):
        with urllib.request.urlopen(source, timeout=30) as resp:
            raw = resp.read()
        return raw.decode("utf-8-sig")
    path = Path(source)
    if not path.exists():
        sys.exit(f"Can't find CSV source: {source}")
    return path.read_text(encoding="utf-8-sig")


REQUIRED_COLUMNS = ["State", "Project Name", "Capacity MW"]


def parse_rows(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    if reader.fieldnames is None:
        sys.exit("CSV has no header row.")

    missing = [c for c in REQUIRED_COLUMNS if c not in reader.fieldnames]
    if missing:
        sys.exit(
            "CSV is missing required column(s): " + ", ".join(missing) +
            "\nFound columns: " + ", ".join(reader.fieldnames)
        )

    today = date.today().isoformat()
    projects = OrderedDict()
    warnings = []
    kept = 0

    for i, row in enumerate(reader, start=2):  # row 1 is the header
        state = (row.get("State") or "").strip()
        name = (row.get("Project Name") or "").strip()
        capacity_raw = (row.get("Capacity MW") or "").strip()

        if not state and not name and not capacity_raw:
            continue  # blank row, skip quietly

        if not state or not name or not capacity_raw:
            warnings.append(f"Row {i}: missing State, Project Name or Capacity MW — skipped.")
            continue

        try:
            capacity = float(capacity_raw)
            if capacity == int(capacity):
                capacity = int(capacity)
        except ValueError:
            warnings.append(f"Row {i} ({name}): Capacity MW '{capacity_raw}' isn't a number — skipped.")
            continue

        lat_raw = (row.get("Latitude") or "").strip()
        lon_raw = (row.get("Longitude") or "").strip()
        pos = [0.0, 0.0]
        if lat_raw and lon_raw:
            try:
                pos = project(float(lon_raw), float(lat_raw))
            except ValueError:
                warnings.append(f"Row {i} ({name}): Latitude/Longitude aren't numbers — using [0, 0].")
        else:
            warnings.append(f"Row {i} ({name}): no Latitude/Longitude given — dot will sit at [0, 0] until set.")

        entry = {
            "name": name,
            "capacity": capacity,
            "badge": (row.get("Stage") or "").strip() or "Early stage",
            "badgeDone": truthy(row.get("Stage Done")),
            "land": (row.get("Land Status") or "").strip() or "Not set",
            "connectivity": (row.get("Connectivity Status") or "").strip() or "Not set",
            "ppa": (row.get("PPA Status") or "").strip() or "Not set",
            "pos": pos,
            "lastUpdated": (row.get("Last Updated") or "").strip() or today,
            "documents": parse_documents(row.get("Documents"), i, name, warnings),
        }

        projects.setdefault(state, []).append(entry)
        kept += 1

    return projects, warnings, kept, today


def main():
    if len(sys.argv) != 2:
        sys.exit(f"Usage: {sys.argv[0]} <published-csv-url-or-local-csv-path>")

    source = sys.argv[1]
    csv_text = fetch_csv_text(source)
    projects, warnings, kept, today = parse_rows(csv_text)

    if not kept:
        sys.exit("No usable rows found — nothing written. Check the sheet against the column names in this script's docstring.")

    output = {"generatedAt": today, "projects": projects}
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
        f.write("\n")

    total_mw = sum(p["capacity"] for items in projects.values() for p in items)
    print(f"Wrote {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    print(f"  {kept} project(s) across {len(projects)} state(s), {total_mw} MW total")
    if warnings:
        print(f"\n{len(warnings)} warning(s):")
        for w in warnings:
            print("  - " + w)
    print("\nReview the diff, then commit and push:")
    print("  git diff data/projects.json")
    print("  git add data/projects.json && git commit -m \"Sync project data from sheet\" && git push origin main")


if __name__ == "__main__":
    main()
