# Kubescape Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/platform-skills:kubescape` and `/platform-skills:kubescape-operator` with references, examples, a trigger eval and full doc wiring as release v1.44.0.

**Architecture:** Two skills split by lifecycle stage (CLI shift-left vs in-cluster operator), each backed by one reference and one example directory. The repo's consistency scripts are the test suite: register the new names first (red), author until green. Every CLI command is executed against the real v4.0.16 binary; every operator example is reconciled by Flux on the local `docker-desktop` cluster.

**Tech Stack:** Kubescape CLI v4.0.16, kubescape-operator chart 1.40.4, Flux v2, GitHub Actions, bash test scripts, jq/yq.

## Global Constraints

- Spec: `docs/specs/2026-10-17-kubescape-design.md` — the "Verified facts" table is authoritative for every version, flag, value key and resource name.
- Version: `1.43.0` → `1.44.0` everywhere the release-consistency scripts check.
- Domain skill count: `49` → `51`.
- Never use `kubescape/github-action`; never use `tj-actions/changed-files`; pin every action by full commit SHA with a `# vX.Y.Z` comment.
- Profiles are `containerprofiles`, never `applicationprofiles`/`networkneighborhoods` (deleted in storage v0.0.331).
- Each risky operation documents blast radius, verification and rollback (CLAUDE.md).
- Example READMEs carry a `Status:` line.
- Local cluster context must be `docker-desktop` before any `kubectl`/`flux` write. Abort otherwise.
- Tool binaries live in the session scratchpad (`$S/bin`), never installed system-wide.

---

### Task 0: Tooling and baseline

**Files:** none in repo.

- [ ] **Step 1:** Put `kubescape` (done, sha256 verified), `yq` v4, `helm` v3, `flux` v2, `cosign` v2, `kubeconform` v0.6.4 into `$S/bin`, each checked against its release `checksums`. Create `$S/venv` with PyYAML.
- [ ] **Step 2:** Run with `PATH=$S/bin:$S/venv/bin:$PATH`: `validate-skill`, `validate-helmcheck`, `handbook-consistency`, `release-consistency`, `validate-ci`, `editor-version-consistency`, `website-coverage`, `plugin-evals-structure`, `render-skills`, `scan-secrets`. Record pre-existing failures (expected: `website/tsconfig.json` JSONC in validate-ci; karpenter live-cluster dry-run).

### Task 1: Register the new domains (red)

**Files:**
- Modify: `tests/validate-skill.sh` (REQUIRED_REFERENCES, EXAMPLE_DOMAINS, VALIDATE_SCRIPTS)
- Modify: `.github/workflows/validate.yml` (kubeconform path list)

- [ ] **Step 1:** Add `references/kubescape.md`, `references/kubescape-operator.md` to REQUIRED_REFERENCES; `examples/kubescape`, `examples/kubescape-operator` to EXAMPLE_DOMAINS; `examples/kubescape/kubescape-validate.sh`, `examples/kubescape-operator/kubescape-operator-validate.sh` to VALIDATE_SCRIPTS; `-path "./examples/kubescape-operator/flux/*" -o` to the kubeconform finder.
- [ ] **Step 2:** Run `bash tests/validate-skill.sh` → expect new FAILs for the 2 references, 2 domains, 2 validators.

### Task 2: CLI examples + offline validator

**Files:**
- Create: `examples/kubescape/README.md`, `examples/kubescape/manifests/insecure-deployment.yaml`, `examples/kubescape/manifests/hardened-deployment.yaml`, `examples/kubescape/exceptions.json`, `examples/kubescape/workflows/kubescape.yml`, `examples/kubescape/kubescape-validate.sh`

- [ ] **Step 1:** Write `kubescape-validate.sh` first. Offline checks: `exceptions.json` parses with `jq`, every entry has `name`, `policyType == "postureExceptionPolicy"`, `actions == ["alertOnly"]`, non-empty `resources` and `posturePolicies`; manifests and workflow parse with `yq`; workflow has no `kubescape/github-action`, no `tj-actions/`, every `uses:` pinned to a 40-hex SHA, `cosign verify-blob` present, `--certificate-identity` equals `https://github.com/kubescape/kubescape/.github/workflows/02-release.yaml@refs/tags/v${KUBESCAPE_VERSION}`. If `kubescape` is on PATH: hardened manifest passes `scan framework nsa --severity-threshold high`, insecure manifest fails it. Run → FAIL (files missing).
- [ ] **Step 2:** Write the manifests (`payments-api` in `payments`), the exceptions file (one control-scoped, one resource-scoped), the workflow and README.
- [ ] **Step 3:** Run the validator with the binary on PATH → PASS. Run `kubescape fix --dry-run` on the insecure manifest's JSON report and `kubescape scan ... --baseline` to confirm the commands documented in Task 3 behave as written.

### Task 3: `references/kubescape.md`

- [ ] Sections: ownership table; install and verify (cosign); frameworks (output of `kubescape list frameworks`); scan targets; gates (`--compliance-threshold`, `--severity-threshold`, exit codes observed); `--baseline`; exceptions and controls-config (`kubescape download controls-inputs`); `fix`; `vap` (`deploy-library`, `create-policy-binding --action Audit`); `image` vs Trivy; CI (link to example); troubleshooting in Problem → Evidence → Fix → Prevention; rollback. Every command run against the binary; outputs quoted are real.

### Task 4: `skills/kubescape/SKILL.md`

- [ ] Frontmatter `name: kubescape`, `description`, `argument-hint: "[scan|cluster|ci|exceptions|fix|vap|image] [target]"`, `title`, `sidebar_label`, `custom_edit_url: null`. Ownership table at the menu, mode dispatch table, one `## Mode:` section per mode, rules. Reads `references/kubescape.md`.
- [ ] **Interactive (user requirement):** empty `$ARGUMENTS` runs the house three-layer wizard. Step 0 detects silently (CLI installed and version, kube context and provider from `providerID`, Helm/Kustomize/manifest files, existing workflows and `exceptions.json`). Layer 1 asks intent in plain words, Layer 2 picks the framework in plain words (CIS auto-matched to the detected provider), Layer 3 asks only gate strictness, whether to use a baseline, and exception expiry. Every mode ends with the same friendly result card: score, top 5 failed controls (ID, severity, resources, one-line why, fix snippet), one suggested next command.

### Task 5: Operator examples, validated live on docker-desktop

**Files:**
- Create: `examples/kubescape-operator/README.md`, `flux/namespace.yaml`, `flux/helmrepository.yaml`, `flux/helmrelease.yaml`, `flux/kustomization.yaml`, `security-exception.yaml`, `runtime-rule-binding.yaml`, `prometheusrule.yaml`, `kubescape-operator-validate.sh`

- [ ] **Step 1:** Validator first: YAML parses; HelmRelease pins `version: "1.40.4"`, sets `clusterName`, `capabilities.riskAcceptance: enable`, `capabilities.runtimeDetection`, `alertCRD.installDefault`; no manifest references `applicationprofiles`/`networkneighborhoods`; SecurityException has `reason`, `author`, `expiresAt`; RuntimeRuleAlertBinding has `rules`. Run → FAIL.
- [ ] **Step 2:** Write the files; validator → PASS; `kubeconform -strict` on `flux/` with the pinned CRD catalog → PASS.
- [ ] **Step 3:** Live: `flux install`, `kubectl apply -k examples/kubescape-operator/flux`, wait for HelmRelease Ready; check pods, CRDs, `kubectl get workloadconfigurationscansummaries -A`, `vulnerabilitymanifestsummaries -A`, `containerprofiles -A`, `generatednetworkpolicies -A`; apply the SecurityException and RuntimeRuleAlertBinding; trigger a runtime alert (`kubectl exec` an unexpected binary) and see it in node-agent logs; curl the prometheus exporter metrics. Record every command and outcome for Task 6.

### Task 6: `references/kubescape-operator.md`

- [ ] Sections: ownership; capability matrix (default, recommended, cost); Flux install; upgrade and rollback; vulns and relevancy; runtime detection (learning period, `containerprofiles`, Rules/bindings, exporters); netpol; in-cluster exceptions; metrics + PrometheusRule; troubleshooting; doc-drift notes. Only commands that ran in Task 5.

### Task 7: `skills/kubescape-operator/SKILL.md`

- [ ] Frontmatter `name: kubescape-operator`, `argument-hint: "[install|vulns|runtime|netpol|exceptions|metrics|debug]"`; ownership at the menu; mode table; `## Mode:` sections; rules. Reads `references/kubescape-operator.md`.
- [ ] **Interactive (user requirement):** empty `$ARGUMENTS` runs the three-layer wizard. Step 0 detects silently (context, provider, K8s version, node kernel, Flux present, existing kubescape release, Falco / Trivy Operator / Kyverno / Prometheus Operator present). Layer 1 asks intent, Layer 2 picks an install profile (Posture-only, Posture + vulns (recommended), Full, Custom), Layer 3 asks only about overlaps it detected (offers to turn off capabilities that duplicate Falco or Trivy Operator), the learning period, and excluded namespaces. Friendly status card at the end.

### Task 8: Wire into existing skills (user requirement: real integration, not only pointers)

- [ ] `skills/preflight/SKILL.md`: when K8s manifests or Helm charts are in scope and `kubescape` is on PATH, run `kubescape scan framework nsa <path> --format json` and fold failed controls into the findings; otherwise recommend it.
- [ ] `skills/helmchart/SKILL.md`: security-audit step runs `kubescape scan <chart-dir>` beside the existing checks.
- [ ] `skills/kubernetes/SKILL.md`: hardening/baseline audit uses `/platform-skills:kubescape cluster`; NetworkPolicy drafting can start from `/platform-skills:kubescape-operator netpol`.
- [ ] `skills/compliance/SKILL.md`: SOC 2 cluster-side evidence via `kubescape scan framework soc2`.
- [ ] `skills/pr-review/SKILL.md`: SOC 2 / security dimension runs Kubescape on changed manifests with `--baseline` when available.
- [ ] `skills/trivy/SKILL.md`, `skills/runtime-security/SKILL.md`, `skills/kyverno/SKILL.md`, `skills/supply-chain/SKILL.md`, `skills/github-actions/SKILL.md`, `skills/observability/SKILL.md`, `skills/openshift/SKILL.md`: ownership row or decision-matrix row where their table covers the overlapping concern.
- [ ] Router (`SKILL.md` + `skills/platform-skills/SKILL.md`): routing rows so posture questions reach `kubescape` and in-cluster runtime/netpol questions reach `kubescape-operator`.

### Task 9: Trigger eval

- [ ] Create `plugin-evals/kubescape-trigger/prompt.md` and `graders/skill-fired.md` (pattern `"(?:platform-skills:)?kubescape"` not followed by `-operator`) plus one content grader; update `plugin-evals/README.md` and `baseline.json` if `plugin-evals-structure.sh` requires it. Run `bash tests/plugin-evals-structure.sh` → PASS.

### Task 10: Doc wiring and version bump

- [ ] `SKILL.md` + `cp SKILL.md skills/platform-skills/SKILL.md`; `COMMANDS.md` (ToC rows + two sections); `HOW_IT_WORKS.md`; `GETTING_STARTED.md` (rows, `All 51 command workflows`); `QUICKSTART.md`; `README.md` (domain rows, tree, `Commands-51` badge); `EDITOR_INTEGRATIONS.md` (sections, ` 51 command workflows`); `PROMPTS.md`; `.github/copilot-instructions.md`; `.cursorrules`; `.cursor/rules/platform-skills.mdc`; `.claude-plugin/plugin.json` (version, description, keywords `kubescape`); `.claude-plugin/marketplace.json` (version, `51 slash-command workflows`); `INSTALLATION.md`; `CHANGELOG.md` `[1.44.0]`; `website/sidebars-commands.js`, `website/sidebars-references.js`; `tile.json` if versioned.

### Task 11: Full verification

- [ ] Re-run every script from Task 0 Step 2 → no FAIL beyond the recorded pre-existing ones. `bash scripts/render-skills.sh $S/render` → both skills rendered with their references and examples.

### Task 12: Ship

- [ ] Commit (conventional, with Co-Authored-By trailer), `git push -u origin feat/kubescape`, `gh pr create -R nitinjain999/platform-skills --head geetika-sv:feat/kubescape --base main`. Leave the cluster clean or report what remains.
