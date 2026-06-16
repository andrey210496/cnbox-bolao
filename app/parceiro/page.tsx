import Link from "next/link";
import Logo from "@/components/Logo";
import UnitRegisterForm from "@/components/UnitRegisterForm";

export const dynamic = "force-dynamic";

export default function ParceiroPage() {
  return (
    <main className="flex-1 w-full">
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/">
            <Logo height={44} />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl mt-5">
            SEJA UMA <span className="text-brand text-glow">UNIDADE</span>
          </h1>
          <p className="text-white/55 mt-2 text-sm">
            Cadastre sua unidade, receba um link exclusivo e ganhe comissão por cada aluno
            que palpitar pelo seu link.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8 text-center">
          {[
            { n: "1", t: "Cadastre", d: "nome, WhatsApp e PIX" },
            { n: "2", t: "Divulgue", d: "seu link pros alunos" },
            { n: "3", t: "Ganhe", d: "comissão por palpite" },
          ].map((s) => (
            <div key={s.n} className="card-premium rounded-2xl p-3">
              <div className="font-display text-brand text-xl">{s.n}</div>
              <div className="text-sm font-semibold mt-1">{s.t}</div>
              <div className="text-[11px] text-white/45 mt-0.5">{s.d}</div>
            </div>
          ))}
        </div>

        <UnitRegisterForm />
      </div>
    </main>
  );
}
