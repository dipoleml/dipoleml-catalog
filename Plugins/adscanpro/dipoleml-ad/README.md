<div align="center">

# Claude-AD

**Active Directory pentest methodology for Claude Code.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-8A2BE2)](https://docs.anthropic.com/en/docs/claude-code)
[![Version](https://img.shields.io/badge/version-0.1.0-informational)](.claude-plugin/plugin.json)
[![Techniques](https://img.shields.io/badge/techniques-Kerberoast%20%C2%B7%20ADCS%20ESC1--17%20%C2%B7%20DCSync%20%C2%B7%20NTLM%20relay-critical)](#what-this-is)

Skills, agents and commands that give Claude the playbook for an internal Active Directory assessment: the phase order, the environment constraints that break your tooling, the telemetry each technique leaves behind, and how a finding maps to a compliance control. It drives standard tooling (netexec, impacket, certipy, bloodyAD, BloodHound CE). You still run the engagement; Claude carries the method.

</div>

---

## What this is

Every AD assessment follows the same spine: map before you exploit, harvest the easy credentials before you spray, collect the graph before you reason about paths. That spine, plus the hundred small constraints a hardened domain throws at you (NTLM disabled, AES-only Kerberos, LDAP channel binding, SPNs that must be FQDNs), is what separates an operator who finishes the engagement from one who spends a day debugging `invalidCredentials`.

Claude-AD encodes that method as Claude Code skills so Claude runs the standard tools in the right order, reads the environment correctly, and tells you what each step will look like to a defender.

**It covers:**

- **Methodology**: the setup → collection → exploitation → post order, and why each step comes when it does.
- **Environment constraints**: NTLM/Kerberos fallback, AES-only, LDAP signing and channel binding, clock skew, the FQDN-vs-short SPN trap, Protected Users, LAPS, gMSA, MachineAccountQuota.
- **OPSEC and telemetry**: the Windows Event IDs each technique generates, what triggers an MDI alert, what a SOC will see.
- **Techniques**: Kerberoasting and AS-REP roasting, ADCS ESC1 through ESC17, ACL abuse (GenericAll / WriteDACL / replication rights), coercion and NTLM relay, delegation abuse. Each one with the standard command, the MITRE ID, the detection events, and the fix.
- **Conceptual compliance mapping**: which control family a technique touches in DORA, NIS2 and ENS.

It orchestrates third-party tools. BloodHound CE (Apache-2.0), impacket, certipy, netexec and bloodyAD do the work; Claude-AD is the method that drives them.

## Install

Claude-AD is a Claude Code plugin. From inside Claude Code:

```
/plugin marketplace add ADScanPro/Claude-AD
/plugin install claude-ad@claude-ad
```

The first line registers this repo as a marketplace; the second installs the plugin. Once installed, the skills load automatically when you work on an AD engagement, and the commands (`/ad-scope`, `/ad-recon`, `/ad-attack-paths`) are available.

## Layout

```
Claude-AD/
├── skills/
│   ├── ad-methodology/          # phase order and why
│   ├── ad-environment-constraints/  # what breaks your tooling in a hardened domain
│   ├── ad-opsec-telemetry/      # Event IDs and MDI alerts per technique
│   ├── kerberos-attacks/        # Kerberoasting, AS-REP, delegation
│   ├── adcs-attacks/            # ESC1-ESC17 with certipy
│   ├── acl-abuse/               # GenericAll, WriteDACL, replication rights
│   ├── coercion-ntlm-relay/     # PetitPotam/PrinterBug/DFSCoerce + ntlmrelayx
│   └── compliance-mapping/      # conceptual technique -> DORA/NIS2/ENS control
├── agents/
│   ├── ad-enumerator.md         # runs collection with standard tooling
│   ├── ad-attack-planner.md     # reasons low-priv -> Domain Admin paths
│   └── ad-exploit-operator.md   # executes one step, with a human gate
└── commands/
    ├── ad-scope.md
    ├── ad-recon.md
    └── ad-attack-paths.md
```

## Scope and ethics

This is for **authorized engagements only**: your own lab, a domain you are contracted to test, a CTF. The exploitation agents ask for confirmation before any action that modifies the directory (a password reset, a group add, an RBCD write), and note where rollback applies. Use it where you have permission to.

## Where Claude-AD ends and ADscan begins

Claude-AD gives you the **method**. It tells Claude what to run, in what order, what each technique looks like on the wire, and which compliance control it touches. You still drive every tool by hand and read every result yourself.

[ADscan](https://github.com/ADScanPro/adscan) is the engine. It runs the whole chain from a low-privilege user to Domain Admin on its own, on-prem, with guardrails and rollback, and turns the result into a report with control IDs a DORA, NIS2 or ENS auditor will accept. Where this repo hands Claude the playbook, ADscan is the tool that executes it end to end and writes the evidence.

ADscan is free and source-available. If the manual method here is useful and you want it run and mapped for you, that is what it is for.

## Prior art and references

Claude-AD stands on the shoulders of the community. The techniques it encodes are documented in depth at [The Hacker Recipes](https://www.thehacker.recipes/), the reference every skill here points back to for exact syntax. It sits alongside the growing set of Claude Code security collections ([Claude-OSINT](https://github.com/elementalsouls/Claude-OSINT), [Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter), [claude-pentest](https://github.com/Stickman230/claude-pentest)), filling the Active-Directory-internal gap those bundles leave open. The tooling it drives (BloodHound CE, impacket, certipy, netexec, bloodyAD) is the work of their respective authors.

## Contributing

New techniques, sharper detection guidance, corrections to the compliance mapping: open an issue or a PR. Keep it AD-internal and keep the commands real.

## License

MIT. See [LICENSE](LICENSE). ADscan itself is a separate product under the Business Source License 1.1 (source-available).

---

<sub>**Keywords:** Active Directory penetration testing · Claude Code skills · red team · Kerberoasting · AS-REP roasting · ADCS ESC1-ESC17 · DCSync · ACL abuse · NTLM relay & coercion (PetitPotam, PrinterBug, DFSCoerce) · Kerberos delegation · BloodHound CE attack paths · OPSEC & MDI telemetry · DORA / NIS2 / ENS compliance mapping · netexec · impacket · certipy · bloodyAD.</sub>
