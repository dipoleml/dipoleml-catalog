# Releasing Cross-Code Organizer

CCO publishes one version through three linked channels:

1. npm: `@mcpware/cross-code-organizer`
2. Official MCP Registry: `io.github.mcpware/cross-code-organizer`
3. GitHub Releases

The tag workflow creates the GitHub Release only after npm and the MCP Registry
both expose the requested version. A partially published run can therefore be
fixed and rerun without creating a misleading GitHub Release.

## One-time publisher configuration

In the npm package settings, add a GitHub Actions trusted publisher with:

- Organization or user: `mcpware`
- Repository: `cross-code-organizer`
- Workflow: `publish.yml`
- Environment: blank
- Permission: allow `npm publish`

The repository workflow uses GitHub OIDC for both npm and the MCP Registry. It
does not use a long-lived npm token. The workflow pins npm CLI 11.6.2 because
trusted publishing requires npm 11.5.1 or later.

## Prepare a version

1. Update the version in `package.json`, `package-lock.json`,
   `.claude-plugin/plugin.json`, and `server.json`.
2. Add `docs/releases/vX.Y.Z.md` with the same version heading.
3. Run the local release gates:

   ```bash
   CCO_RELEASE_TAG=vX.Y.Z node scripts/verify-release.mjs
   npm run test:unit
   npm test
   npm audit --omit=dev
   npm pack --dry-run
   ```

4. Confirm the packed file list contains only intended runtime and user-facing
   documentation files. Research corpora and maintainer scripts must not ship.
5. Commit and push the prepared release to `main`.

## Publish

Create and push the version tag from the exact reviewed commit:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The `Publish` workflow then:

- re-runs metadata, unit, audit, package, and Playwright gates;
- publishes npm with provenance through trusted publishing;
- validates and publishes `server.json` through the official MCP publisher;
- verifies both public registries; and
- creates the GitHub Release from the curated release notes.

Do not describe a version as published until the workflow is green and all
three public channels show that version.

## Verify and close the release

```bash
npm view @mcpware/cross-code-organizer@X.Y.Z version
curl --fail \
  "https://registry.modelcontextprotocol.io/v0.1/servers/io.github.mcpware%2Fcross-code-organizer/versions/X.Y.Z"
gh release view vX.Y.Z --repo mcpware/cross-code-organizer
```

Smoke-test the actual registry artifact rather than the worktree:

```bash
npx --yes @mcpware/cross-code-organizer@X.Y.Z --version
npx --yes @mcpware/cross-code-organizer@X.Y.Z --help
```

Only after those checks pass should release issues and pull requests receive
their final version links and be closed.

## Recovery

- If a transient external step fails, rerun the same workflow. npm and MCP
  Registry publication checks make reruns idempotent.
- If an npm recovery code was used to regain access, npm applies a 72-hour
  security hold. During that hold, package settings cannot be changed and
  packages cannot be published, even after a successful 2FA challenge. The
  hold cannot be lifted early and expires automatically; wait for it to end
  before configuring the trusted publisher or pushing the release tag. See
  [npm's account-recovery documentation](https://docs.npmjs.com/recovering-your-2fa-enabled-account/).
- If code or metadata must change after any registry accepted the version,
  prepare a new patch version. Never overwrite a published artifact or move its
  public tag.
- Do not restore a long-lived `NPM_TOKEN`; repair trusted-publisher or OIDC
  configuration instead.

## Monthly active-install matrix

Anonymous metrics are opt-in and count active installations, not people. Query
the private D1 aggregate with:

```bash
./infra/metrics-worker/scripts/monthly-matrix.sh
```

The three result sets show totals by month, app version, and selected harness.
Do not combine monthly rotating identifiers into cross-month user histories.
