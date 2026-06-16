import { NextResponse } from "next/server";
import { destroyHolderSession } from "@/lib/auth";

export async function POST() {
  await destroyHolderSession();
  return NextResponse.json({ ok: true });
}
