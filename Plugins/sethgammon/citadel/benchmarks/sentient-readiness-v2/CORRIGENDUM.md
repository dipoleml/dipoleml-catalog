# Capability-profile v2 disclosure and corrigendum

The frozen `METHOD.md` and signed run remain unchanged. This note corrects the
interpretation of two phrases without retroactively changing the study.

1. The capability profile was designed after inspecting v1 and after a small
   four-prompt 1.5B calibration. It was prospectively frozen before the 12 v2
   exact instances ran; it was not designed independently of v1.
2. Ten of the 12 v2 instances are parameter-swapped versions of task templates
   present in v1. They are new exact instances, not an independent task-family
   holdout. The other two add lexical counting and percent arithmetic.
3. Each exact instance ran three times per policy with the same prompt,
   temperature zero, and seed 42. Therefore `24/36` means eight of 12 unique
   instances verified in all three deterministic repetitions. The 36 cells per
   policy are useful for timing and runtime variability; they are not 36
   independent task samples.

Application-safe description:

> A separately prospectively frozen follow-up ran 12 new exact instances,
> mostly from task templates already observed in v1, under two policies and
> three timing repetitions. It matched the always-7B cell completion at higher
> measured GPU energy and modeled GPU cost.

The negative economic conclusion is robust to leave-one-matched-pair-out
sensitivity. No generalization beyond these templates, model family, machine,
or exact-answer verifier is claimed.
