import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { clientIp, isRateLimited } from "@/lib/rateLimit";

// POST /api/auth/register  { name, email, password }
export async function POST(req: NextRequest) {
  // Freno contra registros masivos: 5 intentos cada 10 minutos por IP.
  if (isRateLimited(`register:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Las cuentas todavía no están disponibles." }, { status: 503 });
  }

  try {
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
    }
    const { name, email, password } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Ese correo ya tiene una cuenta. Inicia sesión." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, password: hashed } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }
}
