"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ModalType = "terms" | "privacy" | null

export function LoginPolicyLinks() {
  const [openModal, setOpenModal] = useState<ModalType>(null)

  return (
    <>
      <p className="text-[8px] md:text-[9px] font-mono text-muted-foreground mt-6 text-center">
        By continuing, you agree to our{" "}
        <button
          type="button"
          onClick={() => setOpenModal("terms")}
          className="underline cursor-pointer hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Terms of Service
        </button>{" "}
        and{" "}
        <button
          type="button"
          onClick={() => setOpenModal("privacy")}
          className="underline cursor-pointer hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Privacy Policy
        </button>
        .
      </p>

      <Dialog open={openModal === "terms"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic uppercase tracking-tight">
              Terms of Service
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs font-mono text-muted-foreground space-y-4 leading-relaxed">
            <p>
              See VAR(이하 “서비스”) 이용약관에 동의합니다. 서비스를 이용함에 있어 회원은 본 약관 및
              개인정보처리방침을 준수해야 합니다.
            </p>
            <p>
              서비스는 축구 판정 아카이브 및 커뮤니티 제공을 목적으로 하며, 회원이 작성한 콘텐츠(댓글,
              모멘트 등)에 대한 책임은 회원에게 있습니다. 불법·욕설·스팸 등 부적절한 이용 시 서비스
              이용이 제한될 수 있습니다.
            </p>
            <p>
              서비스의 지식재산권은 운영자에게 있으며, 무단 복제·배포·상업적 이용을 금지합니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openModal === "privacy"} onOpenChange={(open) => !open && setOpenModal(null)}>
        <DialogContent className="max-w-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic uppercase tracking-tight">
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs font-mono text-muted-foreground space-y-4 leading-relaxed">
            <p>
              See VAR는 개인정보보호법 등 관련 법령에 따라 최소한의 개인정보만 수집·이용합니다.
            </p>
            <h4 className="text-foreground font-bold mt-4">1. 네이버 로그인 시 수집·이용 항목</h4>
            <p>
              <strong className="text-foreground">필수 제공 항목</strong> (서비스 이용을 위해
              반드시 동의 필요): 회원이름, 연락처 이메일 주소, 별명.
            </p>
            <p>
              <strong className="text-foreground">선택 제공 항목</strong> (동의 시에만 제공):
              프로필 사진. 프로필 사진은 댓글·프로필 등에서 표시용으로 사용되며, 미동의 시 기본
              아이콘으로 표시됩니다.
            </p>
            <h4 className="text-foreground font-bold mt-4">2. 이용 목적</h4>
            <p>
              수집된 정보는 회원 식별, 서비스 제공, 응원 팀 설정, 댓글·모멘트 작성자 표시, 고객
              문의 대응 등에 사용됩니다.
            </p>
            <h4 className="text-foreground font-bold mt-4">3. 보유·파기</h4>
            <p>
              회원 탈퇴 또는 동의 철회 시 지체 없이 파기하며, 법령에 따라 보존이 필요한 경우 해당
              기간만 보관합니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
