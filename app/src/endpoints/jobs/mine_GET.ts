import superjson from "superjson";
import { OutputType } from "./mine_GET.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse } from "../../helpers/requireUser";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const jobs = await db
      .selectFrom("jobs")
      .select([
        "id", "jobCode", "product", "size", "quantity", "paper", "status", "quotedPrice", "neededBy", "paidAt", "paymentClaimedAt",
        "deliveryMethod", "artworkReview", "readyBy", "feedbackRating", "feedbackAt", "createdAt", "updatedAt",
      ])
      .where("customerId", "=", user.id)
      .orderBy("updatedAt", "desc")
      .execute();
    return new Response(superjson.stringify({ jobs } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}