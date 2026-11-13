#!/usr/bin/env python3
"""The one gate before a commit. Stdlib only.

It checks that the shared blocks are stamped, that examples/ is what the renderers write today,
and that the design-docs renderer still refuses what it should.

usage: check.py
exit:  0 everything holds, 1 something does not
"""
import filecmp, json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXAMPLES, SKILLS = ROOT / "examples", ROOT / "skills"
failed = []


def run(*args):
    return subprocess.run([sys.executable, *map(str, args)], capture_output=True, text=True)


def check(name, ok, detail=""):
    print(f"check: {'ok  ' if ok else 'FAIL'} {name}" + ("" if ok else f": {detail}"))
    if not ok:
        failed.append(name)


def sources(out, *folders):
    """Copy the hand-written JSON of the Atlas example into out, without its rendered pages."""
    for folder in folders:
        (out / folder).mkdir(parents=True)
        for source in (EXAMPLES / "atlas" / folder).glob("*.json"):
            shutil.copy(source, out / folder / source.name)


def examples_are_current(tmp):
    pulse, atlas = tmp / "pulse", tmp / "atlas"
    sources(atlas, "c4", "hld", "sad", "tdd")
    steps = [
        (SKILLS / "c4-diagrams/scripts/render.py", EXAMPLES / "model.json", pulse, "context,container,component"),
        (SKILLS / "threat-model/scripts/render.py", EXAMPLES / "model.json", EXAMPLES / "threat-model/threats.json", pulse / "threat-model"),
        (SKILLS / "c4-diagrams/scripts/render.py", atlas / "c4/model.json", atlas / "c4", "context,container,component"),
        (SKILLS / "design-docs/scripts/render.py", atlas),
    ]
    for step in steps:
        result = run(*step)
        if result.returncode:
            return check("examples render", False, (result.stdout + result.stderr).strip().splitlines()[-1])
    stale = [str(page.relative_to(tmp)) for mine, theirs in ((pulse, EXAMPLES), (atlas, EXAMPLES / "atlas"))
             for page in sorted(mine.rglob("*.*")) if not (theirs / page.relative_to(mine)).is_file()
             or not filecmp.cmp(page, theirs / page.relative_to(mine), shallow=False)]
    check("examples/ is what the renderers write today", not stale, "render again: " + ", ".join(stale[:6]))


def refusals(tmp):
    """Each case breaks one thing in the Atlas documents and says how the renderer must answer."""
    section = lambda doc, i: doc["sections"][i]
    cases = [
        ("a missing section", "hld/hld.json", lambda d: d["sections"].pop(1), 1, "sections must be exactly"),
        ("an unknown model id", "hld/hld.json", lambda d: section(d, 5)["blocks"][0]["items"][0].update(elements=["nope"]), 1, 'unknown model id "nope"'),
        ("a block the section does not allow", "hld/hld.json", lambda d: section(d, 0)["blocks"].append({"kind": "flows"}), 1, "not allowed"),
        ("a model block left out", "sad/sad.json", lambda d: section(d, 3).update(blocks=[b for b in section(d, 3)["blocks"] if b["kind"] != "flows"]), 1, 'needs a "flows" block'),
        ("a TDD for a container with no components", "tdd/api.json", lambda d: d.update(subject="ingest"), 1, "has no components"),
        ("a ragged table", "sad/sad.json", lambda d: section(d, 1)["blocks"][0]["rows"][0].append("x"), 1, "does not match its columns"),
        ("a section over its budget", "hld/hld.json", lambda d: section(d, 0)["blocks"][0].update(text="word " * 90), 0, "warn hld#purpose: 90/60 words"),
    ]
    for i, (name, path, change, code, says) in enumerate(cases):
        out = tmp / f"case{i}"; sources(out, "c4", "hld", "sad", "tdd")
        doc = json.loads((out / path).read_text()); change(doc); (out / path).write_text(json.dumps(doc))
        result = run(SKILLS / "design-docs/scripts/render.py", out)
        written = bool(list(out.glob("hld/index.html")))
        check(f"design-docs answers {name}", result.returncode == code and says in result.stdout + result.stderr and written == (code == 0),
              f"exit {result.returncode}, pages written {written}: {(result.stdout + result.stderr).strip()[:160]}")


def main():
    stamp = run(ROOT / "tools/stamp.py", "--check")
    check("shared blocks are stamped", stamp.returncode == 0, stamp.stdout.strip().splitlines()[-1] if stamp.stdout.strip() else "stamp.py failed")
    with tempfile.TemporaryDirectory() as tmp:
        examples_are_current(pathlib.Path(tmp)); refusals(pathlib.Path(tmp))
    print(f"check: {'all good' if not failed else str(len(failed)) + ' failed'}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
