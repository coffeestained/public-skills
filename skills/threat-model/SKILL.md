---
name: threat-model
description: Build a STRIDE threat model from a project's C4 architecture model and render it as a self-contained light-mode HTML report in the outputs folder. Use when asked for a threat model, security review of the architecture, STRIDE analysis, trust boundaries, or attack surface.
license: MIT
metadata:
  author: coffeestained
  version: "1.0"
---

# Threat model

Start from the C4 model, find the trust boundaries, list STRIDE threats per element and per boundary-crossing flow, render one page.
Read `reference/stride.md` first if STRIDE is new to you. It is short.

## 1. Config and input

Use the same `config.json` as the `c4-diagrams` skill (`project_name`, `output_dir`, defaults apply when it is missing).

Read `<output_dir>/c4/model.json`. If it does not exist, run the `c4-diagrams` skill first. The threat model is only as good as that model, so fix the model before modelling threats.

## 2. Find the boundaries

The report derives trust zones from the model: people, the client device (containers with `kind` `web` or `mobile`), the backend, and one zone per external system. Every relationship between two zones is a boundary-crossing flow. Check that list against the code: an internal flow over a public network, or a container on a different account or cluster, is also a boundary. Note those in the threat descriptions.

## 3. Enumerate threats

For each container, person and external system, and for each boundary-crossing flow, walk the six STRIDE categories and ask what could go wrong. Read the code for the answer: auth middleware, input validation, TLS config, IAM policies, logging, rate limits, secrets handling. Record what you find, not what a generic checklist says.

- Keep each threat specific to this system. "Attacker replays a captured JWT against the API after logout" beats "token theft".
- Rate severity by impact and ease: `critical`, `high`, `medium`, `low`.
- Status is `open`, `mitigated` (the code already handles it; say how) or `accepted` (say why).
- Five to fifteen threats is normal for a small system. Do not pad.

## 4. Write threats.json

Write `<output_dir>/threat-model/threats.json`:

```json
{
  "scope": "Pulse containers and their external flows",
  "method": "STRIDE per element and per boundary-crossing flow",
  "generated": "2026-10-09",
  "threats": [
    { "id": "T1", "category": "S", "severity": "high", "status": "mitigated",
      "element": "api", "flow": ["web", "api"],
      "title": "Forged or replayed bearer token",
      "description": "…what, where in the code, and why it matters…",
      "mitigation": "…what the code does or should do…" }
  ]
}
```

- `category`: one letter, `S` `T` `R` `I` `D` `E`.
- `element`: the id the threat lives on. `flow`: `[from, to]` ids when it concerns a data flow. Either or both.
- Ids from the C4 model. Component ids roll up to their container.

## 5. Render

```bash
python3 <skill>/scripts/render.py <output_dir>/c4/model.json <output_dir>/threat-model/threats.json <output_dir>/threat-model
```

No Python? Copy `templates/report.html`, replace the value after `/*__MODEL__*/` with the C4 model JSON and the value after `/*__THREATS__*/` with the threats JSON.

## 6. Report

Print one line: counts by severity and the path, for example `threat-model: 9 threats (2 high) in outputs/threat-model/index.html`.
