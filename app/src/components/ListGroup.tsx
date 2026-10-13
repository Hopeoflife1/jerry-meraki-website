import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./ListGroup.module.css";

// App-wide "order app" building blocks (owner, 2026-10-10: every screen should look like a real, designed app).
// Quiet white groups with hairline rows under small grey section labels; colour only in pills and the one
// primary action. Used by customer and admin screens alike.

export const PageHeader = ({
  title,
  sub,
  back,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
}) => (
  <header className={styles.pageHead}>
    {back && (
      <Link to={back.to} className={styles.back}>
        <ChevronLeft size={18} aria-hidden /> {back.label}
      </Link>
    )}
    <div className={styles.titleRow}>
      <div className={styles.titles}>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  </header>
);

export const Section = ({ label, action, children, id }: { label?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) => (
  <section className={styles.section} aria-labelledby={label && id ? id : undefined}>
    {(label || action) && (
      <div className={styles.sectionHead}>
        {label && (
          <h2 id={id} className={styles.label}>
            {label}
          </h2>
        )}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const Group = ({ children, padded, className }: { children: ReactNode; padded?: boolean; className?: string }) => (
  <div className={`${styles.group} ${padded ? styles.padded : ""} ${className ?? ""}`}>{children}</div>
);

/** Label/value rows inside a Group. */
export const Rows = ({ children }: { children: ReactNode }) => <dl className={styles.rows}>{children}</dl>;
export const Row = ({ label, children, strong }: { label: ReactNode; children: ReactNode; strong?: boolean }) => (
  <div className={styles.row}>
    <dt>{label}</dt>
    <dd className={strong ? styles.strong : undefined}>{children}</dd>
  </div>
);

/** Tappable list row (link) with an optional leading icon, title/subtitle and trailing content + chevron. */
export const LinkRow = ({
  to,
  icon,
  title,
  sub,
  meta,
  trailing,
  onClick,
}: {
  to?: string;
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}) => {
  const inner = (
    <>
      {icon && <span className={styles.rowIcon}>{icon}</span>}
      <span className={styles.rowText}>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
        <strong>{title}</strong>
        {sub && <span className={styles.rowSub}>{sub}</span>}
      </span>
      {trailing && <span className={styles.rowTrail}>{trailing}</span>}
      <ChevronRight size={16} className={styles.chev} aria-hidden />
    </>
  );
  return to ? (
    <Link to={to} className={styles.linkRow}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={styles.linkRow} onClick={onClick}>
      {inner}
    </button>
  );
};

export type PillTone = "progress" | "attention" | "success" | "muted" | "danger";
export const StatusPill = ({ tone = "progress", children, className }: { tone?: PillTone; children: ReactNode; className?: string }) => (
  <span className={`${styles.pill} ${styles[tone]} ${className ?? ""}`}>{children}</span>
);

export const EmptyState = ({ icon, title, text, action }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) => (
  <div className={styles.empty}>
    {icon && <span className={styles.emptyIcon}>{icon}</span>}
    <strong>{title}</strong>
    {text && <p>{text}</p>}
    {action}
  </div>
);