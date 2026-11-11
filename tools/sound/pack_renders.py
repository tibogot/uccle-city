# Copy offline renders (from the save server's folder) into docs/sound/renders: mono where space isn't the
# point, a few trimmed, 20 ms edge fades. usage: python tools/sound/pack_renders.py <src_dir> docs/sound/renders
import wave, numpy as np, glob, os, sys
src, dst = sys.argv[1], sys.argv[2]
STEREO = {"car_passby_asphalt": None, "car_passby_setts": None, "occlusion_walk": None, "birds_dawn_may": (0, 12),
          "bells_saintjob_3pm": (0, 12.5), "train_passby": (0.5, 12.5), "tram_curve_squeal": (3, 14)}
SKIP = {"stress_40"}
for f in sorted(glob.glob(os.path.join(src, "*.wav"))):
    n = os.path.basename(f)[:-4]
    if n in SKIP: continue
    w = wave.open(f); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).astype(np.float32); w.close()
    if n in STEREO:
        if STEREO[n]: a, b = STEREO[n]; x = x[int(a * sr):int(b * sr)]
    elif ch == 2: x = x.mean(1, keepdims=True)
    k = int(0.02 * sr); r = np.linspace(0, 1, k)[:, None]; x[:k] *= r; x[-k:] *= r[::-1]
    o = wave.open(os.path.join(dst, n + ".wav"), "wb"); o.setnchannels(x.shape[1]); o.setsampwidth(2); o.setframerate(sr)
    o.writeframes(np.clip(x, -32768, 32767).astype(np.int16).tobytes()); o.close()
