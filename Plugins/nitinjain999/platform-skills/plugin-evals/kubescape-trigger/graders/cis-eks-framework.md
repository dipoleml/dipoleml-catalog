---
# Picks the EKS benchmark by name, not the vanilla CIS framework.
type: regex
weight: 1
target: last_message
pattern: 'cis-eks-t1\.8\.0'
flags: i
---
