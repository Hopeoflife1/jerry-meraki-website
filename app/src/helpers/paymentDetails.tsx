// Where customers pay once they approve a quote (owner, 2026-10-09). Single source for the job page and any messages.
export const paymentDetails = {
  bank: "Moniepoint",
  accountNumber: "8088390693",
  accountName: "Jerry Meraki Print",
  whatsapp: "2348088390693",
};

// Jobs where payment is due (customer approved, not cancelled). "Awaiting payment" = one of these with paidAt null.
export const PAYABLE_STATUSES = ["approved", "artwork_check", "in_production", "ready", "delivered"] as const;
export const isPayable = (status: string) => (PAYABLE_STATUSES as readonly string[]).includes(status);

// Once a job is paid for, its artwork approved, or printing has started, the customer's artwork is final:
// they can no longer replace it themselves. Exception: when an admin asks for changes, the customer can
// always upload a corrected file. A job with no artwork yet still accepts an upload until printing starts.
const PRINTING_STATUSES = ["in_production", "ready", "delivered", "cancelled"];
export const isArtworkLocked = (job: {
  status: string;
  paidAt: Date | string | null;
  artworkUrl?: string | null;
  artworkFileName?: string | null;
  artworkReview?: string | null;
}) => {
  if (job.artworkReview === "changes_requested") return job.status === "delivered" || job.status === "cancelled";
  if (PRINTING_STATUSES.includes(job.status)) return true;
  const hasArtwork = !!(job.artworkUrl ?? job.artworkFileName);
  return hasArtwork && (!!job.paidAt || job.artworkReview === "approved");
};