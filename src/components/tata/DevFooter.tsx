/**
 * Identificação discreta do desenvolvedor — não é a marca principal do sistema (Turminha da Tata
 * continua sendo a identidade dominante em toda a UI), só um rodapé de autoria/direitos.
 */
export function DevFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-center text-[11px] leading-relaxed text-tata-ink-muted ${className}`}>
      <p>Sistema desenvolvido por HARDWARETEC · by David Souza</p>
      <p>© 2026 — Todos os direitos reservados.</p>
    </footer>
  );
}
