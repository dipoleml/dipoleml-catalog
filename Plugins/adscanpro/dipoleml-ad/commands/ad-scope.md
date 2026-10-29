---
description: Define and record the scope of an authorized Active Directory engagement (domain(s), DC IP, initial credentials, and what is in scope) into a scope file the other AD commands read.
argument-hint: "<domain> [dc-ip]"
allowed-tools: Bash, Read, Write
---

Define the scope for an authorized Active Directory assessment.

Domain: **$1**
DC IP (if given): **$2**

**Authorized engagements only.** This file is what every later step trusts as its
boundary. Fill it from what the client authorized in writing; do not widen it.

Do the following:

1. If any of these are missing, ask the operator for them before writing:
   - Domain(s) / forest and their functional level, if known.
   - DC IP(s) and DC FQDN(s).
   - Initial credentials you are cleared to use (user + password or hash, or a
     Kerberos ccache). Note the privilege level (assume low-priv unless told).
   - In-scope hosts / subnets and anything explicitly **out of scope**.
   - The objective (for example, path to Domain Admin) and any actions the client
     forbids (no password resets, no coercion, no DCSync, business-hours only).
   - Engagement window and a client point of contact for stop/rollback.

2. Do a light reachability check only against the DC IP the client gave you, and
   do not scan anything not yet in scope:
   ```bash
   nxc smb $2 2>/dev/null || echo "DC not reachable / not yet provided"
   ```

3. Write a scope file the other commands will read, at
   `./ad-engagement/scope.md` (create the directory). Record everything above
   plus the date and the operator. Keep credentials only as the engagement
   requires and note where they are stored; do not paste secrets anywhere they
   should not live.

4. Print a short confirmation of the recorded scope and the explicit
   out-of-scope and forbidden-action list, so it is visible before recon starts.

Do not enumerate or exploit here; scope only. Next step is `/ad-recon $1`.
