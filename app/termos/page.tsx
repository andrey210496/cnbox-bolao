import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = { title: "Termos e Privacidade — Bolão CNBOX" };

export default function TermosPage() {
  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[900px] px-4 sm:px-8 h-16 flex items-center">
          <Link href="/">
            <Logo height={28} />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] px-4 sm:px-8 py-10 prose-invert">
        <h1 className="font-display text-3xl sm:text-4xl mb-6">
          TERMOS DE USO E <span className="text-brand">PRIVACIDADE</span>
        </h1>

        <div className="space-y-6 text-white/70 text-sm leading-relaxed">
          <Section title="1. Sobre o bolão">
            O Bolão CNBOX é um bolão promocional de palpites sobre placares de
            jogos de futebol. Cada palpite custa um valor fixo (informado no site),
            pago via PIX. Os participantes que acertarem o placar exato de um jogo
            dividem o prêmio daquele jogo.
          </Section>

          <Section title="2. Idade mínima">
            A participação é restrita a maiores de 18 anos. Ao se cadastrar, você
            declara ter 18 anos ou mais.
          </Section>

          <Section title="3. Como funciona o prêmio">
            Uma parte de cada palpite é destinada ao prêmio do jogo e outra parte à
            administração do bolão (percentuais informados no site). O prêmio de
            cada jogo é dividido igualmente entre os acertadores do placar exato. Se
            ninguém acertar, não há ganhadores naquele jogo. A apuração e o
            pagamento ocorrem em até 24 horas após o término do jogo.
          </Section>

          <Section title="4. Pagamentos">
            Os pagamentos (entrada e prêmios) são processados via PIX pela Asaas. O
            prêmio é enviado para a chave PIX informada no seu cadastro — confira se
            ela está correta. Palpites só são válidos após a confirmação do
            pagamento; palpites não pagos não concorrem.
          </Section>

          <Section title="5. Dados pessoais (LGPD)">
            Coletamos nome, telefone, CPF e chave PIX exclusivamente para
            identificá-lo, viabilizar o pagamento da entrada e o repasse do prêmio.
            Não vendemos nem compartilhamos seus dados com terceiros, exceto o
            necessário para processar pagamentos (Asaas). Você pode solicitar a
            correção ou exclusão dos seus dados a qualquer momento pelos nossos
            canais de contato.
          </Section>

          <Section title="6. Responsabilidade">
            Participe com responsabilidade. O bolão é uma atividade recreativa; não
            aposte valores que comprometam seu orçamento.
          </Section>
        </div>

        <p className="mt-10 text-xs text-white/35">
          Este documento é um modelo base. Recomenda-se revisão por um profissional
          jurídico antes do uso comercial.
        </p>

        <Link
          href="/cadastro"
          className="mt-8 inline-block btn-primary px-6 py-3 rounded-xl font-bold"
        >
          Voltar ao cadastro
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg text-white mb-2">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
