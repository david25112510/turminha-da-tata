export default function GuardianLoading() {
  return (
    <div className="p-4 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto" role="status" aria-label="Carregando">
      <div className="h-32 rounded-tata-xl bg-tata-surface-hover animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 rounded-tata-lg bg-tata-surface-hover animate-pulse" />
      ))}
    </div>
  );
}
