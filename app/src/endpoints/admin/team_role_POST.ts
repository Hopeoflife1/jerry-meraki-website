import superjson from "superjson";
import { sql } from "kysely";
import { schema, OutputType } from "./team_role_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";

// Admin only: grant or remove admin (dashboard + quoting) access by email.
// Guards: you can't remove your own admin access, and the last admin can never be removed.
export async function handle(request: Request) {
  try {
    const me = await requireUser(request, { admin: true });
    const input = schema.parse(superjson.parse(await request.text()));
    const email = input.email.toLowerCase();

    const target = await db
      .selectFrom("users")
      .select(["id", "displayName", "role"])
      .where(sql<string>`lower(email)`, "=", email)
      .executeTakeFirst();
    if (!target) throw new HttpError(404, "No account uses that email yet. Ask them to sign up on the app first, then try again.");

    if (input.role !== "admin") {
      if (target.id === me.id) throw new HttpError(409, "You can't remove your own admin access.");
      const { count } = await db
        .selectFrom("users")
        .select((eb) => eb.fn.countAll<string>().as("count"))
        .where("role", "=", "admin")
        .executeTakeFirstOrThrow();
      if (target.role === "admin" && Number(count) <= 1) throw new HttpError(409, "At least one admin must remain.");
    }

    if (target.role !== input.role) {
      await db.updateTable("users").set({ role: input.role, updatedAt: new Date() }).where("id", "=", target.id).execute();
    }
    return new Response(superjson.stringify({ ok: true, displayName: target.displayName } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}