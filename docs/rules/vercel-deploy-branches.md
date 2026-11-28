---
status: provisional
added: 2026-11-24
check: `vercelbuild` (tools/audit/vercelBuildCheck.mjs: runs vercel.json's ignoreCommand per branch like Vercel does: foundation, kid, character2 and CLI build; every other branch is skipped)
---
**Rule.** Only `claude/foundation` (the live site), the owner's own `claude/kid` and `claude/character2`, and CLI deploys build on Vercel. Every job agent's branch is skipped by `vercel.json`'s `ignoreCommand` (exit 1 = build, exit 0 = skip). Agent branches are checked locally with `tools/tour/serve.mjs`, never on a Vercel preview. A new owner branch that needs a preview is added to the list in `ignoreCommand` and to the check.

**Why.** On 2026-11-24 the owner's Vercel usage showed Deployment Storage at 42 GB of the free 10 GB. Every push of every branch made a full deployment: about 300 MB of models, textures and tiles, plus about 100 MB of brotli siblings since claude/assetgz. The job agents push their `claude/*` branches many times a day, and Vercel keeps old deployments. The previews were never used: agent work is toured locally (rule tour-fresh-bundle).
