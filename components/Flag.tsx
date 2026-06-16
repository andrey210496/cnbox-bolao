type FlagProps = {
  code: string; // ISO-2 minúsculo (ex: "br", "ma", "gb-eng")
  name: string;
  className?: string; // tamanho do badge, ex: "w-24 h-16"
  rounded?: string;
};

/**
 * Bandeira de qualquer seleção (via flagcdn, pelo código ISO-2), exibida como
 * um "escudo" arredondado com borda e brilho sutil.
 */
export default function Flag({
  code,
  name,
  className = "w-12 h-12",
  rounded = "rounded-xl",
}: FlagProps) {
  return (
    <span
      className={`relative inline-block overflow-hidden ${rounded} ${className} ring-1 ring-white/15 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] bg-white/5`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w320/${code}.png`}
        alt={`Bandeira: ${name}`}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </span>
  );
}
