# ThreatSwarm Plugin

A complete offensive security operator workspace for Claude Code -- 27 specialist agents, automated scope enforcement, and full evidence chain from recon to report.

## Install

**Marketplace (recommended):**
```
/plugin marketplace add mukul975/ThreatSwarm
/plugin install threatswarm@threatswarm
```

**Session only:**
```bash
claude --plugin-dir ./threatswarm-plugin
```

## Setup

1. **Populate `scope.txt`** -- every target must be listed before any tool runs.
   ```
   # scope.txt -- one entry per line
   192.168.1.0/24
   10.10.14.0/24
   target.lab
   ```

2. **Set `LHOST`** in your shell profile or project `.env`:
   ```bash
   export LHOST=10.10.14.1
   export LPORT=4444
   ```

3. **Make hook scripts executable:**
   ```bash
   chmod +x threatswarm-plugin/hooks/{scope_check.py,cmd_log.sh,findings_sync.py}
   ```

4. **Reload plugins** inside Claude Code:
   ```
   /reload-plugins
   ```

## Commands

| Command | Usage |
|---------|-------|
| `/threatswarm:engage <target>` | Scope check, evidence dir, recon, attack vectors |
| `/threatswarm:attack <target> <vector>` | Route to correct agent (web, AD, cloud, ...) |
| `/threatswarm:pwned <target> <session>` | Post-ex: privesc, creds, lateral movement |
| `/threatswarm:hunt <hypothesis>` | ATT&CK-mapped threat hunt across logs |
| `/threatswarm:ir <incident-type>` | Incident response triage and timeline |
| `/threatswarm:report <name>` | Aggregate findings into pentest report |

## What's Included

| Component | Count | Details |
|-----------|-------|---------|
| Agents | 27 | Full specialist roster -- recon through report |
| Commands | 6 | engage, attack, pwned, hunt, ir, report |
| Skills | 5 | MITRE ATT&CK, Exploit-DB, wordlists, AD attacks, report templates |
| Hooks | 3 | Scope gate, command log, findings sync |

## Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| `scope_check.py` | PreToolUse | Blocks commands targeting out-of-scope hosts |
| `cmd_log.sh` | PostToolUse | Logs every Bash command to `evidence/commands.log` |
| `findings_sync.py` | Stop | Rolls up CRITICAL/HIGH findings to `evidence/FINDINGS_SUMMARY.md` |

## Requirements

- Claude Code 1.0.33+
- Python 3.8+ (hook scripts)
- Security tools installed per agent needs (nmap, hashcat, impacket, etc.)
