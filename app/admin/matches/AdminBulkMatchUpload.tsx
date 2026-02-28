"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importBulkMatchesFromJson } from "@/lib/actions/admin-matches"
import { DISPLAY_NAME_TO_EMBLEM } from "@/lib/team-short-names"
import { Upload } from "lucide-react"

/** JSON home/away에 넣을 팀 이름 (TEAM_LIST.md 표기, 가나다순) */
const TEAM_DISPLAY_NAMES = Object.keys(DISPLAY_NAME_TO_EMBLEM).sort((a, b) =>
  a.localeCompare(b, "ko")
)

type Props = {
  roundId: string
}

const JSON_FORMAT = `{
  "matches": [
    { "home": "인천 유나이티드", "away": "FC 서울", "date": "2026-02-28T14:00:00Z", "stadium": "인천축구전용" }
  ]
}`

export function AdminBulkMatchUpload({ roundId }: Props) {
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
      const result = await importBulkMatchesFromJson(roundId, text)
      setPending(false)
      if (result.ok) {
        setMessage({ type: "success", text: `${result.created}건 경기가 추가되었습니다.` })
        router.refresh()
      } else {
        setMessage({ type: "error", text: result.error })
      }
    } catch (err) {
      setPending(false)
      setMessage({ type: "error", text: "파일을 읽는 중 오류가 발생했습니다." })
    }
  }

  return (
    <div className="mt-4 p-4 border border-border bg-card/30">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
        JSON 파일으로 일괄 추가
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        아래 형식의 JSON 파일을 선택하면 현재 선택된 라운드에 경기가 일괄 추가됩니다. 팀은 <strong>TEAM_LIST.md</strong> 표기(경남 FC, 인천 유나이티드 등)로 적어 주세요.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          disabled={pending}
          className="hidden"
          id="bulk-match-json"
        />
        <label
          htmlFor="bulk-match-json"
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
          사용 가능한 팀 이름 (home/away에 TEAM_LIST.md 표기 사용)
        </summary>
        <p className="mt-2 text-[10px] text-muted-foreground font-mono">
          {TEAM_DISPLAY_NAMES.join(", ")}
        </p>
      </details>
      <details className="mt-3">
        <summary className="font-mono text-[10px] text-muted-foreground cursor-pointer">
          JSON 형식 예시
        </summary>
        <pre className="mt-2 p-2 bg-muted/50 border border-border text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(JSON.parse(JSON_FORMAT), null, 2)}
        </pre>
      </details>
    </div>
  )
}
