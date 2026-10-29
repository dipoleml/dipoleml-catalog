# Sentient readiness v1 matched-pair sensitivity

The signed v1 aggregate is unchanged. This supplementary analysis removes the
same scenario/repetition from both policies because the baseline cell timed out
after 60 seconds while both policies had selected the same strong route. The
timeout is therefore not evidence of a routing-policy advantage.

| Metric after matched-pair exclusion | Always 7B | Adaptive | Adaptive reduction |
|---|---:|---:|---:|
| Verified cells | 24/35 | 27/35 | quality ratio 1.125 |
| Measured GPU energy | 0.003897104 kWh | 0.004032122 kWh | -3.46% |
| Modeled GPU cost | $0.001487405 | $0.001567705 | -5.40% |
| Request wall duration | 254875 ms | 274061 ms | -7.53% |

Negative reduction means adaptive used more. After exclusion, adaptive used
3.46% more measured GPU energy,
5.40% more modeled GPU cost,
and 7.53% more request wall time.

Conclusion: **v1 does not support a routing-policy savings claim.** It remains a
valid signed calibration run whose frozen economic gates failed.

Report: `sha256:75713af7fe729c44727cc21057a99200337969694dc093ce326f104c8d21f11a`
