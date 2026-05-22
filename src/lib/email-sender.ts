import nodemailer from "nodemailer";
import { Resend } from "resend";
import dns from "dns";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export type SendEmailOptions = {
  from: string;
  to: string;
  subject: string;
  html: string;
  attachments: EmailAttachment[];
};

export async function sendEmail(options: SendEmailOptions): Promise<{ status: "ENVIADO"; messageId: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const smtpHost = process.env.SMTP_HOST;

  // ----------------------------------------------------
  // OPCIÓN 1: RESEND (RECOMENDADO)
  // ----------------------------------------------------
  if (resendApiKey && resendApiKey.trim() !== "") {
    try {
      const resend = new Resend(resendApiKey.trim());
      
      // Resend requiere que la dirección de origen esté verificada o usar noreply@resend.dev en pruebas
      let fromAddress = options.from;
      if (resendApiKey.startsWith("re_") && !options.from.includes("@") && !options.from.includes(".com")) {
        // Fallback para Sandbox de Resend si no está configurada una dirección de origen válida
        fromAddress = "onboarding@resend.dev";
      }

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      });

      if (error) {
        throw new Error(`Error de Resend: ${error.message}`);
      }

      return {
        status: "ENVIADO",
        messageId: data?.id || "resend-message-id",
      };
    } catch (err) {
      console.error("Error al enviar con Resend:", err);
      throw new Error(err instanceof Error ? err.message : "Error al enviar correo mediante Resend.");
    }
  }

  // ----------------------------------------------------
  // OPCIÓN 2: SMTP CORPORATIVO O GMAIL (NODEMAILER)
  // ----------------------------------------------------
  if (smtpHost && smtpHost.trim() !== "") {
    try {
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpSecure = process.env.SMTP_SECURE === "true"; // true para 465, false para 587
      const smtpUser = process.env.SMTP_USER || "";
      const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, ""); // Elimina espacios que Google pone para lectura

      const transporter = nodemailer.createTransport({
        host: smtpHost.trim(),
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser.trim(),
          pass: smtpPass,
        },
        tls: {
          rejectUnauthorized: false, // Previene bloqueos por certificados autofirmados locales
        },
        // Forzar IPv4 para evitar lentitud de resolución DNS IPv6 en Windows/Node
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lookup: (hostname: string, options: any, callback: any) => {
          dns.lookup(hostname, { family: 4 }, callback);
        },
        connectionTimeout: 10000, // 10 segundos máximo de conexión
        greetingTimeout: 10000,
        socketTimeout: 10000,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const info = await transporter.sendMail({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments.map((att) => ({
          filename: att.filename,
          content: att.content,
        })),
      });

      return {
        status: "ENVIADO",
        messageId: info.messageId || "smtp-message-id",
      };
    } catch (err) {
      console.error("Error al enviar con SMTP:", err);
      throw new Error(
        `Error de conexión SMTP: ${
          err instanceof Error ? err.message : "Verifica tus credenciales en el archivo .env"
        }`
      );
    }
  }

  // ----------------------------------------------------
  // ERROR: NO CONFIGURADO
  // ----------------------------------------------------
  throw new Error(
    "Configuración de correo pendiente. Para enviar correos reales, agrega las variables de entorno en tu archivo .env:\n" +
    "1. Con Resend: RESEND_API_KEY\n" +
    "2. Con SMTP (Gmail/Outlook/Otros): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE"
  );
}
