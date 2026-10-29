import { afterAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Drives the real SessionStart hook (bash), not a reimplementation, against
// a scratch WHATSAPP_STATE_DIR — the same override server.ts and
// update-notice.ts honor. The hook always exits 0 and prints one JSON
// object; what varies is additionalContext (model-facing) and, when there is
// an update to announce, systemMessage (user-facing).
const HOOK = join(import.meta.dir, "..", "hooks-handlers", "session-start.sh");
const PLUGIN_VERSION: string = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", ".claude-plugin", "plugin.json"),
    "utf8",
  ),
).version;

const fixtures: string[] = [];
afterAll(() => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true });
});

function runHookRaw(
  dir: string,
  overrides: Record<string, string> = {},
): Record<string, any> {
  return JSON.parse(
    execFileSync("bash", [HOOK], {
      env: {
        ...process.env,
        CLAUDE_PLUGIN_OPTION_CONNECTION_PROVIDER: "",
        ...overrides,
        WHATSAPP_STATE_DIR: dir,
        WHATSAPP_PROVIDER: "",
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: "",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "",
        WHATSAPP_CLOUD_APP_SECRET: "",
        WHATSAPP_CLOUD_VERIFY_TOKEN: "",
      },
      encoding: "utf8",
    }),
  );
}

function runHook(dir: string, overrides: Record<string, string> = {}): string {
  return runHookRaw(dir, overrides).hookSpecificOutput
    .additionalContext as string;
}

// A state dir as the current code actually writes it: pretty-printed JSON
// everywhere (JSON.stringify(x, null, 2)).
function configuredStateDir(opts: { allowFrom: string[] }): string {
  const dir = mkdtempSync(join(tmpdir(), "wa-hook-"));
  fixtures.push(dir);
  writeFileSync(join(dir, ".env"), "WHATSAPP_PHONE_NUMBER=886900000000\n");
  mkdirSync(join(dir, ".baileys_auth"));
  writeFileSync(
    join(dir, ".baileys_auth", "creds.json"),
    JSON.stringify({ registered: true }, null, 2) + "\n",
  );
  writeFileSync(
    join(dir, "access.json"),
    JSON.stringify(
      { dmPolicy: "allowlist", allowFrom: opts.allowFrom, groups: {} },
      null,
      2,
    ) + "\n",
  );
  // Keep the update notice quiet unless a test overwrites this — these tests
  // are about the state-detection branches, not the notice.
  writeFileSync(join(dir, ".last-seen-version"), PLUGIN_VERSION);
  return dir;
}

describe("session-start.sh", () => {
  test("legacy state names the effective provider before pairing guidance", () => {
    const dir = configuredStateDir({ allowFrom: [] });
    const message = runHook(dir);
    expect(message).toContain("Effective connection: linked device");
    expect(message).not.toContain("plugin setting");
    expect(message.indexOf("Effective connection")).toBeLessThan(
      message.indexOf("owner JID is auto-added"),
    );
  });

  // Claude Code exports plugin userConfig to hooks as CLAUDE_PLUGIN_OPTION_*.
  test("plugin cloud-api selection applies when no provider is saved", () => {
    const dir = configuredStateDir({ allowFrom: [] });
    const message = runHook(dir, {
      CLAUDE_PLUGIN_OPTION_CONNECTION_PROVIDER: "cloud-api",
    });
    expect(message).toContain("Official WhatsApp Cloud API is selected");
    expect(message).not.toContain("plugin setting");
  });

  test("a terminal-saved provider overrides a different plugin selection, and says so", () => {
    const dir = configuredStateDir({ allowFrom: [] });
    writeFileSync(
      join(dir, ".env"),
      "WHATSAPP_PHONE_NUMBER=886900000000\nWHATSAPP_PROVIDER=baileys\n",
    );
    const message = runHook(dir, {
      CLAUDE_PLUGIN_OPTION_CONNECTION_PROVIDER: "cloud-api",
    });
    expect(message).toContain(
      "The terminal-saved provider baileys is in effect; the plugin setting cloud-api is ignored.",
    );
    expect(message).toContain("no contacts are allowlisted yet");
    expect(message).not.toContain('"');
  });

  // Regression: the old check grepped the file for compact
  // '"allowFrom":[".' and never matched the pretty-printed form everything
  // writes, so every configured install was greeted as having no contacts.
  test("pretty-printed access.json with contacts → fully-configured message", () => {
    const dir = configuredStateDir({
      allowFrom: ["886900000000@s.whatsapp.net"],
    });
    expect(runHook(dir)).toContain("fully configured and ready");
  });

  test("compact (legacy) access.json with contacts is still recognized", () => {
    const dir = configuredStateDir({
      allowFrom: ["886900000000@s.whatsapp.net"],
    });
    writeFileSync(
      join(dir, "access.json"),
      '{"dmPolicy":"allowlist","allowFrom":["886900000000@s.whatsapp.net"],"groups":{}}\n',
    );
    expect(runHook(dir)).toContain("fully configured and ready");
  });

  test("empty allowFrom → still the no-contacts onboarding message", () => {
    const dir = configuredStateDir({ allowFrom: [] });
    expect(runHook(dir)).toContain("no contacts are allowlisted yet");
  });

  // Spec R2: the access screen is the ADVERTISED first-run route. This branch
  // used to lead with the pairing-code choreography, which is four steps per
  // contact and only ever needed for someone who has never messaged you.
  test("the no-contacts branch leads with the access screen, pairing second", () => {
    const dir = configuredStateDir({ allowFrom: [] });
    const msg = runHook(dir);
    expect(msg).toContain("/whatsapp-channel:access review");
    expect(msg).toContain("normal way");
    // Pairing is still reachable - it is the only route for a stranger.
    expect(msg).toContain("/whatsapp-channel:access pair");
    // Order: the screen is offered before the pairing fallback.
    expect(msg.indexOf("access review")).toBeLessThan(
      msg.indexOf("policy pairing"),
    );
  });

  // A double quote in any of the three unconfigured branches ends the JSON
  // string they are interpolated raw into. runHookRaw would throw on parse,
  // but assert it directly so the reason is named at the failure.
  test("the onboarding branches carry no unescaped double quote", () => {
    expect(runHook(configuredStateDir({ allowFrom: [] }))).not.toContain('"');
  });

  test("pretty-printed creds.json ('registered': true with space) counts as paired", () => {
    // configuredStateDir writes creds pretty-printed already; getting past
    // the has_auth branch to the fully-configured message proves it matched.
    const dir = configuredStateDir({
      allowFrom: ["886900000000@s.whatsapp.net"],
    });
    expect(runHook(dir)).not.toContain("not paired yet");
  });

  // The 0.18.0 update notice only fires from the fully-configured branch —
  // exactly the branch this bug made unreachable, which is how it shipped
  // dead. End-to-end through the hook, not just update-notice.ts's own tests.
  test("update notice reaches the hook output when the recorded version is older", () => {
    const dir = configuredStateDir({
      allowFrom: ["886900000000@s.whatsapp.net"],
    });
    writeFileSync(join(dir, ".last-seen-version"), "0.9.0");
    const out = runHookRaw(dir);
    // The notice itself is user-facing, and the model still gets the same
    // briefing it would have had with no notice at all.
    expect(out.systemMessage).toContain(
      `WhatsApp plugin updated to v${PLUGIN_VERSION}`,
    );
    expect(out.hookSpecificOutput.additionalContext).toContain(
      "fully configured and ready",
    );
  });
});

describe("Cloud API session onboarding", () => {
  function cloudState(complete = true, owner = false): string {
    const dir = configuredStateDir({
      allowFrom: owner ? ["12345@s.whatsapp.net"] : [],
    });
    writeFileSync(
      join(dir, ".env"),
      "WHATSAPP_PROVIDER=cloud-api\n" +
        (complete
          ? "WHATSAPP_CLOUD_PHONE_NUMBER_ID=123456789\nWHATSAPP_CLOUD_ACCESS_TOKEN=fixture-private-token\nWHATSAPP_CLOUD_APP_SECRET=fixture-private-secret\nWHATSAPP_CLOUD_VERIFY_TOKEN=fixture-private-verify\n"
          : ""),
    );
    if (owner)
      writeFileSync(
        join(dir, "access.json"),
        JSON.stringify({
          dmPolicy: "allowlist",
          allowFrom: ["12345@s.whatsapp.net"],
          owner: "12345@s.whatsapp.net",
          ownerExplicit: true,
          groups: {},
        }),
      );
    return dir;
  }

  test("unconfigured installation offers both providers", () => {
    const dir = mkdtempSync(join(tmpdir(), "wa-hook-empty-"));
    fixtures.push(dir);
    const out = runHook(dir);
    expect(out).toContain("choose linked device");
    expect(out).toContain("official WhatsApp Cloud API");
    expect(out).not.toContain("provide their WhatsApp phone number");
  });

  test("Cloud configuration does not claim webhook delivery or prompt phone pairing", () => {
    const out = runHook(cloudState());
    expect(out).toContain("configuration is present");
    expect(out).toContain("does not verify inbound webhook delivery");
    expect(out).toContain("explicitly allowlisted personal owner");
    expect(out).not.toContain("fully configured and ready");
    expect(out).not.toContain("pairing code");
    for (const secret of [
      "fixture-private-token",
      "fixture-private-secret",
      "fixture-private-verify",
    ])
      expect(out).not.toContain(secret);
  });

  test("missing credentials directs to private terminal setup", () => {
    const out = runHook(cloudState(false));
    expect(out).toContain("incomplete or invalid");
    expect(out).toContain("configure provider cloud-api");
    expect(out).toContain("never paste access tokens");
    expect(out).not.toContain("Enter it on phone");
  });

  test("explicit allowed owner removes the owner onboarding warning", () => {
    const out = runHook(cloudState(true, true));
    expect(out).not.toContain("Set an explicitly allowlisted personal owner");
    expect(out).toContain("test an approved personal DM");
  });

  test("an owner inherited from linked-device mode must be re-set", () => {
    const dir = cloudState(true, true);
    writeFileSync(
      join(dir, "access.json"),
      JSON.stringify({
        dmPolicy: "allowlist",
        allowFrom: ["12345@s.whatsapp.net"],
        owner: "12345@s.whatsapp.net",
        groups: {},
      }),
    );
    const out = runHook(dir);
    expect(out).toContain("inherited from linked-device mode");
    expect(out).toContain("access set owner");
  });

  test("a saved cloud-api provider overrides a plugin baileys selection, and says so", () => {
    const out = runHook(cloudState(), {
      CLAUDE_PLUGIN_OPTION_CONNECTION_PROVIDER: "baileys",
    });
    expect(out).toContain("configuration is present");
    expect(out).toContain(
      "The terminal-saved provider cloud-api is in effect; the plugin setting baileys is ignored.",
    );
  });

  test("Cloud configurations receive release notices without claiming connection", () => {
    const dir = cloudState(true, true);
    writeFileSync(join(dir, ".last-seen-version"), "0.9.0");
    const out = runHookRaw(dir);
    expect(out.systemMessage).toContain(
      `WhatsApp plugin updated to v${PLUGIN_VERSION}`,
    );
    expect(out.hookSpecificOutput.additionalContext).toContain(
      "does not verify inbound webhook delivery",
    );
  });
});
