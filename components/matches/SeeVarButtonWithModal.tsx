"use client"

import { useState } from "react"
import { CreateVarMomentModal } from "./CreateVarMomentModal"
import { LoginRequiredDialog } from "@/components/auth/LoginRequiredDialog"

type Props = {
  matchId: string
  variant?: "live" | "finished"
  className?: string
  isLoggedIn?: boolean
}

export function SeeVarButtonWithModal({
  matchId,
  variant = "finished",
  className,
  isLoggedIn = false,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  const baseClass =
    "border border-border bg-primary text-primary-foreground font-black px-8 md:px-10 py-4 md:py-5 text-sm md:text-base tracking-tighter italic hover:scale-105 transition-transform"
  const liveClass = variant === "live" ? "shadow-[0_0_20px_rgba(0,255,65,0.3)]" : ""
  const combinedClass = [baseClass, liveClass, className].filter(Boolean).join(" ")

  const handleClick = () => {
    if (!isLoggedIn) {
      setLoginOpen(true)
      return
    }
    setModalOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={combinedClass}
      >
        판정 이의 제기
      </button>
      <CreateVarMomentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        matchId={matchId}
      />
      <LoginRequiredDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        message="판정 이의 제기를 하려면 먼저 로그인 해주세요."
      />
    </>
  )
}

