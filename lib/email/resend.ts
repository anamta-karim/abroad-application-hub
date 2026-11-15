import { errorMessage } from "@/lib/errors";
/**
 * Sends email through Resend's REST API (https://resend.com/docs/api-reference/emails/send-email).
 * Needs RESEND_API_KEY and REMINDER_FROM_EMAIL (e.g. "AbroadAtlas <reminders@yourdomain.com>").
 * Until a sending domain is verified in Resend, "onboarding@resend.dev" can only
 * send to the email address of the Resend account owner.
 */

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_FROM_EMAIL);
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "Email sending is not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(15000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${body.message || body.name || "send failed"}` };
    return { ok: true, id: body.id };
  } catch (err) {
    return { ok: false, error: errorMessage(err) || "network error" };
  }
}
