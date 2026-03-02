"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importBulkRefereeAssignmentsFromJson } from "@/lib/actions/admin-matches"
import { Upload } from "lucide-react"

/** role 값: MAIN(주심), ASSISTANT(부심), VAR(VAR), WAITING(대기심). 부심·VAR는 최대 2명, 주심·대기심은 1명. */
const ROLE_GUIDE = [
  { role: "MAIN", label: "주심", max: 1 },
  { role: "ASSISTANT", label: "부심", max: 2 },
  { role: "VAR", label: "VAR", max: 2 },
  { role: "WAITING", label: "대기심", max: 1 },
]

const JSON_FORMAT = `{
  "assignments": [
    { "matchId": "경기ID(cuid)", "refereeSlug": "go-hyeongjin", "role": "MAIN" },
    { "matchIdentifier": { "year": 2026, "leagueSlug": "K-league-1", "roundNumber": 14, "homeTeam": "인천", "awayTeam": "서울" }, "refereeSlug": "seol-taehwan", "role": "VAR" },
    { "matchIdentifier": { "year": 2026, "leagueSlug": "K-league-1", "roundNumber": 14, "roundOrder": 1 }, "refereeSlug": "referee-slug-1", "role": "ASSISTANT" },
    { "matchIdentifier": { "year": 2026, "leagueSlug": "K-league-1", "roundNumber": 14, "roundOrder": 2 }, "refereeSlug": "referee-slug-2", "role": "WAITING" }
  ]
}`

export function AdminBulkRefereeAssignmentUpload() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    setMessage(null)
    if (!file) return
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setMessage({ type: "error", text: "JSON 파일(.json)만 업로드할 수 있습니다." })
      return
    }
    setPending(true)
    try {
      const text = await file.text()
      const result = await importBulkRefereeAssignmentsFromJson(text)
      setPending(false)
      if (result.ok) {
        setMessage({
          type: "success",
          text: `추가 ${result.created}건, 건너뜀 ${result.skipped}건 (이미 배정된 건 제외). RefereeStats·RefereeTeamStat에 반영되었습니다.`,
        })
        router.refresh()
      } else {
        setMessage({ type: "error", text: result.error })
      }
    } catch {
      setPending(false)
      setMessage({ type: "error", text: "파일을 읽는 중 오류가 발생했습니다." })
    }
  }

  return (
    <div className="mt-6 p-4 border border-border bg-card/30">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
        JSON 파일으로 심판 배정 일괄 추가
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        경기(matchId 또는 matchIdentifier)와 심판(refereeSlug), 역할(role)을 배열로 넣으면 일괄 배정됩니다. matchIdentifier는 (1) year, leagueSlug, roundNumber, homeTeam, awayTeam(약칭 예: 인천·서울) 또는 (2) year, leagueSlug, roundNumber, roundOrder(경기 숫자, 표에서 일자 옆 1·2·3…) 둘 다 사용 가능합니다. 배정 시 RefereeStats·RefereeTeamStat에 자동 반영됩니다.
      </p>
      <p className="text-[10px] text-muted-foreground font-mono mb-3">
        <strong>role 값:</strong>{" "}
        {ROLE_GUIDE.map((r) => `${r.role}(${r.label}, 최대 ${r.max}명)`).join(", ")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="bulk-referee-json"
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={pending}
          className="hidden"
        />
        <label
          htmlFor="bulk-referee-json"
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs cursor-pointer hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="size-4" />
          {pending ? "처리 중…" : "JSON 파일 선택"}
        </label>
      </div>
      {message && (
        <p
          className={`mt-2 font-mono text-xs ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}
      <details className="mt-3">
        <summary className="font-mono text-[10px] text-muted-foreground cursor-pointer">
          role 값 안내 및 JSON 형식 예시
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <p className="font-mono text-[10px] font-bold text-muted-foreground mb-1">matchIdentifier (둘 중 하나)</p>
            <ul className="font-mono text-[10px] text-muted-foreground list-disc list-inside space-y-0.5 mb-2">
              <li><strong>homeTeam, awayTeam</strong> — year, leagueSlug, roundNumber, homeTeam, awayTeam (약칭 예: 인천·서울)</li>
              <li><strong>roundOrder</strong> — year, leagueSlug, roundNumber, roundOrder (경기 숫자. 표에서 일자 옆 1, 2, 3…)</li>
            </ul>
            <p className="font-mono text-[10px] font-bold text-muted-foreground mb-1">role 입력값 (전부 대문자)</p>
            <ul className="font-mono text-[10px] text-muted-foreground list-disc list-inside space-y-0.5">
              <li><strong>MAIN</strong> — 주심 (1명)</li>
              <li><strong>ASSISTANT</strong> — 부심 (최대 2명)</li>
              <li><strong>VAR</strong> — VAR (최대 2명)</li>
              <li><strong>WAITING</strong> — 대기심 (1명)</li>
            </ul>
          </div>
          <pre className="p-2 bg-muted/50 border border-border text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {JSON_FORMAT}
          </pre>
        </div>
      </details>
    </div>
  )
}
