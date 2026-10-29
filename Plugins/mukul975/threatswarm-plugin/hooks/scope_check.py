#!/usr/bin/env python3
"""
PreToolUse hook: blocks Bash commands targeting out-of-scope hosts.
Reads JSON from stdin per Claude Code hooks spec.
Exit code 2 = block tool call + show stderr message to Claude
Exit code 0 = allow through
"""

import json
import sys
import re
import ipaddress
import os


def load_scope(scope_file: str) -> list:
    """Load scope entries from scope.txt, return list of (kind, entry) tuples."""
    entries = []
    try:
        with open(scope_file, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                # Try CIDR / IP network first
                try:
                    network = ipaddress.ip_network(line, strict=False)
                    entries.append(('network', network))
                    continue
                except ValueError:
                    pass
                # Try IP address (single host)
                try:
                    addr = ipaddress.ip_address(line)
                    entries.append(('network', ipaddress.ip_network(f"{addr}/32", strict=False)))
                    continue
                except ValueError:
                    pass
                # Treat as domain/hostname
                entries.append(('domain', line.lower()))
    except FileNotFoundError:
        pass  # No scope file — allow all (warn only)
    return entries


def extract_targets(command: str) -> tuple:
    """Extract IPv4 addresses and hostnames from a shell command string."""
    # IPv4 addresses (strict: 0-255 per octet)
    ip_pattern = (
        r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.)'
        r'{3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b'
    )
    ips = re.findall(ip_pattern, command)

    # Hostnames / FQDNs — must have at least one dot and a valid TLD-like suffix.
    # Only match tokens that are standalone arguments (preceded by whitespace,
    # -flag=, or start-of-string) to avoid matching Python attr chains like
    # result.stdout.strip or json.dumps.
    host_pattern = (
        r'(?:(?<=\s)|(?<=\=)|(?<=\t)|(?:^))(?!-)'
        r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+'
        r'(?:[a-zA-Z]{2,})'
        r'(?=\s|$|/|:)'
    )
    hosts = re.findall(host_pattern, command, re.MULTILINE)

    # Filter out common false positives
    false_positive_patterns = [
        r'^\d+\.\d+$',            # version numbers like 3.1
        r'^\d+\.\d+\.\d+$',       # version numbers like 1.4.3
        r'^v\d',                   # v1.2.3
        r'\.(log|txt|py|sh|md|json|yaml|yml|conf|rule|xml|cfg|ini|toml|rb|go|c|cpp|h|so|dll|exe|bin|pcap|cap|zip|gz|tar|bak|old|orig|swp)$',
        r'^\.',                    # dotfiles like .dockerenv
        r'^localhost\.',           # localhost.localdomain etc.
        # Reject tokens that look like Python/code method chains (contain lowercase word . lowercase word)
        r'^[a-z_][a-z_0-9]*\.[a-z_]',  # result.stdout, json.dumps, etc.
    ]
    filtered_hosts = []
    for h in hosts:
        h = h.strip()
        if not h:
            continue
        is_fp = False
        for pat in false_positive_patterns:
            if re.search(pat, h, re.IGNORECASE):
                is_fp = True
                break
        if not is_fp:
            filtered_hosts.append(h)

    return ips, filtered_hosts


def is_localhost(target: str) -> bool:
    """Check if target is a loopback / local address."""
    localhost_values = {
        'localhost', '127.0.0.1', '::1', '0.0.0.0',
        '127.0.0.0', '127.255.255.255',
    }
    if target in localhost_values:
        return True
    try:
        addr = ipaddress.ip_address(target)
        return addr.is_loopback or addr == ipaddress.ip_address('0.0.0.0')
    except ValueError:
        return target.lower() in ('localhost', 'localhost.localdomain')


def is_in_scope(target: str, scope_entries: list) -> bool:
    """Check if target (IP string or hostname) is in scope."""
    if is_localhost(target):
        return True

    # Try IP-based matching
    try:
        ip = ipaddress.ip_address(target)
        for kind, entry in scope_entries:
            if kind == 'network' and ip in entry:
                return True
        return False  # IP not in any network
    except ValueError:
        pass

    # Domain / hostname matching (exact or subdomain)
    tgt_lower = target.lower().rstrip('.')
    for kind, entry in scope_entries:
        if kind == 'domain':
            if tgt_lower == entry or tgt_lower.endswith('.' + entry):
                return True
    return False


def is_network_command(command: str) -> bool:
    """Return True if the command is likely to make network connections to external targets.

    Uses word-boundary matching to avoid false positives like:
      'nc' matching inside 'sync', 'hashcat', 'fence'
      'ssh' matching inside 'hashcat', 'getsshkey'
      'ftp' matching inside 'sftp' patterns
    """
    # These tools require exact word-boundary match
    word_boundary_tools = [
        r'\bnmap\b', r'\bnuclei\b', r'\bhttpx\b', r'\bferoxbuster\b',
        r'\bffuf\b', r'\bgobuster\b', r'\bnikto\b', r'\bsqlmap\b',
        r'\bhydra\b', r'\bmedusa\b', r'\bcrackmapexec\b', r'\bcme\b',
        r'\bsmbclient\b', r'\brpcclient\b', r'\benum4linux\b',
        r'\bsubfinder\b', r'\bamass\b', r'\btheHarvester\b', r'\bshodan\b',
        r'\bresponder\b', r'\bbettercap\b', r'\barpspoof\b', r'\bntlmrelayx\b',
        r'\bbloodhound\b', r'\bcertipy\b', r'\bevil-winrm\b',
        r'\bwmiexec\b', r'\bpsexec\b', r'\bsmbexec\b',
        r'\bssh\b', r'\bsftp\b', r'\bftp\b', r'\btelnet\b',
        r'\bnetcat\b', r'\bncat\b', r'\bnc\b',
        r'\bcurl\b', r'\bwget\b', r'\bmsfconsole\b', r'\bmsfvenom\b',
        r'\bsliver\b', r'\bairodump-ng\b', r'\baireplay-ng\b',
        r'\breaver\b', r'\bhostapd\b', r'\btcpdump\b', r'\btshark\b',
        r'\bwireshark\b', r'\bfrida\b', r'\badb\b', r'\bmosquitto\b',
        r'\bimpacket-\w+',  # impacket-secretsdump etc.
        r'\bkerbrute\b', r'\bldapsearch\b', r'\bldapdomaindump\b',
        r'\brpcscan\b', r'\bsmbmap\b', r'\bnetexec\b',
        r'\bdalfox\b', r'\barjun\b', r'\bgrpcurl\b',
    ]
    cmd_lower = command.lower()
    return any(re.search(pat, cmd_lower) for pat in word_boundary_tools)


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
    except (json.JSONDecodeError, EOFError, ValueError):
        sys.exit(0)  # Not JSON or empty stdin — pass through

    # Only intercept Bash tool calls
    tool_name = data.get('tool_name', '')
    if tool_name != 'Bash':
        sys.exit(0)

    command = data.get('tool_input', {}).get('command', '')
    if not command:
        sys.exit(0)

    # Skip if not a network-touching command
    if not is_network_command(command):
        sys.exit(0)

    scope_file = os.environ.get('SCOPE_FILE', './scope.txt')
    scope_entries = load_scope(scope_file)

    # No scope defined — warn but allow (emit warning to stderr)
    if not scope_entries:
        print(
            f"[SCOPE WARNING] scope.txt at '{scope_file}' is empty or missing. "
            "All targets are currently unverified. Add targets to scope.txt.",
            file=sys.stderr
        )
        sys.exit(0)

    ips, hosts = extract_targets(command)
    all_targets = ips + hosts

    # No network targets found in command — allow through
    if not all_targets:
        sys.exit(0)

    # Check each extracted target
    violations = []
    for target in all_targets:
        if not is_in_scope(target, scope_entries):
            violations.append(target)

    if violations:
        msg = (
            f"SCOPE VIOLATION BLOCKED\n"
            f"Target(s) not in {scope_file}: {', '.join(violations)}\n"
            f"Add the target(s) to scope.txt before running.\n"
            f"Command was: {command[:200]}{'...' if len(command) > 200 else ''}"
        )
        # Claude Code blocks on exit code 2 and shows stderr
        print(msg, file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


if __name__ == '__main__':
    main()
