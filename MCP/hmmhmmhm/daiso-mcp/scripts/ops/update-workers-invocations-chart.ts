import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChart } from './workers-chart-renderer.ts';
import {
  buildReadmeSection,
  calculateSummary,
  formatKstDate,
  formatKstDateTime,
  formatNumber,
  parseKstDateText,
} from './workers-chart-helpers.ts';
import { fetchDailyWorkerInvocations } from './workers-chart-data.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const README_PATH = path.join(REPO_ROOT, 'scripts', 'ops', 'README.md');
const OUTPUT_DIR = path.join(REPO_ROOT, 'assets', 'analytics');
const CHART_PATH = path.join(OUTPUT_DIR, 'workers-invocations.png');
const DATA_PATH = path.join(OUTPUT_DIR, 'workers-invocations.json');

const README_START = '<!-- WORKERS_INVOCATIONS_CHART:START -->';
const README_END = '<!-- WORKERS_INVOCATIONS_CHART:END -->';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const API_EMAIL = process.env.CLOUDFLARE_EMAIL;
const GLOBAL_API_KEY = process.env.CLOUDFLARE_GLOBAL_API_KEY;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const SCRIPT_NAME = process.env.CF_WORKER_SCRIPT_NAME ?? 'daiso-mcp';
const CHART_START_DATE = process.env.WORKERS_CHART_START_DATE?.trim() || undefined;
const CHART_DAYS = Number.parseInt(process.env.WORKERS_CHART_DAYS ?? '30', 10);
const CHART_CONCURRENCY = Number.parseInt(process.env.WORKERS_CHART_CONCURRENCY ?? '4', 10);
const INPUT_JSON_PATH = process.env.WORKERS_CHART_INPUT_JSON;
const ROOT_REQUESTS_RETENTION_DAYS = Number.parseInt(
  process.env.WORKERS_CHART_ROOT_REQUESTS_RETENTION_DAYS ?? '7',
  10,
);
const ROOT_REDIRECT_START = process.env.WORKERS_CHART_ROOT_REDIRECT_START
  ? new Date(process.env.WORKERS_CHART_ROOT_REDIRECT_START)
  : undefined;
const ROOT_REDIRECT_HOST = process.env.WORKERS_CHART_ROOT_REDIRECT_HOST ?? 'mcp.aka.page';
const ROOT_REDIRECT_PATH = process.env.WORKERS_CHART_ROOT_REDIRECT_PATH ?? '/';

if (!INPUT_JSON_PATH && (!ACCOUNT_ID || (!API_TOKEN && !GLOBAL_API_KEY))) {
  throw new Error(
    'CLOUDFLARE_ACCOUNT_ID와 CLOUDFLARE_API_TOKEN 또는 CLOUDFLARE_GLOBAL_API_KEY 환경 변수가 필요합니다. 기존 JSON으로 다시 그릴 때는 WORKERS_CHART_INPUT_JSON을 지정하세요.',
  );
}

if (CHART_START_DATE && !/^\d{4}-\d{2}-\d{2}$/.test(CHART_START_DATE)) {
  throw new Error('WORKERS_CHART_START_DATE 형식은 YYYY-MM-DD 이어야 합니다.');
}

if (!Number.isFinite(CHART_DAYS) || CHART_DAYS < 1) {
  throw new Error('WORKERS_CHART_DAYS는 1 이상의 숫자여야 합니다.');
}

if (!Number.isFinite(ROOT_REQUESTS_RETENTION_DAYS) || ROOT_REQUESTS_RETENTION_DAYS < 1) {
  throw new Error('WORKERS_CHART_ROOT_REQUESTS_RETENTION_DAYS는 1 이상의 숫자여야 합니다.');
}

if (ROOT_REDIRECT_START && Number.isNaN(ROOT_REDIRECT_START.getTime())) {
  throw new Error('WORKERS_CHART_ROOT_REDIRECT_START 형식은 ISO datetime 이어야 합니다.');
}

function calculateStartDateFromDays(endDateText, days) {
  const endDate = parseKstDateText(endDateText);
  return formatKstDate(new Date(endDate.getTime() - (days - 1) * 86400000));
}

function calculateRetentionStart(now, days) {
  return new Date(now.getTime() - days * 86400000);
}

async function readInputPayload(inputPath) {
  const resolvedPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(REPO_ROOT, inputPath);
  const payload = JSON.parse(await fs.readFile(resolvedPath, 'utf8'));
  if (!Array.isArray(payload.points)) {
    throw new Error(`points 배열이 없는 JSON입니다: ${resolvedPath}`);
  }
  return payload;
}

async function updateReadme(section, readmePath = README_PATH) {
  const readme = (await fs.readFile(readmePath, 'utf8')).replaceAll('\r\n', '\n');
  const pattern = new RegExp(`${README_START}[\\s\\S]*?${README_END}`, 'm');
  if (pattern.test(readme)) {
    await fs.writeFile(readmePath, readme.replace(pattern, section), 'utf8');
    return;
  }
  const next = `${readme.trimEnd()}\n\n${section}\n`;

  await fs.writeFile(readmePath, next, 'utf8');
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const renderedAt = new Date();
  let points: Array<{ date: string; requests: number }>;
  let scriptName = SCRIPT_NAME;
  let startDate = CHART_START_DATE;
  let endDate: string;
  let updatedAt = renderedAt.toISOString();
  let inputPayload: Awaited<ReturnType<typeof readInputPayload>>;

  if (INPUT_JSON_PATH) {
    inputPayload = await readInputPayload(INPUT_JSON_PATH);
    points = inputPayload.points;
    scriptName = inputPayload.scriptName ?? scriptName;
    startDate = inputPayload.startDate ?? points[0]?.date ?? startDate;
    endDate = inputPayload.endDate ?? points[points.length - 1]?.date ?? startDate;
    updatedAt = inputPayload.updatedAt ?? updatedAt;
  } else {
    const todayKstDate = formatKstDate(renderedAt);
    const endDateExclusive = parseKstDateText(todayKstDate);
    endDate = formatKstDate(new Date(endDateExclusive.getTime() - 86400000));
    startDate = startDate ?? calculateStartDateFromDays(endDate, CHART_DAYS);
    const rootRequestsRetentionStart = calculateRetentionStart(
      renderedAt,
      ROOT_REQUESTS_RETENTION_DAYS,
    );
    const previousPayload = await readInputPayload(DATA_PATH).catch((error) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });

    points = await fetchDailyWorkerInvocations({
      accountId: ACCOUNT_ID,
      apiToken: API_TOKEN,
      apiEmail: API_EMAIL,
      globalApiKey: GLOBAL_API_KEY,
      scriptName,
      startDateText: startDate,
      endDateText: endDate,
      zoneId: ZONE_ID,
      rootRedirectHost: ROOT_REDIRECT_HOST,
      rootRedirectPath: ROOT_REDIRECT_PATH,
      rootRedirectStart: ROOT_REDIRECT_START,
      rootRequestsRetentionStart,
      previousPayload,
      concurrency:
        Number.isFinite(CHART_CONCURRENCY) && CHART_CONCURRENCY > 0 ? CHART_CONCURRENCY : 4,
    });
  }

  const summary = calculateSummary(points);
  const chartBuffer = await renderChart(points, summary, {
    startDate,
    endDate,
    updatedAtText: formatKstDateTime(new Date(updatedAt)),
  });
  await fs.writeFile(CHART_PATH, chartBuffer);
  const payload = {
    accountId: ACCOUNT_ID,
    scriptName,
    metric: ROOT_REDIRECT_START
      ? 'workersInvocationsAdaptive.requests + httpRequestsAdaptiveGroups.count'
      : 'workersInvocationsAdaptive.requests',
    aggregation: ROOT_REDIRECT_START ? 'script-level plus redirected root GET' : 'script-level',
    includedTraffic: ROOT_REDIRECT_START
      ? `Worker invocations for ${scriptName} plus redirected GET ${ROOT_REDIRECT_PATH} traffic on ${ROOT_REDIRECT_HOST}, retaining complete historical daily totals.`
      : 'All invocations for this Worker script are counted across routes and domains, including GET / on mcp.aka.page.',
    rootRedirect:
      ROOT_REDIRECT_START && ZONE_ID
        ? {
            zoneId: ZONE_ID,
            host: ROOT_REDIRECT_HOST,
            path: ROOT_REDIRECT_PATH,
            start: ROOT_REDIRECT_START.toISOString(),
            rootRequestsRetentionDays: ROOT_REQUESTS_RETENTION_DAYS,
          }
        : null,
    timezone: 'Asia/Seoul',
    coverageVersion: 1,
    // 오프라인 렌더링에서는 원본 지표와 완전성 정보를 그대로 유지합니다.
    ...(inputPayload
      ? {
          accountId: inputPayload.accountId,
          metric: inputPayload.metric,
          aggregation: inputPayload.aggregation,
          includedTraffic: inputPayload.includedTraffic,
          rootRedirect: inputPayload.rootRedirect,
          timezone: inputPayload.timezone,
          coverageVersion: inputPayload.coverageVersion,
        }
      : {}),
    days: points.length,
    startDate,
    endDate,
    updatedAt,
    renderedAt: renderedAt.toISOString(),
    ...summary,
    points,
  };
  await fs.writeFile(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const section = buildReadmeSection({
    scriptName,
    updatedAt: formatKstDateTime(new Date(updatedAt)),
    days: points.length,
    startDate,
    endDate,
    cacheKey: payload.renderedAt,
    includesRootRedirect: Boolean(payload.rootRedirect),
  });
  await updateReadme(section);
  const publicReadmePath = path.join(REPO_ROOT, 'README.md');
  const publicReadme = await fs.readFile(publicReadmePath, 'utf8');
  if (publicReadme.includes(README_START) && publicReadme.includes(README_END)) {
    // 상단의 중앙 정렬은 차트 앞에서 시작하고 예시 이미지 뒤에서 끝납니다.
    const publicSection = section
      .replace('<div align="center">\n\n', '')
      .replace('../../assets/analytics/', './assets/analytics/')
      .replace(README_END, `<div align="center">\n\n${README_END}`);
    await updateReadme(publicSection, publicReadmePath);
  }

  console.log(
    `[workers-chart] script=${scriptName} days=${points.length} total=${formatNumber(payload.total)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
