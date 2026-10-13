import superjson from "superjson";
import { OutputType } from "./team_GET.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse } from "../../helpers/requireUser";

// Admin only: every account, admins first, so the owner can see and manage who has dashboard access.
export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const members = await db
      .selectFrom("users")
      .select(["id", "email", "displayName", "phone", "role", "createdAt"])
      .orderBy("role", "asc")
      .orderBy("createdAt", "desc")
      .limit(1000)
      .execute();
    return new Response(superjson.stringify({ members } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}