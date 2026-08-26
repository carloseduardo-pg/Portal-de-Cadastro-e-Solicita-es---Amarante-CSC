import {
  buildReport,
  loadConfig,
  loginAndGetCookie,
  printReport,
  runPool,
  timedFetch,
  type ScenarioReport,
  type StressConfig,
} from './helpers';

/**
 * Authenticated read storm against Amarante list endpoints.
 */
async function scenarioReadStorm(
  config: StressConfig,
  cookie: string,
): Promise<ScenarioReport> {
  const paths = [
    '/requests/kanban',
    '/products/base',
    '/catalog/families',
    '/users',
    '/auth/me',
  ];
  const { results, elapsedMs } = await runPool(
    { requests: config.requests, durationMs: config.durationMs },
    config.concurrency,
    async (i) => {
      const path = paths[i % paths.length];
      const qs = path.includes('?') ? '' : '?page=1&pageSize=20';
      return timedFetch(`${config.baseUrl}${path}${qs}`, {
        headers: { Cookie: cookie },
      });
    },
  );
  return buildReport('read-storm', results, elapsedMs, config);
}

/**
 * Heavier read mix: kanban + queue + dashboard.
 */
async function scenarioReadHeavy(
  config: StressConfig,
  cookie: string,
): Promise<ScenarioReport> {
  const paths = [
    '/requests/kanban',
    '/requests/queue',
    '/dashboard/summary',
    '/dashboard/products',
    '/notifications/count',
  ];
  const { results, elapsedMs } = await runPool(
    { requests: config.requests, durationMs: config.durationMs },
    config.concurrency,
    async (i) => {
      const path = paths[i % paths.length];
      return timedFetch(`${config.baseUrl}${path}`, {
        headers: { Cookie: cookie },
      });
    },
  );
  return buildReport('read-heavy', results, elapsedMs, config);
}

/**
 * Floods POST /auth/login to measure auth throughput and throttling behavior.
 */
async function scenarioLoginFlood(config: StressConfig): Promise<ScenarioReport> {
  const { results, elapsedMs } = await runPool(
    { requests: config.requests, durationMs: config.durationMs },
    config.concurrency,
    async () =>
      timedFetch(`${config.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: config.email,
          password: config.password,
        }),
      }),
  );
  return buildReport('login-flood', results, elapsedMs, {
    ...config,
    maxP95Ms: Math.max(config.maxP95Ms, 3000),
  });
}

/**
 * Mixed workload: mostly reads + occasional /auth/me.
 */
async function scenarioMixed(
  config: StressConfig,
  cookie: string,
): Promise<ScenarioReport> {
  const { results, elapsedMs } = await runPool(
    { requests: config.requests, durationMs: config.durationMs },
    config.concurrency,
    async (i) => {
      const roll = i % 10;
      if (roll <= 2) {
        return timedFetch(`${config.baseUrl}/auth/me`, {
          headers: { Cookie: cookie },
        });
      }
      const path = ['/requests/kanban', '/products/base', '/catalog/families'][
        i % 3
      ];
      const qs = path === '/requests/kanban' ? '' : '?page=1&pageSize=10';
      return timedFetch(`${config.baseUrl}${path}${qs}`, {
        headers: { Cookie: cookie },
      });
    },
  );
  return buildReport('mixed-workload', results, elapsedMs, config);
}

/**
 * Entry point: runs Amarante stress scenarios and exits non-zero on soft failures.
 */
async function main() {
  const profile = process.argv[2] ?? 'all';
  const config = loadConfig(
    profile === 'smoke'
      ? { concurrency: 5, requests: 30, maxP95Ms: 3000, maxErrorRate: 0.1 }
      : profile === 'heavy'
        ? { concurrency: 50, requests: 1000, maxP95Ms: 3000, maxErrorRate: 0.1 }
        : {},
  );

  console.log('Portal Amarante stress tests');
  console.log(
    `baseUrl=${config.baseUrl} concurrency=${config.concurrency} requests=${config.requests} profile=${profile}`,
  );

  const health = await timedFetch(`${config.baseUrl}/health`);
  if (health.status === 0) {
    console.error(
      `API inacessível em ${config.baseUrl}. Suba o backend (npm run dev:api) antes.`,
    );
    process.exit(1);
  }

  const cookie = await loginAndGetCookie(config);
  const reports: ScenarioReport[] = [];

  if (profile === 'read' || profile === 'all' || profile === 'smoke' || profile === 'heavy') {
    reports.push(await scenarioReadStorm(config, cookie));
  }
  if (profile === 'requests' || profile === 'all' || profile === 'heavy') {
    reports.push(await scenarioReadHeavy(config, cookie));
  }
  if (profile === 'mixed' || profile === 'all' || profile === 'heavy') {
    reports.push(await scenarioMixed(config, cookie));
  }
  if (profile === 'login' || profile === 'all' || profile === 'heavy') {
    if (process.env.STRESS_SKIP_LOGIN_FLOOD === '1') {
      console.log('Pulando login-flood (STRESS_SKIP_LOGIN_FLOOD=1).');
    } else {
      reports.push(await scenarioLoginFlood(config));
    }
  }

  for (const r of reports) printReport(r);

  const failed = reports.filter((r) => !r.passed);
  console.log(
    `\nResumo: ${reports.length - failed.length}/${reports.length} cenários passaram`,
  );
  process.exit(failed.length ? 1 : 0);
}

void main();
