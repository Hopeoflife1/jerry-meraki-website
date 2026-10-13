import superjson from "superjson";
import { compare } from "bcryptjs";
import { schema, OutputType } from "./change_password_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { getServerSessionOrThrow } from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";

// Signed-in user changes their own password. Requires the current password,
// then signs out every OTHER device (keeps this one) so an old/shared password stops working everywhere.
export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const session = await getServerSessionOrThrow(request);
    const input = schema.parse(superjson.parse(await request.text()));
    if (input.newPassword === input.currentPassword) throw new HttpError(400, "Choose a password you haven't used here before");

    const row = await db.selectFrom("userPasswords").select(["passwordHash"]).where("userId", "=", user.id).executeTakeFirst();
    if (!row || !(await compare(input.currentPassword, row.passwordHash))) {
      throw new HttpError(400, "Your current password isn't right");
    }

    const passwordHash = await generatePasswordHash(input.newPassword);
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("userPasswords").set({ passwordHash }).where("userId", "=", user.id).execute();
      await trx.deleteFrom("sessions").where("userId", "=", user.id).where("id", "!=", session.id).execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}