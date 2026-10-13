import { sendEmail } from "./email";
import { db } from "./db";

// Backend only. Shared sender for staff notifications (new quote requests, "I've paid" claims).
// Recipients: Mr. Ekeoba at jerrymerakico@gmail.com plus every admin (decided 2026-10-09).
// Delivery note: until an email domain is verified in Floot's Email tab, Floot only delivers to the
// workspace owner. Once a domain is verified, change FROM below to an address on that domain.
// Never throws: a failed email must not fail the customer's action.
export const FROM = "Jerry Meraki Print <quotes@jerrymeraki.invalid>";
export const OWNER_EMAIL = "jerrymerakico@gmail.com";
// Links in emails are opened outside the app, where only the live site works.
export const APP_ORIGIN = process.env.APP_ORIGIN ?? "https://jerrymeraki.vercel.app";

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const waNumber = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = `234${d.slice(1)}`;
  return d;
};

export async function emailAdmins(msg: { subject: string; html: string; text: string; replyTo?: string }) {
  try {
    const admins = await db.selectFrom("users").select(["email"]).where("role", "=", "admin").execute();
    // Skip placeholder addresses (seeded demo accounts) so they don't count as bounces.
    const adminEmails = admins.map((a) => a.email.toLowerCase()).filter((e) => !/@example\.(com|org|net)$/i.test(e));
    const to = Array.from(new Set([OWNER_EMAIL, ...adminEmails]));
    const result = await sendEmail({ from: FROM, to, ...msg });
    if (!result.ok) console.error(`Email "${msg.subject}" failed:`, result.error.message);
  } catch (e) {
    console.error(`Email "${msg.subject}" failed:`, e);
  }
}