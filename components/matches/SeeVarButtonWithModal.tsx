"use client"

import { useState } from "react"
import { CreateVarMomentModal } from "./CreateVarMomentModal"

type Props = {
  matchId: string
  variant?: "live" | "finished"
  className?: string
}

export function SeeVarButtonWithModal({ matchId, variant = "finished", className }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const baseClass =
    "border border-border bg-primary text-primary-foreground font-black px-6 md:px-8 py-2.5 md:py-3 text-xs md:text-sm tracking-tighter italic hover:scale-105 transition-transform"
  const liveClass = variant === "live" ? "shadow-[0_0_20px_rgba(0,255,65,0.3)]" : ""
  const combinedClass = [baseClass, liveClass, className].filter(Boolean).join(" ")

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={combinedClass}
      >
        SEE VAR
      </button>
      <CreateVarMomentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        matchId={matchId}
      />
    </>
  )
}
