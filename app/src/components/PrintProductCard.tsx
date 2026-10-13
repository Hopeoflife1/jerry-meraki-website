import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import styles from "./PrintProductCard.module.css";

// Product tile for bento grids ("What we print", catalog). Ported from the Lovable design.
// Minimal: ivory tile, hairline border, outlined icon, category + index, title, description, price + arrow.
// `size` changes the composition (lg/tall get bigger titles and a faint watermark icon); the parent grid sets the span.
// `variant` "ink" (deep purple) and "tint" (lavender) are used for at most one tile each per grid.

export type PrintTileSize = "sm" | "wide" | "tall" | "lg" | "full";
export type PrintTileVariant = "plain" | "ink" | "tint";

export interface PrintProductCardProps {
  title: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  /** Pre-formatted price, e.g. "₦35,000". Omit to show "Custom quote". */
  fromPrice?: string;
  /** e.g. "3 to 5 days". Omit or empty to hide. */
  leadTime?: string;
  finishes?: string[];
  category?: string;
  /** Position in the grid, shown as "01", "02"… */
  index?: number;
  size?: PrintTileSize;
  variant?: PrintTileVariant;
  className?: string;
}

export const PrintProductCard = ({
  title,
  description,
  href,
  icon: Icon,
  fromPrice,
  leadTime,
  finishes = [],
  category,
  index,
  size = "sm",
  variant = "plain",
  className,
}: PrintProductCardProps) => {
  const extra = [leadTime ? `Ready in ${leadTime}` : null, ...finishes.slice(0, 2)].filter(Boolean).join(" · ");
  const big = size === "lg" || size === "tall";

  return (
    <Link to={href} className={`${styles.tile} ${styles[size]} ${styles[variant]} ${className ?? ""}`}>
      {big ? <Icon className={styles.watermark} strokeWidth={0.65} aria-hidden /> : null}
      <div className={styles.top}>
        <span className={styles.icon}>
          <Icon size={21} strokeWidth={1.4} aria-hidden />
        </span>
        <span className={styles.meta}>
          {category ? <span className={styles.category}>{category}</span> : null}
          {index !== undefined ? <span className={styles.num}>{String(index).padStart(2, "0")}</span> : null}
        </span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        {description ? <p className={styles.desc}>{description}</p> : null}
        {extra ? <p className={styles.extra}>{extra}</p> : null}
      </div>
      <div className={styles.footer}>
        <span>{fromPrice ? `From ${fromPrice}` : "Custom quote"}</span>
        <span className={styles.arrow}>
          <ArrowUpRight size={19} strokeWidth={1.5} aria-hidden />
        </span>
      </div>
    </Link>
  );
};