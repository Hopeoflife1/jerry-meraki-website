import superjson from "superjson";
import { schema, OutputType } from "./confirm_received_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { isPickup } from "../../helpers/jobJourney";

// Customer taps "I've received it" once the job is ready: closes the job as delivered/collected and
// opens the feedback step.
export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db.selectFrom("jobs").select(["id", "customerId", "status", "deliveryMethod"]).where("id", "=", input.id).executeTakeFirst();
    if (!job || job.customerId !== user.id) throw new HttpError(404, "Job not found");
    if (job.status === "delivered") return new Response(superjson.stringify({ ok: true } satisfies OutputType));
    if (job.status !== "ready") throw new HttpError(409, "Your job isn't ready yet");
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("jobs").set({ status: "delivered", updatedAt: new Date() }).where("id", "=", job.id).execute();
      await trx
        .insertInto("jobEvents")
        .values({ jobId: job.id, status: "delivered", note: `Customer confirmed they ${isPickup(job) ? "collected" : "received"} the job` })
        .execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}