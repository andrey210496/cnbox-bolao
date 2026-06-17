import { SCORING } from "@/lib/scoring";

export default function RulesContent({
  prizePct,
  housePct,
  unitPct,
  specialistPrice,
  minEntry,
  entryFee,
}: {
  prizePct: number;
  housePct: number;
  unitPct: number;
  specialistPrice: number;
  minEntry: number;
  entryFee?: number | null;
}) {
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-5">
      <Block title="Como funciona" icon="🎟️">
        <ul className="rules-list">
          <li>Você paga uma <strong>entrada única</strong>{entryFee ? <> de <strong className="text-brand">{brl(entryFee)}</strong></> : null} para participar do bolão da sua unidade durante toda a Copa.</li>
          <li>Depois de entrar, você <strong>palpita de graça</strong> em quantos jogos quiser.</li>
          <li>Você concorre <strong>apenas com os alunos da sua unidade</strong> — não com a rede toda.</li>
          <li>Cada palpite pode ser <strong>editado até o início do jogo</strong>. Começou, trava.</li>
        </ul>
      </Block>

      <Block title="Como pontuar" icon="🎯">
        <ul className="rules-list">
          <li><strong className="text-brand">{SCORING.exact} pontos</strong> — acertou o <strong>placar exato</strong>.</li>
          <li><strong className="text-brand">{SCORING.outcome} pontos</strong> — acertou o <strong>vencedor (ou empate)</strong>, mesmo errando o placar.</li>
          <li><strong className="text-brand">+{SCORING.goalDiff} ponto</strong> — bônus se acertar o <strong>saldo de gols</strong> (ex: cravou 2×1 e deu 3×2). Só conta junto com o vencedor certo.</li>
          <li>Errou o vencedor: <strong>0 ponto</strong>.</li>
        </ul>
      </Block>

      <Block title="Ranking e prêmio" icon="🏆">
        <ul className="rules-list">
          <li>O ranking soma os pontos de todos os seus palpites.</li>
          <li>No <strong>fim da Copa</strong>, quem tiver <strong>mais pontos na unidade</strong> leva o <strong>prêmio acumulado</strong> da unidade.</li>
          <li><strong>Desempate:</strong> mais placares exatos; persistindo, quem entrou primeiro.</li>
          <li>Empate na 1ª posição: o prêmio é <strong>dividido igualmente</strong> entre os líderes.</li>
          <li>O prêmio cai no <strong>PIX</strong> cadastrado, em até 24h após o encerramento.</li>
        </ul>
      </Block>

      <Block title="Para onde vai o dinheiro" icon="💸">
        <ul className="rules-list">
          <li><strong className="text-brand">{prizePct}%</strong> de cada entrada vai para o <strong>prêmio</strong> da unidade.</li>
          <li><strong>{unitPct}%</strong> é a comissão da unidade.</li>
          <li><strong>{housePct}%</strong> é a taxa da plataforma (CNBOX).</li>
          <li>Entrada mínima de <strong>{brl(minEntry)}</strong> — cada unidade pode definir um valor maior.</li>
        </ul>
      </Block>

      <Block title="Especialista IA (opcional)" icon="🤖">
        <ul className="rules-list">
          <li>Quer ajuda num jogo? Compre uma <strong>dica do Especialista IA</strong> por <strong className="text-brand">{brl(specialistPrice)}</strong>.</li>
          <li>Cada compra dá <strong>1 dica</strong> (uso único) daquele jogo. É opcional e <strong>não afeta o prêmio</strong> nem o ranking.</li>
        </ul>
      </Block>

      <Block title="Pagamentos e segurança" icon="🔒">
        <ul className="rules-list">
          <li>Pagamentos via <strong>PIX, cartão de débito ou crédito à vista</strong>, processados pelo Asaas.</li>
          <li>Os palpites travam no horário de início — não dá para palpitar com o jogo em andamento.</li>
          <li>Jogue com responsabilidade. Proibido para menores de 18 anos.</li>
        </ul>
      </Block>
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="card-premium rounded-3xl p-6">
      <h2 className="font-display text-xl mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <div className="text-sm text-white/70 [&_.rules-list]:space-y-2 [&_.rules-list>li]:flex [&_.rules-list>li]:gap-2 [&_.rules-list>li]:before:content-['•'] [&_.rules-list>li]:before:text-brand">
        {children}
      </div>
    </section>
  );
}
