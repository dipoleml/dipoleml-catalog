const ALLOWED_HARNESSES = new Set(["claude", "codex", "opencode", "dsh", "unknown"]);
const MAX_BODY_BYTES = 1024;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const ID_RE = /^[a-f0-9]{32}$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function validPayload(value) {
  return value
    && value.schema === "cco-mau-v1"
    && MONTH_RE.test(value.month)
    && value.month === currentMonth()
    && ID_RE.test(value.monthlyId)
    && VERSION_RE.test(value.version)
    && ALLOWED_HARNESSES.has(value.harness)
    && Object.keys(value).every(key => ["schema", "month", "monthlyId", "version", "harness"].includes(key));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return response({ ok: true, service: "cco-metrics", schema: "cco-mau-v1" });
    }

    if (request.method !== "POST" || url.pathname !== "/v1/mau") {
      return response({ ok: false, error: "Not found" }, 404);
    }

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return response({ ok: false, error: "Expected application/json" }, 415);
    }

    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      return response({ ok: false, error: "Request too large" }, 413);
    }

    let raw;
    try {
      raw = await request.text();
    } catch {
      return response({ ok: false, error: "Could not read request" }, 400);
    }
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return response({ ok: false, error: "Request too large" }, 413);
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return response({ ok: false, error: "Invalid JSON" }, 400);
    }
    if (!validPayload(payload)) {
      return response({ ok: false, error: "Invalid monthly activity signal" }, 400);
    }

    const result = await env.METRICS_DB.prepare(
      `INSERT OR IGNORE INTO monthly_active_users
        (month, monthly_id, app_version, harness, first_seen)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(
      payload.month,
      payload.monthlyId,
      payload.version,
      payload.harness,
      new Date().toISOString(),
    ).run();

    return response({ ok: true, counted: result.meta.changes === 1 });
  },
};
