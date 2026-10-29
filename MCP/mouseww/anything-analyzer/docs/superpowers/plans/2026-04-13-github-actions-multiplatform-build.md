# GitHub Actions Multi-Platform Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up GitHub Actions CI/CD to build Anything Analyzer for macOS (DMG), Windows (NSIS), and Linux (AppImage), with manual trigger and tag-based release.

**Architecture:** A single workflow file with a build matrix covering 4 platform/arch combinations. Each matrix entry runs on a native runner (no cross-compilation). Tag pushes (`v*`) additionally create a GitHub Release with all artifacts attached.

**Tech Stack:** GitHub Actions, electron-builder 25, pnpm, Node.js 20, electron-vite

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `.github/workflows/build.yml` | Create | CI/CD workflow: build matrix, artifact upload, release |
| `electron-builder.yml` | Modify | Add `artifactName` for macOS to differentiate x64/arm64 DMGs |

---

### Task 1: Update electron-builder.yml with Architecture-Specific Artifact Naming

**Files:**
- Modify: `electron-builder.yml:17-19` (mac section)

- [ ] **Step 1: Add `artifactName` to macOS config**

Open `electron-builder.yml` and replace the `mac` section:

```yaml
mac:
  target:
    - dmg
  artifactName: "${productName}-${version}-${arch}.${ext}"
```

This ensures the two macOS builds produce distinct filenames:
- `Anything Analyzer-2.0.0-arm64.dmg`
- `Anything Analyzer-2.0.0-x64.dmg`

- [ ] **Step 2: Verify the full file looks correct**

The complete `electron-builder.yml` should be:

```yaml
appId: com.anything.analyzer
productName: Anything Analyzer
directories:
  buildResources: resources
files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.*'
  - '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
win:
  target:
    - nsis
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
mac:
  target:
    - dmg
  artifactName: "${productName}-${version}-${arch}.${ext}"
linux:
  target:
    - AppImage
```

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml
git commit -m "build: add arch-specific artifact naming for macOS DMG"
```

---

### Task 2: Create GitHub Actions Workflow File

**Files:**
- Create: `.github/workflows/build.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Write the workflow file**

Create `.github/workflows/build.yml` with the following content:

```yaml
name: Build & Release

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: windows-latest
            platform: win
          - os: macos-latest
            platform: mac-arm64
          - os: macos-13
            platform: mac-x64
          - os: ubuntu-latest
            platform: linux

    runs-on: ${{ matrix.os }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm run build

      - name: Package for Windows
        if: matrix.platform == 'win'
        run: npx electron-builder --win --publish never

      - name: Package for macOS
        if: startsWith(matrix.platform, 'mac')
        run: npx electron-builder --mac --publish never

      - name: Package for Linux
        if: matrix.platform == 'linux'
        run: npx electron-builder --linux --publish never

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.platform }}
          path: |
            dist/*.exe
            dist/*.dmg
            dist/*.AppImage
            dist/*.yml
          if-no-files-found: error

  release:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts
          merge-multiple: true

      - name: List artifacts
        run: find artifacts -type f | head -20

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          draft: true
          generate_release_notes: true
          files: |
            artifacts/*.exe
            artifacts/*.dmg
            artifacts/*.AppImage
```

Key design decisions explained:
- **`fail-fast: false`**: One platform failing doesn't cancel others. If macOS fails, you still get Windows + Linux builds.
- **Separate `Package for X` steps**: Each platform has its own step with `if` conditions, so the runner only packages for its own OS. This avoids needing to pass `--platform` which can cause issues.
- **`if-no-files-found: error`**: Fails the build if packaging produced no output — catches silent failures.
- **`release` job**: Only runs on tag pushes. Downloads all platform artifacts and creates a draft GitHub Release. Draft mode lets you review the release before making it public.
- **`generate_release_notes: true`**: GitHub auto-generates release notes from commits since the last tag.
- **No electron mirror override**: The `.npmrc` sets `electron_mirror` to a CN mirror, which works in CI too. No special handling needed.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add GitHub Actions multi-platform build workflow

Builds for Windows (x64), macOS (arm64 + x64), and Linux (x64).
Triggered manually or on version tags (v*).
Tag pushes create a draft GitHub Release with all artifacts."
```

---

### Task 3: Verify Workflow Locally (Dry Run)

**Files:**
- No file changes — validation only

- [ ] **Step 1: Validate YAML syntax**

```bash
cd anything-register
python -c "import yaml; yaml.safe_load(open('.github/workflows/build.yml'))" && echo "YAML valid"
```

If Python/PyYAML not available, use:

```bash
npx yaml-lint .github/workflows/build.yml
```

Or simply review the file to ensure correct indentation and no YAML syntax errors.

- [ ] **Step 2: Verify electron-builder config is valid**

```bash
npx electron-builder --help
```

Confirm electron-builder is accessible. No actual build needed — just verifying the tool is available.

- [ ] **Step 3: Verify pnpm lock file is committed**

```bash
git status pnpm-lock.yaml
```

The lock file must be committed for pnpm CI installs to work. If it's not tracked, add it:

```bash
git add pnpm-lock.yaml
git commit -m "chore: track pnpm-lock.yaml for CI builds"
```

---

### Task 4: Test the Workflow on GitHub

**Files:**
- No file changes — testing only

- [ ] **Step 1: Push to GitHub**

Ensure the repository has a GitHub remote. Push the branch:

```bash
git push origin main
```

- [ ] **Step 2: Trigger manual build**

Go to the repository on GitHub → Actions tab → "Build & Release" workflow → "Run workflow" button → select `main` branch → click "Run workflow".

Alternatively via CLI:

```bash
gh workflow run build.yml --ref main
```

- [ ] **Step 3: Monitor build status**

```bash
gh run list --workflow=build.yml --limit 1
gh run watch
```

Wait for all 4 matrix jobs to complete. Expected: all green.

- [ ] **Step 4: Download and verify macOS artifact**

```bash
gh run download --name build-mac-arm64 --dir ./test-artifacts/mac-arm64
gh run download --name build-mac-x64 --dir ./test-artifacts/mac-x64
```

Verify the DMG files exist and are named correctly:
- `Anything Analyzer-2.0.0-arm64.dmg`
- `Anything Analyzer-2.0.0-x64.dmg`

- [ ] **Step 5: (Optional) Test tag-based release**

```bash
git tag v2.0.0
git push origin v2.0.0
```

After the build completes, check:

```bash
gh release view v2.0.0
```

The release should be in draft status with all platform installers attached.
