import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "cnbox_session";
const ADMIN_COOKIE = "cnbox_admin";
const DAY = 60 * 60 * 24;

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET || "";
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET ausente ou curto demais no .env");
  }
  return new TextEncoder().encode(s);
}

// ---------- Senhas ----------
export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

// ---------- Sessão do usuário (aluno) ----------
export async function createUserSession(userId: string): Promise<void> {
  const token = await new SignJWT({ uid: userId, role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * DAY,
  });
}

export async function getUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "user" ? (payload.uid as string) : null;
  } catch {
    return null;
  }
}

export async function destroyUserSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

// ---------- Sessão do admin ----------
export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function isAdmin(): Promise<boolean> {
  try {
    const store = await cookies();
    const token = store.get(ADMIN_COOKIE)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
}

export function verifyAdminCredentials(user: string, pw: string): boolean {
  const U = process.env.ADMIN_USER || "";
  const P = process.env.ADMIN_PASSWORD || "";
  return Boolean(U && P) && user === U && pw === P;
}
