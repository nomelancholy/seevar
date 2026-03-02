"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importBulkRefereesFromJson } from "@/lib/actions/admin-referees"
import { Upload } from "lucide-react"

const JSON_FORMAT = `{
  "referees": [
    { "name": "고형진", "slug": "go-hyeongjin", "link": "https://..." },
    { "name": "설태환", "slug": "seol-taehwan" }
  ]
}`

export function AdminBulkRefereeUpload() {
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
      const result = await importBulkRefereesFromJson(text)
      setPending(false)
      if (result.ok) {
        setMessage({
          type: "success",
          text: `추가 ${result.created}건, 건너뜀 ${result.skipped}건 (이미 존재하는 슬러그 제외).`,
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
    <div className="p-4 border border-border bg-card/30">
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
        심판 정보 JSON 일괄 등록
      </h4>
      <p className="text-xs text-muted-foreground mb-3">
        아래 형식의 JSON 파일을 선택하면 심판이 일괄 등록됩니다. <strong>name</strong> 필수, slug·link는 생략 가능(이미 존재하는 slug는 건너뜀).
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
