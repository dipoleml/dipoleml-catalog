"use strict";

const fs = require("node:fs");

const EVENT_TYPES = ["add", "update", "delete", "verify", "token", "reveal"];

let ensuredLog = false;

/**
 * 追加一条使用事件。字段：
 *   ts ISO 时间 | type 事件类型 | credential 凭据名 | system 系统名
 *   purpose 用途（token/reveal 必填） | ok 是否成功 | latencyMs | message | cached
 */
function appendEvent(config, event) {
  const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, event)) + "\n";
  if (!ensuredLog) {
    const existed = fs.existsSync(config.usagePath);
    fs.appendFileSync(config.usagePath, line);
    if (!existed) {
      try {
        fs.chmodSync(config.usagePath, 0o600);
      } catch {
        /* 尽力而为 */
      }
    }
    ensuredLog = true;
  } else {
    fs.appendFileSync(config.usagePath, line);
  }
}

function readEvents(config, { sinceDays = null, credential = null, type = null } = {}) {
  if (!fs.existsSync(config.usagePath)) return [];
  const cutoff = sinceDays && Number(sinceDays) > 0 ? Date.now() - Number(sinceDays) * 86400000 : null;
  const out = [];
  for (const line of fs.readFileSync(config.usagePath, "utf8").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    let ev;
    try {
      ev = JSON.parse(s);
    } catch {
      continue; // 跳过损坏行
    }
    if (cutoff && Date.parse(ev.ts) < cutoff) continue;
    if (credential && ev.credential !== credential) continue;
    if (type && ev.type !== type) continue;
    out.push(ev);
  }
  return out;
}

function localDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function aggregate(events) {
  const totals = { calls: 0, ok: 0, failed: 0, byType: {} };
  const byCred = new Map();
  const byPurpose = new Map();
  const byDay = new Map();
  const bySession = new Map();
  const failures = [];

  for (const ev of events) {
    totals.calls++;
    if (ev.ok) totals.ok++;
    else totals.failed++;
    totals.byType[ev.type] = (totals.byType[ev.type] || 0) + 1;

    const ck = ev.credential || "(unknown)";
    if (!byCred.has(ck)) {
      byCred.set(ck, {
        credential: ck,
        system: ev.system || "",
        calls: 0,
        ok: 0,
        failed: 0,
        tokensIssued: 0,
        tokenCacheHits: 0,
        purposes: {},
        lastUsed: null,
      });
    }
    const c = byCred.get(ck);
    c.calls++;
    if (ev.ok) c.ok++;
    else c.failed++;
    if (ev.type === "token") {
      c.tokensIssued++;
      if (ev.cached) c.tokenCacheHits++;
    }
    if (ev.purpose) c.purposes[ev.purpose] = (c.purposes[ev.purpose] || 0) + 1;
    if (!c.lastUsed || ev.ts > c.lastUsed) c.lastUsed = ev.ts;

    if (ev.purpose) {
      if (!byPurpose.has(ev.purpose)) byPurpose.set(ev.purpose, { purpose: ev.purpose, calls: 0, credentials: new Set() });
      const p = byPurpose.get(ev.purpose);
      p.calls++;
      p.credentials.add(ck);
    }

    const day = localDate(ev.ts);
    if (!byDay.has(day)) byDay.set(day, { date: day, calls: 0, token: 0, verify: 0, reveal: 0, manage: 0 });
    const d = byDay.get(day);
    d.calls++;
    if (ev.type === "token") d.token++;
    else if (ev.type === "verify") d.verify++;
    else if (ev.type === "reveal") d.reveal++;
    else d.manage++;

    const sess = ev.session || "(旧记录)";
    if (!bySession.has(sess)) {
      bySession.set(sess, {
        session: sess,
        calls: 0,
        ok: 0,
        failed: 0,
        tokensIssued: 0,
        credentials: new Set(),
        purposes: {},
        firstUsed: ev.ts,
        lastUsed: ev.ts,
      });
    }
    const s = bySession.get(sess);
    s.calls++;
    if (ev.ok) s.ok++;
    else s.failed++;
    if (ev.type === "token") s.tokensIssued++;
    if (ev.credential) s.credentials.add(ev.credential);
    if (ev.purpose) s.purposes[ev.purpose] = (s.purposes[ev.purpose] || 0) + 1;
    if (ev.ts < s.firstUsed) s.firstUsed = ev.ts;
    if (ev.ts > s.lastUsed) s.lastUsed = ev.ts;

    if (!ev.ok && (ev.type === "token" || ev.type === "verify")) {
      failures.push({ ts: ev.ts, credential: ck, type: ev.type, message: ev.message || "" });
    }
  }

  return {
    totals,
    credentials: [...byCred.values()].sort((a, b) => b.calls - a.calls),
    purposes: [...byPurpose.values()]
      .map((p) => ({ purpose: p.purpose, calls: p.calls, credentials: [...p.credentials] }))
      .sort((a, b) => b.calls - a.calls),
    sessions: [...bySession.values()]
      .map((s) => ({
        session: s.session,
        calls: s.calls,
        ok: s.ok,
        failed: s.failed,
        tokensIssued: s.tokensIssued,
        credentials: [...s.credentials],
        purposes: s.purposes,
        firstUsed: s.firstUsed,
        lastUsed: s.lastUsed,
      }))
      .sort((a, b) => (a.lastUsed < b.lastUsed ? 1 : -1)),
    daily: [...byDay.values()].sort((a, b) => (a.date < b.date ? -1 : 1)),
    recentFailures: failures.slice(-8).reverse(),
  };
}

function formatStats(stats, { sinceDays, topPurposes = 10 } = {}) {
  const lines = [];
  const scope = sinceDays && Number(sinceDays) > 0 ? `最近 ${sinceDays} 天` : "全部历史";
  lines.push(`=== mkeys AI 使用统计（${scope}）===`);
  lines.push(
    `总调用: ${stats.totals.calls}  成功: ${stats.totals.ok}  失败: ${stats.totals.failed}  ` +
      `(令牌签发 ${stats.totals.byType.token || 0}，登录验证 ${stats.totals.byType.verify || 0}，` +
      `原始密钥读取 ${stats.totals.byType.reveal || 0}，管理操作 ` +
      `${(stats.totals.byType.add || 0) + (stats.totals.update || 0) + (stats.totals.byType.delete || 0)})`
  );

  if (stats.credentials.length === 0) {
    lines.push("暂无使用记录。");
    return lines.join("\n");
  }

  lines.push("");
  lines.push("-- 按凭据 --");
  for (const c of stats.credentials) {
    const last = c.lastUsed ? c.lastUsed.replace("T", " ").slice(0, 19) : "-";
    lines.push(
      `${c.credential}${c.system ? " (" + c.system + ")" : ""}: ${c.calls} 次（成功 ${c.ok}/失败 ${c.failed}），` +
        `令牌 ${c.tokensIssued} 次${c.tokenCacheHits ? `（缓存命中 ${c.tokenCacheHits}）` : ""}，最近使用 ${last}`
    );
    const purposes = Object.entries(c.purposes).sort((a, b) => b[1] - a[1]);
    if (purposes.length) {
      lines.push(`    用途: ${purposes.map(([p, n]) => `${p} x${n}`).join("、")}`);
    }
  }

  lines.push("");
  lines.push("-- 按用途 --");
  if (stats.purposes.length === 0) {
    lines.push("（无用途记录；get_token 调用时必须提供 purpose）");
  } else {
    for (const p of stats.purposes.slice(0, topPurposes)) {
      lines.push(`${p.purpose}: ${p.calls} 次 [${p.credentials.join(", ")}]`);
    }
    if (stats.purposes.length > topPurposes) lines.push(`… 共 ${stats.purposes.length} 种用途`);
  }

  lines.push("");
  lines.push("-- 按会话 --");
  if (stats.sessions.length === 0) {
    lines.push("暂无会话记录。");
  } else {
    for (const s of stats.sessions.slice(0, 8)) {
      const first = s.firstUsed ? s.firstUsed.replace("T", " ").slice(5, 16) : "-";
      const last = s.lastUsed ? s.lastUsed.replace("T", " ").slice(5, 16) : "-";
      lines.push(
        `${s.session}: ${s.calls} 次（成功 ${s.ok}/失败 ${s.failed}，令牌 ${s.tokensIssued}）` +
          ` [${s.credentials.join(", ") || "无凭据"}] ${first} ~ ${last}`
      );
    }
    if (stats.sessions.length > 8) lines.push(`… 共 ${stats.sessions.length} 个会话/实例`);
  }

  if (stats.daily.length) {
    lines.push("");
    lines.push("-- 按天 --");
    for (const d of stats.daily) {
      lines.push(`${d.date}: 调用 ${d.calls}（令牌 ${d.token}、验证 ${d.verify}、读密钥 ${d.reveal}、管理 ${d.manage}）`);
    }
  }

  if (stats.recentFailures.length) {
    lines.push("");
    lines.push("-- 最近失败（安全信号，建议关注）--");
    for (const f of stats.recentFailures) {
      lines.push(`${f.ts.replace("T", " ").slice(0, 19)} ${f.credential} [${f.type}] ${f.message}`.trimEnd());
    }
  }
  return lines.join("\n");
}

module.exports = { appendEvent, readEvents, aggregate, formatStats, EVENT_TYPES };
