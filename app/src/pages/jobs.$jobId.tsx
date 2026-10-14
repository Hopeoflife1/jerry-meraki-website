import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { ChevronLeft, Copy, FileText, MessageCircle, PackageCheck, AlertTriangle, Lock, ChevronRight } from "lucide-react";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { JobTimeline } from "../components/JobTimeline";
import { ArtworkPicker } from "../components/ArtworkPicker";
import { JobJourney } from "../components/JobJourney";
import { FeedbackCard } from "../components/FeedbackCard";
import { jobJourney, isPickup, fmtDay, type JourneyStep } from "../helpers/jobJourney";
import { useJobs } from "../helpers/useJobs";
import { formatNaira } from "../helpers/formatNaira";
import { allArtworkChecksTicked } from "../helpers/printCatalog";
import { paymentDetails, isArtworkLocked } from "../helpers/paymentDetails";
import type { JobDetail } from "../helpers/jobTypes";
import type { ArtworkReport } from "../helpers/artworkReport";
import styles from "./jobs.$jobId.module.css";

// Customer job page, laid out like an order-details screen: one status card with the next action,
// then quiet grouped sections (payment, summary, artwork, details, tracking). Colour is reserved for
// the status pill, the one primary action and the rating stars.

const OWNER_WHATSAPP = "2348088390693";
// Payment details show once the customer approves, until the job is delivered.
const PAY_STATUSES = ["approved", "artwork_check", "in_production", "ready"];

const copy = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy. Please write it down instead.");
  }
};

const day = (d: Date | string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// One sentence on what happens next, shown in the status card.
const nextStepText = (job: JobDetail) => {
  switch (job.status) {
    case "quote_requested":
      return "We're reviewing your specs and artwork. Your quote will appear here shortly.";
    case "quoted":
      return "Your quote is ready. Approve it to get started.";
    case "approved":
    case "artwork_check":
      if (!job.paidAt && !job.paymentClaimedAt) return "Make your payment below. We start printing once payment and artwork are confirmed.";
      if (!job.artworkFileName) return "Upload your artwork below so we can start printing.";
      if (job.artworkReview === "changes_requested") return "We need a change to your artwork before we can print.";
      if (!job.paidAt) return "We're confirming your transfer. This page updates as soon as it's in.";
      if (job.artworkReview === "approved") return "Payment and artwork are confirmed. Your job goes to print next.";
      return "We're checking your artwork one last time before it goes to print.";
    case "in_production":
      return job.readyBy ? `Estimated ready ${fmtDay(job.readyBy)}. We'll update this page when it's done.` : "We'll update this page as soon as it's ready.";
    case "ready":
      return isPickup(job)
        ? `Collect it at our office, 14/15 Ayoola Lawal, Bariga, with your job code ${job.jobCode}.`
        : `On its way to ${job.deliveryAddress ?? "you"}.`;
    case "delivered":
      return job.feedbackAt ? "Thank you for printing with Jerry Meraki." : "How did we do? Your rating helps us print better.";
    case "cancelled":
      return "Message us on WhatsApp if that's a mistake.";
    default:
      return "";
  }
};

const nowStep = (steps: JourneyStep[]) =>
  steps.find((s) => s.state === "attention") ?? steps.find((s) => s.state === "current") ?? [...steps].reverse().find((s) => s.state === "done")!;

const StatusCard = ({ job, steps }: { job: JobDetail; steps: JourneyStep[] }) => {
  const received = useJobs.useConfirmReceived();
  const now = nowStep(steps);
  const doneCount = steps.filter((s) => s.state === "done").length;
  const cancelled = job.status === "cancelled";
  const tone = cancelled ? "muted" : now.state === "attention" ? "attention" : job.status === "delivered" ? "success" : "progress";
  const pill = cancelled ? "Cancelled" : now.state === "attention" ? "Action needed" : job.status === "delivered" ? "Completed" : "In progress";
  const headline = cancelled ? "This job was cancelled" : job.status === "delivered" && job.feedbackAt ? (isPickup(job) ? "Collected" : "Delivered") : now.title;

  return (
    <section className={styles.status} aria-live="polite">
      <div className={styles.statusTop}>
        <span className={`${styles.pill} ${styles[tone]}`}>{pill}</span>
        {!cancelled && (
          <span className={styles.stepCount}>
            Step {Math.min(doneCount + (now.state === "done" ? 0 : 1), steps.length)} of {steps.length}
          </span>
        )}
      </div>
      <h2 className={styles.statusTitle}>{headline}</h2>
      <p className={styles.statusText}>{nextStepText(job)}</p>
      {!cancelled && (
        <div className={styles.segments} aria-hidden>
          {steps.map((s) => (
            <span key={s.id} className={`${styles.seg} ${s.state === "done" ? styles.segDone : s.state !== "todo" ? styles.segNow : ""}`} />
          ))}
        </div>
      )}
      {job.status === "ready" && (
        <Button
          size="lg"
          className={styles.fullBtn}
          disabled={received.isPending}
          onClick={async () => {
            try {
              await received.mutateAsync(job.id);
              toast.success("Great! Thank you for printing with us.");
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          {received.isPending ? <Spinner size="sm" /> : <PackageCheck size={18} aria-hidden />}
          {isPickup(job) ? "I've collected my job" : "I've received my job"}
        </Button>
      )}
      {job.status === "delivered" && <FeedbackCard jobId={job.id} rating={job.feedbackRating} comment={job.feedbackComment} />}
      {job.status === "quote_requested" && (
        <a
          className={styles.inlineLink}
          href={`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(
            `Hello Jerry Meraki, I just sent quote request ${job.jobCode}: ${job.quantity.toLocaleString()} × ${job.product} (${job.size}).`,
          )}`}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={15} aria-hidden /> Send it on WhatsApp too
        </a>
      )}
    </section>
  );
};

const Row = ({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) => (
  <div className={styles.row}>
    <dt>{label}</dt>
    <dd className={strong ? styles.strong : undefined}>{children}</dd>
  </div>
);

const CopyBtn = ({ value, label }: { value: string; label: string }) => (
  <button type="button" className={styles.copy} onClick={() => copy(value, label)} aria-label={`Copy ${label.toLowerCase()}`}>
    <Copy size={15} aria-hidden />
  </button>
);

const PaymentSection = ({ job }: { job: JobDetail }) => {
  const claim = useJobs.useClaimPayment();
  const amount = job.quotedPrice;
  const proofText = encodeURIComponent(
    `Hello Jerry Meraki, I have paid${amount ? ` ${formatNaira(amount)}` : ""} for job ${job.jobCode} (${job.quantity.toLocaleString()} × ${job.product}). Here is my proof of payment.`,
  );
  return (
    <section className={styles.section} aria-labelledby="pay-h">
      <h3 id="pay-h" className={styles.sectionLabel}>
        Payment
      </h3>
      <div className={styles.group}>
        <dl className={styles.rows}>
          <Row label="Amount to pay" strong>
            {amount ? formatNaira(amount) : "As quoted"}
          </Row>
          <Row label="Bank">{paymentDetails.bank}</Row>
          <Row label="Account number">
            <span className={styles.mono}>{paymentDetails.accountNumber}</span>
            <CopyBtn value={paymentDetails.accountNumber} label="Account number" />
          </Row>
          <Row label="Account name">{paymentDetails.accountName}</Row>
          <Row label="Reference">
            <span className={styles.mono}>{job.jobCode}</span>
            <CopyBtn value={job.jobCode} label="Reference" />
          </Row>
        </dl>
        <div className={styles.groupFoot}>
          <p className={styles.hint}>Use your job code as the transfer narration so we can match your payment.</p>
          {job.paymentClaimedAt ? (
            <p className={styles.note}>
              You told us you paid on {day(job.paymentClaimedAt)}. We're confirming it with the bank.
            </p>
          ) : (
            <Button
              className={styles.fullBtn}
              disabled={claim.isPending}
              onClick={async () => {
                try {
                  await claim.mutateAsync(job.id);
                  toast.success("Thanks! We'll confirm your payment shortly.");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              {claim.isPending ? <Spinner size="sm" /> : null} I've made the transfer
            </Button>
          )}
          <a className={styles.inlineLink} href={`https://wa.me/${paymentDetails.whatsapp}?text=${proofText}`} target="_blank" rel="noreferrer">
            <MessageCircle size={15} aria-hidden /> Send proof of payment on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const id = Number(jobId);
  const { data, isFetching, error } = useJobs.useDetail(id);
  const respond = useJobs.useRespond();
  const upload = useJobs.useUploadArtwork();
  const [file, setFile] = useState<File | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<ArtworkReport | null>(null);
  // Artwork sent with the quote request is shown as received; the upload box only opens if the customer asks to replace it.
  const [replacing, setReplacing] = useState(false);

  if (error) return <p className={styles.error}>{(error as Error).message}</p>;
  if (!data || (isFetching && !data)) return <Skeleton className={styles.skeleton} />;
  const job = data.job;
  const steps = jobJourney(job);
  const artworkLocked = isArtworkLocked(job);
  const changesNeeded = job.artworkReview === "changes_requested";
  const showPayment = PAY_STATUSES.includes(job.status) && !job.paidAt;
  const showPicker = !artworkLocked && (!job.artworkFileName || replacing || changesNeeded);

  const doRespond = async (action: "approve" | "decline") => {
    try {
      await respond.mutateAsync({ id: job.id, action });
      toast.success(action === "approve" ? "Quote approved. Payment details are now on this page." : "Quote declined.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doUpload = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({ jobId: job.id, file, checks, report });
      setFile(null);
      setReplacing(false);
      toast.success("Artwork uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const artworkStatus = !job.artworkFileName
    ? null
    : job.artworkReview === "approved"
      ? { text: "Approved for printing", tone: styles.okText }
      : changesNeeded
        ? { text: "Changes needed", tone: styles.warnText }
        : { text: "We're checking it", tone: undefined };

  const paymentValue = job.paidAt
    ? `Paid · ${day(job.paidAt)}`
    : job.paymentClaimedAt
      ? "Confirming your transfer"
      : PAY_STATUSES.includes(job.status)
        ? "Awaiting payment"
        : "Due after you approve";

  const details: [string, string][] = [
    ["Size", job.size],
    ["Quantity", job.quantity.toLocaleString()],
    ["Paper", job.paper],
    ["Sides", job.printSides],
    ["Colour", job.colourMode],
    ["Finishing", job.finishing.length ? job.finishing.join(", ") : "None"],
    ["Needed by", job.neededBy ? new Date(job.neededBy).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Flexible"],
  ];

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{job.jobCode} · Jerry Meraki</title>
      </Helmet>

      <Link to="/jobs" className={styles.back}>
        <ChevronLeft size={18} aria-hidden /> My jobs
      </Link>

      <header className={styles.head}>
        <h1>
          {job.quantity.toLocaleString()} × {job.product}
        </h1>
        <p>
          <span className={styles.mono}>{job.jobCode}</span> · Requested {day(job.createdAt)}
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <StatusCard job={job} steps={steps} />

          {showPayment && <PaymentSection job={job} />}

          <section className={styles.section} aria-labelledby="sum-h">
            <h3 id="sum-h" className={styles.sectionLabel}>
              Summary
            </h3>
            <div className={styles.group}>
              <dl className={styles.rows}>
                <Row label="Price" strong>
                  {job.quotedPrice ? formatNaira(job.quotedPrice) : "Being prepared"}
                </Row>
                {job.quotedPrice && <Row label="Payment">{paymentValue}</Row>}
                {job.readyBy && job.status !== "delivered" && <Row label="Estimated ready">{fmtDay(job.readyBy)}</Row>}
                <Row label={isPickup(job) ? "Pickup" : "Delivery"}>{isPickup(job) ? "14/15 Ayoola Lawal, Bariga" : job.deliveryAddress ?? "To your address"}</Row>
              </dl>
              {job.quoteMessage && <p className={styles.message}>{job.quoteMessage}</p>}
              {job.status === "quoted" && (
                <div className={styles.groupFoot}>
                  <Button className={styles.fullBtn} disabled={respond.isPending} onClick={() => doRespond("approve")}>
                    {respond.isPending ? <Spinner size="sm" /> : null} Approve quote
                  </Button>
                  <button type="button" className={styles.textBtn} disabled={respond.isPending} onClick={() => doRespond("decline")}>
                    Decline
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="art-h">
            <h3 id="art-h" className={styles.sectionLabel}>
              Artwork
            </h3>
            <div className={styles.group}>
              {job.artworkFileName && (
                <div className={styles.fileRow}>
                  <span className={styles.fileIcon}>
                    <FileText size={18} aria-hidden />
                  </span>
                  <span className={styles.fileText}>
                    <strong>{job.artworkFileName}</strong>
                    <small className={artworkStatus?.tone}>{artworkStatus?.text}</small>
                  </span>
                  {job.artworkDownloadUrl && (
                    <a className={styles.rowLink} href={job.artworkDownloadUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  )}
                </div>
              )}
              {changesNeeded && !artworkLocked && (
                <div className={styles.alert} role="alert">
                  <AlertTriangle size={16} aria-hidden />
                  <div>
                    <strong>What to change</strong>
                    <p>{job.artworkReviewNote}</p>
                  </div>
                </div>
              )}
              {artworkLocked ? (
                <p className={styles.groupNote}>
                  <Lock size={13} aria-hidden />
                  {job.artworkFileName ? "Locked for printing. Need a change? Message us on WhatsApp." : "Printing has started. Send any changes on WhatsApp."}
                </p>
              ) : showPicker ? (
                <div className={styles.groupFoot}>
                  <ArtworkPicker file={file} onFileChange={setFile} checks={checks} onChecksChange={setChecks} onReportChange={setReport} size={job.size} />
                  {file && (
                    <Button className={styles.fullBtn} disabled={upload.isPending || !report || !allArtworkChecksTicked(checks)} onClick={doUpload}>
                      {upload.isPending ? <Spinner size="sm" /> : null}
                      {changesNeeded ? "Upload corrected file" : job.artworkFileName ? "Replace artwork" : "Upload artwork"}
                    </Button>
                  )}
                  {replacing && (
                    <button
                      type="button"
                      className={styles.textBtn}
                      disabled={upload.isPending}
                      onClick={() => {
                        setReplacing(false);
                        setFile(null);
                      }}
                    >
                      Keep my current file
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" className={styles.actionRow} onClick={() => setReplacing(true)}>
                  Replace file <ChevronRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="det-h">
            <h3 id="det-h" className={styles.sectionLabel}>
              Job details
            </h3>
            <div className={styles.group}>
              <dl className={styles.rows}>
                {details.map(([k, v]) => (
                  <Row key={k} label={k}>
                    {v}
                  </Row>
                ))}
              </dl>
              {job.notes && <p className={styles.message}>{job.notes}</p>}
            </div>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={styles.section} aria-labelledby="track-h">
            <h3 id="track-h" className={styles.sectionLabel}>
              Tracking
            </h3>
            <div className={`${styles.group} ${styles.padded}`}>
              <JobJourney steps={steps} />
              <details className={styles.activity}>
                <summary>Full activity</summary>
                <JobTimeline events={job.events} />
              </details>
            </div>
          </section>
          <a
            className={styles.help}
            href={`https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(`Hello Jerry Meraki, I have a question about job ${job.jobCode}.`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} aria-hidden />
            <span>
              <strong>Need help with this job?</strong>
              <small>Chat with us on WhatsApp</small>
            </span>
            <ChevronRight size={16} aria-hidden />
          </a>
        </aside>
      </div>
    </div>
  );
}
