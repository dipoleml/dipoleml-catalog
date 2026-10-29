import { describe, expect, test } from "bun:test";
import {
  channelProvider,
  parseStateEnv,
  stateEnvironment,
  updateStateEnv,
} from "./provider";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("provider configuration", () => {
  test("existing installs and empty plugin values retain Baileys", () => {
    expect(channelProvider({})).toBe("baileys");
    expect(channelProvider({ WHATSAPP_PROVIDER: "" })).toBe("baileys");
    expect(
      channelProvider({
        WHATSAPP_PROVIDER: "${user_config.connection_provider}",
      }),
    ).toBe("baileys");
    expect(() => channelProvider({ WHATSAPP_PROVIDER: "typo" })).toThrow();
  });
  test("saved settings win over plugin env; plugin env fills only missing or blank keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "wa-provider-"));
    try {
      const path = join(dir, ".env");
      writeFileSync(
        path,
        '\uFEFFWHATSAPP_PROVIDER="baileys"\r\nWHATSAPP_CLOUD_ACCESS_TOKEN=test-token\r\nWHATSAPP_CLOUD_APP_SECRET=\r\n',
      );
      const env = stateEnvironment(path, {
        WHATSAPP_PROVIDER: "cloud-api",
        WHATSAPP_CLOUD_ACCESS_TOKEN: "override",
        WHATSAPP_CLOUD_APP_SECRET: "plugin-secret",
        WHATSAPP_CLOUD_VERIFY_TOKEN: "plugin-verify",
      });
      expect(channelProvider(env)).toBe("baileys");
      expect(env.WHATSAPP_CLOUD_ACCESS_TOKEN).toBe("test-token");
      expect(env.WHATSAPP_CLOUD_APP_SECRET).toBe("plugin-secret");
      expect(env.WHATSAPP_CLOUD_VERIFY_TOKEN).toBe("plugin-verify");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("plugin env selects the provider when the saved file lacks it, and blank env never masks the file", () => {
    const dir = mkdtempSync(join(tmpdir(), "wa-provider-"));
    try {
      const path = join(dir, ".env");
      writeFileSync(path, "WHATSAPP_PHONE_NUMBER=123456789\n");
      expect(
        channelProvider(
          stateEnvironment(path, { WHATSAPP_PROVIDER: "cloud-api" }),
        ),
      ).toBe("cloud-api");
      writeFileSync(path, "WHATSAPP_PROVIDER=cloud-api\n");
      expect(
        channelProvider(
          stateEnvironment(path, {
            WHATSAPP_PROVIDER: "${user_config.connection_provider}",
          }),
        ),
      ).toBe("cloud-api");
      expect(
        channelProvider(stateEnvironment(path, { WHATSAPP_PROVIDER: "" })),
      ).toBe("cloud-api");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("switching preserves unrelated settings and removes duplicate provider keys", () => {
    const raw =
      "# Keep this\nWHATSAPP_PHONE_NUMBER=123456789\nWHATSAPP_PROVIDER=baileys\nWHATSAPP_PROVIDER=baileys\nOTHER=value\n";
    const result = updateStateEnv(raw, { WHATSAPP_PROVIDER: "cloud-api" });
    expect(result).toContain("# Keep this\nWHATSAPP_PHONE_NUMBER=123456789\n");
    expect(result).toContain("OTHER=value");
    expect(result.match(/WHATSAPP_PROVIDER=/g)).toHaveLength(1);
    expect(parseStateEnv(result).WHATSAPP_PROVIDER).toBe("cloud-api");
    expect(() =>
      updateStateEnv(raw, { WHATSAPP_PROVIDER: "cloud-api\nOTHER=injected" }),
    ).toThrow();
  });
});
