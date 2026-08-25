export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6" role="status" aria-label="Carregando">
      <div className="h-7 w-40 rounded-full bg-tata-surface-hover animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-tata-surface-hover animate-pulse" />
        ))}
      </div>
    </div>
  );
}
