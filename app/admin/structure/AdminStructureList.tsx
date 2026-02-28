"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  setRoundFocus,
  updateSeason,
  updateLeague,
  updateRound,
  updateRoundLinks,
  deleteSeason,
  deleteLeague,
  deleteRound,
  createLeague,
  createRound,
} from "@/lib/actions/admin-matches"

type RoundWithCount = {
  id: string
  number: number
  slug: string
  isFocus: boolean
  leagueId: string
  youtubeUrl?: string | null
  instagramUrl?: string | null
  _count: { matches: number }
}

type LeagueWithRounds = {
  id: string
  name: string
  slug: string
  seasonId: string
  rounds: RoundWithCount[]
}

type SeasonWithStructure = {
  id: string
  year: number
  leagues: LeagueWithRounds[]
}

type Props = {
  seasons: SeasonWithStructure[]
}

type Editing =
  | { type: "season"; id: string; value: string }
  | { type: "league"; id: string; name: string; slug: string }
  | { type: "round"; id: string; value: string }

export function AdminStructureList({ seasons }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [addingLeagueToSeasonId, setAddingLeagueToSeasonId] = useState<string | null>(null)
  const [addingRoundToLeagueId, setAddingRoundToLeagueId] = useState<string | null>(null)
  const [newLeagueName, setNewLeagueName] = useState("")
  const [newLeagueSlug, setNewLeagueSlug] = useState("")
  const [newRoundNumber, setNewRoundNumber] = useState("")
  const [linkDrafts, setLinkDrafts] = useState<
    Record<string, { youtubeUrl: string; instagramUrl: string }>
  >({})

  async function handleSetFocus(roundId: string, isFocus: boolean) {
    setError(null)
    setPending(roundId)
    const result = await setRoundFocus(roundId, isFocus)
    setPending(null)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  async function handleUpdateSeason(seasonId: string, value: string) {
    const y = parseInt(value, 10)
    if (Number.isNaN(y)) {
      setError("연도를 숫자로 입력해 주세요.")
      return
    }
    setError(null)
    setPending(seasonId)
    const result = await updateSeason(seasonId, y)
    setPending(null)
    if (result.ok) {
      setEditing(null)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleUpdateLeague(leagueId: string, name: string, slug: string) {
    if (!name.trim()) {
      setError("리그 이름을 입력해 주세요.")
      return
    }
    const slugNorm = slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    setError(null)
    setPending(leagueId)
    const result = await updateLeague(leagueId, { name: name.trim(), slug: slugNorm })
    setPending(null)
    if (result.ok) {
      setEditing(null)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleUpdateRound(roundId: string, value: string) {
    const num = parseInt(value, 10)
    if (Number.isNaN(num) || num < 1) {
      setError("라운드 번호를 1 이상으로 입력해 주세요.")
      return
    }
    setError(null)
    setPending(roundId)
    const result = await updateRound(roundId, num)
    setPending(null)
    if (result.ok) {
      setEditing(null)
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleDeleteSeason(seasonId: string) {
    if (!confirm("이 시즌을 삭제할까요? (하위 리그가 없을 때만 가능합니다)")) return
    setError(null)
    setPending(seasonId)
    const result = await deleteSeason(seasonId)
    setPending(null)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  async function handleDeleteLeague(leagueId: string) {
    if (!confirm("이 리그를 삭제할까요? (하위 라운드가 없을 때만 가능합니다)")) return
    setError(null)
    setPending(leagueId)
    const result = await deleteLeague(leagueId)
    setPending(null)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  async function handleDeleteRound(roundId: string, matchCount: number) {
    if (matchCount > 0) return
    if (!confirm("이 라운드를 삭제할까요?")) return
    setError(null)
    setPending(roundId)
    const result = await deleteRound(roundId)
    setPending(null)
    if (result.ok) router.refresh()
    else setError(result.error)
  }

  function getLinkDraft(round: RoundWithCount) {
    const existing = linkDrafts[round.id]
    if (existing) return existing
    return {
      youtubeUrl: round.youtubeUrl ?? "",
      instagramUrl: round.instagramUrl ?? "",
    }
  }

  async function handleUpdateRoundLinksClick(round: RoundWithCount) {
    const draft = getLinkDraft(round)
    setError(null)
    setPending(round.id)
    const result = await updateRoundLinks(round.id, {
      youtubeUrl: draft.youtubeUrl,
      instagramUrl: draft.instagramUrl,
    })
    setPending(null)
    if (result.ok) {
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleAddLeague(seasonId: string) {
    const name = newLeagueName.trim()
    const slug = newLeagueSlug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") ||
      name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    if (!name) {
      setError("리그 이름을 입력해 주세요.")
      return
    }
    if (!slug) {
      setError("리그 슬러그를 입력해 주세요.")
      return
    }
    setError(null)
    setPending(seasonId)
    const result = await createLeague({ seasonId, name, slug })
    setPending(null)
    if (result.ok) {
      setAddingLeagueToSeasonId(null)
      setNewLeagueName("")
      setNewLeagueSlug("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  async function handleAddRound(leagueId: string) {
    const num = parseInt(newRoundNumber, 10)
    if (Number.isNaN(num) || num < 1) {
      setError("라운드 번호를 1 이상으로 입력해 주세요.")
      return
    }
    setError(null)
    setPending(leagueId)
    const result = await createRound({ leagueId, number: num })
    setPending(null)
    if (result.ok) {
      setAddingRoundToLeagueId(null)
      setNewRoundNumber("")
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  if (seasons.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        등록된 시즌이 없습니다. 아래에서 시즌(연도)을 추가하세요.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="font-mono text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
          {error}
        </p>
      )}
      <ul className="space-y-4">
        {seasons.map((s) => (
          <li key={s.id}>
            <div className="flex flex-wrap items-center gap-2">
              {editing?.type === "season" && editing.id === s.id ? (
                <>
                  <span className="font-mono text-sm text-muted-foreground">시즌</span>
                  <input
                    type="number"
                    min={1990}
                    max={2100}
                    value={editing.value}
                    onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                    className="w-20 bg-background border border-border px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateSeason(s.id, editing.value)}
                    disabled={!!pending}
                    className="font-mono text-[10px] text-primary hover:underline disabled:opacity-50"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(null); setError(null) }}
                    className="font-mono text-[10px] text-muted-foreground hover:underline"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span className="font-mono text-sm font-bold text-foreground">시즌 {s.year}</span>
                  <button
                    type="button"
                    onClick={() => setEditing({ type: "season", id: s.id, value: String(s.year) })}
                    disabled={!!pending}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSeason(s.id)}
                    disabled={!!pending}
                    className="font-mono text-[10px] text-destructive hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>

            <div className="ml-4 mt-1.5">
              {addingLeagueToSeasonId === s.id ? (
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                  <input
                    type="text"
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    placeholder="리그 이름"
                    className="w-32 bg-background border border-border px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={newLeagueSlug}
                    onChange={(e) => setNewLeagueSlug(e.target.value)}
                    placeholder="슬러그"
                    className="w-28 bg-background border border-border px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddLeague(s.id)}
                    disabled={!!pending}
                    className="text-primary hover:underline disabled:opacity-50"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingLeagueToSeasonId(null)
                      setNewLeagueName("")
                      setNewLeagueSlug("")
                      setError(null)
                    }}
                    className="text-muted-foreground hover:underline"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingLeagueToSeasonId(s.id)
                    setNewLeagueName("")
                    setNewLeagueSlug("")
                    setAddingRoundToLeagueId(null)
                  }}
                  disabled={!!pending}
                  className="font-mono text-[10px] text-primary hover:underline disabled:opacity-50"
                >
                  + 리그 추가
                </button>
              )}
            </div>

            {s.leagues.length === 0 ? (
              <p className="ml-4 mt-1 font-mono text-[10px] text-muted-foreground">리그 없음</p>
            ) : (
              <ul className="mt-2 ml-4 space-y-2">
                {s.leagues.map((l) => (
                  <li key={l.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      {editing?.type === "league" && editing.id === l.id ? (
                        <>
                          <input
                            type="text"
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            placeholder="리그 이름"
                            className="w-32 bg-background border border-border px-2 py-1 text-xs"
                          />
                          <input
                            type="text"
                            value={editing.slug}
                            onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                            placeholder="슬러그"
                            className="w-28 bg-background border border-border px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateLeague(l.id, editing.name, editing.slug)}
                            disabled={!!pending}
                            className="font-mono text-[10px] text-primary hover:underline disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditing(null); setError(null) }}
                            className="font-mono text-[10px] text-muted-foreground hover:underline"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="font-mono text-xs text-muted-foreground">
                            {l.name} <span className="opacity-70">({l.slug})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditing({ type: "league", id: l.id, name: l.name, slug: l.slug })}
                            disabled={!!pending}
                            className="font-mono text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLeague(l.id)}
                            disabled={!!pending}
                            className="font-mono text-[10px] text-destructive hover:underline disabled:opacity-50"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>

                    <div className="ml-4 mt-1">
                      {addingRoundToLeagueId === l.id ? (
                        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                          <input
                            type="number"
                            min={1}
                            value={newRoundNumber}
                            onChange={(e) => setNewRoundNumber(e.target.value)}
                            placeholder="라운드 번호"
                            className="w-20 bg-background border border-border px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddRound(l.id)}
                            disabled={!!pending}
                            className="text-primary hover:underline disabled:opacity-50"
                          >
                            추가
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingRoundToLeagueId(null)
                              setNewRoundNumber("")
                              setError(null)
                            }}
                            className="text-muted-foreground hover:underline"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAddingRoundToLeagueId(l.id)
                            setNewRoundNumber("")
                            setAddingLeagueToSeasonId(null)
                          }}
                          disabled={!!pending}
                          className="font-mono text-[10px] text-primary hover:underline disabled:opacity-50"
                        >
                          + 라운드 추가
                        </button>
                      )}
                    </div>

                    {l.rounds.length === 0 ? (
                      <p className="ml-4 mt-0.5 font-mono text-[10px] text-muted-foreground/80">라운드 없음</p>
                    ) : (
                      <ul className="mt-1 ml-4 flex flex-wrap gap-x-3 gap-y-1 items-center">
                        {l.rounds.map((r) => {
                          const linkDraft = getLinkDraft(r)
                          return (
                            <li
                              key={r.id}
                              className="flex flex-col gap-1 font-mono text-[10px] text-muted-foreground"
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                {editing?.type === "round" && editing.id === r.id ? (
                                  <>
                                    <input
                                      type="number"
                                      min={1}
                                      value={editing.value}
                                      onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                      className="w-14 bg-background border border-border px-1.5 py-0.5 text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRound(r.id, editing.value)}
                                      disabled={!!pending}
                                      className="text-primary hover:underline disabled:opacity-50"
                                    >
                                      저장
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditing(null)
                                        setError(null)
                                      }}
                                      className="text-muted-foreground hover:underline"
                                    >
                                      취소
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span>{r.slug}</span>
                                    {r.isFocus && <span className="text-primary">(포커스)</span>}
                                    <button
                                      type="button"
                                      onClick={() => handleSetFocus(r.id, !r.isFocus)}
                                      disabled={!!pending}
                                      className="text-primary hover:underline disabled:opacity-50"
                                    >
                                      {r.isFocus ? "포커스 해제" : "포커스로 설정"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEditing({ type: "round", id: r.id, value: String(r.number) })
                                      }
                                      disabled={!!pending}
                                      className="hover:text-foreground disabled:opacity-50"
                                    >
                                      번호 수정
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRound(r.id, r._count.matches)}
                                      disabled={!!pending || r._count.matches > 0}
                                      title={r._count.matches > 0 ? "경기가 있는 라운드는 삭제할 수 없습니다" : "삭제"}
                                      className="text-destructive hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      삭제
                                    </button>
                                  </>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pl-4">
                                <input
                                  type="text"
                                  placeholder="YouTube 링크"
                                  value={linkDraft.youtubeUrl}
                                  onChange={(e) =>
                                    setLinkDrafts((prev) => ({
                                      ...prev,
                                      [r.id]: {
                                        youtubeUrl: e.target.value,
                                        instagramUrl: linkDraft.instagramUrl,
                                      },
                                    }))
                                  }
                                  className="min-w-[140px] bg-background border border-border px-1.5 py-0.5 text-[10px]"
                                />
                                <input
                                  type="text"
                                  placeholder="Instagram 링크"
                                  value={linkDraft.instagramUrl}
                                  onChange={(e) =>
                                    setLinkDrafts((prev) => ({
                                      ...prev,
                                      [r.id]: {
                                        youtubeUrl: linkDraft.youtubeUrl,
                                        instagramUrl: e.target.value,
                                      },
                                    }))
                                  }
                                  className="min-w-[140px] bg-background border border-border px-1.5 py-0.5 text-[10px]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRoundLinksClick(r)}
                                  disabled={!!pending}
                                  className="text-primary hover:underline disabled:opacity-50"
                                >
                                  링크 저장
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
