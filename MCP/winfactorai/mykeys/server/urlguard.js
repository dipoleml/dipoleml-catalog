"use strict";

/**
 * SSRF 防护：mkeys 服务端向 verify/token 端点发起请求前校验目标地址。
 * 默认仅允许公网 http/https 地址，拒绝 localhost、环回、私有、链路本地与保留地址
 * （含域名解析后落在这些网段的情况）。可信内网环境可用 MKEYS_ALLOW_PRIVATE_ENDPOINTS=true 放行。
 */

const dns = require("node:dns").promises;
const net = require("node:net");

function allowPrivate(env) {
  const v = String((env && env.MKEYS_ALLOW_PRIVATE_ENDPOINTS) || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function stripBracketsAndZone(host) {
  return host.replace(/^\[|\]$/g, "").split("%")[0].toLowerCase();
}

function isBlockedIPv4Parts(a, b) {
  if (a === 0 || a === 10 || a === 127) return true; // 本网络/内网/环回
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
  if (a === 169 && b === 254) return true; // 链路本地
  if (a === 172 && b >= 16 && b <= 31) return true; // 内网
  if (a === 192 && b === 168) return true; // 内网
  if (a === 192 && (b === 0 || b === 2)) return true; // 192.0.0/24、192.0.2/24(文档)
  if (a === 198 && (b === 18 || b === 19)) return true; // 基准测试
  if (a === 198 && b === 51) return true; // 198.51.100/24(文档)
  if (a === 203 && b === 0) return true; // 203.0.113/24(文档)
  if (a >= 224) return true; // 组播与保留
  return false;
}

function isBlockedIPv4(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return isBlockedIPv4Parts(p[0], p[1]);
}

function parseV6Group(g) {
  if (g.includes(".")) {
    const p = g.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return [(p[0] << 8) | p[1], (p[2] << 8) | p[3]];
  }
  const n = parseInt(g || "0", 16);
  if (Number.isNaN(n) || n < 0 || n > 0xffff) return null;
  return [n];
}

function expandV6(ip) {
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const groups = [];
  for (const seg of halves[0] === "" ? [] : halves[0].split(":")) {
    const r = parseV6Group(seg);
    if (!r) return null;
    groups.push(...r);
  }
  const tail = [];
  if (halves.length === 2) {
    for (const seg of halves[1] === "" ? [] : halves[1].split(":")) {
      const r = parseV6Group(seg);
      if (!r) return null;
      tail.push(...r);
    }
  } else if (groups.length !== 8) {
    return null;
  }
  const fill = 8 - groups.length - tail.length;
  const all = [...groups, ...new Array(Math.max(fill, 0)).fill(0), ...tail];
  if (all.length !== 8) return null;
  let v = 0n;
  for (const g of all) v = (v << 16n) | BigInt(g);
  return v;
}

function isBlockedIPv6(ip) {
  const v = expandV6(ip);
  if (v === null) return true;
  const prefix = (bits) => v >> BigInt(128 - bits);
  const embeddedV4Blocked = () => {
    const x = Number(v & 0xffffffffn);
    return isBlockedIPv4Parts((x >>> 24) & 0xff, (x >>> 16) & 0xff);
  };
  if (v === 0n) return true; // ::
  if (v === 1n) return true; // ::1
  if (prefix(96) === 0xffffn) return embeddedV4Blocked(); // IPv4-mapped
  if (prefix(96) === 0x64ff9bn) return embeddedV4Blocked(); // NAT64 内嵌 IPv4
  if (prefix(16) === 0x2002n) {
    const x = Number((v >> 64n) & 0xffffffffn); // 6to4 内嵌 IPv4
    return isBlockedIPv4Parts((x >>> 24) & 0xff, (x >>> 16) & 0xff);
  }
  if (prefix(32) === 0x20010db8n) return true; // 文档地址
  if (prefix(7) === 0x7en) return true; // fc00::/7 ULA
  if (prefix(10) === 0x3fan) return true; // fe80::/10 链路本地
  if (prefix(8) === 0xffn) return true; // 组播
  return false;
}

function isBlockedHostname(host) {
  return host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local");
}

function isBlockedIpLiteral(host) {
  if (net.isIPv4(host)) return isBlockedIPv4(host);
  if (net.isIPv6(host)) return isBlockedIPv6(host);
  return false;
}

/**
 * 同步校验：协议必须 http/https；主机名/字面量 IP 直接命中黑名单即拒绝（不做 DNS）。
 * 返回解析后的 URL 对象。
 */
function checkUrlSync(urlStr, what = "URL", env = undefined) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    throw new Error(`${what} 无效: ${urlStr}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`${what} 只支持 http/https: ${urlStr}`);
  }
  if (allowPrivate(env)) return u;
  const host = stripBracketsAndZone(u.hostname);
  if (isBlockedHostname(host) || isBlockedIpLiteral(host)) {
    throw new Error(`${what} 指向环回/私有/保留地址（${host}），已拒绝；可信内网目标需开启 allowPrivateEndpoints`);
  }
  return u;
}

/**
 * 请求前完整校验：在同步检查之上，对域名做 DNS 解析并校验全部解析结果。
 */
async function assertPublicHttpUrl(urlStr, env, what = "URL") {
  const u = checkUrlSync(urlStr, what, env);
  if (allowPrivate(env)) return u;
  const host = stripBracketsAndZone(u.hostname);
  if (net.isIP(host)) return u;
  let addrs;
  try {
    addrs = await dns.lookup(host, { all: true });
  } catch {
    throw new Error(`${what} 的域名 ${host} 解析失败`);
  }
  for (const { address } of addrs) {
    if (isBlockedIpLiteral(address)) {
      throw new Error(`${what} 的域名 ${host} 解析到环回/私有/保留地址 ${address}，已拒绝`);
    }
  }
  return u;
}

module.exports = { checkUrlSync, assertPublicHttpUrl, allowPrivate };
