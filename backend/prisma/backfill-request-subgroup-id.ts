/**
 * Backfill `requests.subgroup_id` a partir dos grupos dos itens.
 *
 * Regras:
 * - Todos os itens com o MESMO subgroup_id → grava esse valor
 * - Mais de um subgrupo, ou itens sem grupo → deixa NULL (legado; não inventa)
 *
 * Uso (em backend/):
 *   npx ts-node --transpile-only prisma/backfill-request-subgroup-id.ts
 *   npx ts-node --transpile-only prisma/backfill-request-subgroup-id.ts --apply
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type Row = {
  id: string;
  code: string | null;
  state: string;
  currentSubgroupId: string | null;
  distinctSubgroups: string[];
  itemsWithoutGroup: number;
  itemCount: number;
};

function classify(row: Row): 'RESOLVED' | 'ALREADY_SET' | 'AMBIGUOUS' | 'NO_GROUP' {
  if (row.currentSubgroupId) return 'ALREADY_SET';
  if (row.distinctSubgroups.length === 1 && row.itemsWithoutGroup === 0) {
    return 'RESOLVED';
  }
  if (row.distinctSubgroups.length === 0) return 'NO_GROUP';
  return 'AMBIGUOUS';
}

async function loadRows(): Promise<Row[]> {
  const requests = await prisma.request.findMany({
    select: {
      id: true,
      code: true,
      state: true,
      subgroupId: true,
      items: {
        select: {
          id: true,
          groupId: true,
          group: { select: { subgroupId: true } },
        },
      },
    },
    orderBy: { code: 'asc' },
  });

  return requests.map((r) => {
    const sgs = new Set<string>();
    let without = 0;
    for (const it of r.items) {
      const sg = it.group?.subgroupId ?? null;
      if (sg) sgs.add(sg);
      else without += 1;
    }
    return {
      id: r.id,
      code: r.code,
      state: r.state,
      currentSubgroupId: r.subgroupId,
      distinctSubgroups: [...sgs],
      itemsWithoutGroup: without,
      itemCount: r.items.length,
    };
  });
}

async function main() {
  const rows = await loadRows();
  const buckets = {
    RESOLVED: [] as Row[],
    ALREADY_SET: [] as Row[],
    AMBIGUOUS: [] as Row[],
    NO_GROUP: [] as Row[],
  };
  for (const row of rows) {
    buckets[classify(row)].push(row);
  }

  console.log('=== Relatório backfill requests.subgroup_id ===');
  console.log(`Total solicitações: ${rows.length}`);
  console.log(`Já preenchidas:     ${buckets.ALREADY_SET.length}`);
  console.log(`Resolvíveis:        ${buckets.RESOLVED.length}`);
  console.log(`Ambíguas:           ${buckets.AMBIGUOUS.length}`);
  console.log(`Sem grupo nos itens:${buckets.NO_GROUP.length}`);
  console.log('');

  if (buckets.RESOLVED.length) {
    console.log('-- Resolvíveis (mesmo subgrupo em todos os itens) --');
    for (const r of buckets.RESOLVED) {
      console.log(
        `  #${r.code ?? '?'} ${r.state} → subgroup ${r.distinctSubgroups[0]} (${r.itemCount} item(ns))`,
      );
    }
    console.log('');
  }

  if (buckets.AMBIGUOUS.length) {
    console.log('-- Ambíguas (deixar NULL — legado) --');
    for (const r of buckets.AMBIGUOUS) {
      console.log(
        `  #${r.code ?? '?'} ${r.state} | ${r.itemCount} itens | subgrupos distintos: ${r.distinctSubgroups.length} | sem grupo: ${r.itemsWithoutGroup}`,
      );
    }
    console.log('');
  }

  if (buckets.NO_GROUP.length) {
    console.log('-- Sem grupo nos itens (deixar NULL) --');
    for (const r of buckets.NO_GROUP) {
      console.log(`  #${r.code ?? '?'} ${r.state} | ${r.itemCount} itens`);
    }
    console.log('');
  }

  const remainingNull =
    buckets.AMBIGUOUS.length + buckets.NO_GROUP.length;
  if (remainingNull > 0) {
    console.log(
      `Atenção PO: após aplicar, restarão ${remainingNull} registro(s) com subgroup_id NULL.`,
    );
    console.log(
      'Não aplicar migration NOT NULL sem decisão: manter nullable ou tratar/encerrar legados.',
    );
  } else {
    console.log('Sem nulos previstos — migration NOT NULL pode seguir.');
  }

  if (!APPLY) {
    console.log('');
    console.log('Modo relatório apenas. Para gravar: acrescente --apply');
    return;
  }

  let updated = 0;
  for (const r of buckets.RESOLVED) {
    await prisma.request.update({
      where: { id: r.id },
      data: { subgroupId: r.distinctSubgroups[0] },
    });
    updated += 1;
  }
  console.log('');
  console.log(`Aplicado: ${updated} solicitação(ões) atualizada(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
