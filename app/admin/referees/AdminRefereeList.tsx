import { AdminRefereeAddForm } from "./AdminRefereeAddForm"
import { AdminBulkRefereeUpload } from "./AdminBulkRefereeUpload"
import { AdminRefereeRow } from "./AdminRefereeRow"

type Referee = {
  id: string
  name: string
  slug: string
  link: string | null
  _count: { matchReferees: number }
}

type Props = { referees: Referee[] }

export function AdminRefereeList({ referees }: Props) {
  return (
    <div className="space-y-6">
      <div className="ledger-surface border border-border p-4">
        <AdminRefereeAddForm />
      </div>
      <div className="ledger-surface border border-border p-4">
        <AdminBulkRefereeUpload />
      </div>
      <div className="ledger-surface border border-border overflow-hidden">
        <div className="grid grid-cols-12 gap-2 p-3 border-b border-border font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-card/50">
          <div className="col-span-3">이름</div>
          <div className="col-span-3">슬러그</div>
          <div className="col-span-4">링크</div>
          <div className="col-span-1 text-center">경기</div>
          <div className="col-span-1 text-right">작업</div>
        </div>
        <div className="divide-y divide-border">
          {referees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-xs">
              등록된 심판이 없습니다.
            </div>
          ) : (
            referees.map((r) => <AdminRefereeRow key={r.id} referee={r} />)
          )}
        </div>
      </div>
    </div>
  )
}
