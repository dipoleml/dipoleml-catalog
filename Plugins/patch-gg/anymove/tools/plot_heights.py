"""Plot joint heights over time as read in each view, to see lags and swaps between the two halves.

python tools/plot_heights.py DET.npz out.png
"""
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

d = np.load(sys.argv[1])
names = [str(n) for n in d["names"]]
keys = ["head", "hips", "tail_tip", "fpaw_L", "fpaw_R", "hpaw_L", "hpaw_R", "wrist_L", "wrist_R"]
fig, axs = plt.subplots(len(keys), 1, figsize=(10, 2.0 * len(keys)), sharex=True)
for ax, k in zip(axs, keys):
    j = names.index(k)
    ax.plot(-d["front_uv"][:, j, 1], label="front", color="#F53CD1")
    ax.plot(-d["side_uv"][:, j, 1], label="side", color="#2F6BFF")
    ax.set_ylabel(k)
axs[0].legend()
plt.tight_layout()
plt.savefig(sys.argv[2], dpi=70)
