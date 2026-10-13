import superjson from "superjson";
import { OutputType } from "./jobs_GET.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse } from "../../helpers/requireUser";

export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const jobs = await db
      .selectFrom("jobs")
      .innerJoin("users", "users.id", "jobs.customerId")
      .select([
        "jobs.id", "jobs.jobCode", "jobs.product", "jobs.size", "jobs.quantity", "jobs.paper", "jobs.status",
        "jobs.quotedPrice", "jobs.neededBy", "jobs.paidAt", "jobs.paymentClaimedAt", "jobs.createdAt", "jobs.updatedAt",
        "jobs.deliveryMethod", "jobs.artworkReview", "jobs.readyBy", "jobs.feedbackRating", "jobs.feedbackAt",
        "users.displayName as customerName", "users.phone as customerPhone",
      ])
      .orderBy("jobs.updatedAt", "desc")
      .limit(500)
      .execute();
    return new Response(superjson.stringify({ jobs } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}