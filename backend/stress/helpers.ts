/**
 * Shared types and helpers for Amarante API stress tests.
 */

export type StressConfig = {
  baseUrl: string;
  email: string;
  password: string;
  /** Concurrent workers (virtual users). */
  concurrency: number;
  /** Total requests per scenario (ignored when durationMs is set). */
  requests: number;
  /** Optional timed run in milliseconds. */
  durationMs?: number;
  /** Soft fail threshold: max error rate (0–1). */
  maxErrorRate: number;
  /** Soft fail threshold: p95 latency in ms. */
  maxP95Ms: number;
};

export type RequestResult = {
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
};

export type ScenarioReport = {
  name: string;
  total: number;
  ok: number;
  failed: number;
  throttled: number;
  errorRate: number;
  rps: number;
  latency: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  statusCodes: Record<string, number>;
  passed: boolean;
  failures: string[];
};
/**
 * Loads stress config from environment with safe defaults for local runs.
 */
export function loadConfig(overrides: Partial<StressConfig> = {}): StressConfig {
  return {
    baseUrl: process.env.STRESS_BASE_URL ?? 'http://localhost:3000/api',
    email: process.env.STRESS_EMAIL ?? 'admin@amarante.local',
    password: process.env.STRESS_PASSWORD ?? 'amarante123',
    concurrency: Number(process.env.STRESS_CONCURRENCY ?? 20),
    requests: Number(process.env.STRESS_REQUESTS ?? 200),
    durationMs: process.env.STRESS_DURATION_MS
      ? Number(process.env.STRESS_DURATION_MS)
      : undefined,
    maxErrorRate: Number(process.env.STRESS_MAX_ERROR_RATE ?? 0.05),
    maxP95Ms: Number(process.env.STRESS_MAX_P95_MS ?? 1500),
    ...overrides,
  };
}

/**
 * Extracts Set-Cookie header values into a Cookie request header string.
 */
export function cookiesFromResponse(res: Response): string {
  const anyHeaders = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies =
    typeof anyHeaders.getSetCookie === 'function'
      ? anyHeaders.getSetCookie()
      : [];
  if (!setCookies.length) {
    const single = res.headers.get('set-cookie');
    if (!single) return '';
    return single.split(',').map((c) => c.split(';')[0].trim()).join('; ');
  }
  return setCookies.map((c) => c.split(';')[0].trim()).join('; ');
}

/**
 * Sleeps for the given milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Authenticates against Amarante API and returns Cookie header for subsequent calls.
 * Retries on HTTP 429 (ThrottlerGuard) until the rate-limit window resets.
 */
export async function loginAndGetCookie(config: StressConfig): Promise<string> {
  const maxAttempts = Number(process.env.STRESS_LOGIN_RETRIES ?? 8);
  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${config.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: config.email,
        password: config.password,
      }),
    });

    if (res.ok) {
      const cookie = cookiesFromResponse(res);
      if (!cookie.includes('access_token')) {
        throw new Error('Login OK, mas cookie access_token ausente');
      }
      if (attempt > 1) {
        console.log(`Login OK após ${attempt} tentativa(s) (rate limit liberado).`);
      }
      return cookie;
    }

    const body = await res.text();
    lastError = `Login falhou (${res.status}): ${body}`;

    if (res.status !== 429 || attempt === maxAttempts) {
      break;
    }

    // Login tem throttle estrito (10/min). Após flood, aguarda a janela.
    const waitMs = Math.min(65_000, 5_000 * attempt);
    console.warn(
      `Rate limit no login (429). Aguardando ${(waitMs / 1000).toFixed(0)}s antes de tentar de novo (${attempt}/${maxAttempts})...`,
    );
    await sleep(waitMs);
  }

  throw new Error(
    `${lastError}\nDica: o endpoint /auth/login limita a 10 req/min. Espere ~1 min após um flood ou rode: STRESS_SKIP_LOGIN_FLOOD=1 npm run test:stress:heavy`,
  );
}

/**
 * Runs an async request function N times with limited concurrency and collects metrics.
 */
export async function runPool(
  totalOrDuration: { requests?: number; durationMs?: number },
  concurrency: number,
  worker: (index: number) => Promise<RequestResult>,
): Promise<{ results: RequestResult[]; elapsedMs: number }> {
  const results: RequestResult[] = [];
  let nextIndex = 0;
  const started = Date.now();
  const deadline = totalOrDuration.durationMs
    ? started + totalOrDuration.durationMs
    : null;
  const maxRequests = totalOrDuration.requests ?? Number.POSITIVE_INFINITY;

  async function runWorker() {
    while (true) {
      if (deadline && Date.now() >= deadline) break;
      const index = nextIndex++;
      if (index >= maxRequests) break;
      results.push(await worker(index));
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => runWorker()),
  );

  return { results, elapsedMs: Date.now() - started };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1,
  );
  return sorted[Math.max(0, idx)];
}

/**
 * Builds a scenario report and applies soft pass/fail thresholds.
 * HTTP 429 (ThrottlerGuard) counts as handled overload, not application failure.
 */
export function buildReport(
  name: string,
  results: RequestResult[],
  elapsedMs: number,
  config: StressConfig,
): ScenarioReport {
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const throttled = results.filter((r) => r.status === 429).length;
  const appFailures = results.filter((r) => !r.ok && r.status !== 429).length;
  const ok = results.filter((r) => r.ok || r.status === 429).length;
  const errorRate = results.length ? appFailures / results.length : 1;
  const statusCodes: Record<string, number> = {};
  for (const r of results) {
    const key = String(r.status || 'ERR');
    statusCodes[key] = (statusCodes[key] ?? 0) + 1;
  }
  const avg =
    latencies.reduce((sum, n) => sum + n, 0) / (latencies.length || 1);
  const p95 = percentile(latencies, 95);
  const failures: string[] = [];
  if (errorRate > config.maxErrorRate) {
    failures.push(
      `errorRate ${(errorRate * 100).toFixed(2)}% > ${(config.maxErrorRate * 100).toFixed(2)}% (excluindo 429)`,
    );
  }
  if (p95 > config.maxP95Ms) {
    failures.push(`p95 ${p95.toFixed(0)}ms > ${config.maxP95Ms}ms`);
  }
  return {
    name,
    total: results.length,
    ok,
    failed: appFailures,
    throttled,
    errorRate,
    rps: elapsedMs > 0 ? (results.length / elapsedMs) * 1000 : 0,
    latency: {
      min: latencies[0] ?? 0,
      max: latencies[latencies.length - 1] ?? 0,
      avg,
      p50: percentile(latencies, 50),
      p95,
      p99: percentile(latencies, 99),
    },
    statusCodes,
    passed: failures.length === 0 && results.length > 0,
    failures,
  };
}

/**
 * Prints a human-readable scenario summary to stdout.
 */
export function printReport(report: ScenarioReport): void {
  const mark = report.passed ? 'PASS' : 'FAIL';
  console.log(`\n[${mark}] ${report.name}`);
  console.log(
    `  total=${report.total} ok=${report.ok} failed=${report.failed} throttled(429)=${report.throttled} errorRate=${(report.errorRate * 100).toFixed(2)}% rps=${report.rps.toFixed(1)}`,
  );
  console.log(
    `  latency ms: min=${report.latency.min.toFixed(0)} avg=${report.latency.avg.toFixed(0)} p50=${report.latency.p50.toFixed(0)} p95=${report.latency.p95.toFixed(0)} p99=${report.latency.p99.toFixed(0)} max=${report.latency.max.toFixed(0)}`,
  );
  console.log(`  status: ${JSON.stringify(report.statusCodes)}`);
  if (report.failures.length) {
    for (const f of report.failures) console.log(`  ! ${f}`);
  }
}

/**
 * Timed fetch wrapper returning RequestResult.
 */
export async function timedFetch(
  url: string,
  init?: RequestInit,
  okStatuses: number[] = [200, 201],
): Promise<RequestResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const latencyMs = performance.now() - start;
    return {
      ok: okStatuses.includes(res.status),
      status: res.status,
      latencyMs,
      error: okStatuses.includes(res.status) ? undefined : await res.text(),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latencyMs: performance.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
