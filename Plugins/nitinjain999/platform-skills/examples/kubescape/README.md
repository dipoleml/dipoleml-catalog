# Kubescape Example

Status: Beta

Posture checks for Kubernetes manifests, Helm charts and Kustomize with the Kubescape CLI: the same workload before and after hardening, an exceptions file with both exception actions, and a CI workflow that fails a pull request only on findings it introduces.

Verified with Kubescape CLI v4.0.16 and regolibrary v2.0.38 (`--controls-version v2.0.38`).

| File | What it shows |
|---|---|
| `manifests/insecure/deployment.yaml` | The "before": NSA compliance score 45, 11 failed controls, each marked inline with the control ID Kubescape reports |
| `manifests/hardened/deployment.yaml` | The "after": same workload, NSA score 100 (non-root, read-only root filesystem, dropped capabilities, seccomp, limits, no service account token, secret from a Secret) |
| `manifests/hardened/networkpolicy.yaml` | The NetworkPolicy that clears C-0030 "Ingress and Egress blocked" |
| `exceptions.json` | One `disable` exception (accepted risk, dated) and one `alertOnly` exception (acknowledged, still failing) |
| `workflows/kubescape.yml` | PR gate on new findings via `--baseline`, signature-verified CLI install, SARIF to code scanning, Markdown job summary, expired-exception check |
| `kubescape-validate.sh` | Offline checks of all of the above; proves the gate with the CLI when `kubescape` is on PATH |

## Quick start

```bash
# Install and check the CLI
brew install kubescape            # or see references/kubescape.md for the verified download
kubescape version

# Score the "before" and "after"
kubescape scan framework nsa examples/kubescape/manifests/insecure
kubescape scan framework nsa examples/kubescape/manifests/hardened

# Gate: exits 1 on the insecure manifest, 0 on the hardened one
kubescape scan framework nsa examples/kubescape/manifests/insecure --severity-threshold high; echo "exit $?"

# Preview automatic fixes without touching the file
kubescape scan framework nsa examples/kubescape/manifests/insecure --format json --output /tmp/insecure.json
kubescape fix /tmp/insecure.json --dry-run

# Run the offline checks
bash examples/kubescape/kubescape-validate.sh
```

## Two things that are not obvious

**A scan without a gate always exits 0.** The insecure manifest scores 45% and the command still succeeds. In CI, pass `--severity-threshold`, `--compliance-threshold`, or `--baseline … --baseline-fail-on-new`.

**`alertOnly` does not silence a finding.** An `alertOnly` exception marks the control `failed (w/exceptions)`: it still lowers the score and still fails every gate. Only `"actions": ["disable"]` removes the finding from the score and the gates (it shows as `passed (w/exceptions)`). The docs list `alertOnly` as the only action; the source (opa-utils v0.0.315) has both. Use `disable` for reviewed, accepted risks and put an `until-YYYY-MM-DD` date in the name: the workflow fails once that date passes.

## Adopting the workflow

1. Copy `workflows/kubescape.yml` to `.github/workflows/kubescape.yml`.
2. Set `SCAN_PATH` to your manifests or chart directory and `FRAMEWORKS` to what you are audited against (`kubescape list frameworks`).
3. Optional: copy `exceptions.json` to `.kubescape/exceptions.json` and replace the entries with your own.
4. Make the `posture` check required in branch protection.

The workflow also runs on every pull request (a required check skipped by a `paths` filter blocks merges), turns off inline `kubescape.io/skip-controls` annotations on both scans so a PR cannot suppress its own finding, and builds Helm chart dependencies before scanning (Kubescape only warns when its own build fails).

The baseline only works when base and head are scanned from the same clone (it compares by repository identity), which is why the workflow scans the base branch from a `git worktree` of the PR checkout rather than from a second clone.

## See also

- `/platform-skills:kubescape` and `references/kubescape.md`: the full CLI guide
- `/platform-skills:kubescape-operator` and `examples/kubescape-operator/`: continuous scanning in the cluster
- `/platform-skills:trivy`: image CVE gates · `/platform-skills:kyverno`: admission enforcement
