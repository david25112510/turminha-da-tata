export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FFFBF2]">
      <div
        role="status"
        aria-label="Carregando"
        className="w-10 h-10 border-4 border-[#ECE1CB] border-t-[#1FA787] rounded-full animate-spin"
      />
    </main>
  );
}
