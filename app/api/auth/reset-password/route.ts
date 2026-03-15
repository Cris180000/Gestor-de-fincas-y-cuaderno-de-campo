import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token) {
      return NextResponse.json(
        { error: "El enlace no es válido o ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      if (record) await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => {});
      return NextResponse.json(
        { error: "El enlace no es válido o ha expirado. Solicita uno nuevo desde «Olvidaste la contraseña»." },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });
    await prisma.passwordResetToken.delete({ where: { id: record.id } });

    return NextResponse.json({
      message: "Contraseña actualizada. Ya puedes iniciar sesión.",
    });
  } catch (e) {
    console.error("reset-password error:", e);
    return NextResponse.json(
      { error: "Error al restablecer la contraseña" },
      { status: 500 }
    );
  }
}
