#!/usr/bin/env python3
"""
Élan Summit — keep ticket availability consistent everywhere.

The tier flags live in ONE place: TICKET_OPEN in assets/js/main.js.
This script reads them and rewrites the schema.org offer availability in every
page that carries the Event JSON-LD, so the site and Google never disagree.

Usage, from public/:
    1. Edit TICKET_OPEN in assets/js/main.js  (e.g. set late: true on 23 August)
    2. python3 tools/set-ticket-state.py
    3. Commit, deploy, hard-refresh.

Mapping:
    open                     -> https://schema.org/InStock
    closed and in SOLD_OUT   -> https://schema.org/SoldOut     (window has passed)
    closed and not sold out  -> https://schema.org/PreOrder    (window not open yet)

Run with --check to verify without writing (exit code 1 if anything is stale).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAIN = ROOT / "assets" / "js" / "main.js"

# Offer name in the JSON-LD -> flag key in TICKET_OPEN
TIERS = {
    "Early Bird": "early",
    "Standard": "standard",
    "Late Registration": "late",
    "Day Delegate": "day",
}

AVAIL = {
    "in": "https://schema.org/InStock",
    "sold": "https://schema.org/SoldOut",
    "pre": "https://schema.org/PreOrder",
}


def read_flags():
    src = MAIN.read_text(encoding="utf-8")
    block = re.search(r"const TICKET_OPEN\s*=\s*\{(.*?)\};", src, re.S)
    if not block:
        sys.exit("Could not find TICKET_OPEN in assets/js/main.js")
    flags = dict(
        (k, v == "true")
        for k, v in re.findall(r"(\w+)\s*:\s*(true|false)", block.group(1))
    )

    sold = re.search(r"const TICKET_SOLD_OUT\s*=\s*\[(.*?)\];", src, re.S)
    sold_out = set(re.findall(r"'([^']+)'", sold.group(1))) if sold else set()

    missing = set(TIERS.values()) - set(flags)
    if missing:
        sys.exit(f"TICKET_OPEN is missing tiers: {', '.join(sorted(missing))}")
    return flags, sold_out


def wanted(flags, sold_out, key):
    if flags[key]:
        return AVAIL["in"]
    return AVAIL["sold"] if key in sold_out else AVAIL["pre"]


def main():
    check_only = "--check" in sys.argv
    flags, sold_out = read_flags()

    print("Ticket flags in main.js:")
    for name, key in TIERS.items():
        state = "OPEN" if flags[key] else ("sold out" if key in sold_out else "not open yet")
        print(f"  {name:<18} {state}")
    print()

    stale = 0
    for page in sorted(ROOT.glob("*.html")):
        src = page.read_text(encoding="utf-8")
        if '"@type":"Offer"' not in src.replace(" ", ""):
            continue

        changed = 0
        for name, key in TIERS.items():
            want = wanted(flags, sold_out, key)
            # Match this offer's object and replace only its availability value.
            pattern = re.compile(
                r'(\{"@type":\s*"Offer",\s*"name":\s*"'
                + re.escape(name)
                + r'".*?"availability":\s*")([^"]+)(")',
                re.S,
            )

            def sub(m):
                nonlocal changed
                if m.group(2) != want:
                    changed += 1
                return m.group(1) + want + m.group(3)

            src2 = pattern.sub(sub, src)
            if pattern.search(src) is None:
                print(f"  !! {page.name}: offer '{name}' not found")
            src = src2

        if changed:
            stale += changed
            if check_only:
                print(f"  STALE  {page.name}: {changed} offer(s) out of date")
            else:
                # Fail loudly rather than write a page whose JSON-LD no longer parses.
                for blob in re.findall(
                    r'<script type="application/ld\+json">(.*?)</script>', src, re.S
                ):
                    json.loads(blob)
                page.write_text(src, encoding="utf-8")
                print(f"  updated {page.name}: {changed} offer(s)")

    if not stale:
        print("  everything already in sync")
    elif check_only:
        print(f"\n{stale} offer value(s) stale. Run without --check to fix.")
        sys.exit(1)


if __name__ == "__main__":
    main()
