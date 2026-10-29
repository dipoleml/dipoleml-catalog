---
title: Kubescape Operator
custom_edit_url: null
---

# Kubescape Operator Reference

Covers all `/platform-skills:kubescape-operator` mode logic: installing the Kubescape operator with Flux, choosing capabilities, continuous posture results, relevancy-filtered vulnerabilities, eBPF runtime threat detection, NetworkPolicies generated from observed traffic, in-cluster exceptions, Prometheus metrics, upgrades, rollback and troubleshooting.

**Verified against:** chart `kubescape-operator` 1.40.4 (operator v0.2.169, storage v0.0.331, node-agent v0.3.219, prometheus-exporter v0.2.23) with the scanner pinned to v4.0.16, Flux v2.9.6, Kubernetes 1.36. Working example: `examples/kubescape-operator`.

**How each fact was checked.** Live on docker-desktop through Flux: install, posture and vulnerability results, on-demand scans, `SecurityException`, metrics, server-side validation of every custom resource. Node-agent features (runtime detection, container profiles, relevancy, generated NetworkPolicies) could not run there (its kernel lacks fanotify permission events, see Preflight); those sections come from the chart and component source at the versions above and say so. CLI scans and the PR gate: `references/kubescape.md`.

## Ownership boundary

| Question | Authoritative skill |
|---|---|
| "Scan the cluster continuously and keep the results in the cluster" | **`/platform-skills:kubescape-operator`** |
| "Which CVEs are in packages that actually load?" | **`/platform-skills:kubescape-operator vulns`** |
| "Alert when a container does something it never did while learning" | **`/platform-skills:kubescape-operator runtime`** |
| "Write NetworkPolicies from real traffic" | **`/platform-skills:kubescape-operator netpol`** |
| "One-off cluster score, CIS audit, PR gate" | `/platform-skills:kubescape` |
| "Syscall rules, Falcosidekick routing" (cluster runs Falco) | `/platform-skills:runtime-security` |
| "CVE reports via Trivy Operator" (cluster runs it) | `/platform-skills:trivy k8s` |
| "Enforce at admission" | `/platform-skills:kyverno` or `/platform-skills:kubescape vap` |
| "Grafana dashboards and alert routing" | `/platform-skills:observability` |

Run one CVE operator per cluster (Kubescape or Trivy Operator) and one eBPF runtime agent per node (node-agent or Falco) unless there is a written reason; two of either doubles cost and alert volume for the same signal.

---

## Preflight

Check before enabling anything that needs the node-agent:

```bash
kubectl version                          # chart needs Kubernetes >= 1.28
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"  "}{.status.nodeInfo.kernelVersion}{"  "}{.status.nodeInfo.containerRuntimeVersion}{"\n"}{end}'

# Kernel options node-agent needs, per node image (one node per image is enough)
kubectl debug node/<node> --image=busybox:1.37 --profile=sysadmin -- \
  sh -c 'zcat /proc/config.gz | grep -E "CONFIG_FANOTIFY_ACCESS_PERMISSIONS|CONFIG_DEBUG_INFO_BTF|CONFIG_BPF_SYSCALL"'
kubectl delete pod -l app.kubernetes.io/managed-by=kubectl-debug --ignore-not-found   # or delete the node-debugger-* pod

# Already running?
kubectl get ds -A | grep -iE 'falco|node-agent|tetragon'      # another eBPF agent
kubectl get deploy -A | grep -i trivy-operator                 # another CVE operator
kubectl get crd | grep -E 'kyverno|monitoring.coreos.com'      # admission engine, Prometheus Operator
```

Want: `CONFIG_FANOTIFY_ACCESS_PERMISSIONS=y`, `CONFIG_DEBUG_INFO_BTF=y`, `CONFIG_BPF_SYSCALL=y`. Docker Desktop's kernel (7.0.14-linuxkit, measured) has `# CONFIG_FANOTIFY_ACCESS_PERMISSIONS is not set`: node-agent crash-loops there, and in kind or minikube running inside Docker Desktop, because they share that kernel. Pick a profile without the node-agent on such nodes.

Namespace: node-agent is a privileged DaemonSet, so `kubescape` needs Pod Security level `privileged` on clusters that enforce it (`examples/kubescape-operator/flux/namespace.yaml`). Keep every other namespace at `restricted` or `baseline`.

---

## Capabilities

Every capability is `enable` or `disable` under `capabilities:`. Defaults from chart 1.40.4; "node-agent" means it deploys the node-agent DaemonSet (the chart deploys it when any of `relevancy`, `runtimeObservability`, `networkPolicyService`, `runtimeDetection`, `malwareDetection`, `nodeProfileService`, `seccompProfileService` is enabled).

| Capability | Default | What it runs | Node-agent | Recommendation |
|---|---|---|---|---|
| `configurationScan` | enable | Scanner + daily scheduler CronJob | no | keep |
| `continuousScan` | disable | Re-scan on resource change | no | enable |
| `nodeScan` | enable | Host data for node-level CIS controls | uses it | keep |
| `vulnerabilityScan` | enable | kubevuln (Grype) + daily scheduler | no | keep unless Trivy Operator runs |
| `nodeSbomGeneration` | enable | SBOMs generated on the node | yes | disable without node-agent (kubevuln then pulls images itself) |
| `relevancy` | enable | Marks CVEs in packages the container loads | yes | keep where node-agent runs |
| `runtimeObservability` | enable | eBPF data collection (profiles) | yes | base for the next four |
| `networkPolicyService` | enable | `generatednetworkpolicies` | yes | keep |
| `runtimeDetection` | disable | Alerts against learned profiles + rules | yes | enable, unless Falco covers the nodes |
| `malwareDetection` | disable | ClamAV file scanning | yes | enable deliberately (CPU) |
| `nodeProfileService`, `seccompProfileService`, `httpDetection`, `networkEventsStreaming` | enable | Node profiles, seccomp profiles, HTTP and network events | yes | keep with node-agent; disable all without |
| `admissionController` | enable | Validating webhook on pods, `pods/exec`, `pods/attach`, `pods/portforward`, rolebindings, clusterrolebindings, networkpolicies; `failurePolicy: Ignore` (measured) | no | keep: it reports (R2000 exec-to-pod, R2001 port-forward), never blocks |
| `riskAcceptance` | disable | Reads `SecurityException` / `ClusterSecurityException` | no | enable |
| `prometheusExporter` | disable | `prometheus-exporter` Deployment, port 8080 | no | enable |
| `global.enableClusterWideSecretAccess` (not under `capabilities`) | **true** | ClusterRoles `kubescape` and `operator` get `get/list/watch` on Secrets in every namespace (rendered and confirmed) | — | **false** in the example: Secret reads stay in `kubescape`. Measured live: posture and vulnerability results unchanged for the demo workload, 0 failed scans; the scanner logs `failed to pull resource type … secrets is forbidden` once per scan (warning). Cost: C-0212 and C-0255, the only controls that read Secret objects, see less; with `nodeSbomGeneration` off, kubevuln cannot use workloads' `imagePullSecrets`. Turn on only with explicit security approval |
| `remediation` | disable | Mutating RBAC: patch on workloads and pods, **cluster-wide patch on nodes**, create/delete NetworkPolicies | no | keep disabled |
| `autoUpgrading` | disable | Self-upgrades the chart | no | keep disabled: GitOps owns versions |
| `manageWorkloads`, `syncSBOM`, `vexGeneration`, `scanEmbeddedSBOMs`, `agentRuntimePosture`, `kubescapeOffline` | disable | Special purpose | — | leave unless needed |

Sizing (chart requests → limits): kubevuln 300m/1000Mi → 1500m/5000Mi (the large one; scales with image size), storage 100m/400Mi → 1500m/1500Mi, kubescape 250m/400Mi → 600m/1Gi, node-agent 100m/180Mi → 500m/1400Mi **per node**, operator 50m/100Mi, prometheus-exporter 10m/10Mi.

### Install profiles

| Profile | Use when | Capability changes from `examples/kubescape-operator/flux/helmrelease.yaml` |
|---|---|---|
| **Full** (the example) | Supported kernels, no Falco, no Trivy Operator | none |
| **Recommended with Falco** | Falco already alerts on these nodes | `runtimeDetection: disable` |
| **Posture + vulns, no node-agent** | Kernel without fanotify permissions (Docker Desktop, some hardened images), or no privileged DaemonSets allowed | `relevancy`, `runtimeObservability`, `networkPolicyService`, `runtimeDetection`, `malwareDetection`, `nodeProfileService`, `seccompProfileService`, `nodeSbomGeneration`: `disable` |
| **Posture only** | Trivy Operator owns CVEs | the line above, plus `vulnerabilityScan: disable` |

The no-node-agent profile was installed live: Ready in 87 s, five pods (kubescape, kubevuln, operator, storage, prometheus-exporter). Without node-agent the node-level CIS controls stay skipped (`missing: hostdata…`) and `kubescape_vulnerabilities_relevant_*` stays 0.

---

## Install with Flux

`examples/kubescape-operator/flux/` (namespace, HelmRepository, HelmRelease). Points that matter:

- `version: "1.40.4"` exactly. The Helm index serves 1.40.5 as its newest version although GitHub marks it a pre-release; a range such as `1.40.x` would install it.
- **`kubescape.image.tag: v4.0.16`.** Chart 1.40.4 bundles scanner v4.0.13, whose `all` framework scans fail with `framework 'C-0042' not found` against the current controls (fixed in v4.0.14, kubescape#3768). The operator's scheduled and on-demand scans all use `all`, so without the override the install is green and produces no results. Reproduced with the v4.0.13 CLI (`kubescape scan framework all <path>` fails; v4.0.14, v4.0.15, v4.0.16 pass) and fixed live by the override (0 failed scans after rollout).
- `clusterName`: shown in every report and metric; the default `cluster` makes clusters indistinguishable.
- `excludeNamespaces`: overriding replaces the chart default, so keep `kubescape,kube-system,kube-public,kube-node-lease,kubeconfig,gmp-system,gmp-public` and append (`flux-system`).
- `install.crds`/`upgrade.crds: CreateReplace`: the chart ships `SecurityException`, `ClusterSecurityException`, `Rules`, `OperatorCommand`, `RuntimeRuleAlertBinding` CRDs.
- `timeout: 10m`: the first install pulls about eight images and waits for the storage APIService.

```bash
kubectl apply -k examples/kubescape-operator/flux
kubectl -n kubescape wait helmrelease/kubescape --for=condition=Ready --timeout=10m
kubectl -n kubescape get pods
kubectl get apiservice v1beta1.spdx.softwarecomposition.kubescape.io   # Available=True
```

Argo CD: the same values in an `Application` with `helm.valuesObject`; set `ServerSideApply=true` for the CRDs.

- **Blast radius:** read-only cluster access for scanning (with `remediation` off); with the chart default `global.enableClusterWideSecretAccess: true` that includes reading every Secret in the cluster, so the example sets it to `false`; a privileged DaemonSet on every node when node-agent is on; a fail-open admission webhook; up to about 5 GiB for kubevuln during scans.
- **If node-agent cannot become Ready**, Helm's wait fails and Flux's install remediation uninstalls the whole release, posture scanning included. Run the preflight first.

### Upgrade and rollback

- Upgrade in a PR: bump `version`, read the chart's release notes for capability default changes, check the bundled scanner tag (`helm show values kubescape/kubescape-operator --version <v> | yq '.kubescape.image.tag'`) and keep the override at or above it.
- Pause: `flux suspend helmrelease kubescape -n kubescape` (stops reconciling, keeps everything running).
- Roll back: `git revert` the bump, then `flux resume helmrelease kubescape -n kubescape`; `upgrade.remediation.remediateLastFailure: true` already rolls back a failed upgrade.
- Remove: `kubectl delete -k examples/kubescape-operator/flux`. This also deletes the `kubescape` namespace and every namespaced resource in it, including custom `Rules` there. `SecurityException`s in application namespaces, and cluster-scoped `ClusterSecurityException`s and `RuntimeRuleAlertBinding`s, survive while their CRDs stay. Export what you want to keep first: `kubectl get rules -n kubescape -o yaml > kubescape-rules.yaml; kubectl get se -A -o yaml > security-exceptions.yaml; kubectl get cse,runtimerulealertbindings -o yaml > cluster-scoped.yaml`.

---

## Posture results

```bash
kubescape operator scan configurations                       # on demand (the CLI asks the operator)
kubectl get workloadconfigurationscansummaries -A            # one per workload
kubectl get configurationscansummaries                       # one per namespace
kubectl -n payments get workloadconfigurationscansummaries deployment-payments-api -o jsonpath='{.spec.severities}'
```

Scheduled scans: CronJob `kubescape-scheduler` (daily); with `continuousScan` the operator also re-scans a workload when it changes.

The operator scans **all frameworks**, so it reports more than an NSA scan. Measured on the example: `payments-api` scores 100 on NSA with the CLI, while the operator reports `{"critical":0,"high":2,"medium":2,"low":1}`; the two High are C-0237 "Check if signature exists" (unsigned image → `/platform-skills:supply-chain`) and C-0211 (CIS 5.6.3). The insecure copy reports 12 High.

Failed controls for one workload:

```bash
kubectl -n payments get workloadconfigurationscansummaries deployment-payments-legacy -o json \
  | jq -r '.spec.controls | to_entries[] | select(.value.status.status=="failed")
           | "\(.value.severity.severity // .value.severity)\t\(.key)"' | sort
```

---

## Vulnerabilities and relevancy

```bash
kubescape operator scan vulnerabilities --include-namespaces payments
kubectl get vulnerabilitymanifestsummaries -A
kubectl -n payments get vulnerabilitymanifestsummaries deployment-payments-api-payments-api -o jsonpath='{.spec.severities}'
# {"critical":{"all":16},"high":{"all":75},…}   (measured, podinfo:6.15.0)
```

Summaries are named `<kind>-<workload>-<container>`. Each severity has `all` and, with relevancy, `relevant`: CVEs in packages the container actually loaded during its learning period. Relevancy is what makes in-cluster CVE counts actionable; it needs the node-agent. Without it, every CVE in every layer counts.

Private registries: kubevuln pulls images itself when `nodeSbomGeneration` is off. It can use workloads' `imagePullSecrets` only with `global.enableClusterWideSecretAccess: true` (cluster-wide Secret reads), which the example turns off. Prefer `imageScanning.privateRegistries.credentials` (`registry`, `username`, `password`), scoped to the registries you name, from a SOPS- or ESO-managed source rather than plain Git (`/platform-skills:secrets`). With node-agent's `nodeSbomGeneration` on, SBOMs come from the node and no registry pull is needed.

Trivy Operator instead: `/platform-skills:trivy k8s`. Pick one; both scanning every image is twice the registry traffic for the same answer.

---

## Runtime detection

Source-verified (node-agent could not run on the test cluster).

Enable: `capabilities.runtimeDetection: enable` and `alertCRD.installDefault: true`. That installs:

- `Rules/default-rules` in `kubescape`: 28 rules, R0001–R0011 (anomalies against the learned profile: unexpected process, file access, syscalls, capabilities, DNS, service-account token, Kubernetes API use, `/proc` environment reads, eBPF program load, sensitive files, egress), R1000–R1030 (signatures: malicious source, drifted binary, kernel module load, SSH, exec from mount, fileless execution, container escape, crypto miners, symlink/hardlink over sensitive files, `LD_PRELOAD`, ptrace, io_uring), R2000/R2001 (exec and port-forward to a pod, via the admission webhook).
- `RuntimeRuleAlertBinding/all-rules-all-pods` (cluster-scoped): every rule, every namespace not in `excludeNamespaces`.

**A binding cannot reach an excluded namespace.** The chart passes `excludeNamespaces` (or `includeNamespaces`) to node-agent itself, and node-agent v0.3.219 never traces pods there (`Config.SkipNamespace`), so a binding for `kube-system` with the default values never fires. Covering such a namespace means removing it from `excludeNamespaces`, which also adds it to posture and CVE scans and to the default all-rules binding.

To narrow detection for a noisy namespace instead (CI runners: every build starts new processes, so anomaly rules fire constantly), use the opt-in `examples/kubescape-operator/ci-runners/`, in this order (select rules by `ruleID`, `ruleName` or `ruleTags`):

1. **Step 1, after the base install is Ready:** `ci-runners/` applies a binding with signature rules only (`ruleTags: [malicious]`, R1002, R1006). Its CRD comes from the Helm release, so on a fresh cluster this fails harmlessly (`ensure CRDs are installed first`); with Flux, give its Kustomization `dependsOn` on the one that installs the operator.
2. **Step 2:** switch the operator's Kustomization from `flux/` to `ci-runners/release/` (the base plus a `postRenderers` patch appending `ci-runners` to the `NotIn` list of `all-rules-all-pods`).

Never put the patch in the base install: a fresh install would then remove the namespace from the default binding before any replacement exists. Measured through Flux on a fresh cluster: base → default binding covers `ci-runners`; step 1 → both bindings; step 2 → default binding excludes it and the signature binding remains. The patch assumes `includeNamespaces` is empty (the default binding then selects with `NotIn`). Roll back in reverse: step 2 first.

### Learning period

Anomaly rules compare behaviour with a per-container profile (`containerprofiles`, `spdx.softwarecomposition.kubescape.io/v1beta1`). `nodeAgent.config.maxLearningPeriod` (default `24h`) sets how long a profile learns.

```bash
kubectl get containerprofiles -n payments \
  -o custom-columns='NAME:.metadata.name,STATUS:.metadata.annotations.kubescape\.io/status,COMPLETION:.metadata.annotations.kubescape\.io/completion'
```

| `kubescape.io/status` | Meaning |
|---|---|
| `initializing` | Profile created |
| `ready` | **Learning** (the constant is literally `Learning = "ready"`) |
| `completed` | Learning finished; anomaly rules active |
| `too-large` | Profile exceeded the size limit; anomaly rules cannot use it |

`kubescape.io/completion: partial` means the container started before the node-agent watched it; restart the workload after installing to get `complete`. Signature rules (R1xxx) and R2xxx do not need a completed profile.

`kubectl get applicationprofiles` and `networkneighborhoods`, which the docs still show, no longer exist: storage v0.0.331 deletes them as deprecated (`pkg/registry/file/cleanup.go`).

### Where alerts go

| Exporter | Value |
|---|---|
| node-agent logs (default) | `nodeAgent.config.stdoutExporter: true` → `kubectl -n kubescape logs ds/node-agent` |
| Alertmanager | `nodeAgent.config.alertManagerExporterUrls: ["alertmanager-operated.monitoring:9093"]` |
| Syslog | `nodeAgent.config.syslogExporterURL: "syslog.logging:514"` |
| HTTP | `nodeAgent.config.httpExporterConfig.url` (+ `maxAlertsPerMinute`). Chart 1.40.4 renders it into node-agent's config only when the synchronizer runs, which needs backend submission (`server` plus `account`/`accessKey`). Without a backend the URL is ignored; use Alertmanager, syslog or stdout |

Roll out on one node pool first (`nodeAgent.nodeSelector` or the chart's multiple-DaemonSet options), watch alert volume for a learning period, then widen. Test with something a learned profile never saw, after `completed`: `kubectl -n payments exec deploy/payments-api -- ls /` triggers R2000 at once and R0001 against the profile.

Falco instead or as well: `/platform-skills:runtime-security`. Both on the same nodes means two privileged eBPF agents for overlapping detections; pick one per node pool.

---

## NetworkPolicy generation

Source-verified. Needs `networkPolicyService` (node-agent). Storage computes a policy per workload from its container profiles' observed traffic, named `<lower(kind)>-<workload-name>` and merged across the workload's containers; nothing is applied automatically.

```bash
kubectl -n payments get generatednetworkpolicies
kubectl -n payments get generatednetworkpolicies deployment-payments-api -o yaml > /tmp/gnp.yaml
yq '.spec' /tmp/gnp.yaml > k8s/payments/networkpolicy-payments-api.yaml     # spec is a NetworkPolicy
yq '.policyRef' /tmp/gnp.yaml                                                # IP → DNS name / known server
```

Before committing:
- Wait at least one full traffic cycle (daily batch jobs, weekly reports): a policy learned in an hour blocks what happens once a day.
- Use `policyRef` (`originalIP` → `dns`, `server`) only to identify each destination, then express it in terms a NetworkPolicy accepts: in-cluster peers as `podSelector`/`namespaceSelector`, external ones as a reviewed `ipBlock` CIDR. Standard NetworkPolicy has no hostname peers, so a DNS name in the policy is rejected by the API; FQDN egress needs a CNI-specific resource (for example Cilium `toFQDNs`, Calico DNS policy).
- Start with the selected workload only: its policy (`podSelector` for that workload, `policyTypes: [Ingress, Egress]`) isolates just those pods. Add a namespace-wide default-deny in a later PR, once every workload in the namespace has a reviewed allow policy and its traffic has been validated; added first, it cuts traffic for every other pod in the namespace.
- Apply through GitOps, one namespace at a time; rollback is reverting the commit.

---

## Exceptions in the cluster

`capabilities.riskAcceptance: enable`, then `SecurityException` (namespaced, short name `se`) or `ClusterSecurityException` (`cse`, adds `namespaceSelector`), `kubescape.io/v1beta1`. Template: `examples/kubescape-operator/security-exception.yaml`.

```yaml
spec:
  reason: "…"                      # free text; required by this repository's convention
  author: platform-team@example.com
  expiresAt: "2026-12-31T23:59:59Z" # RFC 3339, checked at scan time
  match:
    resources: [{kind: Deployment, name: payments-api}]   # or objectSelector / namespaceSelector (cse)
  posture:
    - controlID: C-0237
      action: ignore                # ignore suppresses; alert_only keeps reporting
  # vulnerabilities: [...]          # CVE exceptions, handled by kubevuln
```

Measured: applying it moved C-0237 on `payments-api` to `passed (w/exceptions)` within 40 s (the operator re-scans on exception changes), the workload's High count fell from 2 to 1, and a CLI cluster scan (`kubescape scan control C-0237 --include-namespaces payments`) honoured it with no flag. A file exception (`--exceptions`) wins over an in-cluster one for the same control and resource. List what is accepted: `kubectl get se -A; kubectl get cse`.

---

## Metrics

`capabilities.prometheusExporter: enable` → Service `prometheus-exporter:8080/metrics`. Measured families: `kubescape_controls_total_{cluster,namespace}_{critical,high,medium,low,unknown}` and `kubescape_vulnerabilities_{total,relevant}_{cluster,namespace}_{critical,high,medium,low,negligible,unknown}`; namespace series carry a `namespace` label; workload series need `prometheusExporter.enableWorkloadMetrics: true`.

Scraping: `prometheusExporter.serviceMonitor.enabled: true` with the Prometheus Operator (kube-prometheus-stack needs `serviceMonitorSelectorNilUsesHelmValues: false` or a matching `release` label), or `configurations.prometheusAnnotations: enable` for annotation-based scraping. node-agent has its own metrics (`nodeAgent.config.prometheusExporter: enable`, `nodeAgent.serviceMonitor.enabled: true`): `node_agent_alert_counter`, `node_agent_rule_counter`, `node_agent_exec_counter`, …

Alerts: `examples/kubescape-operator/prometheusrule.yaml` (checked with `promtool check rules` and `promtool test rules`). `KubescapeExporterDown` (`absent(kubescape_controls_total_cluster_high)`) only says Prometheus stopped getting the exporter's metrics. It cannot detect failing scans: prometheus-exporter v0.2.23 registers its cluster gauges at start-up, so a running exporter serves 0, or the last value, while every scan fails. The scanner reports failures only in its logs; alert there, for example with Loki (adjust the stream labels to your log pipeline; the scanner pods carry `app: kubescape`):

```logql
sum(count_over_time({namespace="kubescape", app="kubescape"} |= "scanning failed" [1h])) > 0
```

Without relevancy, alert on `total` CVEs; the example's fallback alert does that only while the `relevant` series report nothing.

---

## Troubleshooting

### node-agent CrashLoopBackOff: "no container runtime can be monitored with fanotify"
- **Evidence:** `kubectl -n kubescape logs ds/node-agent --previous | grep fanotify`; the message lists the runc paths it tried.
- **Cause A — runc elsewhere:** `kubectl debug node/<node> … -- find /host -name runc -type f`. Fix: `global.overrideRuntimePath: <path>`.
- **Cause B — kernel without fanotify permission events:** the preflight grep shows `# CONFIG_FANOTIFY_ACCESS_PERMISSIONS is not set` (Docker Desktop 7.0.14-linuxkit, measured; runc was at the standard `/usr/bin/runc`). No value fixes it: use the no-node-agent profile on those nodes, or a node image built with the option.

### Install green, no scan results
- **Evidence:** `kubectl -n kubescape logs deploy/kubescape | grep 'scanning failed'` → `framework 'C-0042' not found`; `kubectl get workloadconfigurationscansummaries -A` is empty.
- **Cause:** bundled scanner v4.0.13 (chart 1.40.4).
- **Fix:** `kubescape.image.tag: v4.0.16` (≥ v4.0.14). Verify: `kubescape operator scan configurations`, then summaries appear (about 30 s on the test cluster).
- **Prevention:** a log alert on `scanning failed` from the scanner (Metrics). Metrics will not show it: the exporter keeps serving 0 or stale values.

### HelmRelease uninstalled itself
- **Evidence:** `kubectl -n kubescape get helmrelease kubescape -o jsonpath='{.status.conditions}'` → `InstallFailed … timeout waiting for: [DaemonSet/kubescape/node-agent status: 'InProgress']`, `Remediated=True UninstallSucceeded`.
- **Cause:** node-agent never Ready (see the first entry) → Helm wait timeout → Flux remediation.
- **Fix:** resolve node-agent or switch profile; deleting the HelmRelease while a retry is installing waits for that retry (up to `timeout`), so wait for it rather than removing finalizers.

### Storage APIService not Available
- **Evidence:** `kubectl get apiservice v1beta1.spdx.softwarecomposition.kubescape.io`; storage readiness probe failures in events.
- **Fix:** usually transient during the first minutes; check storage memory (limit 1500Mi) and its PVC when `persistence` is enabled.

### Container profiles stay `partial`
- **Cause:** pods started before node-agent.
- **Fix:** `kubectl rollout restart deploy/<name>` once after install.

### kubevuln OOMKilled
- **Cause:** very large images; limit 5000Mi.
- **Fix:** raise `kubevuln.resources.limits.memory`, or exclude build-tool images.

### No metrics in Prometheus
- **Evidence:** `kubectl -n kubescape port-forward svc/prometheus-exporter 18080:8080` then `curl localhost:18080/metrics | grep kubescape_controls_total_cluster`.
- **Fix:** series absent → exporter pod or ServiceMonitor selection (`release` label); series present but never changing after changes in the cluster → check the scanner logs for `scanning failed` (see above).

---

## Where the official docs and the source disagree

| Docs say | Chart 1.40.4 and source say |
|---|---|
| Runtime profiles are `ApplicationProfile` (`kubectl get applicationprofiles`) | `containerprofiles`; `applicationprofiles` is deleted by storage v0.0.331 |
| NetworkPolicies come from `NetworkNeighborhood` | computed from `containerprofiles`; `networkneighborhoods` is deleted |
| Status `completed` means ready | `ready` means *learning*; `completed` means learned |
| Install with the chart defaults | the bundled scanner v4.0.13 cannot run `all` scans; override the image tag |

---

## Cross-references

- `references/kubescape.md` — CLI scans, frameworks, exceptions file, PR gate, VAP
- `references/runtime-security.md` — Falco
- `references/trivy.md` — Trivy Operator
- `references/fluxcd-helmrelease.md` — HelmRelease remediation and drift
- `references/observability.md` — Prometheus and Grafana
- `references/supply-chain.md` — image signing (C-0237)
