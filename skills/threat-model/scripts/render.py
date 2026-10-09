#!/usr/bin/env python3
"""Render the C4 model plus threats.json into one HTML report. Stdlib only.

usage: render.py <c4 model.json> <threats.json> <out_dir>
"""
import json, pathlib, sys

TEMPLATE = pathlib.Path(__file__).resolve().parent.parent / "templates" / "report.html"


def fill(template, **slots):
    # Each placeholder looks like `/*__NAME__*/{}`; the comment stays so the file can be re-rendered.
    out = template
    for name, value in slots.items():
        marker = f"/*__{name}__*/"
        start = out.index(marker) + len(marker)
        end = out.index(";", start)
        out = out[:start] + json.dumps(value) + out[end:]
    return out


def main():
    model = json.loads(pathlib.Path(sys.argv[1]).read_text())
    threats = json.loads(pathlib.Path(sys.argv[2]).read_text())
    out_dir = pathlib.Path(sys.argv[3]); out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.html").write_text(fill(TEMPLATE.read_text(), MODEL=model, THREATS=threats))
    (out_dir / "threats.json").write_text(json.dumps(threats, indent=2) + "\n")
    print(f"threat-model: {len(threats.get('threats', []))} threats in {out_dir}/index.html")


if __name__ == "__main__":
    main()
