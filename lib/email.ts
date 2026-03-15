/**
 * Envío de correos (recuperación de contraseña, etc.) vía SMTP.
 * Configuración en .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (opcional).
 */

import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envía un correo. Devuelve true si se envió correctamente, false si no hay SMTP configurado o falla.
 */
export async function sendMail(options: SendMailOptions): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[email] SMTP no configurado. Define SMTP_HOST, SMTP_USER, SMTP_PASS en .env");
    }
    return false;
  }
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER || "noreply@localhost";
  try {
    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html ?? options.text.replace(/\n/g, "<br>"),
    });
    return true;
  } catch (e) {
    console.error("[email] Error enviando correo:", e);
    return false;
  }
}
