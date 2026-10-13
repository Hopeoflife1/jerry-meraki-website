import { useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "./Button";
import { Textarea } from "./Textarea";
import { Spinner } from "./Spinner";
import { useJobs } from "../helpers/useJobs";
import styles from "./FeedbackCard.module.css";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// Compact rating block that sits inside the job's status card once the job is delivered.
// Tap a star, then an optional comment and Send appear. Sent once; afterwards it shows the rating.
export const FeedbackCard = ({ jobId, rating, comment }: { jobId: number; rating: number | null; comment: string | null }) => {
  const send = useJobs.useFeedback();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");

  if (rating) {
    return (
      <div className={styles.done}>
        <span className={styles.row} aria-label={`You rated ${rating} out of 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} size={16} className={n <= rating ? styles.on : styles.off} aria-hidden />
          ))}
          <span className={styles.doneText}>Your rating</span>
        </span>
        {comment && <p className={styles.quote}>“{comment}”</p>}
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.picker} role="radiogroup" aria-label="Rate this job">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}, ${LABELS[n]}`}
            className={styles.starBtn}
            onClick={() => setStars(n)}
          >
            <Star size={28} className={n <= stars ? styles.on : styles.off} aria-hidden />
          </button>
        ))}
        {stars > 0 && <span className={styles.label}>{LABELS[stars]}</span>}
      </div>
      {stars > 0 && (
        <>
          <Textarea rows={2} placeholder="Add a comment (optional)" value={text} onChange={(e) => setText(e.target.value)} />
          <Button
            className={styles.send}
            disabled={send.isPending}
            onClick={async () => {
              try {
                await send.mutateAsync({ id: jobId, rating: stars, comment: text.trim() || undefined });
                toast.success("Thank you! Your feedback was sent.");
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {send.isPending ? <Spinner size="sm" /> : null} Send rating
          </Button>
        </>
      )}
    </div>
  );
};
