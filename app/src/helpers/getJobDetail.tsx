import { db } from "./db";
import { getUrl } from "./storage";
import type { JobDetail, CostBreakdown, ArtworkChecks } from "./jobTypes";
import type { ArtworkReport } from "./artworkReport";
import { HttpError } from "./requireUser";

// Server-only: loads a job with events. Customers only see their own jobs and never the cost breakdown.
export async function getJobDetail(jobId: number, viewer: { id: number; role: "admin" | "user" }): Promise<JobDetail> {
  const job = await db
    .selectFrom("jobs")
    .innerJoin("users", "users.id", "jobs.customerId")
    .selectAll("jobs")
    .select(["users.displayName as customerName", "users.phone as customerPhone", "users.email as customerEmail"])
    .where("jobs.id", "=", jobId)
    .executeTakeFirst();
  if (!job) throw new HttpError(404, "Job not found");
  const isAdmin = viewer.role === "admin";
  if (!isAdmin && job.customerId !== viewer.id) throw new HttpError(404, "Job not found");

  const events = await db
    .selectFrom("jobEvents")
    .select(["id", "status", "note", "createdAt"])
    .where("jobId", "=", jobId)
    .orderBy("createdAt", "asc")
    .execute();

  let artworkDownloadUrl: string | null = null;
  if (job.artworkUrl) {
    const r = await getUrl({ visibility: "private", filename: job.artworkUrl, expiresInSeconds: 3600 });
    if (r.ok) artworkDownloadUrl = r.url;
  }

  return {
    id: job.id,
    jobCode: job.jobCode,
    product: job.product,
    size: job.size,
    quantity: job.quantity,
    paper: job.paper,
    status: job.status,
    quotedPrice: job.quotedPrice,
    neededBy: job.neededBy,
    paidAt: job.paidAt,
    paymentClaimedAt: job.paymentClaimedAt,
    readyBy: job.readyBy,
    feedbackRating: job.feedbackRating,
    feedbackComment: job.feedbackComment,
    feedbackAt: job.feedbackAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    printSides: job.printSides,
    colourMode: job.colourMode,
    finishing: job.finishing,
    notes: job.notes,
    deliveryMethod: job.deliveryMethod,
    deliveryAddress: job.deliveryAddress,
    quoteMessage: job.quoteMessage,
    costBreakdown: isAdmin ? (job.costBreakdown as unknown as CostBreakdown | null) : null,
    artworkFileName: job.artworkFileName,
    artworkDownloadUrl,
    artworkChecks: job.artworkChecks as unknown as ArtworkChecks | null,
    artworkReport: job.artworkReport as unknown as ArtworkReport | null,
    artworkReview: job.artworkReview,
    artworkReviewNote: job.artworkReviewNote,
    artworkReviewedAt: job.artworkReviewedAt,
    customerName: job.customerName,
    customerPhone: isAdmin ? job.customerPhone : undefined,
    customerEmail: isAdmin ? job.customerEmail : undefined,
    events,
  };
}