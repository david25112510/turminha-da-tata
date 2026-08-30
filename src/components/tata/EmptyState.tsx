import { TataScene } from "./TataScene";

type EmptyStateProps = {
  message: string;
  /** A mascote é usada com moderação — só nos estados vazios de maior destaque (ex.: timeline do dia, fotos). */
  withMascot?: boolean;
};

/** Estado vazio amigável — nunca uma frase seca de "nenhum registro encontrado". */
export function EmptyState({ message, withMascot }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      {withMascot && (
        <div className="relative w-16 h-20 mb-1 tata-mascot-idle">
          <TataScene scene="EMPTY" className="opacity-90" />
        </div>
      )}
      <p className="text-sm text-tata-ink-muted-alt max-w-[220px]">{message}</p>
    </div>
  );
}
