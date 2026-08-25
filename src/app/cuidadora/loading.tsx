export default function CaregiverLoading() {
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto" role="status" aria-label="Carregando">
      <div className="h-16 rounded-tata-lg bg-tata-surface-hover animate-pulse" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl bg-tata-surface-hover animate-pulse" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-tata-surface-hover animate-pulse" />
      ))}
    </div>
  );
}
