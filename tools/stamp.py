#!/usr/bin/env python3
"""Stamp shared/ into every skill, so a copied skill folder stays self-contained. Stdlib only.

A block is the lines between `@shared:begin <file>` and `@shared:end <file>`, written inside
the host file's own comment syntax. Its body is replaced by shared/<file>.

usage: stamp.py [--check]
exit:  0 current or stamped, 1 stale (--check), 2 a marker or shared file is wrong
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHARED = ROOT / "shared"
BEGIN = re.compile(r"@shared:begin (\S+)")


def stamp(text):
    """Return the text with every block's body replaced, and [(block, was_stale)]."""
    lines, out, blocks, i = text.split("\n"), [], [], 0
    while i < len(lines):
        out.append(lines[i]); found = BEGIN.search(lines[i]); i += 1
        if not found:
            continue
        name, source = found.group(1), SHARED / found.group(1)
        if not source.is_file():
            raise ValueError(f"unknown block {name}")
        end = next((j for j in range(i, len(lines)) if f"@shared:end {name}" in lines[j]), None)
        if end is None:
            raise ValueError(f"begin without end for {name}")
        body = source.read_text(encoding="utf-8").rstrip("\n").split("\n")
        blocks.append((name, lines[i:end] != body)); out.extend(body); i = end
    return "\n".join(out), blocks


def main():
    check = "--check" in sys.argv[1:]
    hosts = sorted([*ROOT.glob("skills/*/templates/*"), *ROOT.glob("skills/*/scripts/*.py")])
    total = files = changed = stale = 0; used = set(); broken = []
    for path in hosts:
        rel, text = path.relative_to(ROOT), path.read_text(encoding="utf-8")
        try:
            new, blocks = stamp(text)
        except ValueError as problem:
            broken.append(f"stamp: error {rel}: {problem}"); continue
        if not blocks:
            continue
        total += len(blocks); files += 1; used.update(name for name, _ in blocks)
        for name, was_stale in blocks:
            if was_stale and check:
                stale += 1; print(f"stamp: stale {rel} {name}")
        if new != text and not check:
            path.write_text(new, encoding="utf-8"); changed += 1
    for source in sorted(SHARED.iterdir()):
        if source.is_file() and source.name not in used:
            broken.append(f"stamp: error shared/{source.name}: no skill uses it")
    if broken:
        print("\n".join(broken)); sys.exit(2)
    summary = f"stamp: {total} blocks in {files} files"
    if not check:
        print(f"{summary}, {changed} files updated")
    elif stale:
        print(f"{summary}, {stale} stale (run python3 tools/stamp.py)"); sys.exit(1)
    else:
        print(f"{summary}, all current")


if __name__ == "__main__":
    main()
