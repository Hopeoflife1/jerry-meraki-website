import type { JobStatus, ArtworkReview } from "./schema";
import type { ArtworkReport } from "./artworkReport";

export type CostLine = { stage: string; vendor: string; amount: number };
export type CostBreakdown = { lines: CostLine[]; markupPercent: number; subtotal: number; total: number };
export type ArtworkChecks = Record<string, boolean>;

export type JobSummary = {
  id: number;
  jobCode: string;
  product: string;
  size: string;
  quantity: number;
  paper: string;
  status: JobStatus;
  quotedPrice: string | null;
  neededBy: Date | null;
  /** When an admin marked the customer's payment as received; null = not paid yet. */
  paidAt: Date | null;
  /** When the customer tapped "I've made the transfer"; an admin still has to confirm it. */
  paymentClaimedAt: Date | null;
  deliveryMethod: string;
  /** Admin decision on the current artwork file. */
  artworkReview: ArtworkReview;
  /** Estimated ready date, set when printing starts. */
  readyBy: Date | null;
  /** Customer's 1–5 star rating after delivery. */
  feedbackRating: number | null;
  feedbackAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customerName?: string;
  customerPhone?: string | null;
};

export type JobDetail = JobSummary & {
  printSides: string;
  colourMode: string;
  finishing: string[];
  notes: string | null;
  deliveryAddress: string | null;
  /** Exact shop address; only set for pickup jobs that are ready or collected (not a walk-in shop). */
  pickupAddress: string | null;
  quoteMessage: string | null;
  costBreakdown: CostBreakdown | null;
  artworkFileName: string | null;
  artworkDownloadUrl: string | null;
  artworkChecks: ArtworkChecks | null;
  artworkReport: ArtworkReport | null;
  artworkReviewNote: string | null;
  artworkReviewedAt: Date | null;
  feedbackComment: string | null;
  customerEmail?: string;
  events: { id: number; status: JobStatus; note: string | null; createdAt: Date }[];
};