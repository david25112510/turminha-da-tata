const pulse = "animate-pulse bg-tata-surface-hover";

export default function AdminLoading() {
  return <div className="min-h-full bg-tata-surface-alt px-4 py-6 sm:px-6 lg:px-8 lg:py-9" role="status" aria-label="Carregando central de operação">
    <div className="mx-auto flex max-w-[1560px] flex-col gap-7">
      <div className="border-b border-tata-border pb-6"><div className={`${pulse} h-3 w-36 rounded`} /><div className={`${pulse} mt-3 h-10 w-72 max-w-full rounded-lg`} /><div className={`${pulse} mt-3 h-4 w-44 rounded`} /></div>
      <div className="grid overflow-hidden rounded-[14px] border border-tata-border bg-tata-surface lg:grid-cols-12"><div className="p-6 lg:col-span-7 lg:p-8"><div className={`${pulse} h-3 w-32 rounded`} /><div className={`${pulse} mt-9 h-20 w-56 rounded-lg`} /><div className="mt-7 grid grid-cols-2 gap-3"><div className={`${pulse} h-16 rounded`} /><div className={`${pulse} h-16 rounded`} /></div></div><div className="border-t border-tata-border bg-tata-surface-warm p-6 lg:col-span-5 lg:border-l lg:border-t-0 lg:p-8"><div className={`${pulse} h-3 w-28 rounded`} /><div className="mt-6 flex flex-col gap-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className={`${pulse} h-14 rounded`} />)}</div></div></div>
      <div className="border-y border-tata-border py-8"><div className={`${pulse} h-6 w-44 rounded`} /><div className={`${pulse} mt-6 h-28 w-full rounded`} /></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12"><div className={`${pulse} h-64 rounded-[14px] lg:col-span-4`} /><div className={`${pulse} h-64 rounded-[14px] lg:col-span-5`} /><div className={`${pulse} h-64 rounded-[14px] lg:col-span-3`} /><div className={`${pulse} h-64 rounded-[14px] lg:col-span-8`} /><div className={`${pulse} h-64 rounded-[14px] lg:col-span-4`} /></div>
    </div>
  </div>;
}
