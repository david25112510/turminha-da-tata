/**
 * Toda Server Action desta app já lança Error com mensagem em português voltada ao usuário — mas um erro
 * inesperado (falha de rede, do Prisma, etc.) também chega aqui como instância de Error, e em produção o
 * Next redige mensagens de erro não tratadas para um texto genérico em inglês. Sem isso, esse texto
 * vazaria direto para a tela. Detecta esse padrão e cai para a mensagem em português informada.
 */
export function toUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) return fallback;
  if (/error occurred|internal server error|unexpected (error|token)/i.test(error.message)) return fallback;
  return error.message;
}
