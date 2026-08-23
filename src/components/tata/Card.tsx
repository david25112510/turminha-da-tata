import type { CSSProperties, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  /** Leve realce de cor na borda esquerda — usar com moderação, só quando o cartão precisa se destacar. */
  accent?: "green" | "coral" | "blue" | "yellow" | "lilac";
  animate?: boolean;
  style?: CSSProperties;
};

const ACCENT_BORDER: Record<NonNullable<CardProps["accent"]>, string> = {
  green: "border-l-4 border-l-tata-green",
  coral: "border-l-4 border-l-tata-coral",
  blue: "border-l-4 border-l-tata-blue",
  yellow: "border-l-4 border-l-tata-yellow",
  lilac: "border-l-4 border-l-tata-lilac",
};

/** Cartão padrão do design system — cantos arredondados, sombra suave, nunca quadrado/pesado. */
export function Card({ children, className = "", accent, animate, style }: CardProps) {
  return (
    <div
      style={style}
      className={`bg-tata-surface rounded-tata-lg shadow-tata-card p-5 ${accent ? ACCENT_BORDER[accent] : ""} ${
        animate ? "tata-animate-in" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
