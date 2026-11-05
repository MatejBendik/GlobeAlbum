# Triage labels

Status: confirmed by the user. Use the default roles for local tickets. Track execution evidence separately from triage readiness.

| Canonical role    | Local status      | Meaning                                  |
| ----------------- | ----------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`    | Maintainer evaluation needed             |
| `needs-info`      | `needs-info`      | More information needed                  |
| `ready-for-agent` | `ready-for-agent` | Fully specified for agent implementation |
| `ready-for-human` | `ready-for-human` | Human implementation needed              |
| `wontfix`         | `wontfix`         | Will not be actioned                     |

Use these values on the ticket's `Status:` line. `ready-for-agent` describes readiness; it does not authorize implementation during discovery.
