"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importBulkMatchesFromJsonMulti } from "@/lib/actions/admin-matches"
import { Loader2, Upload } from "lucide-react"

const FILE_RULE = "k1-2026-r1.json, k2-2026-r2.json … (k1=K리그1, k2=K리그2, 연도 4자리, rN=라운드 번호)"

type ResultItem =
  | { filename: string; ok: true; created: number }
  | { filename: string; ok: false; error: string }

export default function AdminBulkMatchUploadMulti() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<string[]>([])
  const [results, setResults] = useState<ResultItem[]>([])

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    e.target.value = ""
    setResults([])
    if (!fileList?.length) return

    const files: { filename: string; jsonText: string }[] = []
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (!file.name.endsWith(".json") && file.type !== "application/json") continue
      try {
        const jsonText = await file.text()
        files.push({ filename: file.name, jsonText })
      } catch {
        setResults([{ filename: file.name, ok: false, error: "파일을 읽을 수 없습니다." }])
        return
      }
    }

    if (files.length === 0) {
      setResults([{ filename: "(선택된 파일 없음)", ok: false, error: "JSON 파일(.json)만 처리됩니다." }])
      return
    }

    setProcessingFiles(files.map((f) => f.filename))
    setPending(true)
    // 진행 UI가 먼저 화면에 그려지도록 한 프레임 뒤에 서버 요청 실행 (33개 등 대량 시 진행 중 메시지가 보이도록)
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      const data = await importBulkMatchesFromJsonMulti(files)
      const nextResults = data?.results
      setResults(Array.isArray(nextResults) ? nextResults : [])
      router.refresh()
    } catch {
      setResults([{ filename: "(전체)", ok: false, error: "요청 처리 중 오류가 발생했습니다." }])
    } finally {
      setPending(false)
      setProcessingFiles([])
    }
  }

  return (
    <div className="mb-6 p-4 border border-border bg-card/30">
      {pending && processingFiles.length > 0 && (
        <div className="mb-4 rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3 text-sm">
            <Loader2 className="size-5 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              DB 저장 진행 중 — {processingFiles.length}개 파일 처리 중입니다. 잠시만 기다려 주세요.
            </span>
          </div>
          <ul className="mt-3 max-h-40 overflow-y-auto space-y-1 font-mono text-xs text-amber-700 dark:text-amber-300">
            {processingFiles.map((name, i) => (
              <li key={`${name}-${i}`}>· {name}</li>
            ))}
          </ul>
        </div>
      )}
      <h4 className="font-mono text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
        리그 전체 경기 일정 한번에 넣기
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        파일명 규칙에 맞는 JSON 파일을 여러 개 선택하면, 파일명에서 리그·연도·라운드를 읽어 해당 라운드에 일괄 추가합니다. 형식은 한 라운드씩 넣을 때와 동일합니다 (matches 배열에 home, away, date, stadium).
      </p>
      <p className="text-[10px] text-muted-foreground font-mono mb-3">
        {FILE_RULE}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".json,application/json"
          multiple
          onChange={handleFiles}
          disabled={pending}
          className="hidden"
          id="bulk-match-json-multi"
        />
        <label
          htmlFor="bulk-match-json-multi"
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs cursor-pointer hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="size-4" />
          {pending ? "저장 중…" : "JSON 파일 여러 개 선택"}
        </label>
      </div>
      {results.length > 0 && (
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {results.map((r, i) => (
            <li key={`${r.filename}-${i}`}>
              <span className="text-muted-foreground">{r.filename}</span>
              {r.ok ? (
                <span className="text-green-600 dark:text-green-400 ml-2">
                  {r.created}건 추가
                </span>
              ) : (
                <span className="text-destructive ml-2">{r.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
