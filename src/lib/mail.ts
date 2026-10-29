import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing mail over SMTP (works with any provider: Resend, Mailgun, Gmail
 * Workspace, the hosting company's mailbox…). Not configured → mail is skipped.
 *   SMTP_HOST, SMTP_PORT (465 = TLS, 587 = STARTTLS), SMTP_USER, SMTP_PASS, SMTP_FROM
 */
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return (transporter = null);
  const port = Number(SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

export const mailEnabled = () => Boolean(process.env.SMTP_HOST);

export async function sendMail(message: { to: string[]; subject: string; html: string; text: string; replyTo?: string }) {
  const t = getTransporter();
  if (!t || message.to.length === 0) return false;
  await t.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: message.to.join(", "),
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
  });
  return true;
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple table email (works in every mail client); `intro` paragraphs go above the rows. */
export function tableEmail(title: string, rows: [string, string][], footer?: { label: string; href: string }, intro: string[] = []) {
  const html = `<!doctype html><html><body style="margin:0;background:#f1f0ef;font-family:Inter,Arial,sans-serif;color:#292726">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px">
<tr><td style="padding:28px 32px 8px;font-size:20px;font-weight:600"><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:#fe5b00;margin-right:8px"></span>${escape(title)}</td></tr>
${intro.map((p) => `<tr><td style="padding:8px 32px;font-size:16px;line-height:1.5;white-space:pre-wrap">${escape(p)}</td></tr>`).join("")}
${rows
  .filter(([, v]) => v)
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 32px;border-bottom:1px solid #eee"><div style="font-size:12px;color:#85807d;text-transform:uppercase">${escape(k)}</div><div style="font-size:16px;white-space:pre-wrap">${escape(v)}</div></td></tr>`,
  )
  .join("")}
${footer ? `<tr><td style="padding:24px 32px 32px"><a href="${escape(footer.href)}" style="display:inline-block;background:#fe5b00;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">${escape(footer.label)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
  const text = [title, "", ...intro.flatMap((p) => [p, ""]), ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), footer ? `\n${footer.href}` : ""].join("\n");
  return { html, text };
}
