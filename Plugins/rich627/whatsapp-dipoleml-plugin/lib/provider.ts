import { readFileSync } from "node:fs";

export type ChannelProvider = "baileys" | "cloud-api";

export function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && !trimmed.startsWith("${") ? trimmed : undefined;
}

export function isProviderKey(key: string): boolean {
  return key === "WHATSAPP_PROVIDER" || key.startsWith("WHATSAPP_CLOUD_");
}

export function channelProvider(
  env: Record<string, string | undefined>,
): ChannelProvider {
  const value = configuredValue(env.WHATSAPP_PROVIDER) ?? "baileys";
  if (value === "baileys" || value === "cloud-api") return value;
  throw new Error("WHATSAPP_PROVIDER must be baileys or cloud-api");
}

export function parseStateEnv(raw: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of raw.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^(\w+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

export function stateEnvironment(
  path: string,
  env: Record<string, string | undefined> = process.env,
): Record<string, string | undefined> {
  let saved: Record<string, string> = {};
  try {
    saved = parseStateEnv(readFileSync(path, "utf8"));
  } catch {}
  // For the provider keys, a non-empty value saved in the state .env wins;
  // the process/plugin env only fills keys the file lacks or leaves blank
  // (blank or an unexpanded `${...}` placeholder counts as unset on both
  // sides). Every terminal tool (provider, status, doctor, access) and the
  // SessionStart hook read this file, so it must be what the server runs -
  // otherwise `provider.ts set` reports one connection while a plugin
  // /config value starts another. Every other key keeps "real env wins",
  // the same split server.ts's own .env loader applies.
  const result: Record<string, string | undefined> = { ...env };
  for (const [key, value] of Object.entries(saved)) {
    if (
      env[key] === undefined ||
      (isProviderKey(key) &&
        (configuredValue(value) || !configuredValue(env[key])))
    )
      result[key] = value;
  }
  return result;
}

export function updateStateEnv(
  raw: string,
  updates: Record<string, string>,
): string {
  for (const [key, value] of Object.entries(updates)) {
    if (!/^WHATSAPP_[A-Z0-9_]+$/.test(key) || /[\r\n\0]/.test(value)) {
      throw new Error("Invalid configuration field");
    }
  }
  const remaining = new Set(Object.keys(updates));
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const output: string[] = [];
  for (const line of lines) {
    const key = line.match(/^(\w+)=/)?.[1];
    if (!key || !Object.hasOwn(updates, key)) {
      output.push(line);
      continue;
    }
    if (remaining.delete(key)) output.push(`${key}=${updates[key]}`);
  }
  while (output.at(-1) === "") output.pop();
  for (const key of remaining) output.push(`${key}=${updates[key]}`);
  return output.join("\n") + "\n";
}
