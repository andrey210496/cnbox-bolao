import Link from "next/link";
import Logo from "./Logo";

export default function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-white/10 bg-ink/50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <Logo height={30} />
          <p className="text-xs text-white/40 text-center sm:text-left max-w-md">
            Bolão promocional da rede CNBOX. Pagamentos processados via PIX pelo
            Asaas. Jogue com responsabilidade — proibido para menores de 18 anos.
          </p>
        </div>
        <div className="text-xs text-white/30 text-center sm:text-right">
          <Link
            href="/parceiro"
            className="text-brand hover:text-brand-light font-medium"
          >
            É de uma unidade? Cadastre-se e ganhe comissão →
          </Link>
          <p className="mt-3">© {new Date().getFullYear()} CNBOX. Todos os direitos reservados.</p>
          <p className="mt-1 flex items-center gap-1.5 justify-center sm:justify-end">
            <span className="text-brand">●</span> Pagamento 100% seguro · PIX
          </p>
        </div>
      </div>
    </footer>
  );
}
