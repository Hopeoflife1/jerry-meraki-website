import superjson from "superjson";
import { schema, OutputType } from "./status_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { statusLabel } from "../../helpers/printCatalog";
import { statusEventNote } from "../../helpers/jobJourney";

export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db.selectFrom("jobs").select(["id", "deliveryMethod"]).where("id", "=", input.id).executeTakeFirst();
    if (!job) throw new HttpError(404, "Job not found");
    const note = input.note?.trim() || statusEventNote(input.status, job, input.readyBy) || `Status changed to ${statusLabel(input.status)}`;
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("jobs")
        .set({ status: input.status, ...(input.readyBy ? { readyBy: input.readyBy } : {}), updatedAt: new Date() })
        .where("id", "=", job.id)
        .execute();
      await trx.insertInto("jobEvents").values({ jobId: job.id, status: input.status, note }).execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}