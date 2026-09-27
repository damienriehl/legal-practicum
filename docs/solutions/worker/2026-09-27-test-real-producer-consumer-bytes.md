---
title: "Boundary tests must connect the real producer to the real consumer"
lane: worker
tags: [contract-tests, producer-consumer, python, worker, release]
status: resolved
related: ["app/worker/test/editor-publisher-release.test.js", "tools/prove_queues_empty.py", "docs/day-zero-migration-operations.md"]
---

# Failure mode

Hand-written frontier fixtures can agree with the Python verifier while drifting
from the Worker's actual response. Separate green unit suites do not prove that
the producer and consumer can communicate.

# Prevention

In `app/worker/test/editor-publisher-release.test.js`, feed the real Worker
endpoint response bytes into `tools/prove_queues_empty.py`, the real Python consumer. Preserve serialization
at the boundary rather than rebuilding an equivalent fixture in the test.
Exercise empty frontiers and non-empty held work, blocked frontiers, active
releases, and unprepared applied batches; also require rejection of tampered
responses. Keep external transport and host dependencies controlled while
running the authoritative parser and decision logic.
This tests the contract that deployment actually relies on.
