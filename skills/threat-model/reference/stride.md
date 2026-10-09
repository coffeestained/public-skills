# STRIDE in five minutes

A threat model answers four questions: what are we building, what can go wrong, what are we doing about it, and did we do a good job. The C4 model answers the first. STRIDE is a checklist for the second.

## Trust boundaries

A boundary is where the level of trust changes: a browser talking to your API, your API talking to a vendor, one account or network talking to another. Data crossing a boundary is where most threats live, so list those flows first. Inside a boundary, the interesting elements are the ones that hold secrets, money or personal data.

## The six categories

| Letter | Threat | Breaks | Ask |
| --- | --- | --- | --- |
| S | Spoofing | Authentication | Can someone pretend to be a user, a service or a server? |
| T | Tampering | Integrity | Can data be changed in transit, at rest or in a queue without anyone noticing? |
| R | Repudiation | Accountability | Can someone deny doing something because nothing recorded it? |
| I | Information disclosure | Confidentiality | Can data leak through responses, logs, errors, backups or a shared store? |
| D | Denial of service | Availability | Can one caller exhaust connections, queues, storage or a third-party quota? |
| E | Elevation of privilege | Authorisation | Can a caller do more than their role allows, or reach an internal endpoint? |

Walk each element and each boundary-crossing flow through the six letters. Most combinations produce nothing. Write down the ones that do.

## Rating

Severity is impact times ease. A high-impact threat that needs physical access is medium. A low-impact threat that any anonymous user can trigger in one request is also medium. Reserve `critical` for unauthenticated reach into data or money.

## Mitigations

Prefer what the code already does. A mitigation is a specific control (JWT signature check with key rotation, parameterised queries, per-user rate limit, server-side authorisation on every handler), not a category ("use encryption"). Mark a threat `accepted` when the team knowingly lives with it, and say why.

Source material, read and rephrased: the STRIDE model as described by Microsoft's threat modelling guidance and Adam Shostack's "Threat Modeling: Designing for Security".
