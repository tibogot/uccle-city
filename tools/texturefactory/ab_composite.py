"""Before / after composites of the city switch (docs/img/texfactory/city/<consumer>_<view>_{before,after}.jpeg ->
<consumer>_<view>_ab.jpg, side by side, labelled).    python -E -P tools/texturefactory/ab_composite.py [consumer ...]"""
import glob
import os
import sys

import cv2
import numpy as np

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "img", "texfactory", "city")
only = sys.argv[1:]
for b in sorted(glob.glob(os.path.join(D, "*_before.jpeg"))):
    a = b.replace("_before.jpeg", "_after.jpeg")
    name = os.path.basename(b).replace("_before.jpeg", "")
    if not os.path.exists(a) or (only and name.split("_")[0] not in only):
        continue
    A, B = cv2.imread(b), cv2.imread(a)
    h = A.shape[0]
    s = np.hstack([A, np.full((h, 8, 3), 255, np.uint8), B])
    for x, t in ((20, "BEFORE: own temporary materials"), (A.shape[1] + 28, "AFTER: library (shipped sets)")):
        cv2.putText(s, t, (x, 44), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 0, 0), 5, cv2.LINE_AA)
        cv2.putText(s, t, (x, 44), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.imwrite(os.path.join(D, f"{name}_ab.jpg"), cv2.resize(s, None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(name)
