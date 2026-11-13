# HLD in five minutes

A High-Level Design is the two-page answer for someone deciding whether to fund, join or depend on a system.

- **Reader:** executives, product, new joiners.
- **Answers:** what is it, who is it for, what could hurt it?
- **Scope:** the whole system, seen from outside and one level in.
- **Subject:** the id of the system in `model.json`.

## The outline

The renderer reads this table. Sections appear in this order, with these ids, and no others.

| # | id | words | blocks | holds |
| --- | --- | --- | --- | --- |
| 1 | purpose | 60 | text | What it does, for whom, and why it exists |
| 2 | scope | 80 | list | Two titled lists: in scope, out of scope |
| 3 | context | 40 | diagram:context, text | Who uses it and what it depends on |
| 4 | architecture | 40 | diagram:container, text | The running parts and their technology, as the diagram shows them |
| 5 | key-flows | 150 | list | Two or three flows across containers, each an ordered list of at most five steps |
| 6 | risks | 120 | risks | Three to five risks to the whole system |

490 words in all. Words are counted in what you write; diagrams and model tables are free.

## What it does not contain

| Leave out | It lives in |
| --- | --- |
| Reasons, alternatives, quality targets, infrastructure | SAD |
| Endpoints, schemas, configuration, tests | TDD |
| Names, technologies, relationship labels | `c4/model.json`, drawn by the `diagram` blocks |
| A table of the containers | SAD, which has no diagram |
| Threats | `threat-model` |

## Writing it

- Lead with the summary: three sentences a reader can stop after.
- Plain words. A protocol name belongs on the container diagram, not in the purpose.
- A flow is what happens, in order, across containers: "A visitor sends the form", not "the system handles requests".
- A risk names what goes wrong and what is done about it. Tie it to the elements it touches.
- If the code did not show it, write "Not determined from code". Do not guess.

Outline shaped by arc42 and the C4 model's notes on supplementary documentation, read and rephrased.
