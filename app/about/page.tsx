import Link from "next/link"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "About | See VAR",
  description: "BETTER JUDGEMENT, BETTER LEAGUE.",
}

export default function AboutPage() {
  return (
    <main className="max-w-4xl mx-auto py-8 md:py-12">
      <header className="mb-12 md:mb-16">
        <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase mb-4 md:mb-6 gradient-text">
          OUR MISSION
        </h1>
        <p className="font-mono text-sm md:text-lg text-primary font-bold tracking-widest">
          BETTER JUDGEMENT, BETTER LEAGUE.
        </p>
      </header>

      <section className="ledger-surface p-6 md:p-12 space-y-8 md:space-y-12 text-muted-foreground leading-relaxed">
        <div className="space-y-4 md:space-y-6">
          <p className="text-base md:text-lg text-foreground/90">
            축구 팬들에게 축구는 단순한 스포츠 그 이상입니다. 우리는 승점 1점에
            울고 웃으며, 좋아하는 선수와 감독의 플레이를 보는 것으로 삶의 에너지를
            얻습니다.
          </p>
          <p className="text-base md:text-lg text-foreground/90">
            하지만 때로 공정해야 할 승점의 향방이 명백한 오심에 의해 뒤바뀌기도
            합니다. 원칙 없는 판정으로 과열된 경기 속에서 선수는 부상의 위협에
            노출되고, 현장의 목소리는 억울한 징계로 침묵당하곤 합니다. 이러한
            악순환은 우리가 사랑하는 리그의 발전을 저해하는 가장 큰 장애물입니다.
          </p>
        </div>

        <div className="quote-accent p-6 md:p-8 bg-muted/50 rounded-r">
          <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed">
            현장의 축구인들은 징계와 벌금이라는 벽 앞에 서 있습니다. 자정 작용조차
            기대하기 힘든 현실 속에서, 어떤 오심은 정심으로 둔갑하고 징계를 받았던
            심판이 금세 다시 경기장에 나타나기도 합니다.
          </p>
        </div>

        <div className="py-8 md:py-12 text-center">
          <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-foreground/80">
            &ldquo;그래서 See VAR가 탄생했습니다.&rdquo;
          </h2>
        </div>

        <div className="space-y-4 md:space-y-6">
          <p className="text-base md:text-lg text-foreground/90">
            현장의 목소리가 닿지 않는 곳에서, 판정에 대한 팬들의 순수한 목소리를
            하나로 모으고자 합니다. 우리는 팬들의 객관적인 데이터를 통해 더 공정한
            판정과 더 건강한 리그를 만드는 마중물이 될 것입니다.
          </p>

          <div className="p-6 md:p-10 bg-muted/80 border-y-2 border-primary text-center my-8 md:my-12 relative overflow-hidden rounded-md">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-[0.3em] mb-4 md:mb-6">
              Our Core Commitment
            </p>
            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed">
              우리의 목표는 심판에 대한 비난이나 괴롭힘이 아닙니다. 클린봇과
              철저한 운영 시스템을 통해 지나친 비난은 지양하고,
            </p>
            <p className="text-xl md:text-3xl text-foreground font-black italic leading-relaxed mb-4 md:mb-6">
              &ldquo;오직
              <span className="text-primary">&lsquo;더 나은 판정&rsquo;</span>과
              <span className="text-primary">&lsquo;더 나은 리그&rsquo;</span>를
              위한
              <br className="hidden md:block" />
              생산적인 비판만을 담겠습니다.&rdquo;
            </p>
            <p className="text-lg md:text-2xl text-primary font-bold italic">
              우리는 우리가 사랑하는 축구를 끝까지 지켜낼 것입니다.
            </p>
          </div>
        </div>

        <div className="pt-8 md:pt-12 border-t border-border space-y-8 md:space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-8">
            <div className="space-y-2">
              <h4 className="font-mono text-[10px] md:text-xs font-black text-primary uppercase tracking-widest">
                Contact Us
              </h4>
              <p className="text-xl md:text-3xl font-black italic tracking-tighter">
                <a
                  href="mailto:support@seevar.com"
                  className="hover:text-primary transition-colors underline decoration-1 underline-offset-8"
                >
                  support@seevar.com
                </a>
              </p>
            </div>
            <Button
              size="lg"
              className="w-full md:w-auto bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-mono"
              asChild
            >
              <Link href="/" className="inline-flex items-center gap-2">
                <Heart className="size-5" />
                SUPPORT SEE VAR
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
