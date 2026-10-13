import superjson from "superjson";
import { schema, OutputType } from "./payment_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { formatNaira } from "../../helpers/formatNaira";
import { isPayable } from "../../helpers/paymentDetails";

// Admin only: mark a job's payment as received (or undo it). Logged on the job's activity so the customer sees it.
export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db.selectFrom("jobs").select(["id", "status", "quotedPrice", "paidAt"]).where("id", "=", input.id).executeTakeFirst();
    if (!job) throw new HttpError(404, "Job not found");
    if (input.paid && !isPayable(job.status)) throw new HttpError(409, "The customer hasn't approved this quote yet");

    const paidAt = input.paid ? new Date() : null;
    const note =
      input.note?.trim() ||
      (input.paid ? `Payment received${job.quotedPrice ? `: ${formatNaira(job.quotedPrice)}` : ""}` : "Payment marked as not received");
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("jobs").set({ paidAt, updatedAt: new Date() }).where("id", "=", job.id).execute();
      await trx.insertInto("jobEvents").values({ jobId: job.id, status: job.status, note }).execute();
      // Paid jobs move on to the artwork check automatically, so the customer's tracker moves too.
      if (input.paid && job.status === "approved") {
        await trx.updateTable("jobs").set({ status: "artwork_check" }).where("id", "=", job.id).execute();
        await trx
          .insertInto("jobEvents")
          .values({ jobId: job.id, status: "artwork_check", note: "We're checking your artwork before printing" })
          .execute();
      }
    });
    return new Response(superjson.stringify({ ok: true, paidAt } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}