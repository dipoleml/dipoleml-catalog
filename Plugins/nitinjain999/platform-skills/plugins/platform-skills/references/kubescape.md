---
title: Kubescape
custom_edit_url: null
---

# Kubescape Reference

Covers all `/platform-skills:kubescape` mode logic: posture scans of manifests, Helm charts, Kustomize and live clusters against NSA-CISA, MITRE ATT&CK, CIS and SOC2; CI gates that fail a pull request only on what it introduces; exceptions; controls configuration; auto-fix; Kubescape's CEL admission policy library; one-off image scans.

**Verified against:** Kubescape CLI v4.0.16 (build `d0ea07b`), regolibrary v2.0.38, cosign v3.1.3, Kubernetes 1.36 (docker-desktop). Every command below was run; every number quoted is real output. Working example: `examples/kubescape`. In-cluster continuous scanning, runtime detection and generated NetworkPolicies: `references/kubescape-operator.md`.

## Ownership boundary

| Question | Authoritative skill |
|---|---|
| "Does this manifest / chart / cluster meet NSA, MITRE, CIS or SOC2?" | **`/platform-skills:kubescape`** |
| "Block insecure Kubernetes changes in PRs" | **`/platform-skills:kubescape ci`** |
| "Continuous posture, CVEs that actually load, runtime alerts, NetworkPolicies from traffic" | `/platform-skills:kubescape-operator` |
| "Is this image safe to ship?" (CI gate) | `/platform-skills:trivy` |
| "Is there a misconfiguration in my Terraform?" | `/platform-skills:checkov` |
| "Enforce this at admission" (cluster runs Kyverno) | `/platform-skills:kyverno` |
| "Enforce this at admission" (no Kyverno, Kubernetes ≥ 1.30) | **`/platform-skills:kubescape vap`** |
| "SOC 2 controls in Terraform" | `/platform-skills:compliance` |
| "Is this production-ready overall?" | `/platform-skills:preflight` (runs Kubescape as one input) |

---

## Install and verify

Laptop: `brew install kubescape` or `kubectl krew install kubescape`. Anything that gates a merge or runs on a server: download the release and verify it. Kubescape signs `checksums.sha256` keylessly from its release workflow.

```bash
( # subshell: a failed download or check stops everything — nothing is extracted or run —
  # without changing the options of the shell you paste this into
  set -euo pipefail
  KUBESCAPE_VERSION=4.0.16
  base="https://github.com/kubescape/kubescape/releases/download/v${KUBESCAPE_VERSION}"
  os=linux; arch=amd64   # darwin / arm64 as needed
  for f in "kubescape_${KUBESCAPE_VERSION}_${os}_${arch}.tar.gz" checksums.sha256 checksums.sha256.sig checksums.sha256.pem; do
    curl -fsSLO "$base/$f"
  done
  cosign verify-blob checksums.sha256 \
    --certificate checksums.sha256.pem \
    --signature checksums.sha256.sig \
    --certificate-identity "https://github.com/kubescape/kubescape/.github/workflows/02-release.yaml@refs/tags/v${KUBESCAPE_VERSION}" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
  if command -v sha256sum >/dev/null; then
    sha256sum --check --ignore-missing checksums.sha256
  else
    shasum -a 256 -c --ignore-missing checksums.sha256   # macOS
  fi
  tar -xzf "kubescape_${KUBESCAPE_VERSION}_${os}_${arch}.tar.gz" kubescape
  ./kubescape version
)
```

Expected: `Verified OK`, then `kubescape_4.0.16_linux_amd64.tar.gz: OK`. cosign v3 also prints `Flag --certificate has been deprecated` and `Flag --signature has been deprecated`: Kubescape publishes a `.sig` and `.pem`, not a bundle, so these flags are the only way to verify it. The warning is expected; a wrong identity fails with `none of the expected identities matched`.

**Do not use `kubescape/github-action` for gates.** Its latest release, v3.0.21 (November 2024), is a Docker action built `FROM quay.io/kubescape/kubescape-cli:v3.0.21`, two major versions behind, and its README recommends `@main` with `tj-actions/changed-files`. `examples/kubescape/workflows/kubescape.yml` installs the verified CLI instead.

---

## Frameworks

`kubescape list frameworks` on v4.0.16 with regolibrary v2.0.38:

| Framework | Use when | Controls |
|---|---|---|
| `NSA` | General hardening; the default for manifests and charts | 26 |
| `MITRE` | Threat-driven review: which attacker techniques the config enables | 27 |
| `cis-v1.12.0` | Audit benchmark, self-managed or vanilla clusters (kind, kubeadm, docker-desktop) | 131 |
| `cis-eks-t1.8.0` | Audit benchmark, EKS | 49 |
| `cis-aks-t1.8.0` | Audit benchmark, AKS | 56 |
| `cis-gke-v1.9.0` | Audit benchmark, GKE | 40 |
| `SOC2` | Cluster-side SOC 2 evidence (Terraform side: `/platform-skills:compliance`) | 7 |
| `security` | Threat-focused subset ("controls that are used to assess security threats") | 37 |
| `AllControls` | Everything; noisy, for exploration only | 290 |
| `ArmoBest`, `DevOpsBest`, `WorkloadScan`, `AgentRuntimeHardening` | Vendor and special-purpose sets | — |

Also listed: `cis-v1.10.0`, `cis-eks-t1.7.0`, `cis-aks-t1.2.0` for older audits. Names are case-insensitive (`nsa`, `NSA`); combine with commas (`nsa,mitre`).

Pick the CIS benchmark from the **Kubernetes distribution**, not the infrastructure. A node's `providerID` only names the cloud: a self-managed kubeadm cluster on EC2 also has `aws://…` IDs, and the 49-control EKS benchmark would then skip checks the 131-control `cis-v1.12.0` covers (Kubescape's own provider detection, k8s-interface `GetCloudProviderFromNode`, makes exactly this `aws` → EKS shortcut). Confirm the managed service:

```bash
kubectl version -o json | jq -r .serverVersion.gitVersion      # v1.33.5-eks-… → EKS, v1.33.5-gke.… → GKE
kubectl get nodes -o jsonpath='{.items[0].metadata.labels.kubernetes\.azure\.com/cluster}'   # non-empty → AKS
kubectl get nodes -o jsonpath='{.items[0].spec.providerID}'     # hint only: aws:// azure:// gce://
```

| Signal | Benchmark |
|---|---|
| `gitVersion` contains `-eks-` | `cis-eks-t1.8.0` |
| `gitVersion` contains `-gke.` | `cis-gke-v1.9.0` |
| nodes labelled `kubernetes.azure.com/cluster` | `cis-aks-t1.8.0` |
| none of these (kubeadm, kind, docker-desktop, self-managed on any cloud) | `cis-v1.12.0` |

When the hint and the signals disagree (an `aws://` cluster without `-eks-`), or there is no cluster to ask, confirm the distribution with the user instead of guessing.

**Pin the controls.** Without `--controls-version`, every scan downloads the latest regolibrary, so results can change with no code change. In CI, pin it (`--controls-version v2.0.38`) and bump it deliberately.

---

## Scan targets

| Target | Command | Notes |
|---|---|---|
| Manifest directory | `kubescape scan framework nsa k8s/` | Recurses; YAML and JSON |
| Helm chart | `kubescape scan framework nsa charts/web-service --kube-version 1.33` | v4.0.16 runs Helm's dependency build itself when the chart has dependencies (network access; writes `charts/`) but only **warns** if it fails, and then scans the chart without those subcharts. Build them yourself first and stop on errors (`helm repo add` each `https://` repository, then `helm dependency build`; the CI workflow does this). `--kube-version` sets `.Capabilities.KubeVersion` (Helm's default is v1.20) |
| Kustomize | `kubescape scan framework nsa overlays/production/` | Directory with `kustomization.yaml` |
| Git URL | `kubescape scan framework nsa https://github.com/acme/payments-platform` | Clones first |
| Stdin | `helm template … \| kubescape scan framework nsa -` | |
| Live cluster | `kubescape scan framework cis-eks-t1.8.0` | Current kube context; read-only |
| Some namespaces | `--include-namespaces payments,checkout` / `--exclude-namespaces kube-system` | Cluster scans |
| Many clusters | `--kube-contexts prod-eu,prod-us --fleet-report fleet.json --output nsa.json` | One report per context (`nsa.prod-eu.json`), plus a combined report with `clusters`, `compliance`, `controlMatrix`, `divergence` |
| Skip paths | `--exclude-path 'test/**'` or a `.kubescapeignore` at the scan root | gitignore syntax |

Measured on this repository's `examples/helm/web-service`: NSA score 90, 3 rendered resources.

### What a CLI-only cluster scan cannot see

`kubescape scan framework cis-v1.12.0` on docker-desktop scored 35.2 with 44 failed and **53 of 131 controls skipped**: 47 need host data (`ControlPlaneInfo`, `KubeletInfo`, `CNIInfo`, `KubeProxyInfo`) and 5 are manual-review. Host data comes from the operator's node-agent. For a complete CIS audit, install the operator (`/platform-skills:kubescape-operator install`) and scan again; the CLI picks up the host data automatically.

---

## Reading results

```bash
kubescape scan framework nsa k8s/                  # table: severity, control, failed/all, score
kubescape scan framework nsa k8s/ -v               # every failed resource per control
kubescape scan framework nsa k8s/ --view control   # by control
kubescape scan control C-0057 k8s/ -v              # one control
kubescape scan framework nsa k8s/ --format json --output report.json
```

Statuses: `failed`, `passed`, `skipped` (missing host data or manual-review), and `w/exceptions` as a sub-status (see Exceptions). Control pages: `https://kubescape.io/docs/controls/c-0057/`.

Result card — the same five lines every mode ends with:

```bash
jq -r '
  .summaryDetails as $s
  | "Score: \($s.complianceScore | floor)%  (frameworks: \([$s.frameworks[].name] | join(", ")))",
    ( [ $s.controls | to_entries[] | select(.value.status == "failed")
        | {id: .key, sev: .value.severity, name: .value.name,
           failed: .value.ResourceCounters.failedResources,
           rank: ({"Critical":0,"High":1,"Medium":2,"Low":3}[.value.severity] // 4)} ]
      | sort_by(.rank, -.failed) | .[:5][]
      | "  \(.sev | ascii_upcase | .[0:4])  \(.id)  \(.name)  (\(.failed) resource(s))" )' report.json
```

On `examples/kubescape/manifests/insecure`:

```text
Score: 45%  (frameworks: NSA)
  HIGH  C-0012  Applications credentials in configuration files  (1 resource(s))
  HIGH  C-0041  HostNetwork access  (1 resource(s))
  HIGH  C-0057  Privileged container  (1 resource(s))
  HIGH  C-0270  Ensure CPU limits are set  (1 resource(s))
  HIGH  C-0271  Ensure memory limits are set  (1 resource(s))
```

Other formats: `--format sarif` (code scanning), `junit`, `markdown` (job summaries), `github-actions` (annotations), `html`, `pdf`, `csv`, `prometheus`. Several at once: `--format sarif,json,markdown --output results` writes `results.sarif`, `results.json`, `results.md`.

---

## Gates

**A scan without a gate flag exits 0**, whatever it finds: the insecure example scores 45% and still succeeds. Measured exit codes on `examples/kubescape/manifests/insecure` (worst finding High, score 45):

| Flag | Exit | Rule |
|---|---|---|
| _(none)_ | 0 | Report only |
| `--severity-threshold critical` | 0 | Fails when any failed control is **at or above** the level |
| `--severity-threshold high` | 1 | `compliance result exceeds severity threshold: high` |
| `--compliance-threshold 40` | 0 | Fails when the score is **below** the number |
| `--compliance-threshold 46` | 1 | `scan compliance-score is below permitted threshold: 45.00 (compliance-threshold: 46.00)` |

- `--compliance-threshold` applies to `scan framework`, `scan control`, `scan workload` and `--view resource|control`.
- Failed controls with an unknown severity count as exceeding any severity threshold (the gate fails closed).
- `--fail-threshold` was removed; old pipelines that pass it error out.
- The report files are written before the gate fails, so later CI steps can upload them with `if: always()`.

Greenfield: `--severity-threshold high`. Brownfield (the first scan shows dozens of failures): gate on new findings with a baseline, and pay down the debt separately.

---

## Baseline: fail only on what a change introduces

```bash
# base: the target branch, scanned from a worktree of the same clone
git worktree add --detach ../base origin/main
(cd ../base && kubescape scan framework nsa k8s --controls-version v2.0.38 \
  --honor-inline-exceptions=false --format json --output /tmp/base.json)

# head: the PR, compared to the base
kubescape scan framework nsa k8s --controls-version v2.0.38 \
  --honor-inline-exceptions=false \
  --baseline /tmp/base.json --baseline-fail-on-new --baseline-severity-threshold high
```

`--honor-inline-exceptions=false` on both scans: otherwise a change can add a `kubescape.io/skip-controls` annotation next to its new finding and pass (see Exceptions).

Measured with 11 existing failures on main:

| PR | Result |
|---|---|
| Adds `hostPID: true` | `Baseline drift summary: 1 new, 0 resolved, 14 unchanged, 0 incomparable`, exit 1 |
| Changes nothing security-relevant | `0 new, 0 resolved, 14 unchanged`, exit 0 |

**Both reports must come from the same repository identity.** Kubescape compares by repository (remote URL, or the absolute path when there is no remote). Two copies of the same files in different directories, or two clones without a shared remote, give `14 incomparable` and fail, even with no change, because incomparable failures count as new to avoid a false green. A `git worktree` of the PR checkout shares its `origin`, which is why the CI workflow uses one. `kubescape diff base.json head.json` shows the reason under `incomparable[].reason` (`repository identities differ: …`).

Options: `--baseline-granularity evidence` (default: a new failing path inside an already failing control is new) or `control` (only new failing controls count).

---

## Exceptions

An exceptions file is a JSON array of `postureExceptionPolicy` entries, passed with `--exceptions .kubescape/exceptions.json` (template: `examples/kubescape/exceptions.json`).

```json
{
  "name": "payments-api-egress-enforced-by-linkerd-policy-until-2026-12-31",
  "policyType": "postureExceptionPolicy",
  "actions": ["disable"],
  "resources": [
    { "designatorType": "Attributes",
      "attributes": { "kind": "Deployment", "namespace": "payments", "name": "payments-api" } }
  ],
  "posturePolicies": [ { "controlID": "C-0030" } ]
}
```

**The two actions behave differently, and the docs describe only one.** Measured on a manifest whose only failure is C-0030:

| Action | C-0030 status | Score | `--severity-threshold medium` | `--compliance-threshold 100` |
|---|---|---|---|---|
| none | `failed` | 95 | exit 1 | exit 1 |
| `alertOnly` | `failed (w/exceptions)` | 95 | exit 1 | exit 1 |
| `disable` | `passed (w/exceptions)` | 100 | exit 0 | exit 0 |

The opa-utils source (v0.0.315) says it directly: "An alertOnly exception acknowledges the finding without suppressing it … Only a disable action removes the finding from the results." Use `disable` for a reviewed, accepted risk; use `alertOnly` to mark a known issue that should keep failing.

**Only exactly `["alertOnly"]` keeps a finding failing.** armoapi-go v0.0.730 `IsAlertOnly()` is true only when the list contains `alertOnly` and no `disable`, and opa-utils suppresses every exception that is not alert-only. So a list that also contains `disable`, an empty list, a missing `actions` field and an unknown value all suppress — measured: `[]`, no field and `["alertOnly","disable"]` each moved C-0030 to `passed (w/exceptions)` and passed the gate. Write exactly `["disable"]` or `["alertOnly"]`; the CI workflow rejects every other form.

Matching:
- `resources` entries are ORed; `posturePolicies` entries are ORed; keys inside one object are ANDed (`{"frameworkName": "NSA", "controlID": "C-0041"}` = that control in that framework only).
- `name`, `kind`, `namespace`, `cluster`, `frameworkName`, `controlID`, `ruleName` take regular expressions (`"name": "aws-node|kube-proxy"`); label keys match exactly.
- Use `controlID`; `controlName` is deprecated.

**Inline exceptions bypass all of this.** Kubescape honours `kubescape.io/skip-controls` annotations (with optional `kubescape.io/skip-reason` and `kubescape.io/skip-expiry`) on the resource itself, **by default for local files** (not for live-cluster scans). Measured: a PR adding `privileged: true` with `kubescape.io/skip-controls: C-0057` passed `--severity-threshold high` (C-0057 `passed (w/exceptions)`); with `--honor-inline-exceptions=false` the same scan fails. In CI, pass `--honor-inline-exceptions=false` on every scan (base and head) so suppressions go through the reviewed exceptions file.

Expiry: the file has no expiry field. Put `until-YYYY-MM-DD` at the end of every `disable` exception's name; the CI workflow fails once the date passes, so accepted risks are renewed with a reason or fixed. In the cluster, `SecurityException` CRDs have a real `expiresAt` (`references/kubescape-operator.md`); a file exception wins over an in-cluster one for the same control and resource.

---

## Controls configuration

Some controls take inputs (allowed registries, sensitive key names, resource bounds). Download the defaults, edit, pass with `--controls-config`:

```bash
kubescape download controls-inputs -o .kubescape/controls-inputs.json
kubescape scan framework nsa k8s/ --controls-config .kubescape/controls-inputs.json
```

The file is a flat JSON object. Keys on v4.0.16 include `imageRepositoryAllowList`, `publicRegistries`, `untrustedRegistries`, `trustedCosignPublicKeys`, `sensitiveKeyNames` (default `aws_secret_access_key`, `secret`, `key`, `password`, `pwd`, `token`, `jwt`, `bearer`, `credential`, …), `sensitiveKeyNamesAllowed`, `sensitiveValues`, `sensitiveValuesAllowed`, `insecureCapabilities`, `k8sRecommendedLabels`, `cpu_limit_max`/`min`, `memory_limit_max`/`min`, `max_critical_vulnerabilities`, `max_high_vulnerabilities`, `floatingImageTags`, `imageDigestExemptRepositories`.

Common edit: restrict images to your registries.

```json
{ "imageRepositoryAllowList": ["123456789012.dkr.ecr.eu-west-1.amazonaws.com/", "ghcr.io/acme/"] }
```

Keep the file in Git next to `exceptions.json`; a change to either is a security review.

---

## Fix

```bash
kubescape scan framework nsa k8s/ --format json --output /tmp/report.json
kubescape fix /tmp/report.json --dry-run            # preview; prints to stderr
kubescape fix /tmp/report.json --output-dir /tmp/fixed   # fixed copies; originals untouched
kubescape fix /tmp/report.json --interactive        # approve resource by resource
```

On `examples/kubescape/manifests/insecure`, `--dry-run` reports `Would auto-fix 5 of 11 flagged control instances` and lists six changes: `runAsUser = 1000`, `runAsGroup = 1000`, `allowPrivilegeEscalation = false`, `privileged = false`, `readOnlyRootFilesystem = true`, `automountServiceAccountToken = false`. It cannot fix:

- C-0012 (credentials in config), C-0030 (no NetworkPolicy), C-0041 (hostNetwork): "no auto-fix available for this control".
- C-0055 (seccomp/capabilities), C-0270/C-0271 (limits): "skipped: auto-fix requires a user-supplied value (--skip-user-values is set)". `--skip-user-values` defaults to true; leave it, and set those values yourself.

Rules:
- Review the diff: `readOnlyRootFilesystem: true` breaks an app that writes outside a mounted volume; `runAsUser: 1000` breaks an image built for another UID.
- A cluster report produces patched manifests on stdout (or one per resource with `--output-dir`). Commit them to Git and let the GitOps reconciler apply them; never `kubescape fix cluster.json | kubectl apply -f -` on production.
- With a report from someone else (a CI artifact), pass `--base-path <repo>` so fixes cannot write outside it.
- `--include-controls C-0016,C-0017` / `--skip-controls` narrow the fix.

Rollback: the fix edits files in place unless `--output-dir` is set; `git checkout -- k8s/` (or `git restore`) undoes it.

---

## Validating admission policies (vap)

Kubescape ships its controls as a CEL `ValidatingAdmissionPolicy` library (72 policies on v4.0.16). Kubernetes ≥ 1.30. If the cluster already runs Kyverno, write the policy there (`/platform-skills:kyverno`); two admission engines enforcing the same rule give two different error messages and twice the rollout work.

```bash
kubescape vap list-policies                       # control ID → policy name, params, resources
kubescape vap deploy-library > kubescape-vap-library.yaml

# The stream holds a CRD and a resource of that CRD; one kubectl apply fails the
# first time with "ensure CRDs are installed first". Apply the CRD first:
yq 'select(.kind == "CustomResourceDefinition")' kubescape-vap-library.yaml | kubectl apply -f -
kubectl wait --for=condition=Established crd/controlconfigurations.kubescape.io --timeout=60s
kubectl apply -f kubescape-vap-library.yaml
```

Installing the library enforces nothing; a binding does. Bind by control ID (`--control`), not by policy name: `--policy` accepts any string, including a misspelled name that binds nothing.

```bash
# 1. Warn + Audit in one namespace
kubescape vap create-policy-binding --name payments-c0057 --control C-0057 \
  --namespace payments --action Warn --action Audit | kubectl apply -f -
```

Measured on Kubernetes 1.36:

```text
Warning: Validation failed for ValidatingAdmissionPolicy 'kubescape-c-0057-privileged-container-denied' with binding 'payments-c0057': Pod/priv-test has one or more privileged container.(see more at https://kubescape.io/docs/controls/c-0057/)
pod/priv-test created
```

```bash
# 2. After a clean audit period, Deny
kubescape vap create-policy-binding --name payments-c0057 --control C-0057 \
  --namespace payments --action Deny | kubectl apply -f -
```

```text
The pods "priv-test" is invalid: : ValidatingAdmissionPolicy 'kubescape-c-0057-privileged-container-denied' with binding 'payments-c0057' denied request: Pod/priv-test has one or more privileged container.
```

- **Blast radius:** a Deny binding rejects every matching create and update in its namespaces, including controllers re-creating pods during a rollout. Bind one namespace first.
- **Verification:** `kubectl get validatingadmissionpolicybindings`; create a known-bad pod with `--dry-run=server`.
- **Rollback:** `kubectl delete validatingadmissionpolicybinding payments-c0057` (takes effect immediately; the policies stay inert).
- `--namespace` narrows only namespaced resources; use `--resource-rule apps/v1/deployments` to narrow further. `Deny` and `Warn` cannot be combined.
- GitOps: commit the rendered library and bindings to Git; do not pipe them in a pipeline.

---

## Image

```bash
kubescape scan image ghcr.io/stefanprodan/podinfo:6.15.0 --severity-threshold critical
kubescape scan framework nsa --scan-images     # cluster or workload scan plus the images it runs
```

Grype-based. Measured: the first scan took 75 s (vulnerability database download included); `podinfo:6.9.2` has 34 Critical, 255 High, and `podinfo:6.15.0` 16 Critical, 85 High, so a configuration score of 100 says nothing about the image. Private registries: `--username`/`--password` (or `--registry-token`); one platform of a multi-arch index: `--platform linux/amd64`; air-gapped: `--grype-db-url` with `quay.io/kubescape/grype-offline-db`.

For the CI gate on images, use `/platform-skills:trivy`: it is the repository's standard, with `.trivyignore` expiry handling and SARIF already wired. Use `kubescape scan image` for a quick check or when the team standardised on Grype.

---

## CI

`examples/kubescape/workflows/kubescape.yml`:

- Installs the pinned CLI and verifies it with cosign before use.
- Pull requests: scans the base branch from a `git worktree` and gates with `--baseline … --baseline-fail-on-new --baseline-severity-threshold high`; a new `SCAN_PATH` without a base falls back to `--severity-threshold high`.
- Push to main: full scan, SARIF to code scanning, no gate.
- Writes `kubescape-results.{sarif,json,md}`; the Markdown goes to the job summary.
- Fails on `disable` exceptions past their `until-` date, or without one (an undated `disable` would suppress forever).
- Passes `--honor-inline-exceptions=false` on both scans, so a PR cannot suppress its own finding with a `kubescape.io/skip-controls` annotation.
- Builds Helm chart dependencies under `SCAN_PATH` for both revisions and fails on errors, because Kubescape only warns when its own build fails.
- Runs on every pull request (no `paths` filter): a required check skipped by a paths filter stays pending and blocks the merge.
- Skips SARIF upload for fork PRs (their token is read-only); the gate still runs.
- `permissions: {}` at the top, `contents: read` + `security-events: write` on the job, `persist-credentials: false`.

Make the `posture` job a required check in branch protection.

Air-gapped runners: `kubescape download artifacts --output .kubescape/artifacts` once, commit or cache it, and scan with `--use-artifacts-from .kubescape/artifacts`.

---

## Troubleshooting

### CI passes although the scan shows failures
- **Evidence:** the job log shows a table with failed controls and the step is green.
- **Cause:** no gate flag; a scan exits 0 by default.
- **Fix:** add `--severity-threshold high`, `--compliance-threshold <n>`, or `--baseline … --baseline-fail-on-new`.
- **Prevention:** `kubescape-validate.sh`-style check that the workflow passes a gate flag.

### An exception does not stop the gate
- **Evidence:** the control shows `failed` with sub-status `w/exceptions` in the JSON (`summaryDetails.controls["C-0030"].statusInfo`).
- **Cause:** `"actions": ["alertOnly"]` acknowledges without suppressing.
- **Fix:** `"actions": ["disable"]` with an `until-YYYY-MM-DD` name for an accepted risk.

### Baseline marks everything "incomparable"
- **Evidence:** `Baseline drift summary: 0 new, 0 resolved, 0 unchanged, 14 incomparable`; `kubescape diff base.json head.json --format json | jq '.incomparable[0].reason'` → `repository identities differ`.
- **Cause:** base and head scanned from different directories without a shared git remote.
- **Fix:** scan the base from a `git worktree` of the same clone (as the workflow does).

### Results changed overnight with no code change
- **Cause:** a new regolibrary release (controls are downloaded at scan time).
- **Fix:** `--controls-version v2.0.38`; bump it in its own PR.

### Helm chart scan shows few or no resources
- **Evidence:** `Failed to build chart dependencies` warning in the scan log; subchart workloads missing from the report.
- **Cause:** Kubescape's own dependency build failed (unreachable or unregistered repository, private credentials) and it carried on with the parent chart only.
- **Fix:** build dependencies before scanning and fail on errors: `helm repo add` each `https://` repository from `Chart.yaml` (a fresh Helm config with a `Chart.lock` otherwise fails with `no repository definition`), then `helm dependency build <chart>`; set `--kube-version` when templates branch on it.

### CIS cluster scan skips about 40% of controls
- **Evidence:** `skipped` with `missing: hostdata.kubescape.cloud/v1beta0/KubeletInfo` (or `ControlPlaneInfo`, `CNIInfo`, `KubeProxyInfo`).
- **Fix:** install the operator (`/platform-skills:kubescape-operator install`) and scan again.

### `kubescape vap deploy-library | kubectl apply -f -` fails
- **Evidence:** `no matches for kind "ControlConfiguration" in version "kubescape.io/v1" … ensure CRDs are installed first`.
- **Fix:** apply the CRD, wait for `Established`, apply the rest (see vap).

### A VAP binding has no effect
- **Evidence:** `kubectl get validatingadmissionpolicybinding <name> -o jsonpath='{.spec.policyName}'` names a policy `kubectl get validatingadmissionpolicies` does not list.
- **Cause:** created with `--policy` and a wrong name.
- **Fix:** recreate with `--control C-XXXX`.

### `kubescape fix --dry-run` prints nothing
- **Cause:** it reports on stderr as log lines.
- **Fix:** read stderr (`2>&1`), or use `--output-dir` and `diff -r`.

---

## Where the official docs and the v4.0.16 source disagree

| Docs say | Source and measurement say |
|---|---|
| Exceptions: "`actions` (currently only `alertOnly`)"; `alertOnly` reports "without failing the check" | `alertOnly` keeps the control failing and gating; `disable` exists and suppresses |
| GitHub Action: `kubescape/github-action@main` | latest release bundles CLI v3.0.21; install the v4 CLI |
| `kubescape vap deploy-library \| kubectl apply -f -` | fails on the first run (CRD in the same stream) |
| CIS framework list stops at `cis-v1.10.0`, `cis-eks-t1.7.0`, `cis-aks-t1.2.0` | `cis-v1.12.0`, `cis-eks-t1.8.0`, `cis-aks-t1.8.0`, `cis-gke-v1.9.0` exist |

---

## Cross-references

- `references/kubescape-operator.md` — continuous scanning, host data for CIS, vulnerabilities, runtime detection, NetworkPolicies, in-cluster exceptions
- `references/trivy.md` — image CVE gates
- `references/kyverno.md` — admission policy when Kyverno runs
- `references/supply-chain.md` — signing and SBOMs
- `references/compliance.md` — SOC 2 in Terraform
- `references/github-actions.md` — workflow hardening
