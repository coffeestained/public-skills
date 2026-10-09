---
name: c4-diagrams
description: Turn a codebase into C4 model architecture diagrams (system context, container, component) rendered as self-contained light-mode HTML in the project's outputs folder. Use when asked for architecture diagrams, a C4 model, a system context or container diagram, or to document how a system is put together.
license: MIT
metadata:
  author: coffeestained
  version: "1.0"
---

# C4 diagrams

Survey the code, write one `model.json`, render one HTML page per level.
Read `reference/c4.md` first if C4 is new to you. It is short.

## 1. Config

Look for `config.json` in the project root. If it is missing, use these defaults and tell the user they can `cp <skill>/config.json.example config.json` to change them.

| key | default | meaning |
| --- | --- | --- |
| `project_name` | folder name | Title on every page |
| `output_dir` | `outputs` | Pages go to `<output_dir>/c4/` |
| `levels` | `["context","container"]` | Add `"component"` for one page per container that has components |
| `include` | everything | Globs to survey |
| `exclude` | vendored and generated code | Globs to skip |

## 2. Survey the code

Read entry points, service definitions, Dockerfiles, compose files, infra, package manifests and README. Then decide:

- **People**: who uses the system (one per role, not per feature).
- **The system**: one software system, named after the product.
- **Containers**: things that run or store data. Apps, services, workers, databases, queues, buckets. Each queue or topic is its own container. Not Docker images, not libraries.
- **External systems**: SaaS and other teams' systems the code calls. Treat hosted databases you own (RDS, DynamoDB) as containers, not externals.
- **Components** (only if `component` is in `levels`): the major modules inside each container, grouped by responsibility. Five to nine per container is plenty.
- **Relationships**: one per direction. Label with intent ("Publishes order events", not "Uses") and the protocol or technology.

Give every element a one-sentence description and a technology. Add tags where the code tells you: `tech:`, `region:`, `env:`, `team:`, `risk:`. Skip tags you would have to guess.

## 3. Write the model

Write `<output_dir>/c4/model.json` in this shape. Ids are short and stable.

```json
{
  "project": "Pulse",
  "description": "One line on what the system is for.",
  "generated": "2026-10-09",
  "elements": [
    { "id": "user", "type": "person", "name": "User", "description": "…", "external": true },
    { "id": "pulse", "type": "system", "name": "Pulse", "description": "…" },
    { "id": "ses", "type": "system", "name": "Amazon SES", "external": true, "technology": "SaaS", "description": "…" },
    { "id": "api", "type": "container", "parent": "pulse", "kind": "app", "name": "API Service",
      "technology": "Node, TypeScript", "description": "…", "tags": ["tech:EC2", "region:us-west-1", "risk:Medium"] },
    { "id": "api.auth", "type": "component", "parent": "api", "name": "Auth Middleware", "technology": "Express", "description": "…" }
  ],
  "relationships": [
    { "from": "user", "to": "api", "label": "Reads and posts messages", "technology": "JSON / HTTPS" }
  ]
}
```

- `type`: `person`, `system`, `container`, `component`.
- `kind` (containers only): `app`, `web`, `mobile`, `store`, `queue`, `function`. Picks the icon.
- `external: true` marks people and systems outside the boundary.
- Relationships may point at components; the renderer rolls them up to the container and system levels.

A complete one: https://github.com/coffeestained/public-skills/blob/main/examples/model.json

## 4. Render

```bash
python3 <skill>/scripts/render.py <output_dir>/c4/model.json <output_dir>/c4 context,container
```

This writes `context.html`, `container.html`, `component-<id>.html` and `index.html` next to `model.json`. Each page is self-contained: open it in a browser, print it, or paste it into a wiki.

No Python? Copy `templates/diagram.html`, replace the value after `/*__MODEL__*/` with the model JSON and the value after `/*__VIEW__*/` with `{"level":"container"}` (or `{"level":"component","container":"api"}`), one file per page. Do the same for `templates/index.html` with `/*__PAGES__*/`.

## 5. Report

Print one line: what was written and where, for example `c4: 3 diagrams in outputs/c4/ (open outputs/c4/index.html)`.

## Rules of thumb

- Everything on a diagram has a name, a type, a technology and a description. The template enforces this; the model has to supply it.
- Every arrow is one direction and says what for and over what.
- Keep the context diagram readable by a non-engineer. Put protocols on the container diagram instead.
- Do not invent elements the code does not show. Say what you could not determine.
