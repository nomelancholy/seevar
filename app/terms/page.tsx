import Link from "next/link"

export const metadata = {
  title: "이용약관 | SEE VAR",
  description: "SEE VAR 서비스 이용약관입니다.",
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-black tracking-tighter mb-6 md:mb-8">
        이용약관
      </h1>
      <div className="ledger-surface p-6 md:p-8 space-y-8 text-muted-foreground text-sm md:text-base leading-relaxed">
        <p className="text-foreground/90">
          SEE VAR(이하 &quot;서비스&quot;)를 이용해 주셔서 감사합니다. 본 약관은 서비스 이용과
          관련하여 이용자와 운영자 간의 권리·의무 및 책임 사항을 규정합니다.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제1조 (목적)</h2>
          <p>
            본 약관은 SEE VAR가 제공하는 축구 판정 아카이브 및 커뮤니티 서비스의 이용 조건 및
            절차, 이용자와 운영자 간의 권리·의무를 정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제2조 (서비스의 이용)</h2>
          <p>
            이용자는 서비스가 정한 이용 방식에 따라 서비스를 이용하여야 하며, 타인의 계정을
            무단으로 사용하거나 서비스의 정상 운영을 방해하는 행위를 해서는 안 됩니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제3조 (금지 행위)</h2>
          <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>법령 또는 공서양속에 위반하는 행위</li>
            <li>타인의 명예를 훼손하거나 권리를 침해하는 행위</li>
            <li>욕설, 비방, 혐오 표현, 스팸 등 다른 이용자에게 불쾌감을 주는 콘텐츠 게시</li>
            <li>서비스의 시스템·보안을 해치거나 무단으로 데이터를 수집·이용하는 행위</li>
          </ul>
          <p>
            위반 시 서비스는 사전 통지 없이 게시물 삭제, 이용 제한, 계정 정지 등의 조치를 할 수
            있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제4조 (저작권 및 콘텐츠)</h2>
          <p>
            이용자가 작성한 게시물의 저작권은 해당 이용자에게 있습니다. 단, 서비스는 서비스
            운영·개선·홍보 목적으로 해당 콘텐츠를 사이트 내에서 사용·노출할 수 있는 권한을
            가집니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제5조 (면책)</h2>
          <p>
            서비스는 천재지변, 통신 장애, 제3자의 불법 행위 등으로 인한 서비스 중단·장애에 대해
            책임을 지지 않습니다. 이용자 간 또는 이용자와 제3자 간 분쟁에 대해서는 당사자들이
            해결하며, 서비스는 법령이 정하는 범위 내에서만 관여할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제6조 (약관의 변경)</h2>
          <p>
            서비스는 필요한 경우 약관을 변경할 수 있으며, 변경 시 사이트 또는 공지사항을 통해
            안내합니다. 변경된 약관은 공지 후 효력이 발생합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">제7조 (문의)</h2>
          <p>
            이용약관에 대한 문의는{" "}
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
          시행일: 본 약관은 서비스 운영 시점부터 적용됩니다.
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
