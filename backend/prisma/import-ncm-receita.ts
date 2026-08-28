/**
 * Importa a tabela TIPI/NCM da Receita Federal para `ncm_codes`.
 *
 * Uso:
 *   npm run import:ncm-receita --prefix backend -- /caminho/tipi.csv
 *
 * CSV esperado (separador `;` ou `,`, com cabeçalho):
 *   codigo;descricao
 *   22021000;Águas...
 *   2202.10.00;Águas...   ← pontuação é removida na normalização
 *
 * Ou colunas alternativas: code/description, ncm/desc, Código/Descrição.
 *
 * Upsert: atualiza description + source=RECEITA; não apaga NCMs só do bootstrap SAP.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { formatNcmDisplay, normalizeNcmCode } from '../src/common/ncm';

const prisma = new PrismaClient();

function parseCsv(content: string): { code: string; description: string }[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const codeIdx = header.findIndex((h) =>
    ['codigo', 'código', 'code', 'ncm', 'cod_ncm', 'codncm'].includes(h),
  );
  const descIdx = header.findIndex((h) =>
    ['descricao', 'descrição', 'description', 'desc', 'nome'].includes(h),
  );
  if (codeIdx < 0 || descIdx < 0) {
    throw new Error(
      `Cabeçalho inválido. Esperado colunas codigo/descricao (ou code/description). Achado: ${header.join(', ')}`,
    );
  }
  const out: { code: string; description: string }[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const code = normalizeNcmCode(cols[codeIdx]);
    const description = (cols[descIdx] || '').trim().toUpperCase();
    if (!code || !description) continue;
    out.push({ code, description: description || formatNcmDisplay(code) });
  }
  return out;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: npm run import:ncm-receita -- <arquivo.csv>');
    console.error('Ex.: npm run import:ncm-receita -- ./data/tipi-ncm.csv');
    process.exit(1);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`Arquivo não encontrado: ${abs}`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(abs, 'utf8'));
  console.log(`Lidos ${rows.length} NCMs de ${abs}`);

  let upserted = 0;
  const batchSize = 200;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((r) =>
        prisma.ncmCode.upsert({
          where: { code: r.code },
          create: {
            code: r.code,
            description: r.description,
            active: true,
            source: 'RECEITA',
          },
          update: {
            description: r.description,
            active: true,
            source: 'RECEITA',
          },
        }),
      ),
    );
    upserted += batch.length;
    process.stdout.write(`\rUpsert ${upserted}/${rows.length}`);
  }
  console.log('\nConcluído.');
  const total = await prisma.ncmCode.count();
  const receita = await prisma.ncmCode.count({ where: { source: 'RECEITA' } });
  console.log(`ncm_codes: ${total} total · ${receita} source=RECEITA`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
