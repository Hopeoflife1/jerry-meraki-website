import type { JobDetail } from "../helpers/jobTypes";
import styles from "./JobSpecs.module.css";

export const JobSpecs = ({ job, className }: { job: JobDetail; className?: string }) => {
  const rows: [string, string][] = [
    ["Product", job.product],
    ["Size", job.size],
    ["Quantity", job.quantity.toLocaleString()],
    ["Paper", job.paper],
    ["Sides", job.printSides],
    ["Colour", job.colourMode],
    ["Finishing", job.finishing.length ? job.finishing.join(", ") : "None"],
    ["Needed by", job.neededBy ? new Date(job.neededBy).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Flexible"],
    ["Delivery", job.deliveryMethod === "delivery" ? `Deliver to: ${job.deliveryAddress ?? ""}` : "Pick up at 14/15 Ayoola Lawal, Bariga"],
  ];
  return (
    <div className={`${styles.wrap} ${className || ""}`}>
      <dl className={styles.grid}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.item}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {job.notes && (
        <div className={styles.notes}>
          <dt>Notes</dt>
          <dd>{job.notes}</dd>
        </div>
      )}
    </div>
  );
};