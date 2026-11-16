// THE SOUND GATE (owner 2026-11-16: "all sound off by default, a mute / unmute button"). ONE setting for every real-time
// sound of the viewer: the city ambience, vehicles, trams, the motorbike / scooter / Villo, the falcon flight, the games'
// cues and sirens each create their own AudioContext (viewer/audio, viewer/moto/motoAudio.js, viewer/falconFlight/
// falconAudio.js, viewer/game/audio.js, viewer/policeCar/...). Installed before any of them (main.js imports this first),
// the gate wraps window.AudioContext: every context is registered, suspended at birth while muted, its resume() is a no-op
// while muted, and unmuting resumes them all (muting suspends them all). OfflineAudioContext (the renders) is untouched.
//   default MUTED; ?sound=1 starts unmuted; the viewer's choice is remembered in localStorage "uccle-sound" (try/catch)
//   soundGate.muted, soundGate.set(muted), soundGate.toggle(), soundGate.onChange(f), soundGate.mountButton()
// The button: a small speaker icon, bottom-right above the credits line, always on top (also over the game HUDs).
// No hotkey (M is the map).
const KEY = "uccle-sound";
const qs = typeof location !== "undefined" ? new URLSearchParams(location.search) : new URLSearchParams();
let stored = null;
try { stored = localStorage.getItem(KEY); } catch {}
const contexts = new Set(), listeners = new Set();
let muted = qs.get("sound") === "1" ? false : qs.get("sound") === "0" ? true : stored === "on" ? false : true;

const Orig = typeof window !== "undefined" ? window.AudioContext || window.webkitAudioContext : null;
if (Orig && !Orig.__gated) {
  class GatedAudioContext extends Orig {
    constructor(...a) {
      super(...a);
      contexts.add(this);
      if (muted) Orig.prototype.suspend.call(this).catch(() => {});
    }
    resume() { return muted ? Promise.resolve() : super.resume(); }
  }
  GatedAudioContext.__gated = true;
  window.AudioContext = GatedAudioContext;
  if (window.webkitAudioContext) window.webkitAudioContext = GatedAudioContext;
}

export const soundGate = {
  get muted() { return muted; },
  set(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? "off" : "on"); } catch {}
    for (const c of contexts) {
      if (c.state === "closed") { contexts.delete(c); continue; }
      (muted ? Orig.prototype.suspend.call(c) : Orig.prototype.resume.call(c)).catch(() => {});
    }
    for (const f of listeners) try { f(muted); } catch {}
    this._paint?.();
  },
  toggle() { this.set(!muted); },
  onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  mountButton() {
    if (typeof document === "undefined" || this._btn) return this._btn;
    const b = document.createElement("button");
    b.type = "button";
    b.id = "sound-toggle";
    Object.assign(b.style, {
      position: "fixed", right: "12px", bottom: "34px", zIndex: "2147483000", width: "34px", height: "34px", padding: "0",
      border: "1px solid rgba(255,255,255,0.25)", borderRadius: "17px", background: "rgba(20,22,26,0.72)", color: "#f2f2ee",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
    });
    const ICON = {
      on: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
      off: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M17 9l5 6"/><path d="M22 9l-5 6"/></svg>',
    };
    this._paint = () => { b.innerHTML = muted ? ICON.off : ICON.on; b.title = muted ? "Sound off: click to turn it on" : "Sound on: click to mute"; b.setAttribute("aria-pressed", String(!muted)); };
    this._paint();
    // (a click is a user gesture: the browser lets the contexts resume)
    b.addEventListener("click", (e) => { e.stopPropagation(); this.toggle(); b.blur(); });
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(b);
    this._btn = b;
    return b;
  },
};
if (typeof window !== "undefined") window.__sound = soundGate;
