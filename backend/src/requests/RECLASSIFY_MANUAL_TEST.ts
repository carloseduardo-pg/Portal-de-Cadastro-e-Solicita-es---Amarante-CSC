/**
 * Teste manual — reclassificação + divisão de lote misto
 *
 * API:
 *   POST /api/requests/:id/reclassify-fixed-asset
 *   POST /api/requests/:id/reclassify-consumption
 *   POST /api/requests/:id/send-from-imobilizado
 *
 * Casos:
 * 1) Lote inteiro → AF, returnToApprover=true → Imobilizado encaminha → volta Aprovador
 * 2) Lote inteiro → AF, returnToApprover=false → Imobilizado encerra (NCM + promote)
 * 3) Lote misto (parte dos itemIds) → mãe fica no Aprovador com consumo;
 *    filha com parentRequestId vai ao Imobilizado; timeline nas duas
 * 4) Caminho inverso no Imobilizado (parcial ou total) → RECLASSIFY_CONSUMPTION
 */
export {};
