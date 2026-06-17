import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Logo from "@/components/Logo";
import GameCard from "@/components/GameCard";
import { listGames, isOpen } from "@/lib/games";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const games = await listGames().catch(() => []);
  const logged = Boolean(await getUserId());
  const betHref = logged ? "/app" : "/cadastro";
  const openGames = games.filter((g) => isOpen(g));

  const steps = [
    { icon: "📝", title: "Crie sua conta", desc: "Cadastro rápido e escolha sua unidade." },
    { icon: "🎟️", title: "Entre no bolão", desc: "Pagamento único pra concorrer a temporada toda." },
    { icon: "⚽", title: "Palpite em tudo", desc: "Dê seu placar em todos os jogos da Copa, sem pagar de novo." },
    { icon: "🏆", title: "Suba no ranking", desc: "Some pontos a cada acerto. O 1º da sua unidade leva o prêmio." },
  ];

  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 grid-floor pointer-events-none" />
        <div className="absolute inset-0 stadium-beams pointer-events-none" />
        <div className="relative mx-auto max-w-[1100px] px-4 sm:px-8 pt-12 pb-10 lg:pt-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-brand pulse-ring" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
              Bolão CNBOX · Copa do Mundo
            </span>
          </div>

          <Logo height={56} className="mb-6" />

          <h1 className="w-full font-display text-5xl sm:text-7xl xl:text-8xl leading-[0.9]">
            PALPITE, PONTUE,{" "}
            <span className="text-brand text-glow">LIDERE SUA UNIDADE.</span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-white/65 max-w-2xl">
            Entre uma vez no bolão da sua unidade e palpite em{" "}
            <strong className="text-brand">todos os jogos da Copa</strong>. Cada acerto vale
            pontos. No fim, quem tiver mais pontos na unidade leva o prêmio.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href={betHref}
              className="btn-primary px-9 py-4 rounded-2xl font-display text-xl tracking-wide"
            >
              {logged ? "IR PRO BOLÃO →" : "COMEÇAR AGORA →"}
            </Link>
            {!logged && (
              <Link
                href="/entrar"
                className="px-8 py-4 rounded-2xl font-semibold text-white/85 glass hover:text-white transition-colors"
              >
                Já tenho conta
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* JOGOS */}
      <section className="w-full">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-3xl sm:text-4xl">
              JOGOS <span className="text-brand">ABERTOS</span>
            </h2>
          </div>

          {openGames.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openGames.map((g) => (
                <GameCard key={g.id} game={g} href={betHref} cta="Palpitar" />
              ))}
            </div>
          ) : (
            <div className="card-premium rounded-3xl p-12 text-center">
              <p className="text-white/60 text-lg">
                Nenhum jogo aberto no momento. Volte em breve — os jogos da Copa
                aparecem aqui. ⚽
              </p>
            </div>
          )}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="w-full">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12">
          <h2 className="font-display text-3xl sm:text-4xl text-center mb-10">
            COMO <span className="text-brand">FUNCIONA</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <div key={i} className="card-premium rounded-3xl p-6">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-display text-xl tracking-wide mb-1.5">{s.title}</h3>
                <p className="text-sm text-white/55">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
