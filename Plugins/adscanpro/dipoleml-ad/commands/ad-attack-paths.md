---
description: Launch the ad-attack-planner agent to reason low-privilege-to-Domain-Admin paths from the collected inventory and BloodHound CE graph, then present the plan for human approval before any exploitation.
argument-hint: "<domain>"
allowed-tools: Bash, Read, Write, Agent
---

Reason attack paths to Domain Admin for **$1**.

**Authorized engagements only.** This reads the inventory produced by `/ad-recon`.
If no inventory exists under `./ad-engagement/`, tell the operator to run
`/ad-recon $1` first and stop.

Steps:

1. Read `./ad-engagement/scope.md` (objective and forbidden actions) and the
   inventory + BloodHound CE zip from `/ad-recon`.

2. Launch the **ad-attack-planner** agent with those inputs. It loads the graph
   into BloodHound CE, reasons which edges to chain from a low-privilege
   principal to the objective (ACL abuse, Kerberos, ADCS ESC1/ESC8, DCSync,
   coercion + relay), and checks each hop against posture using
   `ad-environment-constraints` and `compliance-mapping`.

3. The planner does **not** execute. It writes a plan file to `./ad-engagement/`
   and presents the ranked path(s) with, per step: the technique-skill, the exact
   standard-tool command, feasibility, telemetry, rollback where state changes,
   and a conceptual compliance theme.

4. Present the plan and stop at the **confirmation gate**. Ask the operator which
   steps are approved. Only after explicit human approval does
   `ad-exploit-operator` run any step, one at a time, with its own gate before
   anything that modifies the directory.

Recommend the quietest path that reaches the objective, but let the human decide.
