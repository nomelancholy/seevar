import { FAN_PERSPECTIVE_LABEL } from "@/lib/utils/stats"

type PerspectiveRow = {
  key: "HOME" | "AWAY" | "NEUTRAL"
  average: number | null
  count: number
}

type Props = {
  /** 인덱스 0 = 1점 … 4 = 5점 */
  distribution: [number, number, number, number, number]
  perspectives: PerspectiveRow[]
  /** 홈·원정·제3자 팬 평균을 같은 비중으로 합친 값 */
  balancedRating: number | null
  totalVotes: number
  /** 시즌별 평점 (최신순). 2개 시즌 이상일 때만 표시 */
  seasons: Array<{ year: number; average: number; count: number }>
}

/** 평점이 "어떻게" 나왔는지 보여주는 보조 지표: 분포, 팬 시점별 평균, 시즌 추이 */
export function RefereeRatingInsights({
  distribution,
  perspectives,
  balancedRating,
  totalVotes,
  seasons,
}: Props) {
  if (totalVotes === 0) return null
  const maxBucket = Math.max(...distribution, 1)

  return (
    <div className="mt-6 md:mt-8 border-t border-border pt-4 md:pt-6 space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div>
          <h3 className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-widest mb-3">
            평점 분포
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star - 1]
              const percent = Math.round((count / totalVotes) * 100)
              return (
                <div key={star} className="flex items-center gap-3 font-mono text-xs md:text-sm">
                  <span className="w-8 shrink-0 text-muted-foreground">{star}점</span>
                  <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full ${star >= 4 ? "bg-primary" : star <= 2 ? "bg-destructive" : "bg-muted-foreground/80"}`}
                      style={{ width: `${(count / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                    {count.toLocaleString()}건 · {percent}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-widest mb-3">
            팬 시점별 평점
          </h3>
          <div className="space-y-2">
            {perspectives.map((row) => (
              <div key={row.key} className="flex items-center gap-3 font-mono text-xs md:text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">
                  {FAN_PERSPECTIVE_LABEL[row.key]}
                </span>
                <div className="flex-1 h-2 bg-muted/50 overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${row.average != null ? (row.average / 5) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right tabular-nums">
                  <span className="font-bold">{row.average != null ? row.average.toFixed(1) : "—"}</span>
                  <span className="text-muted-foreground"> ({row.count.toLocaleString()})</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border/50 pt-3">
            <span className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-widest">
              균형 평점
            </span>
            <span className="text-xl md:text-2xl font-black italic font-mono">
              {balancedRating != null ? balancedRating.toFixed(1) : "—"}
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] md:text-xs text-muted-foreground leading-relaxed">
            홈팀·원정팀·제3자 팬의 평균을 같은 비중으로 합친 값입니다. 한쪽 팬이 몰려서 평가한
            경기의 쏠림을 덜어내고 볼 수 있습니다.
            {balancedRating == null && " 두 시점 이상의 평가가 모이면 표시됩니다."}
          </p>
        </div>
      </div>

      {seasons.length >= 2 && (
        <div>
          <h3 className="font-mono text-xs md:text-sm text-muted-foreground uppercase tracking-widest mb-3">
            시즌별 평점
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {seasons.map((season) => (
              <div key={season.year} className="bg-card/30 p-3 md:p-4 border border-border/50 text-center">
                <p className="font-mono text-[10px] md:text-xs text-muted-foreground mb-1 md:mb-2">
                  {season.year}
                </p>
                <p className="text-2xl md:text-3xl font-black italic font-mono">
                  {season.average.toFixed(1)}
                </p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1 font-mono">
                  평가 {season.count.toLocaleString()}건
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
