/**
 * Seed Amarante — apenas o que NÃO vem do SAP B1.
 * Catálogo/itens: `npm run import:sap`
 * Atributos PDM: demo P3 (planilha SAP não traz atributos).
 */
import { PrismaClient, SupplierOriginBase } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { pdmAttributesForFamily } from './pdm-catalog';

const prisma = new PrismaClient();

const REAL_MEASURE_UNITS = [
  { code: 'UN', name: 'Unidade' },
  { code: 'KG', name: 'Quilograma' },
  { code: 'MT', name: 'Metro' },
  { code: 'M3', name: 'Metro cúbico' },
  { code: 'LT', name: 'Litro' },
] as const;

async function main() {
  console.log('==> Amarante seed (infra — catálogo via import:sap)');

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

  const seedUsers: {
    email: string;
    name: string;
    role: 'ADMIN' | 'SOLICITANTE' | 'APROVADOR' | 'APROVADOR_IMOBILIZADO' | 'COMPLIANCE';
  }[] = [
    { email: 'admin@amarante.local', name: 'Administrador CSC', role: 'ADMIN' },
    { email: 'solicitante@amarante.local', name: 'Marcos Vieira', role: 'SOLICITANTE' },
    { email: 'erika@amarante.local', name: 'Erika Fouchard', role: 'APROVADOR' },
    {
      email: 'imobilizado@amarante.local',
      name: 'Aprovador Imobilizado',
      role: 'APROVADOR_IMOBILIZADO',
    },
    { email: 'compliance@amarante.local', name: 'Compliance CSC', role: 'COMPLIANCE' },
    {
      email: 'amanda.cavalcante@amarantehoteis.com.br',
      name: 'Amanda Cavalcante',
      role: 'ADMIN',
    },
    {
      email: 'beatriz.barros@amarantehoteis.com.br',
      name: 'Beatriz Barros',
      role: 'SOLICITANTE',
    },
    {
      email: 'andresa.ferreira@amarantehoteis.com.br',
      name: 'Andresa Ferreira',
      role: 'APROVADOR',
    },
    {
      email: 'erika.fouchard@amarantehoteis.com.br',
      name: 'Erika Fouchard',
      role: 'APROVADOR_IMOBILIZADO',
    },
  ];

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash,
        active: true,
        hotelId: hotelByCode.MGI.id,
        role: u.role,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        active: true,
        hotelId: hotelByCode.MGI.id,
        role: u.role,
      },
    });
  }

  for (const u of REAL_MEASURE_UNITS) {
    await prisma.measureUnit.upsert({
      where: { code: u.code },
      update: { name: u.name, active: true },
      create: { code: u.code, name: u.name, active: true },
    });
  }
  await prisma.measureUnit.updateMany({
    where: { code: { notIn: REAL_MEASURE_UNITS.map((u) => u.code) } },
    data: { active: false },
  });

  for (const h of hotels) {
    await prisma.costCenter.upsert({
      where: { hotelId_code: { hotelId: h.id, code: 'A&B' } },
      update: { name: `A&B — ${h.code}`, active: true },
      create: { hotelId: h.id, code: 'A&B', name: `A&B — ${h.code}`, active: true },
    });
  }

  /**
   * DEMO P3 — atributos por família já importada do SAP.
   * Sem famílias (antes do import:sap): nada a fazer.
   */
  const families = await prisma.family.findMany({ where: { active: true } });
  let attributeCount = 0;
  for (const family of families) {
    const defs = pdmAttributesForFamily(family.name);
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

  // Remove hierarquia PDM legada (códigos 1/3/6) sem produtos SAP nem solicitações.
  const legacyFamilies = await prisma.family.findMany({
    where: { NOT: { code: { startsWith: 'FAM' } } },
    select: { id: true, code: true },
  });
  let removedFamilies = 0;
  for (const f of legacyFamilies) {
    const reqCount = await prisma.request.count({ where: { familyId: f.id } });
    if (reqCount > 0) continue;
    const productCount = await prisma.product.count({
      where: { group: { subgroup: { familyId: f.id } } },
    });
    if (productCount > 0) continue;
    await prisma.productAttribute.deleteMany({ where: { familyId: f.id } });
    const sgs = await prisma.subgroup.findMany({
      where: { familyId: f.id },
      select: { id: true },
    });
    for (const sg of sgs) {
      await prisma.group.deleteMany({ where: { subgroupId: sg.id } });
    }
    await prisma.subgroup.deleteMany({ where: { familyId: f.id } });
    await prisma.family.delete({ where: { id: f.id } });
    removedFamilies += 1;
  }

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
    measureUnits: await prisma.measureUnit.count({ where: { active: true } }),
    families: await prisma.family.count(),
    products: await prisma.product.count({ where: { sapCode: { not: null } } }),
    attributes: await prisma.productAttribute.count(),
  };

  console.log('OK  Amarante seed complete (infra)');
  console.log(`    Hotéis: ${counts.hotels} · UM ativas: ${counts.measureUnits}`);
  console.log(
    `    Famílias no banco: ${counts.families} · produtos SAP: ${counts.products}` +
      (families.length
        ? ` · attrs demo P3: ${attributeCount}`
        : ' · attrs demo: (rode import:sap e re-seed)'),
  );
  if (removedFamilies) {
    console.log(`    Removidas ${removedFamilies} famílias PDM legadas (sem SAP)`);
  }
  console.log('    Catálogo: npm run import:sap');
  console.log('    Login seed (senha amarante123):');
  console.log('      amanda.cavalcante@amarantehoteis.com.br — ADMIN');
  console.log('      beatriz.barros@amarantehoteis.com.br — SOLICITANTE');
  console.log('      andresa.ferreira@amarantehoteis.com.br — APROVADOR');
  console.log('      erika.fouchard@amarantehoteis.com.br — APROVADOR_IMOBILIZADO');
  console.log('      admin@amarante.local — ADMIN (dev)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
