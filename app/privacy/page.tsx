import Link from "next/link"

export const metadata = {
  title: "개인정보 처리 방침 | SEE VAR",
  description: "SEE VAR 개인정보 처리 방침입니다.",
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-6 md:mb-8">
        개인정보 처리 방침
      </h1>
      <div className="ledger-surface p-6 md:p-8 space-y-8 text-muted-foreground text-sm md:text-base leading-relaxed">
        <p className="text-foreground/90">
          SEE VAR(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등
          관련 법령을 준수합니다. 본 방침은 서비스가 수집하는 개인정보의 항목, 이용 목적, 보관
          기간 및 이용자 권리에 대해 안내합니다.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">1. 수집하는 개인정보 항목</h2>
          <p>
            서비스는 회원 가입, 로그인, 커뮤니티 활동(한줄평·댓글 작성 등) 시 아래와 같은 정보를
            수집할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>필수: 이메일, 이름(또는 닉네임), 프로필 이미지(선택)</li>
            <li>서비스 이용 과정: IP 주소, 접속 로그, 기기 정보</li>
            <li>선택: 응원 팀 정보</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">2. 개인정보의 이용 목적</h2>
          <p>
            수집된 정보는 서비스 제공, 회원 식별, 부정 이용 방지, 공지 사항 전달, 통계 및 서비스
            개선 목적으로만 사용됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">3. 쿠키 및 광고</h2>
          <p>
            본 서비스는 Google AdSense 등 제3자 광고 서비스를 사용할 수 있습니다. Google을
            비롯한 제3자 광고 업체는 쿠키를 사용하여 사용자가 본 사이트 및 다른 사이트에 방문한
            기록을 바탕으로 맞춤 광고를 제공할 수 있습니다.
          </p>
          <p>
            Google이 이러한 데이터를 어떻게 사용하는지 자세한 내용은{" "}
            <a
              href="https://www.google.com/policies/privacy/partners/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google 개인정보 처리방침(파트너 사이트)
            </a>
            에서 확인할 수 있습니다.
          </p>
          <p>
            맞춤 광고를 원하지 않으시면{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google 광고 설정
            </a>
            또는{" "}
            <a
              href="https://www.aboutads.info/choices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              aboutads.info
            </a>
            에서 개인 맞춤 광고용 쿠키 사용을 중단할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">4. 개인정보의 보관 및 파기</h2>
          <p>
            이용자의 개인정보는 수집·이용 목적이 달성된 후 별도 DB로 옮겨 보관 기간 동안 저장된
            뒤, 법령에 따라 파기됩니다. 회원 탈퇴 시 관련 정보는 지체 없이 삭제·파기합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">5. 이용자의 권리</h2>
          <p>
            이용자는 개인정보 열람·정정·삭제·처리 정지를 요청할 수 있으며, 서비스는 법령이
            정하는 기한 내에 조치하겠습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">6. 문의</h2>
          <p>
            개인정보 처리 방침에 대한 문의는{" "}
            <a
              href="mailto:takeknowledge@naver.com"
              className="text-primary hover:underline"
            >
              takeknowledge@naver.com
            </a>
            으로 연락해 주세요.
          </p>
        </section>

        <p className="text-xs text-muted-foreground pt-4">
          시행일: 본 방침은 서비스 운영 시점부터 적용됩니다. 변경 시 사이트 내 공지를 통해
          안내합니다.
        </p>
      </div>
      <p className="mt-8">
        <Link
          href="/"
          className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← 홈으로
        </Link>
      </p>
    </main>
  )
}
