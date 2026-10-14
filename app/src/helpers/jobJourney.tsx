import type { JobDetail, JobSummary } from "./jobTypes";
import type { JobStatus } from "./schema";

// The customer's journey from quote to feedback, derived from the job (shared by the customer tracker,
// the admin "Next step" panel and the job lists). Payment and artwork can happen side by side, so more
// than one step can be "current" at once.
export type StepState = "done" | "current" | "todo" | "attention";
export type JourneyStep = { id: string; title: string; detail: string; state: StepState; at: Date | null };

const ORDER: JobStatus[] = ["quote_requested", "quoted", "approved", "artwork_check", "in_production", "ready", "delivered"];
const reached = (status: JobStatus, target: JobStatus) => status !== "cancelled" && ORDER.indexOf(status) >= ORDER.indexOf(target);

export const fmtDay = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) : "";

export const isPickup = (job: Pick<JobSummary, "deliveryMethod">) => job.deliveryMethod !== "delivery";

/** Default activity note when an admin moves a job forward (customers read these). */
export const statusEventNote = (status: JobStatus, job: { deliveryMethod: string }, readyBy?: string | Date | null) => {
  const pickup = isPickup(job);
  switch (status) {
    case "artwork_check":
      return "We're checking your artwork before printing";
    case "in_production":
      return `Your job is printing now${readyBy ? `. Estimated ready: ${fmtDay(readyBy)}` : ""}`;
    case "ready":
      return pickup ? "Your job is ready for pickup at our office, 14/15 Ayoola Lawal, Bariga. Bring your job code." : "Your job is out for delivery";
    case "delivered":
      return pickup ? "Job collected. Thank you!" : "Job delivered. Thank you!";
    case "cancelled":
      return "Job cancelled";
    default:
      return null;
  }
};

export function jobJourney(job: JobDetail): JourneyStep[] {
  const first = (s: JobStatus) => {
    const e = job.events.find((x) => x.status === s);
    return e ? new Date(e.createdAt) : null;
  };
  const s = job.status;
  const pickup = isPickup(job);
  const steps: JourneyStep[] = [];
  const add = (id: string, title: string, state: StepState, detail: string, at: Date | null = null) =>
    steps.push({ id, title, state, detail, at: state === "done" ? at : null });

  add("requested", "Quote requested", "done", "We received your request.", new Date(job.createdAt));
  add(
    "quoted",
    "Quote sent",
    reached(s, "quoted") ? "done" : s === "quote_requested" ? "current" : "todo",
    reached(s, "quoted") ? "Your price is ready." : "We're pricing your job.",
    first("quoted"),
  );
  add(
    "approved",
    "Quote approved",
    reached(s, "approved") ? "done" : s === "quoted" ? "attention" : "todo",
    reached(s, "approved") ? "You approved the quote." : "Approve your quote to start.",
    first("approved"),
  );
  const payDue = reached(s, "approved");
  add(
    "paid",
    "Payment received",
    job.paidAt ? "done" : !payDue ? "todo" : job.paymentClaimedAt ? "current" : "attention",
    job.paidAt ? "Thank you, we received your payment." : job.paymentClaimedAt ? "We're confirming your transfer." : "Make your payment to the account shown.",
    job.paidAt ? new Date(job.paidAt) : null,
  );
  const artDone = job.artworkReview === "approved" || reached(s, "in_production");
  add(
    "artwork",
    "Artwork approved",
    artDone
      ? "done"
      : !payDue
        ? "todo"
        : job.artworkReview === "changes_requested" || !job.artworkFileName
          ? "attention"
          : "current",
    artDone
      ? "Your file is ready to print."
      : job.artworkReview === "changes_requested"
        ? "We need a change to your file."
        : job.artworkFileName
          ? "We're checking your file."
          : "Upload your artwork.",
    job.artworkReviewedAt ? new Date(job.artworkReviewedAt) : first("in_production"),
  );
  add(
    "printing",
    "Printing",
    reached(s, "ready") ? "done" : s === "in_production" ? "current" : "todo",
    reached(s, "ready") ? "Printed and finished." : job.readyBy ? `Estimated ready ${fmtDay(job.readyBy)}.` : "We print and finish your job.",
    first("in_production"),
  );
  add(
    "ready",
    pickup ? "Ready for pickup" : "Out for delivery",
    reached(s, "delivered") ? "done" : s === "ready" ? "attention" : "todo",
    pickup ? "Collect it at our office, 14/15 Ayoola Lawal, Bariga." : `On its way to ${job.deliveryAddress ?? "you"}.`,
    first("ready"),
  );
  add(
    "delivered",
    pickup ? "Collected" : "Delivered",
    s === "delivered" ? "done" : "todo",
    "In your hands.",
    first("delivered"),
  );
  add(
    "feedback",
    "Your feedback",
    job.feedbackAt ? "done" : s === "delivered" ? "attention" : "todo",
    job.feedbackAt ? `You rated us ${job.feedbackRating}/5. Thank you!` : "Tell us how we did.",
    job.feedbackAt ? new Date(job.feedbackAt) : null,
  );
  return steps;
}

/** One-line "what the customer needs to do" for job lists; null when we're the ones working. */
export const customerAction = (job: JobSummary): string | null => {
  const s = job.status;
  if (s === "quoted") return "Approve your quote";
  if (reached(s, "approved") && !job.paidAt && !job.paymentClaimedAt && s !== "delivered") return "Make your payment";
  if (job.artworkReview === "changes_requested" && !reached(s, "in_production")) return "Fix your artwork";
  if (s === "ready") return isPickup(job) ? "Ready for pickup" : "Out for delivery";
  if (s === "delivered" && !job.feedbackAt) return "Rate your job";
  return null;
};