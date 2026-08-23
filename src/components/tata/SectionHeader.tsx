export function SectionHeader({ icon, title }: { icon?: string; title: string }) {
  return (
    <span className="flex items-center gap-1.5 font-[family-name:var(--font-baloo)] font-semibold text-sm text-tata-ink">
      {icon && <span aria-hidden="true">{icon}</span>}
      {title}
    </span>
  );
}
