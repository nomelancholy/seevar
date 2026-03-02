export default function ArchiveLoading() {
  return (
    <main className="py-8 md:py-12 animate-in fade-in duration-200">
      <header className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="h-10 md:h-14 w-48 md:w-72 bg-muted/50 rounded mb-2 md:mb-4" />
          <div className="h-4 w-72 md:w-96 bg-muted/30 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-muted/50 rounded animate-pulse" />
          <div className="h-10 w-28 bg-muted/50 rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted/50 rounded animate-pulse" />
        </div>
      </header>

      <div className="ledger-surface overflow-hidden border border-border">
        <div className="grid grid-cols-12 bg-card/50 p-4 border-b border-border gap-2">
          <div className="col-span-2 h-3 bg-muted/50 rounded" />
          <div className="col-span-1 h-3 bg-muted/50 rounded" />
          <div className="col-span-7 h-3 bg-muted/50 rounded" />
          <div className="col-span-2 h-3 bg-muted/50 rounded" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="grid grid-cols-12 p-4 md:p-6 gap-4 items-center">
              <div className="col-span-2 space-y-1">
                <div className="h-3 w-20 bg-muted/40 rounded" />
                <div className="h-3 w-14 bg-muted/30 rounded" />
              </div>
              <div className="col-span-1 flex justify-center">
                <div className="h-6 w-8 bg-muted/40 rounded" />
              </div>
              <div className="col-span-7 flex items-center justify-center gap-4">
                <div className="h-5 w-24 bg-muted/40 rounded" />
                <div className="h-6 w-12 bg-muted/50 rounded" />
                <div className="h-5 w-20 bg-muted/40 rounded" />
              </div>
              <div className="col-span-2 flex justify-end">
                <div className="h-8 w-24 bg-muted/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
