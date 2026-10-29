/**
 * Privacy-preserving usage metrics.
 *
 * Metrics are disabled by default. Detailed event aggregates stay local, and
 * an enabled installation submits one deduplicated activity identity per UTC
 * month. Delivery retries can retransmit the same payload. The schema cannot
 * accept paths, names, prompts, file contents, or
 * arbitrary event properties. The pseudonym changes every month, preventing
 * cross-month tracking while still allowing a monthly active-install count.
 */

import { createHmac, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ALLOWED_EVENTS = new Set([
  "doctor_open",
  "repair_apply",
  "repair_undo",
  "migration_preview",
  "migration_apply",
  "migration_undo",
]);

const ALLOWED_HARNESSES = new Set(["claude", "codex", "opencode", "dsh", "unknown"]);
const stateQueues = new Map();
export const DEFAULT_METRICS_ENDPOINT = "https://cco-metrics-api.keungkawai5.workers.dev/v1/mau";
const ACTIVE_CONSENT_VERSION = "cco-mau-v1";
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function monthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

function defaultState() {
  return {
    version: 2,
    enabled: false,
    consentVersion: null,
    createdAt: null,
    secret: null,
    lastAttemptAt: null,
    lastSubmittedMonth: null,
    days: {},
  };
}

export function metricsPath(home) {
  return join(home, ".cco", "privacy-metrics.json");
}

async function readState(home) {
  try {
    const parsed = JSON.parse(await readFile(metricsPath(home), "utf8"));
    const state = { ...defaultState(), ...parsed, version: 2 };
    if (!state.days || typeof state.days !== "object" || Array.isArray(state.days)) state.days = {};
    return state;
  } catch {
    return defaultState();
  }
}

async function saveState(home, state) {
  const path = metricsPath(home);
  const directory = dirname(path);
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  try {
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

async function withStateLock(home, operation) {
  const key = metricsPath(home);
  const previous = stateQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  stateQueues.set(key, current);
  try {
    return await current;
  } finally {
    if (stateQueues.get(key) === current) stateQueues.delete(key);
  }
}

function publicStatus(state) {
  const optedIn = state.enabled && state.consentVersion === ACTIVE_CONSENT_VERSION;
  return {
    enabled: Boolean(optedIn),
    localDetailsOnly: true,
    monthlySignalShared: Boolean(optedIn),
    lastSubmittedMonth: state.lastSubmittedMonth || null,
    retentionDays: 30,
    storedDays: Object.keys(state.days || {}).length,
    localFields: ["UTC day", "event count", "harness id", "coarse inventory buckets"],
    sharedFields: ["UTC month", "monthly rotating anonymous id", "CCO version", "harness id"],
    neverCollected: ["paths", "file names", "skill names", "prompts", "session content", "credentials"],
  };
}

export async function getPrivacyMetricsStatus(home) {
  const state = await readState(home);
  const status = publicStatus(state);
  return { ...status, sharePreview: status.enabled ? buildSharePreview(state) : null };
}

export async function setPrivacyMetricsEnabled(home, enabled) {
  return withStateLock(home, async () => {
    const state = await readState(home);
    state.enabled = Boolean(enabled);
    state.consentVersion = enabled ? ACTIVE_CONSENT_VERSION : null;
    state.createdAt ||= new Date().toISOString();
    state.secret ||= randomBytes(32).toString("hex");
    await saveState(home, state);
    return publicStatus(state);
  });
}

function coarseBucket(value) {
  const count = Math.max(0, Number(value) || 0);
  if (count === 0) return "0";
  if (count <= 5) return "1-5";
  if (count <= 20) return "6-20";
  if (count <= 50) return "21-50";
  if (count <= 100) return "51-100";
  return "100+";
}

function pruneDays(state, today) {
  const current = new Date(`${today}T00:00:00.000Z`);
  const cutoff = new Date(current);
  cutoff.setUTCDate(cutoff.getUTCDate() - 29);
  let changed = false;
  for (const day of Object.keys(state.days || {})) {
    const date = new Date(`${day}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date < cutoff || date > current) {
      delete state.days[day];
      changed = true;
    }
  }
  return changed;
}

export async function recordPrivacyMetric(home, event, harnessId, { inventoryCount = null, now = new Date() } = {}) {
  if (!ALLOWED_EVENTS.has(event)) return false;
  return withStateLock(home, async () => {
    const state = await readState(home);
    const day = dayKey(now);
    const pruned = pruneDays(state, day);
    if (!publicStatus(state).enabled) {
      if (pruned) await saveState(home, state);
      return false;
    }
    const harness = ALLOWED_HARNESSES.has(harnessId) ? harnessId : "unknown";
    state.days[day] ||= { events: {}, harnesses: {}, inventoryBucket: null };
    state.days[day].events[event] = (state.days[day].events[event] || 0) + 1;
    state.days[day].harnesses[harness] = (state.days[day].harnesses[harness] || 0) + 1;
    if (inventoryCount !== null) state.days[day].inventoryBucket = coarseBucket(inventoryCount);
    await saveState(home, state);
    return true;
  });
}

export function buildSharePreview(state, day = dayKey()) {
  const bucket = state.days?.[day] || { events: {}, harnesses: {}, inventoryBucket: null };
  const secret = state.secret || "local-preview-without-secret";
  return {
    schema: "cco-privacy-metrics-v1",
    day,
    dailyId: createHmac("sha256", secret).update(day).digest("hex").slice(0, 20),
    events: { ...bucket.events },
    harnesses: { ...bucket.harnesses },
    inventoryBucket: bucket.inventoryBucket,
  };
}

export function buildMonthlyActiveSignal(state, version, harnessId, now = new Date()) {
  if (!state.secret) throw new Error("Missing metrics secret");
  const month = monthKey(now);
  const harness = ALLOWED_HARNESSES.has(harnessId) ? harnessId : "unknown";
  return {
    schema: "cco-mau-v1",
    month,
    monthlyId: createHmac("sha256", state.secret).update(`mau:${month}`).digest("hex").slice(0, 32),
    version,
    harness,
  };
}

/**
 * Submit the current month's opt-in activity signal without exposing local
 * event details. Failures are non-fatal and retried after 24 hours.
 */
export async function submitMonthlyActiveSignal(home, version, harnessId, {
  endpoint = process.env.CCO_METRICS_ENDPOINT || DEFAULT_METRICS_ENDPOINT,
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  return withStateLock(home, async () => {
    const state = await readState(home);
    const pruned = pruneDays(state, dayKey(now));
    if (!publicStatus(state).enabled) {
      if (pruned) await saveState(home, state);
      return { sent: false, reason: "disabled" };
    }

    const month = monthKey(now);
    if (state.lastSubmittedMonth === month) return { sent: false, reason: "already-submitted", month };

    const lastAttempt = state.lastAttemptAt ? Date.parse(state.lastAttemptAt) : NaN;
    if (Number.isFinite(lastAttempt) && now.getTime() - lastAttempt < RETRY_AFTER_MS) {
      return { sent: false, reason: "retry-later", month };
    }

    state.secret ||= randomBytes(32).toString("hex");
    state.lastAttemptAt = now.toISOString();
    await saveState(home, state);

    const payload = buildMonthlyActiveSignal(state, version, harnessId, now);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) return { sent: false, reason: "server-rejected", month };
      state.lastSubmittedMonth = month;
      await saveState(home, state);
      return { sent: true, month };
    } catch {
      return { sent: false, reason: "network-error", month };
    } finally {
      clearTimeout(timeout);
    }
  });
}
