#!/usr/bin/env python3
"""
Smoke test: prove the fellowship's "Month 2" SAE experiment is solo-doable on
OPEN tooling — load a Gemma Scope SAE (Google's open SAEs for Gemma-2) via
sae_lens, no Anthropic access required.

If this loads, the intent-decomposition experiment (does an SAE feature separate
safe vs malicious tool descriptions, RAGLens Feature 22790 style) can be run
locally on Gemma-2-2b.
"""
import sys
try:
    import sae_lens
    from sae_lens import SAE
except Exception as e:
    print("sae_lens import failed:", e); sys.exit(1)

print("sae_lens version:", getattr(sae_lens, "__version__", "?"))

# show which Gemma Scope releases sae_lens knows about
try:
    from sae_lens.toolkit.pretrained_saes_directory import get_pretrained_saes_directory
    d = get_pretrained_saes_directory()
    gemma = [k for k in d if "gemma-scope" in k.lower()]
    print(f"\nGemma Scope releases available: {len(gemma)}")
    for k in gemma[:8]:
        print("  -", k)
except Exception as e:
    print("(could not list directory:", e, ")")

# try to actually load one canonical Gemma-2-2b residual SAE (downloads weights)
candidates = [
    ("gemma-scope-2b-pt-res-canonical", "layer_20/width_16k/canonical"),
    ("gemma-scope-2b-pt-res", "layer_20/width_16k/average_l0_71"),
]
for release, sae_id in candidates:
    try:
        print(f"\nLoading {release} :: {sae_id} (cpu) ...")
        res = SAE.from_pretrained(release, sae_id, device="cpu")
        sae = res[0] if isinstance(res, tuple) else res
        cfg = sae.cfg
        print("  OK. d_in =", getattr(cfg, "d_in", "?"),
              "| d_sae =", getattr(cfg, "d_sae", "?"),
              "| hook =", getattr(cfg, "hook_name", getattr(cfg, "metadata", "?")))
        print("\nPROOF: open SAE loaded with zero Anthropic access. Month-2 is solo-doable.")
        break
    except Exception as e:
        print("  failed:", repr(e)[:200])
