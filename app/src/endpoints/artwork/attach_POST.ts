import superjson from "superjson";
import { getInfo } from "../../helpers/storage";
import { schema, OutputType } from "./attach_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { isArtworkLocked } from "../../helpers/paymentDetails";
import { emailAdmins, esc, APP_ORIGIN } from "../../helpers/emailAdmins";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db
      .selectFrom("jobs")
      .select(["id", "customerId", "jobCode", "product", "quantity", "status", "paidAt", "artworkUrl", "artworkReview"])
      .where("id", "=", input.jobId)
      .executeTakeFirst();
    if (!job || (job.customerId !== user.id && user.role !== "admin")) throw new HttpError(404, "Job not found");
    if (user.role !== "admin" && isArtworkLocked(job)) {
      throw new HttpError(409, "Your artwork is locked for printing. Message us on WhatsApp if you need a change.");
    }
    if (!input.storageKey.startsWith(`artwork/${job.jobCode}/`)) throw new HttpError(400, "Invalid file");
    const info = await getInfo({ visibility: "private", filename: input.storageKey });
    if (!info.ok || !info.exists) throw new Error("Upload did not finish. Please try again.");

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("jobs")
        .set({
          artworkUrl: input.storageKey,
          artworkFileName: input.fileName,
          artworkChecks: input.checks,
          artworkReport: input.report ?? null,
          // A new file always needs a fresh look.
          artworkReview: "pending",
          artworkReviewNote: null,
          artworkReviewedAt: null,
          updatedAt: new Date(),
        })
        .where("id", "=", job.id)
        .execute();
      await trx
        .insertInto("jobEvents")
        .values({
          jobId: job.id,
          status: job.status,
          note: `Artwork uploaded: ${input.fileName}${input.report?.override ? " (sent anyway with problems flagged)" : ""}`,
        })
        .execute();
    });

    // Tell the admins about files sent from the job page (the first upload with a quote request is already
    // covered by the quote request email).
    const replacing = !!job.artworkUrl || job.status !== "quote_requested";
    if (user.role !== "admin" && replacing) {
      const link = `${APP_ORIGIN}/dashboard/jobs/${job.id}`;
      const why = job.artworkReview === "changes_requested" ? "corrected artwork you asked for" : "new artwork";
      await emailAdmins({
        replyTo: user.email,
        subject: `Artwork to check: ${job.jobCode} (${why})`,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#22123a;padding:24px;background:#fbf8f1"><div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e3dccd;border-radius:12px;padding:24px"><p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6c6280">Artwork to check · ${esc(job.jobCode)}</p><h1 style="margin:8px 0 12px;font-family:Georgia,serif;font-size:22px;color:#3d1a78">${esc(user.displayName)} sent ${esc(why)}</h1><p style="margin:0 0 16px;font-size:14px">${esc(input.fileName)} for ${esc(job.quantity.toLocaleString("en-NG"))} × ${esc(job.product)}.${input.report?.override ? " <strong>They chose to send it anyway despite problems the checker found.</strong>" : ""}</p><a href="${esc(link)}" style="display:inline-block;background:#f26b1d;color:#22123a;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">Check and approve</a></div></div>`,
        text: `${user.displayName} sent ${why} for ${job.jobCode}: ${input.fileName}. Check and approve: ${link}`,
      });
    }
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}