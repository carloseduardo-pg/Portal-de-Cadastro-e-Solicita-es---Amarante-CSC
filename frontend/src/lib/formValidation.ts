/** Retorna mensagem se valor obrigatório estiver vazio. */
export function requiredText(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message;
}

/** Retorna mensagem se texto tiver menos caracteres que o mínimo. */
export function minLengthText(
  value: string,
  min: number,
  message: string,
): string | undefined {
  return value.trim().length >= min ? undefined : message;
}
