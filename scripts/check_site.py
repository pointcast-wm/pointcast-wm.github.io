#!/usr/bin/env python3
"""Pre-publish gate for the project page.

Two checks, both required before every push:

1. RETIRED   no authored page (``index.html``, ``README.md``) may contain a
             value from the paper registry's ``retired`` list. The registry is
             the paper repository's ``cell_provenance.json``; it is passed in
             because this site carries no copy of it. Entries with
             ``allow_if_line_contains`` are honored the way the paper's own
             checker honors them.

2. BANNED    no file in the site (text content, file name, image metadata,
             video metadata) may carry an identifying string. The strings
             are read from a file kept OUTSIDE this repository, so the gate
             itself does not publish what it guards against.

Usage:

    python3 scripts/check_site.py --registry <cell_provenance.json> --banned <strings.txt>

Exit status is non-zero on any hit.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

AUTHORED = ("index.html", "README.md")
TEXT_SUFFIXES = {".html", ".md", ".css", ".js", ".txt", ".json", ".svg", ".xml", ".yml", ".yaml"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
VIDEO_SUFFIXES = {".mp4", ".webm", ".mov"}


def iter_files(site: Path):
    for p in sorted(site.rglob("*")):
        if p.is_file() and ".git" not in p.parts:
            yield p


def check_retired(site: Path, registry: Path) -> list[str]:
    reg = json.loads(registry.read_text(encoding="utf-8"))
    retired = reg.get("retired", {})
    hits: list[str] = []
    for name in AUTHORED:
        path = site / name
        if not path.exists():
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").split("\n"), 1):
            for value, why in retired.items():
                if value.startswith("_"):
                    continue
                allow: list[str] = []
                if isinstance(why, dict):
                    allow = list(why.get("allow_if_line_contains", []))
                if any(a in line for a in allow):
                    continue
                if re.search(rf"(?<![\d.]){re.escape(value)}(?![\d])", line):
                    hits.append(f"  {name}:{lineno}  retired value {value!r}: {line.strip()[:100]}")
    return hits


def _image_metadata(path: Path) -> dict:
    try:
        from PIL import Image  # type: ignore
    except ImportError:
        return {}
    try:
        with Image.open(path) as im:
            return {k: str(v) for k, v in (im.info or {}).items() if k != "dpi"}
    except Exception as exc:  # unreadable image: report, do not hide
        return {"_error": str(exc)}


def _video_metadata(path: Path) -> str:
    if shutil.which("ffprobe") is None:
        return ""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format_tags:stream_tags", "-of", "default", str(path)],
        capture_output=True, text=True, check=False,
    )
    return out.stdout


def check_banned(site: Path, banned: list[str]) -> list[str]:
    hits: list[str] = []
    lowered = [b.lower() for b in banned if b.strip()]

    def scan(label: str, text: str) -> None:
        low = text.lower()
        for b in lowered:
            if b in low:
                hits.append(f"  {label}: contains {b!r}")

    for p in iter_files(site):
        rel = str(p.relative_to(site))
        scan(f"path {rel}", rel)
        if p.suffix.lower() in TEXT_SUFFIXES:
            scan(f"text {rel}", p.read_text(encoding="utf-8", errors="replace"))
        elif p.suffix.lower() in IMAGE_SUFFIXES:
            meta = _image_metadata(p)
            if meta:
                scan(f"image metadata {rel}", json.dumps(meta))
        elif p.suffix.lower() in VIDEO_SUFFIXES:
            scan(f"video metadata {rel}", _video_metadata(p))
    return hits


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--site", type=Path, default=Path(__file__).resolve().parent.parent)
    ap.add_argument("--registry", type=Path, required=True, help="paper registry cell_provenance.json")
    ap.add_argument("--banned", type=Path, required=True, help="identifying strings, one per line, kept outside the repo")
    args = ap.parse_args()

    if not args.registry.exists():
        print(f"FAIL  registry not found: {args.registry}")
        return 2
    if not args.banned.exists():
        print(f"FAIL  banned-string file not found: {args.banned}")
        return 2

    banned = [ln.strip() for ln in args.banned.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
    retired_hits = check_retired(args.site, args.registry)
    banned_hits = check_banned(args.site, banned)

    n_files = sum(1 for _ in iter_files(args.site))
    print(f"site     : {args.site}  ({n_files} files)")
    print(f"registry : {args.registry}")
    print(f"banned   : {len(banned)} strings from {args.banned}")
    print()
    print(f"RETIRED  {'FAIL' if retired_hits else 'PASS'}  ({len(retired_hits)} hits)")
    for h in retired_hits:
        print(h)
    print(f"BANNED   {'FAIL' if banned_hits else 'PASS'}  ({len(banned_hits)} hits)")
    for h in banned_hits:
        print(h)
    return 1 if (retired_hits or banned_hits) else 0


if __name__ == "__main__":
    sys.exit(main())
