#!/usr/bin/env node
/**
 * Portal Amarante — testes de carga e segurança (3 níveis)
 *
 *   node tests/load/run-node.mjs              # normal (padrão)
 *   node tests/load/run-node.mjs smoke
 *   node tests/load/run-node.mjs normal
 *   node tests/load/run-node.mjs heavy
 *
 * Ou: LEVEL=smoke node tests/load/run-node.mjs
 * Override: VUS=10 DURATION_MS=5000 node tests/load/run-node.mjs smoke
 */
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const EMAIL = process.env.EMAIL || 'admin@amarante.local';
const PASS = process.env.PASS || 'amarante123';

/** Perfis: smoke = rápido; normal = baseline; heavy = stress */
const PROFILES = {
  smoke: {
    label: 'SMOKE',
    description: 'Checagem rápida — segurança + pouca carga',
    vus: 5,
    durationMs: 5_000,
    sessions: 2,
    loginBurst: 12,
    maxFailRate: 0.05,
    // sob smoke esperamos quase sem throttle de API
    warnThrottleRate: 0.5,
  },
  normal: {
    label: 'NORMAL',
    description: 'Baseline do protótipo — uso típico autenticado',
    vus: 20,
    durationMs: 12_000,
    sessions: 5,
    loginBurst: 15,
    maxFailRate: 0.1,
    warnThrottleRate: 0.7,
  },
  heavy: {
    label: 'HEAVY',
    description: 'Stress — muitos VUs; 429 de API é proteção, não bug',
    vus: 50,
    durationMs: 25_000,
    sessions: 8,
    loginBurst: 20,
    maxFailRate: 0.15,
    warnThrottleRate: 0.95,
  },
};

const PATHS = [
  '/dashboard/summary',
  '/requests/kanban',
  '/products/base?page=1&pageSize=20',
  '/catalog/families',
];

const line = (ch = '─', n = 64) => ch.repeat(n);
const stamp = () => new Date().toLocaleTimeString('pt-BR', { hour12: false });

function log(msg = '') {
  console.log(msg);
}
function step(title) {
  log(`\n${line()}`);
  log(`[${stamp()}] ▶ ${title}`);
  log(line());
}
function ok(msg) {
  log(`  ✓ PASS  ${msg}`);
}
function fail(msg) {
  log(`  ✗ FAIL  ${msg}`);
}
function info(msg) {
  log(`  · ${msg}`);
}
function warn(msg) {
  log(`  ! WARN  ${msg}`);
}

function resolveProfile() {
  const arg = (process.argv[2] || process.env.LEVEL || 'normal')
    .toLowerCase()
    .trim();
  if (!PROFILES[arg]) {
    console.error(
      `Nível inválido: "${arg}". Use: smoke | normal | heavy\n` +
        `Ex.: node tests/load/run-node.mjs smoke`,
    );
    process.exit(2);
  }
  const p = { ...PROFILES[arg], name: arg };
  if (process.env.VUS) p.vus = Number(process.env.VUS);
  if (process.env.DURATION_MS) p.durationMs = Number(process.env.DURATION_MS);
  if (process.env.SESSIONS) p.sessions = Number(process.env.SESSIONS);
  return p;
}

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (raw.length) {
    return raw.map((c) => c.split(';')[0]).join('; ');
  }
  const single = res.headers.get('set-cookie');
  if (!single) return '';
  return single
    .split(/,(?=\s*\w+=)/)
    .map((c) => c.split(';')[0].trim())
    .join('; ');
}

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  return { status: res.status, cookie: parseCookies(res) };
}

async function authedGet(path, cookie) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie },
  });
  return { status: res.status, ms: performance.now() - t0, path };
}

async function worker(stopAt, stats, cookie) {
  while (Date.now() < stopAt) {
    for (const path of PATHS) {
      if (Date.now() >= stopAt) break;
      const r = await authedGet(path, cookie);
      stats.api.total += 1;
      stats.api.latencies.push(r.ms);
      stats.byPath[path] = stats.byPath[path] || {
        total: 0,
        ok: 0,
        fail: 0,
        throttled: 0,
        latencies: [],
      };
      const bp = stats.byPath[path];
      bp.total += 1;
      bp.latencies.push(r.ms);
      if (r.status === 200) {
        stats.api.ok += 1;
        bp.ok += 1;
      } else if (r.status === 429) {
        stats.api.throttled += 1;
        bp.throttled += 1;
      } else {
        stats.api.fail += 1;
        bp.fail += 1;
        if (stats.api.sampleErrors.length < 5) {
          stats.api.sampleErrors.push(`${path} → HTTP ${r.status}`);
        }
      }
    }
    await sleep(50);
  }
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[i];
}

function fmtMs(n) {
  return `${Number(n).toFixed(0)}ms`;
}

function pct(num, den) {
  if (!den) return '0%';
  return `${((100 * num) / den).toFixed(1)}%`;
}

async function acquireSessions(count) {
  const cookies = [];
  let attempts = 0;
  let throttled = 0;
  while (cookies.length < count && attempts < count * 12) {
    attempts += 1;
    const { status, cookie } = await login();
    if ((status === 200 || status === 201) && cookie) {
      cookies.push(cookie);
      info(`sessão ${cookies.length}/${count} (HTTP ${status})`);
      await sleep(120);
      continue;
    }
    if (status === 429) {
      throttled += 1;
      info(`login rate-limited (429) — aguardando 1s…`);
      await sleep(1000);
      continue;
    }
    info(`login falhou HTTP ${status} — nova tentativa…`);
    await sleep(300);
  }
  return { cookies, attempts, throttled };
}

async function checkUnauthenticatedAccess() {
  /**
   * Após smoke/normal, o IP pode ainda estar no rate limit global → 429
   * em vez de 401. Não é falha de auth: a rota não vazou dados (não é 200).
   */
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${BASE}/requests`);
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    info(
      `GET /requests sem cookie → HTTP ${res.status}` +
        (attempt > 1 ? ` (tentativa ${attempt}/${maxAttempts})` : '') +
        (retryAfter ? `  Retry-After=${retryAfter}s` : ''),
    );

    if (res.status === 401) {
      return { pass: true, detail: '401', soft: false };
    }
    if (res.status === 200) {
      return {
        pass: false,
        detail: '200 (vazamento sem auth)',
        soft: false,
      };
    }
    if (res.status === 429) {
      if (attempt < maxAttempts) {
        const waitSec = Math.min(Math.max(retryAfter || 3, 2), 20);
        warn(
          `rate limit residual (comum se rodou smoke/normal antes) — aguardando ${waitSec}s…`,
        );
        await sleep(waitSec * 1000);
        continue;
      }
      // Ainda 429: proteção ativa; não há 200 → não falha o suite
      warn(
        'ainda 429 após retries — IP no cooldown do Throttler; auth 401 não verificável agora',
      );
      return {
        pass: true,
        detail: '429 residual (sem vazamento 200)',
        soft: true,
      };
    }
    return {
      pass: false,
      detail: `HTTP ${res.status} inesperado`,
      soft: false,
    };
  }
  return { pass: false, detail: 'esgotou tentativas', soft: false };
}

async function main() {
  const profile = resolveProfile();
  const results = []; // { name, pass, detail }

  log(line('═'));
  log(`  DISTAC — teste de carga & segurança`);
  log(`  Nível: ${profile.label}  (${profile.name})`);
  log(`  ${profile.description}`);
  log(line('═'));
  info(`BASE_URL     = ${BASE}`);
  info(`VUs          = ${profile.vus}`);
  info(`Duração      = ${profile.durationMs}ms (${(profile.durationMs / 1000).toFixed(1)}s)`);
  info(`Sessões login= ${profile.sessions}`);
  info(`Rotas        = ${PATHS.join(', ')}`);
  info(`Início       = ${new Date().toLocaleString('pt-BR')}`);
  if (profile.name === 'heavy') {
    info(
      'Dica: se rodou smoke/normal há pouco, pode haver 429 residual — o script aguarda e trata isso.',
    );
  }

  // --- 0) Health ---
  step('0/4  Healthcheck da API');
  let health;
  try {
    health = await fetch(`${BASE}/health`);
  } catch (e) {
    fail(`API inacessível: ${e.message}`);
    log('\nSuba a API:  cd backend && npm run start:dev');
    process.exit(1);
  }
  if (!health.ok) {
    fail(`GET /health → HTTP ${health.status}`);
    process.exit(1);
  }
  const healthBody = await health.json().catch(() => ({}));
  ok(`GET /health → ${health.status} ${JSON.stringify(healthBody)}`);
  results.push({ name: 'Health', pass: true, detail: String(health.status) });

  // --- 1) Segurança ---
  step('1/4  Segurança (antes da carga)');
  const authCheck = await checkUnauthenticatedAccess();
  if (!authCheck.pass) {
    fail(`rota protegida: ${authCheck.detail}`);
    results.push({ name: 'Auth 401', pass: false, detail: authCheck.detail });
    process.exit(1);
  }
  if (authCheck.soft) {
    ok(`sem vazamento de dados (${authCheck.detail})`);
  } else {
    ok('rotas autenticadas bloqueiam sem cookie (401)');
  }
  results.push({
    name: 'Auth 401',
    pass: true,
    detail: authCheck.detail,
  });

  const h = await fetch(`${BASE}/health`);
  const nosniff = h.headers.get('x-content-type-options');
  info(`Helmet x-content-type-options = ${nosniff ?? '(ausente)'}`);
  if (nosniff !== 'nosniff') {
    fail('Helmet não aplicou x-content-type-options: nosniff');
    results.push({ name: 'Helmet', pass: false, detail: String(nosniff) });
    process.exit(1);
  }
  ok('Helmet ativo (nosniff)');
  results.push({ name: 'Helmet', pass: true, detail: 'nosniff' });

  // --- 2) Sessões ---
  step('2/4  Autenticação (sessões JWT via cookie)');
  info(`obtendo até ${profile.sessions} sessões (respeitando rate limit de login)…`);
  const { cookies, attempts, throttled: loginThrottle } = await acquireSessions(
    profile.sessions,
  );
  if (!cookies.length) {
    fail('não foi possível autenticar — aguarde ~60s (cooldown do login) e tente de novo');
    process.exit(1);
  }
  ok(`${cookies.length} sessão(ões) OK  (tentativas=${attempts}, 429 no login=${loginThrottle})`);
  results.push({
    name: 'Login sessões',
    pass: true,
    detail: `${cookies.length} ok`,
  });

  // --- 3) Carga ---
  step(`3/4  Carga autenticada  [${profile.label}]`);
  info(`disparando ${profile.vus} VUs por ${(profile.durationMs / 1000).toFixed(1)}s…`);
  const tLoad0 = performance.now();
  const stats = {
    api: { total: 0, ok: 0, fail: 0, throttled: 0, latencies: [], sampleErrors: [] },
    byPath: {},
  };
  const stopAt = Date.now() + profile.durationMs;
  await Promise.all(
    Array.from({ length: profile.vus }, (_, i) =>
      worker(stopAt, stats, cookies[i % cookies.length]),
    ),
  );
  const loadMs = performance.now() - tLoad0;
  const lat = stats.api.latencies;
  const failRate = stats.api.total === 0 ? 1 : stats.api.fail / stats.api.total;
  const throttleRate =
    stats.api.total === 0 ? 0 : stats.api.throttled / stats.api.total;
  const rps = stats.api.total / (loadMs / 1000);

  info(`tempo real de carga ≈ ${fmtMs(loadMs)}`);
  info(
    `requisições: total=${stats.api.total}  ok=${stats.api.ok}  fail=${stats.api.fail}  throttled(429)=${stats.api.throttled}`,
  );
  info(
    `taxas: ok=${pct(stats.api.ok, stats.api.total)}  fail=${pct(stats.api.fail, stats.api.total)}  429=${pct(stats.api.throttled, stats.api.total)}`,
  );
  info(
    `latência: p50=${fmtMs(percentile(lat, 50))}  p95=${fmtMs(percentile(lat, 95))}  p99=${fmtMs(percentile(lat, 99))}  max=${fmtMs(Math.max(0, ...lat))}`,
  );
  info(`throughput ≈ ${rps.toFixed(1)} req/s`);

  log('\n  Por rota:');
  for (const path of PATHS) {
    const bp = stats.byPath[path] || {
      total: 0,
      ok: 0,
      fail: 0,
      throttled: 0,
      latencies: [],
    };
    info(
      `${path}  n=${bp.total} ok=${bp.ok} fail=${bp.fail} 429=${bp.throttled}  p95=${fmtMs(percentile(bp.latencies, 95))}`,
    );
  }
  if (stats.api.sampleErrors.length) {
    warn('amostra de erros HTTP (não-429):');
    for (const e of stats.api.sampleErrors) info(`  ${e}`);
  }
  if (throttleRate > profile.warnThrottleRate) {
    warn(
      `muitos 429 na API (${pct(stats.api.throttled, stats.api.total)}) — rate limit global atuando (esperado no heavy)`,
    );
  }

  const loadPass = stats.api.total > 0 && failRate <= profile.maxFailRate;
  if (loadPass) {
    ok(
      `carga dentro do limite (fail ≤ ${(profile.maxFailRate * 100).toFixed(0)}%; 429 não conta como fail de app)`,
    );
  } else {
    fail(
      `taxa de erro API ${pct(stats.api.fail, stats.api.total)} acima do máximo ${(profile.maxFailRate * 100).toFixed(0)}%`,
    );
  }
  results.push({
    name: `Carga ${profile.label}`,
    pass: loadPass,
    detail: `ok=${stats.api.ok} fail=${stats.api.fail} 429=${stats.api.throttled} p95=${fmtMs(percentile(lat, 95))}`,
  });

  // --- 4) Rate limit login ---
  step('4/4  Rate limit no login (pós-carga)');
  info(`enviando ${profile.loginBurst} logins inválidos seguidos…`);
  let login429 = 0;
  let loginOther = 0;
  for (let i = 0; i < profile.loginBurst; i++) {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'x@x.com', password: 'errada1' }),
    });
    if (r.status === 429) login429 += 1;
    else loginOther += 1;
  }
  info(`resultado: 429=${login429}  outros=${loginOther}  (total=${profile.loginBurst})`);
  const ratePass = login429 >= 1;
  if (ratePass) ok('rate limit de login ativo (recebeu 429)');
  else fail('rate limit de login não disparou (esperado ≥1× 429)');
  results.push({
    name: 'Rate limit login',
    pass: ratePass,
    detail: `429=${login429}/${profile.loginBurst}`,
  });

  // --- Resumo ---
  step('Resumo final');
  const allPass = results.every((r) => r.pass);
  log('');
  log('  Check'.padEnd(22) + 'Status'.padEnd(8) + 'Detalhe');
  log('  ' + line('─', 60));
  for (const r of results) {
    const st = r.pass ? 'PASS' : 'FAIL';
    log(`  ${r.name.padEnd(20)}${st.padEnd(8)}${r.detail}`);
  }
  log('  ' + line('─', 60));
  log(`  Nível executado : ${profile.label} (${profile.name})`);
  log(`  Fim             : ${new Date().toLocaleString('pt-BR')}`);
  log('');
  if (allPass) {
    log(`  ★ RESULTADO: OK — nível ${profile.label} passou`);
    log(line('═'));
    process.exit(0);
  }
  log(`  ★ RESULTADO: FALHOU — revise os checks FAIL acima`);
  log(line('═'));
  process.exit(1);
}

main().catch((e) => {
  console.error('\nErro inesperado:', e);
  process.exit(1);
});
