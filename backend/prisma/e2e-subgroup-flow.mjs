/**
 * E2E API: criar → enviар → devolver → corrigir → enviar → reclassificar AF → aprovar.
 * Uso: node --experimental-strip-types … or plain node with fetch.
 */
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const PASS = 'amarante123';

const UC_SUBGROUP = 'd90f874a-3a49-4ac0-98d0-171394977ace';
const UC_GROUP = 'df0b6488-5ef9-4813-8dfc-75414cb7b97e';
const AF_SUBGROUP = '249d38ad-f453-4217-97fd-d973893be0f4';
const AF_GROUP = '1c05080c-8af3-41e9-bbe6-80a67a7c79d0';
const HOTEL = 'd218d250-2bdf-42e7-95fc-8dd868cbbc8f';
const MU = '0be06f7c-2d1c-4d05-b35a-9bdd5715817a';
const CC = '01468073-1e10-40e6-bbba-faadc2cd62b6';
const NCM = '02012020';

function parseCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length) {
    return raw.map((c) => c.split(';')[0]).join('; ');
  }
  const single = res.headers.get('set-cookie');
  if (!single) return '';
  return single
    .split(/,(?=\s*[^;]+=)/)
    .map((c) => c.split(';')[0].trim())
    .join('; ');
}

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(body)}`);
  return parseCookies(res);
}

async function api(cookie, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }
  return data;
}

async function claim(cookie, requestId) {
  await api(cookie, 'PUT', `/requests/${requestId}/presence`);
}

function step(msg) {
  console.log(`\n▶ ${msg}`);
}

async function main() {
  const stamp = Date.now().toString().slice(-6);
  const desc = `E2E SUBGRUPO TESTE ${stamp}`;

  step('1. Login solicitante');
  const sol = await login('beatriz.barros@amarantehoteis.com.br');

  step('2. Criar rascunho (subgroupId obrigatório, sem familyId)');
  const created = await api(sol, 'POST', '/requests', {
    hotelIds: [HOTEL],
    subgroupId: UC_SUBGROUP,
    type: 'INCLUSAO',
    observation: 'Motivo E2E backfill subgroup — criação e fluxo completo.',
    requestDescription: desc,
    targetStage: 'SOLICITANTE',
    items: [
      {
        groupId: UC_GROUP,
        descriptionShort: desc,
        descriptionLong: `${desc} DESCRICAO LONGA PARA ENVIO`,
        measureUnitId: MU,
        costCenterId: CC,
        source: 'NATIONAL',
      },
    ],
  });
  console.log(`  id=${created.id} code=${created.code} state=${created.state} subgroupId=${created.subgroupId}`);
  if (!created.subgroupId) throw new Error('create não gravou subgroupId');
  if (!created.familyId) throw new Error('create não gravou familyId derivado');

  step('3. Enviar ao aprovador');
  await claim(sol, created.id);
  const sent = await api(sol, 'POST', `/requests/${created.id}/send-to-approver`, {
    message: 'Enviando E2E ao administrativo',
  });
  console.log(`  state=${sent.state}`);

  step('4. Login aprovador → devolver ao solicitante');
  const apr = await login('andresa.ferreira@amarantehoteis.com.br');
  await claim(apr, created.id);
  const returned = await api(apr, 'POST', `/requests/${created.id}/return-to-requester`, {
    message: 'Devolvendo E2E para correção',
  });
  console.log(`  state=${returned.state}`);

  step('5. Solicitante corrige e reenvia');
  await claim(sol, created.id);
  const fixedDesc = `${desc} CORRIGIDO`;
  await api(sol, 'PATCH', `/requests/${created.id}`, {
    subgroupId: UC_SUBGROUP,
    observation: 'Motivo E2E — correção após retorno.',
    requestDescription: fixedDesc,
    targetStage: 'SOLICITANTE',
    items: [
      {
        groupId: UC_GROUP,
        descriptionShort: fixedDesc,
        descriptionLong: `${fixedDesc} DESCRICAO LONGA`,
        measureUnitId: MU,
        costCenterId: CC,
        source: 'NATIONAL',
      },
    ],
    editNote: 'Correção E2E',
  });
  const resent = await api(sol, 'POST', `/requests/${created.id}/send-to-approver`, {
    message: 'Reenviando E2E após correção',
  });
  console.log(`  state=${resent.state}`);

  step('6. Aprovador reclassifica como ativo fixo (targetSubgroupId)');
  await claim(apr, created.id);
  const itemId = resent.items[0].id;
  const reclass = await api(apr, 'POST', `/requests/${created.id}/reclassify-fixed-asset`, {
    justification: 'E2E — item é ativo fixo',
    itemIds: [itemId],
    targetSubgroupId: AF_SUBGROUP,
  });
  console.log(`  state=${reclass.state} fixedAsset=${reclass.fixedAsset} subgroupId=${reclass.subgroupId}`);
  if (reclass.state !== 'IMOBILIZADO') throw new Error(`esperado IMOBILIZADO, veio ${reclass.state}`);

  step('7. Imobilizado classifica grupo AF + conclui (aprova na base)');
  const imob = await login('erika.fouchard@amarantehoteis.com.br');
  await claim(imob, created.id);
  const afterSave = await api(imob, 'PATCH', `/requests/${created.id}`, {
    subgroupId: AF_SUBGROUP,
    items: [
      {
        groupId: AF_GROUP,
        descriptionShort: fixedDesc,
        descriptionLong: `${fixedDesc} DESCRICAO LONGA`,
        costCenterId: CC,
        source: 'NATIONAL',
        unitQuantity: 1,
        physicalLocation: 'ALMOXARIFADO E2E',
      },
    ],
    editNote: 'Classificação AF E2E',
  });
  console.log(`  após save: state=${afterSave.state} groupId=${afterSave.items[0]?.groupId}`);

  const done = await api(imob, 'POST', `/requests/${created.id}/send-from-imobilizado`, {
    message: 'E2E — registro na base de ativos fixos',
    items: [{ itemId: afterSave.items[0].id, ncm: NCM }],
  });
  console.log(`  state=${done.state} closedAt=${done.closedAt}`);
  if (done.state !== 'ENCERRADO') throw new Error(`esperado ENCERRADO, veio ${done.state}`);

  console.log('\n✓ E2E completo sem travar.');
}

main().catch((e) => {
  console.error('\n✗ E2E falhou:', e.message);
  process.exitCode = 1;
});
