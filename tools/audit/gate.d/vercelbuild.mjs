// gate row `vercelbuild` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "vercelbuild",
  script: "tools/audit/vercelBuildCheck.mjs",
  args: ["--quiet"],
  deps: ["vercel.json"],
  guards: "only claude/foundation (the live site), the owner's claude/kid + claude/character2 and CLI deploys build on Vercel; every other branch (the job agents' claude/*) is skipped by vercel.json's ignoreCommand, run here exactly as Vercel runs it (rule vercel-deploy-branches, 2026-11-24: Deployment Storage 42 GB of the free 10 GB)",
  timeout: 60,
};
