#!/usr/bin/env python3
"""Render model.json into the HTML pages. Stdlib only, so it runs anywhere.

usage: render.py <model.json> <out_dir> [context,container,component]
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent.parent / "templates"
LEVEL_TITLES = {"context": "System Context", "container": "Containers", "component": "Components"}
LEVEL_SUMMARY = {
    "context": "The system, its users and the external systems around it.",
    "container": "The apps and data stores inside the system and how they talk.",
}


def fill(template, **slots):
    # Each placeholder looks like `/*__NAME__*/{}`; the comment is kept so the file stays re-renderable.
    out = template
    for name, value in slots.items():
        marker = f"/*__{name}__*/"
        start = out.index(marker) + len(marker)
        end = out.index(";", start)  # placeholder value runs to the end of the statement
        out = out[:start] + json.dumps(value) + out[end:]
    return out


def main():
    model_path, out_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    levels = sys.argv[3].split(",") if len(sys.argv) > 3 else ["context", "container"]
    model = json.loads(model_path.read_text())
    out_dir.mkdir(parents=True, exist_ok=True)
    diagram = (HERE / "diagram.html").read_text()
    index = (HERE / "index.html").read_text()
    containers = [e for e in model["elements"] if e["type"] == "container"]
    with_components = [c["id"] for c in containers if any(e.get("parent") == c["id"] for e in model["elements"] if e["type"] == "component")]
    component_pages = with_components if "component" in levels else []
    pages = []
    for level in ("context", "container"):
        if level in levels:
            view = {"level": level, "componentPages": component_pages}
            (out_dir / f"{level}.html").write_text(fill(diagram, MODEL=model, VIEW=view))
            pages.append({"file": f"{level}.html", "title": LEVEL_TITLES[level], "level": f"Level: {level}", "summary": LEVEL_SUMMARY[level]})
    for cid in component_pages:
        name = next(c["name"] for c in containers if c["id"] == cid)
        view = {"level": "component", "container": cid, "componentPages": component_pages}
        (out_dir / f"component-{cid}.html").write_text(fill(diagram, MODEL=model, VIEW=view))
        pages.append({"file": f"component-{cid}.html", "title": f"Components: {name}", "level": "Level: component", "summary": f"Inside the {name} container."})
    (out_dir / "index.html").write_text(fill(index, MODEL=model, PAGES=pages))
    (out_dir / "model.json").write_text(json.dumps(model, indent=2) + "\n")
    print(f"c4: wrote {len(pages)} diagrams + model.json to {out_dir}/")


if __name__ == "__main__":
    main()
