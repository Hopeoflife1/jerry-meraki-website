import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  MessageCircle,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Circle,
  Banknote,
  Undo2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  PenLine,
  Printer,
  PackageCheck,
  Truck,
  Star,
} from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { StatusBadge } from "../components/StatusBadge";
import { PaymentBadge } from "../components/PaymentBadge";
import { JobSpecs } from "../components/JobSpecs";
import { JobTimeline } from "../components/JobTimeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useJobs } from "../helpers/useJobs";
import { formatNaira } from "../helpers/formatNaira";
import { printCatalog } from "../helpers/printCatalog";
import { quotePricing } from "../helpers/quotePricing";
import { isPayable, paymentDetails } from "../helpers/paymentDetails";
import { jobJourney, isPickup, fmtDay } from "../helpers/jobJourney";
import { JobJourney } from "../components/JobJourney";
import type { CostLine, JobDetail } from "../helpers/jobTypes";
import type { JobStatus } from "../helpers/schema";
import styles from "./dashboard.jobs.$jobId.module.css";

const toWhatsApp = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = "234" + d.slice(1);
  return d;
};

const defaultLines = (job: JobDetail): CostLine[] => {
  const lines: CostLine[] = [
    { stage: "Plate making", vendor: "", amount: 0 },
    { stage: "Paper / stock", vendor: "", amount: 0 },
    { stage: "Printing (impressions)", vendor: "", amount: 0 },
  ];
  if (job.finishing.some((f) => f.toLowerCase().includes("lamination"))) lines.push({ stage: "Lamination", vendor: "", amount: 0 });
  lines.push({ stage: "Finishing (cutting, folding, binding)", vendor: "", amount: 0 });
  if (job.deliveryMethod === "delivery") lines.push({ stage: "Transport & logistics", vendor: "", amount: 0 });
  return lines;
};

const QuoteBuilder = ({ job }: { job: JobDetail }) => {
  const send = useJobs.useSendQuote();
  const [lines, setLines] = useState<CostLine[]>(() => job.costBreakdown?.lines ?? defaultLines(job));
  const [markup, setMarkup] = useState(String(job.costBreakdown?.markupPercent ?? 30));
  const [finalPrice, setFinalPrice] = useState(job.quotedPrice ? String(Number(job.quotedPrice)) : "");
  const [priceTouched, setPriceTouched] = useState(!!job.quotedPrice);
  const [message, setMessage] = useState(job.quoteMessage ?? "");

  const subtotal = quotePricing.subtotal(lines);
  const total = quotePricing.priceAtMarkup(subtotal, Number(markup) || 0);
  const minPrice = quotePricing.minimumPrice(subtotal);
  const quoteError = quotePricing.validate({ cost: subtotal, markupPercent: Number(markup), finalPrice: Number(finalPrice) });
  const profit = (Number(finalPrice) || total) - subtotal;
  const unit = job.quantity ? (Number(finalPrice) || total) / job.quantity : 0;

  useEffect(() => {
    if (!priceTouched) setFinalPrice(total ? String(Math.ceil(total / 500) * 500) : "");
  }, [total, priceTouched]);

  const update = (i: number, patch: Partial<CostLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const editable = job.status === "quote_requested" || job.status === "quoted";

  const submit = async () => {
    try {
      await send.mutateAsync({
        id: job.id,
        lines: lines.map((l) => ({ ...l, amount: Number(l.amount) || 0 })),
        markupPercent: Number(markup) || 0,
        finalPrice: Number(finalPrice),
        message: message || undefined,
      });
      toast.success("Quote sent to customer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <h2>Job costing</h2>
        <span className={styles.hintSmall}>Internal only · customer sees the final price</span>
      </div>
      <div className={styles.lines}>
        <div className={`${styles.line} ${styles.lineHead}`}>
          <span>Stage</span>
          <span>Supplier / note</span>
          <span>Cost (₦)</span>
          <span />
        </div>
        {lines.map((l, i) => (
          <div key={i} className={styles.line}>
            <Select value={l.stage} onValueChange={(v) => update(i, { stage: v })} disabled={!editable}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([...printCatalog.costStages, l.stage])].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="e.g. in-house" value={l.vendor} disabled={!editable} onChange={(e) => update(i, { vendor: e.target.value })} />
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={l.amount || ""}
              disabled={!editable}
              onChange={(e) => update(i, { amount: Number(e.target.value) })}
              className={styles.num}
            />
            <Button variant="ghost" size="icon-sm" aria-label="Remove line" disabled={!editable} onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
              <Trash2 size={15} />
            </Button>
          </div>
        ))}
        {editable && (
          <Button variant="ghost" size="sm" className={styles.addLine} onClick={() => setLines((ls) => [...ls, { stage: "Design / artwork correction", vendor: "", amount: 0 }])}>
            <Plus size={14} /> Add cost line
          </Button>
        )}
      </div>

      <div className={styles.summary}>
        <div>
          <span>Production cost</span>
          <strong>{formatNaira(subtotal)}</strong>
        </div>
        <div>
          <span>Markup %</span>
          <Input
            type="number"
            min={quotePricing.MIN_MARKUP_PERCENT}
            value={markup}
            disabled={!editable}
            onChange={(e) => setMarkup(e.target.value)}
            className={styles.markup}
          />
        </div>
        <div>
          <span>Suggested price</span>
          <strong>{formatNaira(total)}</strong>
        </div>
        <div>
          <span>Final price to customer (₦)</span>
          <Input
            type="number"
            min={0}
            value={finalPrice}
            disabled={!editable}
            onChange={(e) => {
              setPriceTouched(true);
              setFinalPrice(e.target.value);
            }}
            className={styles.finalInput}
          />
          <span className={styles.minHint}>Min {formatNaira(minPrice)}</span>
        </div>
      </div>
      {editable && subtotal > 0 && quoteError && <p className={styles.quoteError}>{quoteError}</p>}
      <div className={styles.metrics}>
        <span>
          Profit <strong className={profit < 0 ? styles.neg : styles.pos}>{formatNaira(profit)}</strong>
        </span>
        <span>
          Per unit <strong>₦{unit.toFixed(unit < 100 ? 1 : 0)}</strong>
        </span>
      </div>

      {editable && (
        <>
          <Textarea
            rows={3}
            placeholder="Message to customer, e.g. Price includes matte lamination. Ready 2 working days after approval and artwork check."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button className={styles.send} disabled={send.isPending || !!quoteError} onClick={submit}>
            {send.isPending ? <Spinner size="sm" /> : <Send size={16} />}
            {job.status === "quoted" ? "Update & resend quote" : "Send quote to customer"}
          </Button>
        </>
      )}
    </section>
  );
};

// Payment marker: the admin confirms money has arrived in the Moniepoint account.
// Artwork decision: approve the file for printing or send the customer a note on what to fix.
const ArtworkReviewBox = ({ job }: { job: JobDetail }) => {
  const review = useJobs.useArtworkReview();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const done = job.status === "delivered" || job.status === "cancelled";
  const when = job.artworkReviewedAt
    ? new Date(job.artworkReviewedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const act = async (decision: "approved" | "changes_requested" | "pending", n?: string) => {
    try {
      await review.mutateAsync({ id: job.id, decision, note: n });
      setAsking(false);
      setNote("");
      toast.success(
        decision === "approved"
          ? "Artwork approved. The customer can see it on their job."
          : decision === "changes_requested"
            ? "Sent. The customer can now upload a corrected file."
            : "Artwork review reopened",
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const waText = job.artworkReviewNote
    ? encodeURIComponent(
        `Hello ${job.customerName}, this is Jerry Meraki Print about job ${job.jobCode}. Please update your artwork: ${job.artworkReviewNote} You can upload the new file here: https://jerrymeraki.floot.app/jobs/${job.id}`,
      )
    : "";

  if (job.artworkReview === "approved") {
    return (
      <div className={styles.reviewApproved}>
        <span>
          <CheckCircle2 size={16} /> Approved for printing{when ? ` on ${when}` : ""}.
        </span>
        {!done && (
          <Button variant="ghost" size="sm" disabled={review.isPending} onClick={() => act("pending")}>
            <Undo2 size={14} /> Undo
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className={styles.review}>
      {job.artworkReview === "changes_requested" && (
        <div className={styles.reviewChanges}>
          <p>
            <AlertTriangle size={14} /> You asked for changes{when ? ` on ${when}` : ""}: “{job.artworkReviewNote}”. Waiting for the customer's new file.
          </p>
          {job.customerPhone && (
            <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/${toWhatsApp(job.customerPhone!)}?text=${waText}`, "_blank")}>
              <MessageCircle size={14} /> Tell them on WhatsApp
            </Button>
          )}
        </div>
      )}
      {done ? null : asking ? (
        <>
          <Textarea
            rows={3}
            autoFocus
            placeholder="What should the customer fix? e.g. Please add 3mm bleed and send the file in CMYK."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className={styles.reviewActions}>
            <Button disabled={review.isPending || note.trim().length < 3} onClick={() => act("changes_requested", note)}>
              {review.isPending ? <Spinner size="sm" /> : <Send size={14} />} Send to customer
            </Button>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.reviewActions}>
          <Button className={styles.approveArt} disabled={review.isPending} onClick={() => act("approved")}>
            {review.isPending ? <Spinner size="sm" /> : <ThumbsUp size={16} />} Approve artwork
          </Button>
          <Button variant="outline" disabled={review.isPending} onClick={() => setAsking(true)}>
            <PenLine size={16} /> {job.artworkReview === "changes_requested" ? "Change the request" : "Request changes"}
          </Button>
        </div>
      )}
    </div>
  );
};

const PaymentPanel = ({ job }: { job: JobDetail }) => {
  const mark = useJobs.useMarkPayment();
  if (!isPayable(job.status)) return null;
  const paid = !!job.paidAt;
  const set = async (value: boolean) => {
    try {
      await mark.mutateAsync({ id: job.id, paid: value });
      toast.success(value ? "Marked as paid. The customer can see it on their job." : "Payment marker removed");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <section className={`${styles.card} ${paid ? styles.paidCard : styles.dueCard}`}>
      <div className={styles.cardHead}>
        <h2>Payment</h2>
        <PaymentBadge status={job.status} paidAt={job.paidAt} claimedAt={job.paymentClaimedAt} />
      </div>
      {paid ? (
        <>
          <p className={styles.muted}>
            {job.quotedPrice ? formatNaira(job.quotedPrice) : "Payment"} received on{" "}
            {new Date(job.paidAt!).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}.
          </p>
          <p className={styles.nextStep}>
            <strong>Next:</strong>{" "}
            {job.status === "approved" || job.status === "artwork_check"
              ? job.artworkFileName
                ? job.artworkReview === "approved"
                  ? "the artwork is approved. Move the job to In production."
                  : "check the artwork below and approve it, then move the job to In production."
                : "the customer hasn't uploaded artwork yet. Message them on WhatsApp."
              : job.status === "in_production"
                ? "when printing is done, move the job to Ready for pickup/delivery."
                : job.status === "ready"
                  ? "once the customer collects it, move the job to Delivered."
                  : "nothing. This job is complete."}
          </p>
          <Button variant="ghost" size="sm" disabled={mark.isPending} onClick={() => set(false)}>
            {mark.isPending ? <Spinner size="sm" /> : <Undo2 size={14} />} Undo, not paid yet
          </Button>
        </>
      ) : (
        <>
          {job.paymentClaimedAt && (
            <p className={styles.claimNote}>
              The customer says they paid on{" "}
              {new Date(job.paymentClaimedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.
            </p>
          )}
          <p className={styles.muted}>
            Check {paymentDetails.bank} {paymentDetails.accountNumber} for{" "}
            {job.quotedPrice ? <strong>{formatNaira(job.quotedPrice)}</strong> : "the quoted amount"} with reference <strong>{job.jobCode}</strong>,
            then mark it paid.
          </p>
          <Button className={styles.markPaid} disabled={mark.isPending} onClick={() => set(true)}>
            {mark.isPending ? <Spinner size="sm" /> : <Banknote size={16} />} Mark as paid
          </Button>
        </>
      )}
    </section>
  );
};

const StatusUpdater = ({ job }: { job: JobDetail }) => {
  const upd = useJobs.useUpdateStatus();
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [note, setNote] = useState("");
  useEffect(() => setStatus(job.status), [job.status]);
  return (
    <div className={styles.manualBody}>
      <Select value={status} onValueChange={(v) => setStatus(v as JobStatus)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {printCatalog.statuses.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input placeholder="Note for the customer (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Button
        variant="secondary"
        disabled={upd.isPending || status === job.status}
        onClick={async () => {
          try {
            await upd.mutateAsync({ id: job.id, status, note: note || undefined });
            setNote("");
            toast.success("Status updated");
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      >
        {upd.isPending ? <Spinner size="sm" /> : null} Update status
      </Button>
    </div>
  );
};

// Guided "what to do now" for the admin: names the blockers, offers the one next action with a single
// button, and a ready-made WhatsApp update for the customer. Manual status change stays available below.
const NextStepPanel = ({ job }: { job: JobDetail }) => {
  const upd = useJobs.useUpdateStatus();
  const [note, setNote] = useState("");
  const [readyBy, setReadyBy] = useState("");
  const pickup = isPickup(job);
  const name = job.customerName?.split(" ")[0] ?? "there";
  const link = `https://jerrymeraki.floot.app/jobs/${job.id}`;
  const price = job.quotedPrice ? formatNaira(job.quotedPrice) : "the quoted amount";

  const move = async (status: JobStatus, extra?: { readyBy?: string }) => {
    try {
      await upd.mutateAsync({ id: job.id, status, note: note.trim() || undefined, ...extra });
      setNote("");
      toast.success("Done. The customer's tracker has moved on.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  let title = "";
  let text = "";
  let waText = "";
  let action: React.ReactNode = null;
  const blockers: string[] = [];
  const noteInput = (placeholder: string) => (
    <Input placeholder={placeholder} value={note} onChange={(e) => setNote(e.target.value)} />
  );

  switch (job.status) {
    case "quote_requested":
      title = "Send the quote";
      text = "Fill in the job costing and send the price to the customer.";
      break;
    case "quoted":
      title = "Waiting for the customer to approve";
      text = `Quote sent: ${price}.`;
      waText = `Hello ${name}, your quote for job ${job.jobCode} (${job.quantity.toLocaleString()} × ${job.product}) is ready: ${price}. You can approve it here: ${link}`;
      break;
    case "approved":
    case "artwork_check": {
      if (!job.paidAt) blockers.push(job.paymentClaimedAt ? "The customer says they've paid. Check Moniepoint and mark it paid above." : "Waiting for payment.");
      if (!job.artworkFileName) blockers.push("Waiting for the customer's artwork.");
      else if (job.artworkReview === "changes_requested") blockers.push("Waiting for the corrected artwork.");
      else if (job.artworkReview !== "approved") blockers.push("Check the artwork below and approve it.");
      const onlyPayment = blockers.length === 1 && !job.paidAt;
      title = blockers.length ? "Before printing" : "Ready to print";
      text = blockers.length ? "" : "Payment and artwork are confirmed. Set an estimated ready date and start printing.";
      waText = !job.paidAt
        ? `Hello ${name}, a reminder for job ${job.jobCode}: please pay ${price} to ${paymentDetails.bank} ${paymentDetails.accountNumber} (${paymentDetails.accountName}) with ${job.jobCode} as the reference. Details: ${link}`
        : !job.artworkFileName
          ? `Hello ${name}, we've received your payment for job ${job.jobCode}, thank you! Please upload your artwork here so we can start printing: ${link}`
          : `Hello ${name}, thank you! Payment for job ${job.jobCode} is confirmed and we're getting your job ready to print. Track it here: ${link}`;
      if (!blockers.length || onlyPayment) {
        action = (
          <>
            <label className={styles.fieldLabel}>
              Estimated ready date
              <Input type="date" value={readyBy} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setReadyBy(e.target.value)} />
            </label>
            {noteInput("Note for the customer (optional)")}
            <Button
              className={onlyPayment ? undefined : styles.primaryStep}
              variant={onlyPayment ? "outline" : "primary"}
              disabled={upd.isPending}
              onClick={() => move("in_production", readyBy ? { readyBy } : undefined)}
            >
              {upd.isPending ? <Spinner size="sm" /> : <Printer size={16} />} {onlyPayment ? "Start printing before payment" : "Start printing"}
            </Button>
          </>
        );
      }
      break;
    }
    case "in_production":
      title = "Printing";
      text = job.readyBy ? `Estimated ready ${fmtDay(job.readyBy)}. When it's done, let the customer know.` : "When it's printed and finished, let the customer know.";
      waText = `Hello ${name}, your job ${job.jobCode} is printing now${job.readyBy ? ` and should be ready ${fmtDay(job.readyBy)}` : ""}. Track it here: ${link}`;
      action = (
        <>
          {noteInput(pickup ? "Pickup note, e.g. Open 9am to 6pm, Monday to Saturday" : "Delivery note, e.g. Rider: Musa, 0803 000 0000")}
          <Button className={styles.primaryStep} disabled={upd.isPending} onClick={() => move("ready")}>
            {upd.isPending ? <Spinner size="sm" /> : pickup ? <PackageCheck size={16} /> : <Truck size={16} />}{" "}
            {pickup ? "Mark ready for pickup" : "Mark out for delivery"}
          </Button>
        </>
      );
      break;
    case "ready":
      title = pickup ? "Waiting for the customer to collect" : "Out for delivery";
      text = `The customer can also tap "I've ${pickup ? "collected" : "received"} my job" themselves.`;
      waText = pickup
        ? `Hello ${name}, your job ${job.jobCode} is ready for pickup at ${job.pickupAddress ?? "our office"}. Please message us before you come and bring your job code. ${link}`
        : `Hello ${name}, your job ${job.jobCode} is on its way to you. ${link}`;
      action = (
        <Button className={styles.primaryStep} disabled={upd.isPending} onClick={() => move("delivered")}>
          {upd.isPending ? <Spinner size="sm" /> : <CheckCircle2 size={16} />} {pickup ? "Mark as collected" : "Mark as delivered"}
        </Button>
      );
      break;
    case "delivered":
      title = job.feedbackAt ? "Complete" : "Waiting for feedback";
      text = job.feedbackAt ? "" : "The customer has been asked to rate the job in the app.";
      waText = job.feedbackAt ? "" : `Hello ${name}, thank you for printing with Jerry Meraki! How did we do? Please rate job ${job.jobCode} here: ${link}`;
      break;
    case "cancelled":
      title = "Cancelled";
      break;
  }

  return (
    <section className={`${styles.card} ${styles.nextCard}`} aria-labelledby="next-h">
      <span className={styles.nextLabel}>Next step</span>
      <h2 id="next-h">{title}</h2>
      {text && <p className={styles.muted}>{text}</p>}
      {blockers.length > 0 && (
        <ul className={styles.blockers}>
          {blockers.map((b) => (
            <li key={b}>
              <AlertTriangle size={14} aria-hidden /> {b}
            </li>
          ))}
        </ul>
      )}
      {job.status === "delivered" && job.feedbackRating && (
        <div className={styles.feedback}>
          <span aria-label={`${job.feedbackRating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={18} className={n <= job.feedbackRating! ? styles.starOn : styles.starOff} aria-hidden />
            ))}
          </span>
          {job.feedbackComment && <blockquote>{job.feedbackComment}</blockquote>}
        </div>
      )}
      {action}
      {waText && job.customerPhone && (
        <Button variant="outline" onClick={() => window.open(`https://wa.me/${toWhatsApp(job.customerPhone!)}?text=${encodeURIComponent(waText)}`, "_blank")}>
          <MessageCircle size={16} /> Update the customer on WhatsApp
        </Button>
      )}
      <details className={styles.manual}>
        <summary>Change status manually</summary>
        <StatusUpdater job={job} />
      </details>
    </section>
  );
};

export default function AdminJobPage() {
  const { jobId } = useParams();
  const { data, error } = useJobs.useDetail(Number(jobId));
  if (error) return <p className={styles.error}>{(error as Error).message}</p>;
  if (!data) return <Skeleton className={styles.skeleton} />;
  const job = data.job;
  const waText = encodeURIComponent(`Hello ${job.customerName}, this is Jerry Meraki Print about your job ${job.jobCode} (${job.quantity.toLocaleString()} × ${job.product}).`);

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{job.jobCode} · Dashboard</title>
      </Helmet>
      <Link to="/dashboard" className={styles.back}>
        <ArrowLeft size={16} /> All jobs
      </Link>
      <header className={styles.head}>
        <div>
          <span className={styles.code}>{job.jobCode}</span>
          <h1>
            {job.quantity.toLocaleString()} × {job.product}
          </h1>
          <span className={styles.sub}>
            Requested {new Date(job.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <span className={styles.badges}>
          <StatusBadge status={job.status} />
          <PaymentBadge status={job.status} paidAt={job.paidAt} claimedAt={job.paymentClaimedAt} />
        </span>
      </header>

      <div className={styles.grid}>
        <div className={styles.col}>
          <QuoteBuilder key={`${job.id}-${job.status}`} job={job} />
          <section className={styles.card}>
            <h2>Specification</h2>
            <JobSpecs job={job} />
          </section>
        </div>
        <div className={styles.col}>
          <NextStepPanel job={job} />
          <section className={styles.card}>
            <h2>Customer</h2>
            <div className={styles.customer}>
              <strong>{job.customerName}</strong>
              <span>{job.customerEmail}</span>
              <span>{job.customerPhone ?? "No phone"}</span>
            </div>
            {job.customerPhone && (
              <Button variant="outline" onClick={() => window.open(`https://wa.me/${toWhatsApp(job.customerPhone!)}?text=${waText}`, "_blank")}>
                <MessageCircle size={16} /> Message on WhatsApp
              </Button>
            )}
          </section>
          <PaymentPanel job={job} />
          <section className={styles.card}>
            <h2>Artwork</h2>
            {job.artworkFileName ? (
              <>
                <div className={styles.artwork}>
                  <span>{job.artworkFileName}</span>
                  {job.artworkDownloadUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(job.artworkDownloadUrl!, "_blank")}>
                      <Download size={14} /> Download
                    </Button>
                  )}
                </div>
                <ul className={styles.checks}>
                  {job.artworkReport
                    ? printCatalog.artworkChecklist.map((c) => {
                        const it = job.artworkReport!.items[c.id];
                        const status = it?.status ?? "manual";
                        const icon =
                          status === "pass" ? (
                            <CheckCircle2 size={14} />
                          ) : status === "fail" ? (
                            <XCircle size={14} />
                          ) : status === "warn" ? (
                            <AlertTriangle size={14} />
                          ) : (
                            <HelpCircle size={14} />
                          );
                        return (
                          <li key={c.id} className={`${styles.reportItem} ${styles[`r_${status}`]}`}>
                            {icon}
                            <span>
                              <strong>{c.label}</strong>
                              <small>
                                {status === "manual" ? "Customer confirmed (not checked automatically). " : status === "warn" ? "Customer confirmed. " : ""}
                                {it?.detail}
                              </small>
                            </span>
                          </li>
                        );
                      })
                    : printCatalog.artworkChecklist.map((c) => {
                        const ok = !!job.artworkChecks?.[c.id];
                        return (
                          <li key={c.id} className={ok ? styles.ok : styles.notOk}>
                            {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />} {c.label}
                          </li>
                        );
                      })}
                </ul>
                {job.artworkReport?.override && (
                  <p className={styles.overrideFlag}>
                    <AlertTriangle size={14} /> The customer chose "Send it anyway" despite the problems above. Fix the file or agree a change with them
                    before printing.
                  </p>
                )}
                {job.artworkReport?.note && <p className={styles.muted}>{job.artworkReport.note}</p>}
                {!job.artworkReport && <p className={styles.muted}>Not checked automatically: the customer ticked the checklist themselves.</p>}
                <ArtworkReviewBox job={job} />
              </>
            ) : (
              <p className={styles.muted}>No artwork uploaded yet.</p>
            )}
          </section>
          <section className={styles.card}>
            <h2>Activity</h2>
            <JobJourney steps={jobJourney(job)} attentionLabel="Customer's turn" className={styles.journey} />
            <JobTimeline events={job.events} />
          </section>
        </div>
      </div>
    </div>
  );
}