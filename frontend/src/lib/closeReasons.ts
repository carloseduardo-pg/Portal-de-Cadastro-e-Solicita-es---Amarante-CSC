/**
 * Motivos pré-definidos para encerrar solicitação sem promover à base.
 * Manter alinhado a `backend/src/requests/close-reasons.ts`.
 */
export const CLOSE_REASON_OPTIONS = [
  { code: 'item_ja_existe', label: 'Item já existe na base' },
  { code: 'solicitacao_duplicada', label: 'Solicitação duplicada' },
  { code: 'dados_incorretos', label: 'Dados incorretos ou incompletos' },
  { code: 'nao_necessario', label: 'Cadastro não é mais necessário' },
  { code: 'fora_escopo', label: 'Fora do escopo / tipo de item errado' },
  { code: 'outro', label: 'Outro (detalhar na observação)' },
] as const;

export type CloseReasonCode = (typeof CLOSE_REASON_OPTIONS)[number]['code'];

export function closeReasonLabel(code: string | undefined | null): string | null {
  if (!code) return null;
  return CLOSE_REASON_OPTIONS.find((o) => o.code === code)?.label ?? code;
}
