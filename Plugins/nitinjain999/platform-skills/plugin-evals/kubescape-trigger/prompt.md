---
description: "Trigger check: a framework-posture and PR-gate request must load the kubescape skill, not trivy, kyverno or kubernetes."
tags: [kubescape, trigger]
max_turns: 12
timeout_seconds: 420
allowed_tools: [Read, Glob, Grep, Skill]
---

Our auditors want to know how our EKS cluster measures up against the CIS benchmark. We also want pull requests that change our Kubernetes manifests in k8s/ to fail when they introduce new high-severity misconfigurations, without failing on the problems that are already there. How do we set both up?
