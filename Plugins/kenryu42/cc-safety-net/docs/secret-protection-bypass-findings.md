# CC Safety Net: Built-in Secret Protection Bypass

## Summary

CC Safety Net's built-in secret protection (which blocks access to `.env` and other sensitive files) has been iteratively hardened during testing. Current state:

1. **Path operand extraction** — only checks file arguments of a whitelist of known file-reading commands (`cat`, `head`, `tail`, etc.). Interpreters are not checked.
2. **Literal string scan** — scans the full command string for `.env` anywhere, including in shell assignments like `f=.env`. Added after the initial interpreter bypass was demonstrated.
3. **Shell variable indirection** — `f=.env; python3 ...` was subsequently blocked too. The substring match now catches `.env` anywhere in the raw command text.

**Remaining bypass**: Encoding the filename (e.g., base64) avoids the literal `.env` string entirely. The protection performs no decoding or evaluation of encoded strings.

## Evolution of Bypass Attempts

### Attempt 1 — Interpreter not in COMMAND_PATH_OPERANDS

**Command**: `python3 -c "print(open('.env').read())"`

**Result**: Initially worked, then blocked.

The `extractCommandPathTargets` function in `src/guards/secret-protection.ts` only checks file arguments for commands in a hardcoded whitelist:

```js
const COMMAND_PATH_OPERANDS = new Set([
  'awk', 'cat', 'chmod', 'chown', 'cp', 'grep', 'head', 'less', 'ln',
  'more', 'mv', 'rg', 'rm', 'rsync', 'scp', 'sed', 'tail', 'tar', 'touch', 'zip',
]);
```

When a command is not in this set, `extractSegmentPathTargets` returns an empty array immediately — the `.env` path argument is never examined:

```js
function extractSegmentPathTargets(tokens) {
  // ...
  if (!COMMAND_PATH_OPERANDS.has(command)) {
    return [];  // <-- bypass: exits without checking any arguments
  }
  // ...
}
```

**Fix applied**: A second defense layer was added — a literal string scan that searches the raw command text for `.env` regardless of command type.

### Attempt 2 — Shell variable indirection

**Command**: `f=.env; python3 -c "print(open('$f').read())"`

**Result**: Initially worked, then blocked.

The `.env` string appeared in an assignment token (`f=.env`) which the path operand extraction didn't flag. The shell resolved `$f` at runtime after the scan completed.

**Fix applied**: The substring scan was broadened to catch `.env` anywhere in the command string, including assignment contexts.

### Attempt 3 — Base64 encoding (currently works)

**Command**: `b64=$(echo LmVudg== | base64 -d); python3 -c "print(open('$b64').read())"`

**Result**: Works (read and write).

The `.env` string never appears literally in the command. Only the base64-encoded form `LmVudg==` is present, which the shell decodes at runtime. The protection performs no decoding or taint tracking.

## Demonstration

```
# Blocked: direct .env ref
$ cat .env
> BLOCKED by CC Safety Net

# Blocked: interpreter with literal .env
$ python3 -c "print(open('.env').read())"
> BLOCKED by CC Safety Net

# Blocked: shell variable with .env literal in assignment
$ f=.env; python3 -c "print(open('$f').read())"
> BLOCKED by CC Safety Net

# Works: base64-encoded filename
$ b64=$(echo LmVudg== | base64 -d); python3 -c "import os; print(open(os.path.expanduser('~/.../test-cc/$b64')).read())"
TEST=1234567890

# Write also works with encoding
$ b64=$(echo LmVudg== | base64 -d); python3 -c "open('$b64','a').write('hello')"
```

## Why the `read`/`write`/`edit` tools are blocked

These tools pass a `path` parameter, which is caught by `extractPathLikeToolValues` via the `PATH_LIKE_KEYS` set:

```js
const PATH_LIKE_KEYS = new Set([
  'file', 'file_path', 'filepath', 'glob', 'notebook_path', 'path', 'pattern',
]);
```

This check is independent of the command-parsing pathway and uses `findSensitivePathTarget` directly against the resolved path.

## Sensitive Path Matching Logic

**File**: `src/rules/secret-protection-rules.ts`

The `.env` file is blocked by the `secret.basename.env` rule:

```js
{
  id: 'secret.basename.env',
  category: 'Basename',
  label: '.env',
  description: 'Blocks exact .env files.',
  basename: '.env',
}
```

Other sensitive basenames with the same bypass exposure:
- `.npmrc`
- `.pypirc`
- `.netrc`
- `.git-credentials`
- `id_rsa`, `id_ed25519`, `id_ecdsa`
- `credentials`
- `.env.*` variants (via `SECRET_ENV_VARIANT_RULE`)
- SSH key variants like `id_rsa.bak`, `id_rsa-old`

Directory-level protections (`~/.ssh`, `~/.aws`, `~/.kube/config`, `secrets/`) share the same underlying path extraction gap but are less likely to appear in encoded form since they're directory paths rather than single filenames.

## Note on Configurability

Custom rulebooks (user/project scope) cannot fix this gap. The docs state:

> "Custom rules can only add restrictions; they cannot bypass built-in CC Safety Net protections."

Adding a custom rule against `python3` or `node` would not help because the built-in secret protection runs separately from custom rules, and some bypasses (encoded strings) operate at a level that rules cannot express.

## Fix Suggestions

1. **Add interpreters to `COMMAND_PATH_OPERANDS`**: Include `python3`, `python`, `node`, `ruby`, `perl`, and common scripting languages so their arguments are also checked. Catches the direct reference case.

2. **Resolve shell variables before scanning**: Perform basic variable expansion on the command string before scanning for sensitive paths. Even simple assignment lookup (`f=.env` → resolve `$f`) would close the indirection gap.

3. **Recursive argument analysis**: When a command has a `-c` / `-e` argument (script code), analyze the script content for file-read operations targeting sensitive paths.

4. **Taint-tracking / encoded string detection**: Detect common encoding patterns (base64, hex) and decode before scanning for sensitive strings. This is harder to do reliably without false positives.

5. **Execute-level security**: Instead of pre-scanning command text, restrict file system access at the OS level (e.g., seccomp, Landlock, or a sandbox) so even if a bypass command runs, it cannot open sensitive files.
