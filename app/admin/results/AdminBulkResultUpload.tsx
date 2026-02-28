"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importBulkMatchResultsFromJson } from "@/lib/actions/admin-results"
import { Upload } from "lucide-react"

const JSON_FORMAT = `{
  "results": [
    {
      "matchId": "경기ID(cuid)",
      "status": "FINISHED",
      "scoreHome": 2,
      "scoreAway": 1,
      "refereeCards": [
        { "refereeSlug": "go-hyeongjin", "role": "MAIN", "homeYellowCards": 2, "awayYellowCards": 1, "homeRedCards": 0, "awayRedCards": 0 }
      ]
    },
    {
      "matchIdentifier": { "year": 2026, "leagueSlug": "kleague1", "roundNumber": 1, "roundOrder": 2 },
      "status": "FINISHED",
      "scoreHome": 1,
      "scoreAway": 1
    }
  ]
}`

export function AdminBulkResultUpload() {
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
      const result = await importBulkMatchResultsFromJson(text)
      setPending(false)
      if (result.ok) {
        setMessage({
          type: "success",
          text: `${result.updated}건 경기 결과가 반영되었습니다. 심판 카드가 있으면 RefereeTeamStat에도 반영됩니다.`,
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
        JSON 파일으로 경기 결과 일괄 반영
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        경기(matchId 또는 matchIdentifier), 상태·스코어, 선택적으로 심판별 옐로/레드 카드(refereeCards)를 넣으면 일괄 반영됩니다. 카드 정보는 RefereeTeamStat에 자동 반영됩니다.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="bulk-result-json"
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={pending}
          className="hidden"
        />
        <label
          htmlFor="bulk-result-json"
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
