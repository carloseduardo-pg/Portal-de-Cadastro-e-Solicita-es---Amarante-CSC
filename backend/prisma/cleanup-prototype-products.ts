/**
 * Remove produtos e solicitações de protótipo anteriores ao import SAP.
 *
 * Critério produto: `sap_code IS NULL` (itens de teste / seed antigo).
 * Critério solicitação: anterior ao 1º produto SAP, ou família legada (código
 * não FAM/AFF/TMP_), ou item ligado a produto sem sap_code.
 * Também remove a hierarquia PDM legada (MIG-* / códigos numéricos 101001…).
 *
 * Uso: `npx ts-node prisma/cleanup-prototype-products.ts` (em backend/)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sapMin = await prisma.product.findFirst({
    where: { sapCode: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  if (!sapMin) {
    throw new Error('Nenhum produto SAP encontrado — abortando limpeza.');
  }
  console.log(`SAP import a partir de ${sapMin.createdAt.toISOString()}`);

  const protoProducts = await prisma.product.findMany({
    where: { sapCode: null },
    select: { id: true, descriptionShort: true, unifiedCode: true },
  });
  const protoProductIds = protoProducts.map((p) => p.id);
  console.log(`Produtos protótipo (sem sap_code): ${protoProducts.length}`);
  for (const p of protoProducts) {
    console.log(`  - ${p.unifiedCode ?? p.id} | ${p.descriptionShort}`);
  }

  const legacyFamilies = await prisma.family.findMany({
    where: {
      NOT: {
        OR: [
          { code: { startsWith: 'FAM' } },
          { code: { startsWith: 'AFF' } },
          { code: { startsWith: 'TMP_' } },
        ],
      },
    },
    select: { id: true, code: true, name: true },
  });
  const legacyFamilyIds = legacyFamilies.map((f) => f.id);
  console.log(
    `Famílias legadas: ${legacyFamilies.map((f) => `${f.code} (${f.name})`).join(', ') || '(nenhuma)'}`,
  );

  const protoRequests = await prisma.request.findMany({
    where: {
      OR: [
        { createdAt: { lt: sapMin.createdAt } },
        ...(legacyFamilyIds.length ? [{ familyId: { in: legacyFamilyIds } }] : []),
        ...(protoProductIds.length
          ? [{ items: { some: { productId: { in: protoProductIds } } } }]
          : []),
      ],
    },
    select: { id: true, createdAt: true },
  });
  const protoRequestIds = protoRequests.map((r) => r.id);
  console.log(`Solicitações protótipo: ${protoRequests.length}`);

  const notifications = await prisma.notification.findMany({
    select: { id: true, linkUrl: true, body: true },
  });
  const notifIds = notifications
    .filter((n) => {
      const blob = `${n.linkUrl ?? ''} ${n.body ?? ''}`;
      return protoRequestIds.some((id) => blob.includes(id));
    })
    .map((n) => n.id);

  const result = await prisma.$transaction(async (tx) => {
    const itemIds = (
      await tx.requestItem.findMany({
        where: { requestId: { in: protoRequestIds } },
        select: { id: true },
      })
    ).map((i) => i.id);

    const ncmSug = itemIds.length
      ? await tx.ncmSuggestion.deleteMany({ where: { requestItemId: { in: itemIds } } })
      : { count: 0 };
    const ncmSugSrc = protoProductIds.length
      ? await tx.ncmSuggestion.deleteMany({
          where: { sourceProductId: { in: protoProductIds } },
        })
      : { count: 0 };
    const itemLinks = itemIds.length
      ? await tx.requestItemLink.deleteMany({ where: { requestItemId: { in: itemIds } } })
      : { count: 0 };
    const items = protoRequestIds.length
      ? await tx.requestItem.deleteMany({ where: { requestId: { in: protoRequestIds } } })
      : { count: 0 };
    const stages = protoRequestIds.length
      ? await tx.requestStage.deleteMany({ where: { requestId: { in: protoRequestIds } } })
      : { count: 0 };
    const reqHotels = protoRequestIds.length
      ? await tx.requestHotel.deleteMany({ where: { requestId: { in: protoRequestIds } } })
      : { count: 0 };
    const requests = protoRequestIds.length
      ? await tx.request.deleteMany({ where: { id: { in: protoRequestIds } } })
      : { count: 0 };
    const notifs = notifIds.length
      ? await tx.notification.deleteMany({ where: { id: { in: notifIds } } })
      : { count: 0 };

    if (protoProductIds.length) {
      await tx.requestItem.updateMany({
        where: { productId: { in: protoProductIds } },
        data: { productId: null },
      });
    }

    // product_links / product_hotels / attribute_values: onDelete Cascade no schema,
    // mas deletamos explicitamente para log claro.
    const attrVals = protoProductIds.length
      ? await tx.productAttributeValue.deleteMany({
          where: { productId: { in: protoProductIds } },
        })
      : { count: 0 };
    const links = protoProductIds.length
      ? await tx.productLink.deleteMany({ where: { productId: { in: protoProductIds } } })
      : { count: 0 };
    const hotels = protoProductIds.length
      ? await tx.productHotel.deleteMany({ where: { productId: { in: protoProductIds } } })
      : { count: 0 };
    const products = protoProductIds.length
      ? await tx.product.deleteMany({ where: { id: { in: protoProductIds } } })
      : { count: 0 };

    let groups = 0;
    let subgroups = 0;
    let attrs = 0;
    let families = 0;
    for (const f of legacyFamilies) {
      const sgs = await tx.subgroup.findMany({
        where: { familyId: f.id },
        select: { id: true },
      });
      for (const sg of sgs) {
        const gDel = await tx.group.deleteMany({ where: { subgroupId: sg.id } });
        groups += gDel.count;
      }
      const sgDel = await tx.subgroup.deleteMany({ where: { familyId: f.id } });
      subgroups += sgDel.count;
      const aDel = await tx.productAttribute.deleteMany({ where: { familyId: f.id } });
      attrs += aDel.count;
      const still = await tx.request.count({ where: { familyId: f.id } });
      if (still === 0) {
        await tx.family.delete({ where: { id: f.id } });
        families += 1;
      }
    }

    return {
      ncmSug: ncmSug.count + ncmSugSrc.count,
      itemLinks: itemLinks.count,
      items: items.count,
      stages: stages.count,
      reqHotels: reqHotels.count,
      requests: requests.count,
      notifs: notifs.count,
      attrVals: attrVals.count,
      links: links.count,
      hotels: hotels.count,
      products: products.count,
      groups,
      subgroups,
      attrs,
      families,
    };
  });

  const remaining = {
    products: await prisma.product.count(),
    productsNoSap: await prisma.product.count({ where: { sapCode: null } }),
    requests: await prisma.request.count(),
    requestItems: await prisma.requestItem.count(),
    families: await prisma.family.count(),
    subgroups: await prisma.subgroup.count(),
    groups: await prisma.group.count(),
  };

  console.log('Removido:', JSON.stringify(result, null, 2));
  console.log('Restante:', JSON.stringify(remaining, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
