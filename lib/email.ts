/**
 * Envío de correos (recuperación de contraseña, etc.) vía SMTP.
 *
 * - Producción / cuando defines SMTP_* en .env: usa tu servidor real.
 * - Desarrollo sin SMTP_*: usa Ethereal (https://ethereal.email), correo de prueba con URL de vista previa.
 */

import nodemailer from "nodemailer";

let etherealAccountPromise: Promise<nodemailer.TestAccount> | null = null;

function getEtherealAccount(): Promise<nodemailer.TestAccount> {
  if (!etherealAccountPromise) {
    etherealAccountPromise = nodemailer.createTestAccount();
  }
  return etherealAccountPromise;
}

async function createMailTransport(): Promise<nodemailer.Transporter | null> {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number.isNaN(port) ? 587 : port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  if (process.env.NODE_ENV === "development") {
    const account = await getEtherealAccount();
    console.warn(
      "[email] Sin SMTP_HOST/SMTP_USER/SMTP_PASS: usando Ethereal (solo desarrollo). Añade SMTP_* al .env para enviar a tu bandeja real."
    );
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    });
  }

  return null;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendMailResult {
  ok: boolean;
  /** Presente con Ethereal: abre el HTML del mensaje en el navegador */
  previewUrl?: string;
}

/**
 * Envía un correo. En desarrollo sin SMTP configurado usa Ethereal y devuelve previewUrl.
 */
export async function sendMail(options: SendMailOptions): Promise<SendMailResult> {
  const transport = await createMailTransport();
  if (!transport) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] No hay transporte (¿NODE_ENV sin development?). Define SMTP_* en .env");
    }
    return { ok: false };
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "Cuaderno Campo <noreply@localhost>";

  try {
    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, "<br>"),
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    return { ok: true, previewUrl };
  } catch (e) {
    console.error("[email] Error enviando correo:", e);
    return { ok: false };
  }
}
