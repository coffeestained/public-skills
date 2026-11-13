# TDD in five minutes

A Technical Design Document is what an engineer needs to change one container safely and keep it running.

- **Reader:** engineers who build and run that container.
- **Answers:** how does it work, how do I change and run it?
- **Scope:** one container. A component is a section of its container's TDD, never a TDD of its own.
- **Subject:** the id of a container that has components in `model.json`. The file is `tdd/<that id>.json`.

## The outline

The renderer reads this table. Sections appear in this order, with these ids, and no others.

| # | id | words | blocks | holds |
| --- | --- | --- | --- | --- |
| 1 | responsibility | 60 | text, list | What it owns, and what it deliberately does not |
| 2 | components | 40 | diagram:component, text | Its parts and what they talk to |
| 3 | interfaces | 180 | flows, table, text | Commands, endpoints, events and schedules: input, output, errors |
| 4 | data | 120 | table, text | What it stores: keys, fields, owner, retention |
| 5 | behaviour | 180 | list, text | The main sequences in order, and the rules that always hold |
| 6 | failure-modes | 120 | risks | What fails, what the effect is, how it is handled |
| 7 | testing | 80 | table, text | Tier, what it covers, the command that runs it |
| 8 | operations | 100 | table, list | Configuration by name, deploy, what to watch, runbooks |
| 9 | open-questions | 60 | list, text | What the code did not show |

940 words in all. Words are counted in what you write; the diagram and the flows table are free.

## What it does not contain

| Leave out | It lives in |
| --- | --- |
| Why the system exists, its users, system risks | HLD |
| Decisions across containers, quality goals, infrastructure | SAD |
| Other containers' internals | Their TDDs |
| Threats | `threat-model` |

## Writing it

- The component diagram needs components. If the container has none in the model, run `c4-diagrams` with the `component` level first.
- An interface row is a contract: name, input, output, how it fails.
- Behaviour is ordered steps a reader can follow in the code. Name files and functions in backticks.
- Configuration and secrets by name only. Never a value.
- A failure mode is local: it ends inside this container. A risk to the whole system belongs in the HLD.
- If the code did not show it, it goes in open questions. Do not guess.

Outline shaped by arc42 (building blocks, runtime view, risks) and common engineering design-doc practice, read and rephrased.
