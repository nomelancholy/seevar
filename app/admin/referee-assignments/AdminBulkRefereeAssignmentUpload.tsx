"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importBulkRefereeAssignmentsFromJson } from "@/lib/actions/admin-matches"
import { Upload } from "lucide-react"

const JSON_FORMAT = `{
  "assignments": [
    { "matchId": "경기ID(cuid)", "refereeSlug": "go-hyeongjin", "role": "MAIN" },
    { "matchIdentifier": { "year": 2026, "leagueSlug": "kleague1", "roundNumber": 1, "roundOrder": 1 }, "refereeSlug": "seol-taehwan", "role": "VAR" }
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
      <p className="text-xs text-muted-foreground mb-3">
        경기(matchId 또는 matchIdentifier)와 심판(refereeSlug), 역할(role)을 배열로 넣으면 일괄 배정됩니다. 배정 시 RefereeStats·RefereeTeamStat에 자동 반영됩니다.
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
          JSON 형식 예시
        </summary>
        <pre className="mt-2 p-2 bg-muted/50 border border-border text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {JSON_FORMAT}
        </pre>
      </details>
    </div>
  )
}
