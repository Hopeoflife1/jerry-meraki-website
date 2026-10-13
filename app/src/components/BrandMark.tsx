import { Link } from "react-router-dom";
import styles from "./BrandMark.module.css";

export const BrandMark = ({
  className,
  light,
  compact,
  to = "/",
}: {
  className?: string;
  light?: boolean;
  compact?: boolean;
  to?: string;
}) => (
  <Link
    to={to}
    aria-label={compact ? "Jerry Meraki home" : undefined}
    className={`${styles.mark} ${light ? styles.light : ""} ${className || ""}`}
  >
    <span className={styles.logo} aria-hidden>
      JM
    </span>
    {!compact && (
      <span className={styles.text}>
        <span className={styles.name}>Jerry Meraki</span>
        <span className={styles.tag}>Where precision meets print</span>
      </span>
    )}
  </Link>
);