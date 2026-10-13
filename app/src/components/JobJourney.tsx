import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import type { JourneyStep } from "../helpers/jobJourney";
import styles from "./JobJourney.module.css";

// Vertical tracker of a job from quote request to feedback. Shape + icon + label carry the state
// (colour is secondary): done = tick, current = clock, attention ("Your turn") = alert, todo = empty circle.
const ICON = {
  done: <CheckCircle2 size={18} aria-hidden />,
  current: <Clock size={18} aria-hidden />,
  attention: <AlertCircle size={18} aria-hidden />,
  todo: <Circle size={18} aria-hidden />,
};

export const JobJourney = ({ steps, className, attentionLabel = "Your turn" }: { steps: JourneyStep[]; className?: string; attentionLabel?: string }) => (
  <ol className={`${styles.list} ${className ?? ""}`}>
    {steps.map((s) => (
      <li key={s.id} className={`${styles.step} ${styles[s.state]}`} aria-current={s.state === "current" || s.state === "attention" ? "step" : undefined}>
        <span className={styles.icon}>{ICON[s.state]}</span>
        <div className={styles.body}>
          <span className={styles.titleRow}>
            <strong>{s.title}</strong>
            {s.state === "attention" && <span className={styles.tag}>{attentionLabel}</span>}
            {s.state === "current" && <span className={styles.tagSoft}>In progress</span>}
          </span>
          {s.state !== "todo" && <span className={styles.detail}>{s.detail}</span>}
          {s.at && (
            <time className={styles.time}>
              {s.at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </time>
          )}
        </div>
      </li>
    ))}
  </ol>
);