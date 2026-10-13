import superjson from "superjson";
import { createHash } from "crypto";
import { schema, OutputType } from "./reset_password_POST.schema";
import { db } from "../../helpers/db";
import { errorResponse, HttpError } from "../../helpers/requireUser";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";

// Second half of "Forgot password": checks the emailed one-time token, sets the new password,
// signs the account out everywhere and clears failed-login lockouts.
export async function handle(request: Request) {
  try {
    const { token, newPassword } = schema.parse(superjson.parse(await request.text()));
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await generatePasswordHash(newPassword);

    await db.transaction().execute(async (trx) => {
      // Claim the token atomically so the same link can't be used twice.
      const reset = await trx
        .updateTable("passwordResets")
        .set({ usedAt: new Date() })
        .where("tokenHash", "=", tokenHash)
        .where("usedAt", "is", null)
        .where("expiresAt", ">", new Date())
        .returning(["userId"])
        .executeTakeFirst();
      if (!reset) throw new HttpError(400, "This reset link has expired or was already used. Ask for a new one.");

      const user = await trx.selectFrom("users").select(["email"]).where("id", "=", reset.userId).executeTakeFirstOrThrow();
      await trx
        .insertInto("userPasswords")
        .values({ userId: reset.userId, passwordHash })
        .onConflict((oc) => oc.column("userId").doUpdateSet({ passwordHash }))
        .execute();
      await trx.deleteFrom("sessions").where("userId", "=", reset.userId).execute();
      await trx
        .deleteFrom("loginAttempts")
        .where((eb) => eb(eb.fn("lower", ["email"]), "=", user.email.toLowerCase()))
        .execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}
