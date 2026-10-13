import { BadgeCheck, Clock, BellRing } from "lucide-react";
import { isPayable } from "../helpers/paymentDetails";
import styles from "./PaymentBadge.module.css";

// "Paid" / "Awaiting payment" marker for approved jobs. Shape + icon + label, colour second (design system C4).
// Renders nothing before the customer approves (no payment is due yet) or for cancelled jobs.
// "Check payment" = the customer says they've transferred; an admin still has to confirm it in Moniepoint.
export const PaymentBadge = ({
  status,
  paidAt,
  claimedAt,
  className,
}: {
  status: string;
  paidAt: Date | string | null;
  claimedAt?: Date | string | null;
  className?: string;
}) => {
  if (!isPayable(status)) return null;
  if (paidAt)
    return (
      <span className={`${styles.badge} ${styles.paid} ${className ?? ""}`}>
        <BadgeCheck size={13} aria-hidden /> Paid
      </span>
    );
  if (claimedAt)
    return (
      <span className={`${styles.badge} ${styles.claimed} ${className ?? ""}`}>
        <BellRing size={13} aria-hidden /> Check payment
      </span>
    );
  return (
    <span className={`${styles.badge} ${styles.due} ${className ?? ""}`}>
      <Clock size={13} aria-hidden /> Awaiting payment
    </span>
  );
};