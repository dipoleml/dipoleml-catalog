# Citadel application media kit

All images are normalized 1440 by 900 PNG captures from the rendered local site
at the same source revision as the application package. Run
`node scripts/capture-application-media.js` to recapture all three at the exact target
size. The social preview is 1200 by 630.

## Application images

1. [`01-product-entry.png`](../assets/application/01-product-entry.png)
   Caption: Citadel starts with one command and opens progressively from task
   routing into durable state, coordination, and governed operation control.
2. [`02-evidence-hero.png`](../assets/application/02-evidence-hero.png)
   Caption: The evaluator path leads with the latest outside-authored diagnostic:
   direct Claude verified 2/16, the controller 3/16, and the weak baseline
   invalidated a general optimization claim despite 1.26% lower comparison cost.
3. [`03-policy-comparison.png`](../assets/application/03-policy-comparison.png)
   Caption: Two separately frozen studies make the boundary visible: a bounded
   synthetic support envelope passed, while the outside-authored follow-up
   invalidated the generalized strong-baseline claim. Both remain public.

## Social preview

- [`citadel-social-preview.png`](../assets/citadel-social-preview.png)
- Editable source: [`citadel-social-preview.svg`](../assets/citadel-social-preview.svg)

## Two-minute walkthrough

- [`citadel-sentient-walkthrough.mp4`](../assets/application/citadel-sentient-walkthrough.mp4)
- Narration source: [`walkthrough-narration.txt`](../assets/application/walkthrough-narration.txt)
- Rebuild: `py -3 scripts/render-application-walkthrough.py`

The walkthrough currently preserves the failed calibration trail and the
separately frozen hybrid v2 result with its boundaries. It predates the public
holdout and must not be described as the latest result; the application PDF and
evidence page carry the current diagnostic.

The narration uses generated text-to-speech and should be labeled as such if
uploaded to a platform that requires synthetic-media disclosure.

## Real-command verification supplement

- [`citadel-live-verification-demo.mp4`](../assets/application/citadel-live-verification-demo.mp4)
- Exact command output and digests: [`live-verification-output.json`](../assets/application/live-verification-output.json)
- Rebuild: `py -3 scripts/render-live-verification-demo.py`

This silent 42-second terminal reel is generated only after the three public
verification commands exit zero. It is a product-evidence supplement, not a
mock terminal animation.
