---
name: design-docs
description: Write a High-Level Design (HLD), Solution Architecture Document (SAD) or Technical Design Document (TDD) from a project's C4 model and code, rendered as self-contained light-mode HTML with the C4 diagrams drawn inline. Use when asked for an HLD, SAD, TDD, design doc, architecture document, solution design or technical design. Needs the c4-diagrams model first.
license: MIT
metadata:
  author: coffeestained
  version: "1.0"
---

# Design documents

Start from the C4 model, read the code for what the model cannot say, write one short JSON per document, render.
Read `reference/hld.md`, `reference/sad.md` or `reference/tdd.md` for the type you are writing. Each is short, and its table is the outline the renderer enforces.

## 1. Pick the type

| type | reader | answers | scope |
| --- | --- | --- | --- |
| `hld` | Executives, product, new joiners | What is it, who is it for, what could hurt it? | The whole system |
| `sad` | Architects, tech leads, reviewers | Why this shape, and does it meet its goals? | The whole solution |
| `tdd` | Engineers who build and run it | How does it work, how do I change and run it? | One container |

One fact has one home: each reference file lists what its type leaves out and where that lives. Link down, never restate. If the request does not name a type, ask.

## 2. Config and input

Use the same `config.json` as the `c4-diagrams` skill (`project_name`, `output_dir`, defaults apply when it is missing).

Read `<output_dir>/c4/model.json`. If it does not exist, run the `c4-diagrams` skill first. A TDD needs components for its container, so add `"component"` to `levels`. Never edit the model here: when it is wrong, fix it with `c4-diagrams` and render again.

## 3. Read the code

The model already holds names, technologies and relationships. Read for the rest:

- **HLD**: README, product docs, entry points. Purpose, who it is for, what is out of scope, the two or three flows that matter.
- **SAD**: infra code, deploy config, decision records. Why each choice was made, where each container runs, the targets that are tested or alarmed.
- **TDD**: the container's source. Commands or routes, stored data, the main sequences, error handling, tests, configuration names.

Record what you find. Write "Not determined from code" rather than guess. Configuration and secrets by name, never a value.

## 4. Write the document

Write `<output_dir>/hld/hld.json`, `<output_dir>/sad/sad.json` or `<output_dir>/tdd/<container-id>.json`:

```json
{
  "type": "hld", "subject": "atlas", "status": "draft", "version": "0.1",
  "generated": "2026-11-12", "owner": "Atlas platform team",
  "summary": "Three sentences a reader can stop after. At most 50 words.",
  "sections": [
    { "id": "purpose", "blocks": [{ "kind": "text", "text": "…" }] },
    { "id": "risks", "blocks": [{ "kind": "risks", "items": [
      { "id": "R1", "title": "…", "impact": "high", "mitigation": "…", "elements": ["ingest"] }] }] }
  ]
}
```

- `subject`: a model id. The system for `hld` and `sad`; a container that has components for `tdd`. `status` is `draft`, `review` or `approved`.
- `sections`: exactly the ids in the type's outline, in its order. Titles come from the ids.

| block | fields | source |
| --- | --- | --- |
| `text` | `text` | you |
| `list` | `items`, optional `title`, `ordered` | you |
| `table` | `columns`, `rows`, optional `title` | you |
| `decisions` | `items`: `id`, `title`, `decision`, `why`, optional `alternatives`, `elements` | you |
| `risks` | `items`: `id`, `title`, `impact` (`high`, `medium`, `low`), `mitigation`, optional `elements` | you |
| `diagram` | `level`: `context`, `container` or `component` | model |
| `elements` | `of`: `containers` or `externals` | model |
| `flows` | none | model |

Blocks from the model draw themselves: never retype a name, a technology or a relationship. Text between backticks renders as code.

Complete ones: https://github.com/coffeestained/public-skills/tree/main/examples/atlas

## 5. Render

```bash
python3 <skill>/scripts/render.py <output_dir>
```

This checks and renders every document under `<output_dir>` and links them to each other, the diagrams and the threat model. An error stops the run and nothing is written: a missing or misplaced section, a block the section does not allow, an id the model does not have. A warning is a section over its word budget: cut it, or say why it stays. The budget is a ceiling, not a target.

No Python? Copy `templates/document.html` and replace the value after `/*__MODEL__*/` with the model JSON, after `/*__DOC__*/` with the document JSON and after `/*__NAV__*/` with `[]`.

## 6. Report

Print the renderer's last line, for example `design-docs: 3 documents in outputs/ (hld 338/490w, sad 469/910w, tdd/api 324/940w); open outputs/hld/index.html`, and each warning you left standing. Say what the code did not show: open questions are part of the document.
