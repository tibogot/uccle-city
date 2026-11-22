// gate row `assetgz` (docs/WORKFLOW.md: one file per row; mergeGate.mjs runs it)
export default {
  name: "assetgz",
  script: "tools/audit/assetGzCheck.mjs",
  args: ["--quiet"],
  guards: "the live site's data goes out compressed and decodes to the source (rule asset-compression, claude/assetgz): every listed file type is a brotli-sibling type or proven incompressible, every KTX2 supercompressed; vercel.json's build runs tools/asset_hashes.mjs (kept by .vercelignore, node: builtins only) and a header rule sends <file>.br with Content-Encoding: br (the dev server too); the --br build on a boot sample writes siblings that decode byte for byte to the source, the list's hash + raw size right, the cache rebuild identical, -25 % or more against brotli-3 (what Vercel sends today); sw.js in node answers the source bytes via a sibling, and the plain file (siblings then off) for a re-encoded / missing / wrong sibling, plain only with ?assetbr=old, untouched with no list",
  timeout: 300,
};
