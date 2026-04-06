import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

const OK_MESSAGE =
  "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.";

function isDatabaseConnectionOrAuthError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  // Códigos Prisma típicos de conexión / URL (no usar cualquier P10xx)
  return /Authentication failed|database credentials|Can\'t reach database|Unable to open the database|does not exist|P1000|P1001|P1002|P1003|P1012|P1013/i.test(
    msg
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json({ error: "Introduce un correo electrónico válido." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: emailRaw } });

    if (!user) {
      return NextResponse.json({ message: OK_MESSAGE });
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const base =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
      (typeof request.headers.get("origin") === "string" ? request.headers.get("origin")! : "") ||
      "http://localhost:3000";
    const link = `${base}/restablecer-contrasena?token=${encodeURIComponent(token)}`;

    const mail = await sendMail({
      to: user.email,
      subject: "Restablecer contraseña — Cuaderno de Campo",
      text: `Hola ${user.nombre},\n\nPara elegir una nueva contraseña, abre este enlace (válido 1 hora):\n${link}\n\nSi no has solicitado el cambio, ignora este correo.`,
    });

    if (!mail.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[forgot-password] Falló el envío. Enlace directo (solo desarrollo).");
        return NextResponse.json({
          message:
            "No se pudo enviar el correo. Usa el enlace de abajo para restablecer la contraseña (solo desarrollo). Revisa SMTP en .env o tu conexión.",
          devResetLink: link,
        });
      }
      return NextResponse.json({ message: OK_MESSAGE });
    }

    return NextResponse.json({
      message: OK_MESSAGE,
      ...(process.env.NODE_ENV === "development" && mail.previewUrl
        ? {
            emailPreviewUrl: mail.previewUrl,
            devNote:
              "Modo desarrollo: el correo se envió por Ethereal (prueba). Abre «Vista previa del correo» para ver el mensaje; en producción configura SMTP_* y verás el envío real.",
          }
        : {}),
    });
  } catch (e) {
    console.error("forgot-password error:", e);
    if (process.env.NODE_ENV === "development" && isDatabaseConnectionOrAuthError(e)) {
      return NextResponse.json(
        {
          error:
            "No hay conexión con la base de datos. Revisa DATABASE_URL en .env: en este proyecto suele ser SQLite (DATABASE_URL=file:./dev.db sin comillas, ruta relativa a la carpeta prisma/). Ejecuta npm run db:migrate desde la carpeta del proyecto, asegúrate de que exista prisma/dev.db y reinicia npm run dev. Si tienes otro .env en una carpeta padre (workspace), unifica la variable o quita las comillas del valor.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud. Inténtalo más tarde." },
      { status: 500 }
    );
  }
}
