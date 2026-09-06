"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Copy, Search, UserCheck, Users } from "lucide-react"
import {
  copySeasonRoster,
  setRefereeSeasonActive,
  setTeamSeasonLeague,
} from "@/lib/actions/admin-season-rosters"

type SeasonRoster = {
  id: string
  year: number
  leagues: Array<{
    id: string
    name: string
    slug: string
    teamIds: string[]
  }>
  refereeIds: string[]
}

type Team = {
  id: string
  name: string
  slug: string | null
  emblemPath: string | null
}

type Referee = {
  id: string
  name: string
  slug: string
}

type Props = {
  seasons: SeasonRoster[]
  teams: Team[]
  referees: Referee[]
}

export function AdminSeasonRosterManager({ seasons, teams, referees }: Props) {
  const router = useRouter()
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "")
  const [teamQuery, setTeamQuery] = useState("")
  const [refereeQuery, setRefereeQuery] = useState("")
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const season = seasons.find((item) => item.id === seasonId) ?? seasons[0]
  const previousSeason = [...seasons]
    .filter((item) => item.year < season.year)
    .sort((a, b) => b.year - a.year)[0]

  const teamLeagueById = useMemo(() => {
    const result = new Map<string, string>()
    for (const league of season.leagues) {
      for (const teamId of league.teamIds) {
        if (!result.has(teamId)) result.set(teamId, league.id)
      }
    }
    return result
  }, [season])

  const duplicateTeamIds = useMemo(() => {
    const counts = new Map<string, number>()
    for (const league of season.leagues) {
      for (const teamId of league.teamIds) counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
    }
    return new Set(Array.from(counts).filter(([, count]) => count > 1).map(([id]) => id))
  }, [season])

  const activeRefereeIds = useMemo(() => new Set(season.refereeIds), [season.refereeIds])
  const normalizedTeamQuery = teamQuery.trim().toLocaleLowerCase("ko")
  const normalizedRefereeQuery = refereeQuery.trim().toLocaleLowerCase("ko")
  const filteredTeams = teams.filter((team) =>
    `${team.name} ${team.slug ?? ""}`.toLocaleLowerCase("ko").includes(normalizedTeamQuery)
  )
  const filteredReferees = referees.filter((referee) =>
    `${referee.name} ${referee.slug}`.toLocaleLowerCase("ko").includes(normalizedRefereeQuery)
  )

  async function handleTeamLeagueChange(teamId: string, leagueId: string) {
    setMessage(null)
    setPendingKey(`team:${teamId}`)
    const result = await setTeamSeasonLeague({
      teamId,
      seasonId: season.id,
      leagueId: leagueId || null,
    })
    setPendingKey(null)
    if (result.ok) router.refresh()
    else setMessage({ type: "error", text: result.error })
  }

  async function handleRefereeToggle(refereeId: string, active: boolean) {
    setMessage(null)
    setPendingKey(`referee:${refereeId}`)
    const result = await setRefereeSeasonActive({ refereeId, seasonId: season.id, active })
    setPendingKey(null)
    if (result.ok) router.refresh()
    else setMessage({ type: "error", text: result.error })
  }

  async function handleCopyPrevious() {
    if (!previousSeason) return
    if (
      !confirm(
        `${previousSeason.year} 시즌 팀·심판 명단을 ${season.year} 시즌으로 복사할까요? 현재 ${season.year} 설정은 교체됩니다.`
      )
    ) return

    setMessage(null)
    setPendingKey("copy")
    const result = await copySeasonRoster({
      sourceSeasonId: previousSeason.id,
      targetSeasonId: season.id,
    })
    setPendingKey(null)
    if (result.ok) {
      setMessage({
        type: "success",
        text: `${previousSeason.year} 시즌에서 팀 ${result.teams}개, 심판 ${result.referees}명을 복사했습니다. 승강 팀과 신규·제외 심판만 조정하세요.`,
      })
      router.refresh()
    } else {
      setMessage({ type: "error", text: result.error })
    }
  }

  const assignedTeamCount = teamLeagueById.size

  return (
    <div className="space-y-8">
      <section className="ledger-surface border border-border p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <label className="font-mono text-xs">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              관리할 시즌
            </span>
            <select
              value={season.id}
              onChange={(event) => {
                setSeasonId(event.target.value)
                setMessage(null)
              }}
              className="min-w-36 bg-background border border-border px-3 py-2 text-sm font-bold focus:border-primary outline-none"
            >
              {seasons.map((item) => (
                <option key={item.id} value={item.id}>{item.year} 시즌</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleCopyPrevious}
            disabled={!previousSeason || pendingKey !== null}
            className="inline-flex items-center justify-center gap-2 border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="size-3.5" />
            {pendingKey === "copy"
              ? "복사 중"
              : previousSeason
                ? `${previousSeason.year} 명단 복사`
                : "이전 시즌 없음"}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Summary label="리그" value={season.leagues.length} />
          <Summary label="소속 팀" value={assignedTeamCount} />
          <Summary label="미소속 팀" value={teams.length - assignedTeamCount} />
          <Summary label="활동 심판" value={activeRefereeIds.size} />
        </div>

        {season.leagues.length === 0 && (
          <p className="mt-4 flex items-center gap-2 text-destructive font-mono text-xs">
            <AlertCircle className="size-4" /> 이 시즌에 리그가 없습니다. 먼저 시즌·리그 관리에서 리그를 추가하세요.
          </p>
        )}
        {duplicateTeamIds.size > 0 && (
          <p className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-mono text-xs">
            <AlertCircle className="size-4" /> 같은 시즌의 여러 리그에 연결된 팀이 {duplicateTeamIds.size}개 있습니다. 아래에서 소속을 다시 선택하면 정리됩니다.
          </p>
        )}
        {message && (
          <p className={`mt-4 font-mono text-xs ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {message.text}
          </p>
        )}
      </section>

      <section className="ledger-surface border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider">
              <Users className="size-4" /> 팀 리그 소속
            </h3>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              한 팀은 같은 시즌에 하나의 리그에만 소속됩니다.
            </p>
          </div>
          <SearchInput value={teamQuery} onChange={setTeamQuery} placeholder="팀 검색" />
        </div>
        <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
          {filteredTeams.map((team) => {
            const key = `team:${team.id}`
            return (
              <div key={team.id} className="grid grid-cols-12 gap-3 items-center p-3 md:p-4 font-mono text-xs">
                <div className="col-span-7 md:col-span-6 min-w-0">
                  <p className="font-bold truncate">{team.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{team.slug ?? "슬러그 없음"}</p>
                </div>
                <div className="col-span-5 md:col-span-6">
                  <select
                    value={teamLeagueById.get(team.id) ?? ""}
                    onChange={(event) => handleTeamLeagueChange(team.id, event.target.value)}
                    disabled={pendingKey !== null || season.leagues.length === 0}
                    className={`w-full bg-background border px-2 py-1.5 text-xs outline-none disabled:opacity-50 ${duplicateTeamIds.has(team.id) ? "border-amber-500" : "border-border focus:border-primary"}`}
                  >
                    <option value="">미소속</option>
                    {season.leagues.map((league) => (
                      <option key={league.id} value={league.id}>{league.name}</option>
                    ))}
                  </select>
                  {pendingKey === key && <p className="mt-1 text-[9px] text-muted-foreground">저장 중…</p>}
                </div>
              </div>
            )
          })}
          {filteredTeams.length === 0 && <EmptyRow text="검색 결과가 없습니다." />}
        </div>
      </section>

      <section className="ledger-surface border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-wider">
              <UserCheck className="size-4" /> 시즌 활동 심판
            </h3>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              체크된 심판만 {season.year} 시즌 관리자 배정 후보에 나타납니다. 과거 기록은 유지됩니다.
            </p>
          </div>
          <SearchInput value={refereeQuery} onChange={setRefereeQuery} placeholder="심판 검색" />
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:[&>*]:border-b md:[&>*:nth-last-child(-n+2)]:border-b-0 divide-border max-h-[520px] overflow-y-auto">
          {filteredReferees.map((referee) => {
            const active = activeRefereeIds.has(referee.id)
            const key = `referee:${referee.id}`
            return (
              <label key={referee.id} className="flex items-center gap-3 p-3 md:p-4 border-border cursor-pointer hover:bg-muted/20">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => handleRefereeToggle(referee.id, event.target.checked)}
                  disabled={pendingKey !== null}
                  className="size-4 accent-primary"
                />
                <span className="min-w-0 font-mono text-xs">
                  <span className="block font-bold truncate">{referee.name}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {pendingKey === key ? "저장 중…" : referee.slug}
                  </span>
                </span>
              </label>
            )
          })}
          {filteredReferees.length === 0 && <EmptyRow text="검색 결과가 없습니다." />}
        </div>
      </section>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-muted/20 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-black">{value.toLocaleString()}</p>
    </div>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="relative block w-full md:w-56">
      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border pl-8 pr-3 py-2 font-mono text-xs outline-none focus:border-primary"
      />
    </label>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <div className="p-8 text-center font-mono text-xs text-muted-foreground">{text}</div>
}
