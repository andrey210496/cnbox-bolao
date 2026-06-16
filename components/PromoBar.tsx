export default function PromoBar() {
  const items = [
    "🔥 BOLÃO CNBOX",
    "⚽ TODOS OS JOGOS DA COPA",
    "💸 PALPITE A PARTIR DE R$10",
    "⚡ PIX NA HORA",
    "🏆 ACERTOU O PLACAR, LEVOU A BOLADA",
  ];
  const loop = [...items, ...items];
  return (
    <div className="w-full bg-gradient-to-r from-brand-dark via-brand to-brand-dark text-ink overflow-hidden">
      <div className="marquee-track py-1.5">
        {loop.map((t, i) => (
          <span
            key={i}
            className="px-6 text-[11px] sm:text-xs font-semibold uppercase tracking-wider"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
