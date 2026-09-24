import nodemailer, { type Transporter } from "nodemailer";

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

let transporterInstance: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE, // true for 465, false for 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Prevents local self-signed certificate handshake halts
      },
    });
  }
  return transporterInstance;
}

/**
 * Verifies that the SMTP transporter is configured and can connect to Gmail
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: `SMTP connection established successfully with ${SMTP_HOST}` };
  } catch (error: any) {
    console.error("SMTP verification error:", error);
    return { success: false, message: error?.message || "Failed to connect to SMTP server" };
  }
}

/**
 * Dispatches an email using the configured SMTP transporter
 */
export async function sendMail(options: MailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getTransporter();
    const fromAddress = `"Hotel OS Operations" <${SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.subject,
      replyTo: options.replyTo || SMTP_USER,
      attachments: options.attachments,
    });

    console.log(`Email dispatched successfully [ID: ${info.messageId}] to:`, options.to);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("Failed to send email via SMTP:", error);
    return { success: false, error: error?.message || "Email dispatch failed" };
  }
}
