import Link from "next/link"

export const metadata = {
  title: "Whistle Recharge | See VAR",
  description: "호각 충전",
}

export default function WhistleRechargePage() {
  return (
    <main className="py-8 md:py-12 max-w-2xl">
      <h1 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase mb-6">
        Whistle Recharge
      </h1>
      <div className="ledger-surface p-6 md:p-8 rounded-md space-y-6">
        <p className="text-muted-foreground">
          호각 충전 및 사용 내역은 추후 연동됩니다.
        </p>
        <Link
          href="/"
          className="text-[10px] font-mono font-bold text-primary hover:underline uppercase tracking-widest"
        >
          ← 홈으로
        </Link>
      </div>
    </main>
  )
}
