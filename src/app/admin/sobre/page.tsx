import { version } from "../../../../package.json";

export default function AboutPage() {
  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-lg">
      <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-tata-ink">
        Sobre o sistema
      </h1>

      <div className="bg-tata-surface rounded-2xl shadow-sm p-6 flex flex-col gap-4 text-sm">
        <div>
          <p className="font-[family-name:var(--font-baloo)] font-semibold text-lg text-tata-ink">
            Turminha da Tata
          </p>
          <p className="text-tata-ink-soft">Sistema de gestão e acompanhamento infantil</p>
        </div>

        <div className="h-px bg-tata-border" />

        <div>
          <p className="text-xs font-semibold text-tata-ink-muted uppercase tracking-wide">Desenvolvido por</p>
          <p className="text-tata-ink">HARDWARETEC</p>
          <p className="text-tata-ink-soft">by David Souza</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-tata-ink-muted uppercase tracking-wide">Telefone</p>
          <p className="text-tata-ink">(31) 99373-7165</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-tata-ink-muted uppercase tracking-wide">Versão</p>
          <p className="text-tata-ink">{version}</p>
        </div>

        <div className="h-px bg-tata-border" />

        <p className="text-xs text-tata-ink-muted">© 2026 — Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
