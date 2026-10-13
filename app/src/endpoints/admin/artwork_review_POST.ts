import superjson from "superjson";
import { schema, OutputType } from "./artwork_review_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";

// Admin only: approve the customer's artwork for printing, ask for changes (with a note the customer
// sees), or undo the decision. Logged on the job's activity. A new upload resets the review to pending.
export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db.selectFrom("jobs").select(["id", "status", "artworkUrl", "artworkFileName"]).where("id", "=", input.id).executeTakeFirst();
    if (!job) throw new HttpError(404, "Job not found");
    if (!job.artworkUrl && input.decision === "approved") throw new HttpError(409, "There's no artwork to approve yet");

    const note = input.decision === "changes_requested" ? input.note!.trim() : null;
    const event =
      input.decision === "approved"
        ? `Artwork approved for printing${job.artworkFileName ? `: ${job.artworkFileName}` : ""}`
        : input.decision === "changes_requested"
          ? `Changes needed on your artwork: ${note}`
          : "Artwork review reopened";
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("jobs")
        .set({
          artworkReview: input.decision,
          artworkReviewNote: note,
          artworkReviewedAt: input.decision === "pending" ? null : new Date(),
          updatedAt: new Date(),
        })
        .where("id", "=", job.id)
        .execute();
      await trx.insertInto("jobEvents").values({ jobId: job.id, status: job.status, note: event }).execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}