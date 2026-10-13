import superjson from "superjson";
import { schema, OutputType } from "./payment_claim_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import { formatNaira } from "../../helpers/formatNaira";
import { isPayable } from "../../helpers/paymentDetails";
import { emailAdmins, esc, waNumber, APP_ORIGIN } from "../../helpers/emailAdmins";

// Customer taps "I've made the transfer". Records the claim, logs it on the job and emails the admins
// so Mr. Ekeoba knows to check Moniepoint. Only an admin can mark the job as actually paid.
export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db
      .selectFrom("jobs")
      .innerJoin("users", "users.id", "jobs.customerId")
      .select([
        "jobs.id", "jobs.customerId", "jobs.jobCode", "jobs.product", "jobs.quantity", "jobs.status",
        "jobs.quotedPrice", "jobs.paidAt", "jobs.paymentClaimedAt", "users.phone",
      ])
      .where("jobs.id", "=", input.id)
      .executeTakeFirst();
    if (!job || job.customerId !== user.id) throw new HttpError(404, "Job not found");
    if (!isPayable(job.status)) throw new HttpError(409, "Payment isn't due on this job");
    if (job.paidAt) throw new HttpError(409, "We've already received your payment");
    // Already told us: don't email the admins twice.
    if (job.paymentClaimedAt) return new Response(superjson.stringify({ ok: true, paymentClaimedAt: job.paymentClaimedAt } satisfies OutputType));

    const now = new Date();
    const amount = job.quotedPrice ? formatNaira(job.quotedPrice) : "the quoted amount";
    await db.transaction().execute(async (trx) => {
      await trx.updateTable("jobs").set({ paymentClaimedAt: now, updatedAt: now }).where("id", "=", job.id).execute();
      await trx
        .insertInto("jobEvents")
        .values({ jobId: job.id, status: job.status, note: `Customer says they have paid ${amount}. We're confirming it.` })
        .execute();
    });

    const link = `${APP_ORIGIN}/dashboard/jobs/${job.id}`;
    const what = `${job.quantity.toLocaleString("en-NG")} × ${job.product}`;
    const phone = job.phone ? waNumber(job.phone) : null;
    await emailAdmins({
      replyTo: user.email,
      subject: `Payment to confirm: ${job.jobCode}, ${amount} from ${user.displayName}`,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#22123a;background:#fbf8f1;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e3dccd;border-radius:12px;padding:24px">
    <p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6c6280">Payment to confirm · ${esc(job.jobCode)}</p>
    <h1 style="margin:8px 0 12px;font-family:Georgia,serif;font-size:24px;color:#3d1a78">${esc(user.displayName)} says they paid ${esc(amount)}</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5">For ${esc(what)}. Check the Moniepoint account for a transfer with the reference <strong>${esc(job.jobCode)}</strong>, then mark the job as paid.</p>
    <p style="margin:0 0 8px">
      <a href="${esc(link)}" style="display:inline-block;background:#f26b1d;color:#22123a;font-weight:bold;text-decoration:none;padding:12px 20px;border-radius:8px">Open the job and mark as paid</a>
    </p>
    ${phone ? `<p style="margin:8px 0 0;font-size:13px"><a href="https://wa.me/${esc(phone)}" style="color:#3d1a78">Message the customer on WhatsApp</a></p>` : ""}
  </div>
</div>`,
      text: [
        `${user.displayName} says they paid ${amount} for ${job.jobCode} (${what}).`,
        `Check Moniepoint for the reference ${job.jobCode}, then mark it paid: ${link}`,
      ].join("\n"),
    });

    return new Response(superjson.stringify({ ok: true, paymentClaimedAt: now } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}