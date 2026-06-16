import { NextResponse } from "next/server";

// Link de indicação da unidade: marca a unidade num cookie e leva ao cadastro.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const res = NextResponse.redirect(new URL("/cadastro", req.url));
  res.cookies.set("cnbox_unit", slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    sameSite: "lax",
  });
  return res;
}
