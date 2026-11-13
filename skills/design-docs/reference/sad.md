# SAD in five minutes

A Solution Architecture Document says why the solution has this shape and what it runs on: software, infrastructure and the concerns that cut across both.

- **Reader:** architects, tech leads, reviewers.
- **Answers:** why this shape, and does it meet its goals?
- **Scope:** the whole solution, cross-cutting.
- **Subject:** the id of the system in `model.json`.

## The outline

The renderer reads this table. Sections appear in this order, with these ids, and no others.

| # | id | words | blocks | holds |
| --- | --- | --- | --- | --- |
| 1 | drivers | 100 | list, text | The forces and constraints that shaped the solution |
| 2 | quality-goals | 120 | table | Attribute, target, how it is met |
| 3 | decisions | 300 | decisions | Three to seven decisions, each with its reason and what was not chosen |
| 4 | software | 60 | elements, flows, text | The containers, the external systems and what passes between them |
| 5 | infrastructure | 120 | table, text | Where each container runs: service, account, region, sizing, environments |
| 6 | shared-concerns | 150 | table | Security posture, observability, configuration, data lifecycle, cost |
| 7 | open-questions | 60 | list, text | What the code did not show |

910 words in all. Words are counted in what you write; model tables are free.

## What it does not contain

| Leave out | It lives in |
| --- | --- |
| Purpose, scope, user flows, system risks | HLD |
| Diagrams | `c4/`, linked from the top of the page |
| Contracts, schemas, algorithms, alarms, choices inside one container | TDD |
| The threat list | `threat-model` |

## Writing it

- A decision is a choice between real options. State the choice, the reason, and what it was chosen over.
- A decision that touches one container only belongs in that container's TDD.
- A quality goal has a number or a test: "frames are at most 70 minutes old", not "fresh data".
- The `software` section needs two `elements` blocks, `"of": "containers"` and `"of": "externals"`, and one `flows` block.
- Infrastructure is facts from infra code and deploy config. No account ids, no secret values.
- If the code did not show it, it goes in open questions. Do not guess.

Outline shaped by arc42 (quality requirements, decisions, deployment view, cross-cutting concepts), read and rephrased.
