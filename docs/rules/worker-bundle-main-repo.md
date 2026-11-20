---
number: 12
check: (merge procedure)
---
**Rule.** Rebuild and commit `viewer/tileWorker.bundle.js` **only in the main repo**, only when worker code changed.

**Why.** a rebuild in a worktree changes only the path comments, yet that changes the tile-cache hash: every player's tiles rebuild once (148 s first load)
