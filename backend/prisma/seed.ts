import {
  PrismaClient,
  ProductSource,
  SupplierOriginBase,
} from '@prisma/client';
import {
  PDM_FAMILIES,
  PDM_GROUPS,
  PDM_SAMPLE_PRODUCTS,
  PDM_SUBGROUPS,
  pdmAttributesForFamily,
} from './pdm-catalog';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('==> Amarante seed (catálogo / sem solicitações mock)');

  const passwordHash = await bcrypt.hash('amarante123', 10);

  const hotels = await Promise.all(
    [
      { code: 'MCZ', name: 'Maceió' },
      { code: 'MGI', name: 'Maragogi' },
      { code: 'JPT', name: 'Japaratinga' },
      { code: 'SALG', name: 'Salinas' },
      { code: 'MV4', name: 'MV4 Corporativo' },
    ].map((h) =>
      prisma.hotel.upsert({
        where: { code: h.code },
        update: { name: h.name, active: true },
        create: h,
      }),
    ),
  );

  const hotelByCode = Object.fromEntries(hotels.map((h) => [h.code, h]));

  const admin = await prisma.user.upsert({
    where: { email: 'admin@amarante.local' },
    update: { name: 'Administrador CSC', passwordHash, active: true, hotelId: hotelByCode.MGI.id, role: 'ADMIN' },
    create: {
      email: 'admin@amarante.local',
      name: 'Administrador CSC',
      passwordHash,
      active: true,
      hotelId: hotelByCode.MGI.id,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { email: 'solicitante@amarante.local' },
    update: { name: 'Marcos Vieira', passwordHash, active: true, hotelId: hotelByCode.MGI.id, role: 'SOLICITANTE' },
    create: {
      email: 'solicitante@amarante.local',
      name: 'Marcos Vieira',
      passwordHash,
      active: true,
      hotelId: hotelByCode.MGI.id,
      role: 'SOLICITANTE',
    },
  });

  await prisma.user.upsert({
    where: { email: 'erika@amarante.local' },
    update: { name: 'Erika Fouchard', passwordHash, active: true, hotelId: hotelByCode.MGI.id, role: 'APROVADOR' },
    create: {
      email: 'erika@amarante.local',
      name: 'Erika Fouchard',
      passwordHash,
      active: true,
      hotelId: hotelByCode.MGI.id,
      role: 'APROVADOR',
    },
  });

  await prisma.user.upsert({
    where: { email: 'compliance@amarante.local' },
    update: { name: 'Compliance CSC', passwordHash, active: true, hotelId: hotelByCode.MGI.id, role: 'COMPLIANCE' },
    create: {
      email: 'compliance@amarante.local',
      name: 'Compliance CSC',
      passwordHash,
      active: true,
      hotelId: hotelByCode.MGI.id,
      role: 'COMPLIANCE',
    },
  });

  const un = await prisma.measureUnit.upsert({
    where: { code: 'UN' },
    update: { name: 'Unidade', active: true },
    create: { code: 'UN', name: 'Unidade', active: true },
  });

  const lt = await prisma.measureUnit.upsert({
    where: { code: 'LT' },
    update: { name: 'Litro', active: true },
    create: { code: 'LT', name: 'Litro', active: true },
  });

  const kg = await prisma.measureUnit.upsert({
    where: { code: 'KG' },
    update: { name: 'Quilograma', active: true },
    create: { code: 'KG', name: 'Quilograma', active: true },
  });

  const muByCode: Record<string, { id: string }> = { UN: un, LT: lt, KG: kg };

  const groups = [];
  for (const g of PDM_GROUPS) {
    groups.push(
      await prisma.group.upsert({
        where: { code: g.code },
        update: { name: g.name, active: true },
        create: { code: g.code, name: g.name, active: true },
      }),
    );
  }

  const subgroups: Record<string, { id: string; code: string }> = {};
  for (const sg of PDM_SUBGROUPS) {
    const group = groups.find((g) => g.code === sg.groupCode)!;
    const row = await prisma.subgroup.upsert({
      where: { code: sg.code },
      update: { name: sg.name, groupId: group.id, active: true },
      create: { code: sg.code, name: sg.name, groupId: group.id, active: true },
    });
    subgroups[sg.code] = row;
  }

  const families: Record<string, { id: string; code: string; name: string }> = {};
  for (const f of PDM_FAMILIES) {
    const row = await prisma.family.upsert({
      where: { code: f.code },
      update: { name: f.name, subgroupId: subgroups[f.sg].id, active: true },
      create: { code: f.code, name: f.name, subgroupId: subgroups[f.sg].id, active: true },
    });
    families[f.code] = row;
  }

  /** Atributos PDM de protótipo (todas as famílias) — base real Amarante substitui depois. */
  let attributeCount = 0;
  for (const f of PDM_FAMILIES) {
    const family = families[f.code];
    const defs = pdmAttributesForFamily(f.code);
    for (const def of defs) {
      const existing = await prisma.productAttribute.findFirst({
        where: { familyId: family.id, name: def.name },
      });
      if (existing) {
        await prisma.productAttribute.update({
          where: { id: existing.id },
          data: {
            required: def.required,
            examples: [...def.examples],
            active: true,
          },
        });
      } else {
        await prisma.productAttribute.create({
          data: {
            familyId: family.id,
            name: def.name,
            required: def.required,
            examples: [...def.examples],
            active: true,
          },
        });
      }
      attributeCount += 1;
    }
  }

  for (const h of hotels) {
    await prisma.costCenter.upsert({
      where: { hotelId_code: { hotelId: h.id, code: 'A&B' } },
      update: { name: `A&B — ${h.code}`, active: true },
      create: { hotelId: h.id, code: 'A&B', name: `A&B — ${h.code}`, active: true },
    });
  }

  for (const p of PDM_SAMPLE_PRODUCTS) {
    const measureUnit = muByCode[p.mu] ?? un;
    const product = await prisma.product.upsert({
      where: { unifiedCode: p.unified },
      update: {
        descriptionShort: p.short,
        descriptionLong: p.long,
        familyId: families[p.family].id,
        measureUnitId: measureUnit.id,
        ncmCode: 'ncm' in p ? p.ncm : null,
        ncmConfirmedById: admin.id,
        ncmConfirmedAt: new Date(),
        active: true,
      },
      create: {
        unifiedCode: p.unified,
        descriptionShort: p.short,
        descriptionLong: p.long,
        familyId: families[p.family].id,
        measureUnitId: measureUnit.id,
        source: ProductSource.NATIONAL,
        ncmCode: 'ncm' in p ? p.ncm : null,
        ncmConfirmedById: admin.id,
        ncmConfirmedAt: new Date(),
        active: true,
      },
    });

    for (const hc of p.hotels) {
      const hotel = hotelByCode[hc];
      const cc = await prisma.costCenter.findFirst({
        where: { hotelId: hotel.id, code: 'A&B' },
      });
      await prisma.productHotel.upsert({
        where: { productId_hotelId: { productId: product.id, hotelId: hotel.id } },
        update: { costCenterId: cc?.id },
        create: {
          productId: product.id,
          hotelId: hotel.id,
          costCenterId: cc?.id,
        },
      });
    }
  }

  // Solicitações de produto NÃO são seedadas — o fluxo de Nova Solicitação popula o banco.

  await prisma.supplier.upsert({
    where: { document: '12345678000199' },
    update: {},
    create: {
      document: '12345678000199',
      corporateName: 'FORNECEDOR EXEMPLO LTDA',
      tradeName: 'FORNECEDOR EXEMPLO',
      originBase: SupplierOriginBase.SEMPLICE,
      registrationComplete: true,
      active: true,
    },
  });

  const start = new Date('2026-08-01');
  for (let d = 0; d < 31; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dow = date.getDay();
    await prisma.businessCalendar.upsert({
      where: { date },
      update: { isBusinessDay: dow !== 0 && dow !== 6 },
      create: { date, isBusinessDay: dow !== 0 && dow !== 6 },
    });
  }

  const counts = {
    hotels: await prisma.hotel.count(),
    groups: await prisma.group.count(),
    subgroups: await prisma.subgroup.count(),
    families: await prisma.family.count(),
    attributes: await prisma.productAttribute.count(),
    products: await prisma.product.count(),
    requests: await prisma.request.count(),
  };

  console.log('OK  Amarante seed complete (somente catálogo)');
  console.log(`    PDM: ${counts.groups} grupos · ${counts.subgroups} subgrupos · ${counts.families} famílias`);
  console.log(`    Atributos PDM (protótipo): ${counts.attributes} (sincronizados ${attributeCount} defs)`);
  console.log(`    Base: ${counts.products} produtos · ${counts.hotels} hotéis · ${counts.requests} solicitações`);
  console.log('    admin@amarante.local / amarante123');
  console.log('    solicitante@amarante.local / amarante123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
