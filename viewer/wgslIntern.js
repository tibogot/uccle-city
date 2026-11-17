// perf9 (?wgslintern=old = off): ONE copy of each WGSL text on the JS heap. three r187 keeps the generated vertex /
// fragment code of every node build (NodeBuilderState.vertexShader / fragmentShader, tens of KB each) and caches its
// programs by that text (Pipelines.programs: Map code -> ProgrammableStage, which keeps the text too). Two builds that
// generate the same code (two node graphs of different node objects, e.g. the per-model wrapAO copies of a library slot,
// fading copies, per-tile materials) each keep their OWN string of it: the map lookup matches by content, the second
// copy stays alive in its state. Here, once per state, after its pipeline is set, the state's strings are replaced by
// the program's (same content, so every map lookup still matches; three reads them only as those map keys).
export function installWgslIntern(renderer) {
  const P = renderer._pipelines;
  if (!P || P.__intern) return null;
  const done = new WeakSet(), stats = { states: 0, swapped: 0, chars: 0 };
  const orig = P.getForRender;
  P.getForRender = function (ro, promises) {
    const r = orig.call(this, ro, promises);
    const st = ro._nodeBuilderState;
    if (st && !done.has(st)) {
      const p = this.get(ro)?.pipeline;
      if (p?.vertexProgram && p.fragmentProgram) {
        done.add(st); stats.states++;
        const v = p.vertexProgram.code, f = p.fragmentProgram.code;
        // (equal content is the invariant: the programs were looked up by these very strings)
        if (typeof v === "string" && st.vertexShader === v) { st.vertexShader = v; stats.swapped++; stats.chars += v.length; }
        if (typeof f === "string" && st.fragmentShader === f) { st.fragmentShader = f; stats.swapped++; stats.chars += f.length; }
      }
    }
    return r;
  };
  P.__intern = stats;
  return stats;
}
