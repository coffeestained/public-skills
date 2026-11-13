#!/usr/bin/env python3
"""Check and render the HLD, SAD and TDDs that sit beside a C4 model. Stdlib only.

usage:  render.py <output_dir>
reads:  <output_dir>/c4/model.json, hld/hld.json, sad/sad.json, tdd/<container-id>.json
writes: hld/index.html, sad/index.html, tdd/<container-id>.html
exit:   0 written (warnings allowed), 1 an error: nothing is written
"""
import json, pathlib, re, sys

SKILL = pathlib.Path(__file__).resolve().parent.parent
TITLES = {"hld": "High-Level Design", "sad": "Solution Architecture", "tdd": "Technical Design"}
FIELDS = {  # what each block kind must carry
    "text": ["text"], "list": ["items"], "table": ["columns", "rows"], "diagram": ["level"],
    "elements": ["of"], "flows": [], "decisions": ["items"], "risks": ["items"],
}
FROM_MODEL = {"diagram", "elements", "flows"}  # drawn from model.json: never typed, never counted
ITEM = {"decisions": ["id", "title", "decision", "why"], "risks": ["id", "title", "impact", "mitigation"]}
CHOICES = {"level": ["context", "container", "component"], "of": ["containers", "externals"],
           "impact": ["high", "medium", "low"], "status": ["draft", "review", "approved"]}
UNCOUNTED = {"kind", "id", "elements", "impact", "level", "of", "ordered"}


# @shared:begin fill.py (edit shared/fill.py, then run tools/stamp.py)
def fill(template, **slots):
    # Each placeholder looks like `/*__NAME__*/{}`; the comment is kept so the file stays re-renderable.
    out = template
    for name, value in slots.items():
        marker = f"/*__{name}__*/"
        start = out.index(marker) + len(marker)
        end = out.index(";", start)  # placeholder value runs to the end of the statement
        data = json.dumps(value).replace("</", "<\\/")  # a "</script>" inside a string must not end the script
        out = out[:start] + data + out[end:]
    return out
# @shared:end fill.py


def outline(kind):
    """The numbered rows of the table in reference/<kind>.md: [(section id, word budget, allowed blocks)]."""
    rows = []
    for line in (SKILL / "reference" / f"{kind}.md").read_text(encoding="utf-8").splitlines():
        cells = [c.strip().strip("`") for c in line.strip().strip("|").split("|")]
        if len(cells) >= 4 and cells[0].isdigit():
            rows.append((cells[1], int(cells[2]), [b.strip() for b in cells[3].split(",")]))
    return rows


def words(value):
    """Hand-written words only."""
    if isinstance(value, str):
        return len(value.split())
    if isinstance(value, list):
        return sum(words(v) for v in value)
    if isinstance(value, dict):
        return 0 if value.get("kind") in FROM_MODEL else sum(words(v) for k, v in value.items() if k not in UNCOUNTED)
    return 0


def spec_of(block):
    return f"diagram:{block.get('level')}" if block.get("kind") == "diagram" else block.get("kind")


def check(doc, name, kind, model):
    """Return (errors, warnings, words used, budget) for one document."""
    errors, warnings = [], []
    err = lambda where, message: errors.append(f"design-docs: error {name}{where}: {message}")
    warn = lambda where, message: warnings.append(f"design-docs: warn {name}{where}: {message}")
    ids = {e["id"]: e for e in model.get("elements", [])}
    subject = ids.get(doc.get("subject"))
    if doc.get("type") != kind:
        err("", f'type "{doc.get("type")}" does not match its folder "{kind}"')
    if doc.get("status", "draft") not in CHOICES["status"]:
        err("", f'status "{doc.get("status")}" is not one of {", ".join(CHOICES["status"])}')
    if subject is None:
        err("", f'unknown model id "{doc.get("subject")}" as subject')
    elif kind == "tdd":
        if subject["type"] != "container":
            err("", f'subject "{subject["id"]}" is a {subject["type"]}; a TDD covers one container')
        elif not any(e.get("parent") == subject["id"] and e["type"] == "component" for e in ids.values()):
            err("", f'subject "{subject["id"]}" has no components in the model; run c4-diagrams with the component level first')
        if name != f"tdd/{doc.get('subject')}":
            err("", f'file name does not match its subject "{doc.get("subject")}"')
    elif subject["type"] != "system" or subject.get("external"):
        err("", f'subject "{subject["id"]}" must be the system itself')
    if words(doc.get("summary", "")) > 50:
        warn("", f"summary {words(doc['summary'])}/50 words")

    wanted, got = outline(kind), [s.get("id") for s in doc.get("sections", [])]
    if got != [w[0] for w in wanted]:
        err("", f"sections must be exactly, in order: {', '.join(w[0] for w in wanted)}")
        return errors, warnings, 0, sum(w[1] for w in wanted)
    used = 0
    for section, (sid, budget, allowed) in zip(doc["sections"], wanted):
        at, blocks = f"#{sid}", section.get("blocks", [])
        for block in blocks:
            k = block.get("kind")
            if k not in FIELDS:
                err(at, f'unknown block "{k}"'); continue
            if spec_of(block) not in allowed and k not in allowed:
                err(at, f'block "{spec_of(block)}" not allowed (allowed: {", ".join(allowed)})'); continue
            for field in FIELDS[k]:
                if field not in block:
                    err(at, f'block "{k}" is missing "{field}"')
            for field in ("level", "of"):
                if field in block and block[field] not in CHOICES[field]:
                    err(at, f'{field} "{block[field]}" is not one of {", ".join(CHOICES[field])}')
            if k == "table" and any(len(row) != len(block.get("columns", [])) for row in block.get("rows", [])):
                err(at, "a table row does not match its columns")
            for item in block.get("items", []) if k in ITEM else []:
                for field in ITEM[k]:
                    if field not in item:
                        err(at, f'{k[:-1]} "{item.get("id", "?")}" is missing "{field}"')
                if k == "risks" and item.get("impact") not in CHOICES["impact"]:
                    err(at, f'impact "{item.get("impact")}" is not one of {", ".join(CHOICES["impact"])}')
                for ref in item.get("elements", []):
                    if ref not in ids:
                        err(at, f'unknown model id "{ref}"')
        have = {spec_of(b) for b in blocks} | {b.get("kind") for b in blocks}
        for spec in allowed:
            if spec.split(":")[0] in FROM_MODEL and spec not in have:
                err(at, f'needs a "{spec}" block')
        count = words(blocks); used += count
        if not blocks:
            warn(at, "empty section")
        elif count > budget:
            warn(at, f"{count}/{budget} words")
    return errors, warnings, used, sum(w[1] for w in wanted)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__.strip())
    out = pathlib.Path(sys.argv[1]); model_path = out / "c4" / "model.json"
    if not model_path.is_file():
        sys.exit(f"design-docs: error {model_path} is missing: run the c4-diagrams skill first")
    model = json.loads(model_path.read_text(encoding="utf-8")); ids = {e["id"]: e for e in model.get("elements", [])}
    sources = [p for p in (out / "hld" / "hld.json", out / "sad" / "sad.json") if p.is_file()] + sorted((out / "tdd").glob("*.json"))
    if not sources:
        sys.exit(f"design-docs: error no documents under {out}/ (hld/hld.json, sad/sad.json, tdd/<container-id>.json)")

    docs, errors, warnings, sizes = [], [], [], []
    for path in sources:
        kind = path.parent.name; name = kind if kind != "tdd" else f"tdd/{path.stem}"
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as problem:
            errors.append(f"design-docs: error {name}: not JSON ({problem})"); continue
        e, w, used, budget = check(doc, name, kind, model)
        errors += e; warnings += w; sizes.append(f"{name} {used}/{budget}w")
        page = path.with_name("index.html" if kind != "tdd" else f"{path.stem}.html")
        title = TITLES[kind] + (f": {ids.get(doc.get('subject'), {}).get('name', path.stem)}" if kind == "tdd" else "")
        docs.append((doc, page, title))
    print("\n".join(errors + warnings), end="\n" if errors or warnings else "")
    if errors:
        sys.exit(f"design-docs: {len(errors)} error{'s' * (len(errors) != 1)}, nothing written")

    # Every page links its siblings, so the set reads as one document.
    extra = [("Diagrams", out / "c4" / "index.html"), ("Threat model", out / "threat-model" / "index.html")]
    pages = [(t, p) for t, p in extra[:1] if p.is_file()] + [(t, p) for _, p, t in docs] + [(t, p) for t, p in extra[1:] if p.is_file()]
    template = (SKILL / "templates" / "document.html").read_text(encoding="utf-8")
    for doc, page, _ in docs:
        nav = [{"title": t, "href": f"../{p.parent.name}/{p.name}", **({"here": True} if p == page else {})} for t, p in pages]
        page.write_text(fill(template, MODEL=model, DOC=doc, NAV=nav), encoding="utf-8")
    tail = f", {len(warnings)} warning{'s' * (len(warnings) != 1)}" if warnings else ""
    print(f"design-docs: {len(docs)} document{'s' * (len(docs) != 1)} in {out}/ ({', '.join(sizes)}){tail}; open {docs[0][1]}")


if __name__ == "__main__":
    main()
