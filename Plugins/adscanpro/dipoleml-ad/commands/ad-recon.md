---
description: Launch the ad-enumerator agent to run the collection phase against the defined scope, producing a structured AD inventory (users, groups, SPNs, ACLs, ADCS templates, trusts) plus a BloodHound CE graph.
argument-hint: "<domain>"
allowed-tools: Bash, Read, Write, Agent
---

Run reconnaissance / collection against **$1**.

**Authorized engagements only.** This reads the scope defined by `/ad-scope`; if
`./ad-engagement/scope.md` does not exist, tell the operator to run `/ad-scope $1`
first and stop.

Steps:

1. Read `./ad-engagement/scope.md` and confirm the domain **$1**, DC IP, and the
   credentials/privilege level to use are present. Surface any forbidden actions
   the client set.

2. Launch the **ad-enumerator** agent with that scope. It runs the collection
   phase with standard tools (netexec/nxc, impacket, rusthound-ce or
   bloodhound-python for the BloodHound CE graph, certipy find) and follows
   `ad-methodology`, `ad-environment-constraints` and `ad-opsec-telemetry`.

3. Collection is read-only. The enumerator must not modify the directory; if the
   scope forbids specific enumeration (for example loud BloodHound collection),
   respect it.

4. When the agent returns, save its structured inventory under
   `./ad-engagement/` and print a short summary: counts of users/groups,
   kerberoastable and AS-REP-roastable accounts, vulnerable ADCS templates,
   interesting ACLs, trusts, and the BloodHound CE zip path.

Do not plan or execute a path here. Next step is `/ad-attack-paths $1`.
