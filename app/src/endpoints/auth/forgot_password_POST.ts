import superjson from "superjson";
import { createHash, randomBytes } from "crypto";
import { schema, OutputType } from "./forgot_password_POST.schema";
import { db } from "../../helpers/db";
import { errorResponse } from "../../helpers/requireUser";
import { sendEmail } from "../../helpers/email";
import { APP_ORIGIN, FROM, esc } from "../../helpers/emailAdmins";

const LINK_MINUTES = 60;
const MAX_LINKS_PER_HOUR = 3;

// "Forgot password": emails a one-time link to /reset-password. Always answers ok, whether or not the
// email has an account, so the form can't be used to find out who is registered.
export async function handle(request: Request) {
  try {
    const { email } = schema.parse(superjson.parse(await request.text()));
    const user = await db
      .selectFrom("users")
      .select(["id", "email", "displayName"])
      .where((eb) => eb(eb.fn("lower", ["email"]), "=", email.toLowerCase()))
      .executeTakeFirst();

    if (user) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await db
        .selectFrom("passwordResets")
        .select((eb) => eb.fn.countAll<number>().as("n"))
        .where("userId", "=", user.id)
        .where("createdAt", ">=", hourAgo)
        .executeTakeFirstOrThrow();

      if (Number(recent.n) < MAX_LINKS_PER_HOUR) {
        const token = randomBytes(32).toString("hex");
        await db
          .insertInto("passwordResets")
          .values({
            userId: user.id,
            tokenHash: createHash("sha256").update(token).digest("hex"),
            expiresAt: new Date(Date.now() + LINK_MINUTES * 60 * 1000),
          })
          .execute();

        const link = `${APP_ORIGIN}/reset-password?token=${token}`;
        const name = user.displayName.split(" ")[0] || "there";
        const result = await sendEmail({
          from: FROM,
          to: user.email,
          subject: "Reset your Jerry Meraki password",
          text: `Hi ${name},\n\nUse this link to choose a new password for your Jerry Meraki account:\n${link}\n\nThe link works once and expires in ${LINK_MINUTES} minutes. If you didn't ask for this, you can ignore this email.\n\nJerry Meraki Print`,
          html: `<p>Hi ${esc(name)},</p><p>Use the button below to choose a new password for your Jerry Meraki account.</p><p><a href="${link}" style="display:inline-block;background:#3d1a78;color:#fbf8f1;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a></p><p style="color:#666;font-size:13px">The link works once and expires in ${LINK_MINUTES} minutes. If you didn't ask for this, you can ignore this email.</p><p>Jerry Meraki Print</p>`,
        });
        if (!result.ok) console.error("Password reset email failed:", result.error.message);
      }
    }
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}
