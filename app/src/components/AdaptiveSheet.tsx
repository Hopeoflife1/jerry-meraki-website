import { ReactNode, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./Dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./Sheet";
import { useIsMobile } from "../helpers/useIsMobile";
import styles from "./AdaptiveSheet.module.css";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: "form" | "wide" | "confirm";
  footer?: ReactNode;
  children: ReactNode;
  /** Element to refocus on close. Pass the opener: Safari does not focus buttons on click. */
  returnFocusTo?: HTMLElement | null;
};

/**
 * Design system §6 adaptive overlay: centered Dialog on desktop, bottom Sheet on phones.
 * Radix provides focus trapping, Esc to close and aria-modal. Focus returns to whatever opened it,
 * even when no DialogTrigger is used.
 */
export const AdaptiveSheet = ({ open, onOpenChange, title, description, size = "form", footer, children, returnFocusTo }: Props) => {
  const isMobile = useIsMobile();
  const returnFocus = useRef<HTMLElement | null>(null);

  const focusProps = {
    onOpenAutoFocus: () => {
      const active = document.activeElement as HTMLElement | null;
      returnFocus.current = active && active !== document.body ? active : null;
    },
    onCloseAutoFocus: (e: Event) => {
      const el = returnFocusTo ?? returnFocus.current;
      if (el && document.contains(el)) {
        e.preventDefault();
        el.focus();
      }
    },
    ...(description ? {} : { "aria-describedby": undefined }),
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className={`${styles.sheet} ${size === "wide" ? styles.sheetTall : ""}`} {...focusProps}>
          <span className={styles.handle} aria-hidden />
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className={styles.body}>{children}</div>
          {footer && <SheetFooter className={`${styles.footer} ${styles.sheetFooter}`}>{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${styles.dialog} ${styles[size]}`} {...focusProps}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className={styles.body}>{children}</div>
        {footer && <DialogFooter className={styles.footer}>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};