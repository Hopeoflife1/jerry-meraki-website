import superjson from "superjson";
import { schema, OutputType } from "./feedback_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { emailAdmins, esc, APP_ORIGIN } from "../../helpers/emailAdmins";

// Customer rates a delivered job (once). Logged on the job and emailed to the admins.
export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db
      .selectFrom("jobs")
      .select(["id", "customerId", "jobCode", "product", "quantity", "status", "feedbackAt"])
      .where("id", "=", input.id)
      .executeTakeFirst();
    if (!job || job.customerId !== user.id) throw new HttpError(404, "Job not found");
    if (job.status !== "delivered") throw new HttpError(409, "You can rate your job once you've received it");
    if (job.feedbackAt) throw new HttpError(409, "You've already rated this job. Thank you!");
    const comment = input.comment?.trim() || null;
    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("jobs")
        .set({ feedbackRating: input.rating, feedbackComment: comment, feedbackAt: new Date(), updatedAt: new Date() })
        .where("id", "=", job.id)
        .execute();
      await trx
        .insertInto("jobEvents")
        .values({ jobId: job.id, status: job.status, note: `Customer rated the job ${input.rating}/5${comment ? `: “${comment}”` : ""}` })
        .execute();
    });
    const stars = "★".repeat(input.rating) + "☆".repeat(5 - input.rating);
    const link = `${APP_ORIGIN}/dashboard/jobs/${job.id}`;
    await emailAdmins({
      replyTo: user.email,
      subject: `${stars} ${user.displayName} rated ${job.jobCode}`,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#22123a;padding:24px;background:#fbf8f1"><div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e3dccd;border-radius:12px;padding:24px"><p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6c6280">Customer feedback · ${esc(job.jobCode)}</p><h1 style="margin:8px 0 4px;font-size:28px;color:#f26b1d">${stars}</h1><p style="margin:0 0 12px;font-size:14px">${esc(user.displayName)} · ${esc(job.quantity.toLocaleString("en-NG"))} × ${esc(job.product)}</p>${comment ? `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #3d1a78;background:#f4eefb">${esc(comment)}</blockquote>` : ""}<a href="${esc(link)}" style="color:#3d1a78">Open the job</a></div></div>`,
      text: `${user.displayName} rated ${job.jobCode} ${input.rating}/5.${comment ? ` "${comment}"` : ""} ${link}`,
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}