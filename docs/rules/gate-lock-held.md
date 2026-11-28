---
status: provisional
added: 2026-11-28
check: `locks` (tools/audit/lockCheck.mjs G1-G6: mergeGate waits for a live holder of gate.lock and exits 76 at GATE_LOCK_WAIT_S with the lock untouched, takes a dead holder's, releases on exit, --no-lock, nested under a parent that holds it; merge.mjs takes it before the merge and runs mergeGate async with --no-lock)
---
**Rule.** `tools/audit/mergeGate.mjs` takes `C:/Users/tibog/Downloads/uccle-jobs/gate.lock` itself, for its whole run, through `tools/gate/lock.mjs` (owner `mergeGate(<worktree>)` or UCCLE_LOCK_OWNER, pid, start time, a heartbeat every minute). A lock held by a live, beating holder is waited for with a line a minute (GATE_LOCK_WAIT_S caps the wait: exit 76, lock busy); a dead holder's lock is taken over; it is released on exit, a crash and Ctrl-C. `tools/merge.mjs` takes gate.lock for the whole merge (merge, bundle, gate, push, cleanup) and runs mergeGate asynchronously (its heartbeat keeps beating) with `--no-lock`; mergeGate also treats a lock held by its parent process as its own, so the two never deadlock. Agents never write gate.lock by hand.

**Why.** On 2026-11-28 mergeGate never wrote gate.lock: agents wrote it by hand (each with its own *-lock.mjs script) and one ran its gate without it, so two gates shared the laptop and their timing rows read each other's load.
