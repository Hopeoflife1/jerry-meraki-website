import type { JobStatus } from "../helpers/schema";
import { printCatalog } from "../helpers/printCatalog";
import styles from "./StatusBadge.module.css";

export const StatusBadge = ({ status, className }: { status: JobStatus; className?: string }) => {
  const s = printCatalog.statuses.find((x) => x.id === status);
  return (
    <span className={`${styles.badge} ${styles[status]} ${className || ""}`}>
      <span className={styles.dot} />
      {s?.short ?? status}
    </span>
  );
};