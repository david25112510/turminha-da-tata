export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-tata-bg">
      <div
        role="status"
        aria-label="Carregando"
        className="w-10 h-10 border-4 border-tata-border border-t-tata-green rounded-full animate-spin"
      />
    </main>
  );
}
