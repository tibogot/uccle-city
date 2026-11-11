# Spectrogram + numbers for WAV renders. usage: analyze.py out.png a.wav [b.wav ...]
import sys, wave, numpy as np, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
def load(p):
    w = wave.open(p); n = w.getnframes(); ch = w.getnchannels(); sr = w.getframerate()
    x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    x = x.reshape(-1, ch); return x, sr
out, files = sys.argv[1], sys.argv[2:]
fig, axes = plt.subplots(len(files), 2, figsize=(14, 2.6 * len(files)), gridspec_kw={"width_ratios": [3, 1]}, squeeze=False)
for ax, f in zip(axes, files):
    x, sr = load(f); m = x.mean(1); name = f.replace("\\", "/").split("/")[-1]
    low = any(k in name for k in ("engine", "hum", "bells", "train"))
    Pxx, _, _, _ = ax[0].specgram(m + 1e-9, NFFT=4096 if low else 1024, Fs=sr, noverlap=3584 if low else 896, cmap="magma")
    top_db = 10 * np.log10(Pxx.max() + 1e-20); ax[0].images[-1].set_clim(top_db - 75, top_db); ax[0].set_ylim(0, 3000 if low else min(12000, sr / 2)); ax[0].set_title(name, fontsize=9); ax[0].set_ylabel("Hz")
    S = np.abs(np.fft.rfft(m * np.hanning(len(m)))) ** 2; fr = np.fft.rfftfreq(len(m), 1 / sr)
    ax[1].semilogx(fr[1:], 10 * np.log10(S[1:] + 1e-12)); ax[1].set_xlim(30, sr / 2); ax[1].grid(True, which="both", alpha=.3)
    cent = (fr * S).sum() / S.sum(); rms = np.sqrt((m ** 2).mean()); peak = np.abs(x).max()
    bands = [(20, 250), (250, 1000), (1000, 4000), (4000, 12000)]; e = [S[(fr >= a) & (fr < b)].sum() for a, b in bands]; tot = sum(e)
    top = fr[np.argsort(S[(fr > 80)])[-5:] + np.searchsorted(fr, 80)]
    env = np.sqrt(np.convolve(m ** 2, np.ones(int(sr * 0.01)) / int(sr * 0.01), "same")); thr = env.max() * 0.25
    on = np.where((env[1:] > thr) & (env[:-1] <= thr))[0] / sr
    lr = ""
    if x.shape[1] == 2: lr = " L/R dB %.1f" % (10 * np.log10((x[:, 0] ** 2).sum() / max(1e-12, (x[:, 1] ** 2).sum())))
    print(f"{name}: {len(m)/sr:.1f}s rms {20*np.log10(rms+1e-9):.1f} dBFS peak {peak:.2f} centroid {cent:.0f} Hz bands%% " + " ".join(f"{100*v/tot:.0f}" for v in e) + f" topHz {np.round(np.sort(top)).astype(int).tolist()} onsets {np.round(on[:14],2).tolist()}{lr}")
plt.tight_layout(); plt.savefig(out, dpi=48)
