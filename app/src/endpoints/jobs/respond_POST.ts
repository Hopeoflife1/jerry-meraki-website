import superjson from "superjson";
import { schema, OutputType } from "./respond_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db.selectFrom("jobs").select(["id", "customerId", "status"]).where("id", "=", input.id).executeTakeFirst();
    if (!job || job.customerId !== user.id) throw new HttpError(404, "Job not found");
    if (job.status !== "quoted") throw new HttpError(409, "This quote can no longer be changed");

    const status = input.action === "approve" ? "approved" : "cancelled";
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("jobs").set({ status, updatedAt: new Date() }).where("id", "=", job.id).execute();
      await trx
        .insertInto("jobEvents")
        .values({
          jobId: job.id,
          status,
          note: input.note?.trim() || (status === "approved" ? "Customer approved the quote" : "Customer declined the quote"),
        })
        .execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}