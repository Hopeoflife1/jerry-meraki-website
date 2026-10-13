import type { JobDetail } from "../helpers/jobTypes";
import { statusLabel } from "../helpers/printCatalog";
import styles from "./JobTimeline.module.css";

export const JobTimeline = ({ events, className }: { events: JobDetail["events"]; className?: string }) => (
  <ol className={`${styles.list} ${className || ""}`}>
    {[...events].reverse().map((e, i) => (
      <li key={e.id} className={`${styles.item} ${i === 0 ? styles.latest : ""}`}>
        <span className={styles.dot} />
        <div>
          <strong>{statusLabel(e.status)}</strong>
          {e.note && <p>{e.note}</p>}
          <time>
            {new Date(e.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </time>
        </div>
      </li>
    ))}
  </ol>
);