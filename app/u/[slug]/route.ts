import { NextResponse } from "next/server";

// Base pública (atrás do proxy o app se vê como localhost:3000, então usamos
// o domínio configurado ou os headers encaminhados pelo proxy).
function publicBase(req: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

// Link de indicação da unidade: marca a unidade num cookie e leva ao cadastro.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const res = NextResponse.redirect(new URL("/cadastro", publicBase(req)));
  res.cookies.set("cnbox_unit", slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    sameSite: "lax",
  });
  return res;
}
