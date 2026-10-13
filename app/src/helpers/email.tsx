import nodemailer from "nodemailer";

// Server-only replacement for Floot's @floot/email. Sends through an SMTP mailbox, by default Gmail:
// set SMTP_USER (e.g. jerrymerakico@gmail.com) and SMTP_PASS (a Google "App password") in Vercel.
// Unlike Floot without a verified domain, this delivers to any address. Messages are sent FROM the
// SMTP mailbox (Gmail requires it); the caller's display name is kept. Never throws.
type Msg = { from?: string; to: string | string[]; replyTo?: string; subject: string; html?: string; text?: string };

export async function sendEmail(msg: Msg): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.warn(`Email not sent (SMTP_USER/SMTP_PASS not set): ${msg.subject}`);
    return { ok: false, error: { message: "Email is not configured" } };
  }
  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user, pass },
    });
    const name = msg.from?.match(/^\s*"?([^"<]+?)"?\s*</)?.[1] ?? "Jerry Meraki Print";
    await transport.sendMail({
      from: `"${name}" <${user}>`,
      to: msg.to,
      replyTo: msg.replyTo,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: { message: (e as Error).message } };
  }
}
