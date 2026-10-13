import superjson from "superjson";
import { schema, OutputType } from "./quote_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";
import type { CostBreakdown } from "../../helpers/jobTypes";
import { formatNaira } from "../../helpers/formatNaira";
import { quotePricing } from "../../helpers/quotePricing";

export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const input = schema.parse(superjson.parse(await request.text()));
    const job = await db.selectFrom("jobs").select(["id", "status"]).where("id", "=", input.id).executeTakeFirst();
    if (!job) throw new HttpError(404, "Job not found");
    if (!["quote_requested", "quoted"].includes(job.status)) throw new HttpError(409, "This job is past the quoting stage");

    const subtotal = quotePricing.subtotal(input.lines);
    const invalid = quotePricing.validate({ cost: subtotal, markupPercent: input.markupPercent, finalPrice: input.finalPrice });
    if (invalid) throw new HttpError(422, invalid);
    const breakdown: CostBreakdown = {
      lines: input.lines,
      markupPercent: input.markupPercent,
      subtotal,
      total: quotePricing.priceAtMarkup(subtotal, input.markupPercent),
    };

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable("jobs")
        .set({
          status: "quoted",
          quotedPrice: input.finalPrice,
          costBreakdown: breakdown,
          quoteMessage: input.message?.trim() || null,
          updatedAt: new Date(),
        })
        .where("id", "=", job.id)
        .execute();
      await trx
        .insertInto("jobEvents")
        .values({ jobId: job.id, status: "quoted", note: `Quote sent: ${formatNaira(input.finalPrice)}` })
        .execute();
    });
    return new Response(superjson.stringify({ ok: true } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}