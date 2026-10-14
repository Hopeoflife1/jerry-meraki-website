import { Link } from "react-router-dom";
import styles from "./SiteFooter.module.css";

const WHATSAPP = "https://wa.me/2348088390693";

type FooterLink = { label: string; to?: string; href?: string };

// Kept to six (owner, 2026-10-14: footer was too long). Quote, catalog and jobs are already in the main nav.
const LINKS: FooterLink[] = [
  { label: "Chat with us", href: WHATSAPP },
  { label: "Help centre", to: "/guide" },
  { label: "Track my jobs", to: "/jobs" },
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
  { label: "Refund policy", to: "/refunds" },
];

// Site-wide footer (customer pages): quick links plus the business's contact details.
export const SiteFooter = () => (
  <footer className={styles.footer}>
    <div className={styles.inner}>
      <nav aria-label="Footer" className={styles.links}>
        {LINKS.map((l) =>
          l.to ? (
            <Link key={l.label} to={l.to} className={styles.link}>
              {l.label}
            </Link>
          ) : (
            <a key={l.label} href={l.href} className={styles.link} target="_blank" rel="noopener noreferrer">
              {l.label}
            </a>
          ),
        )}
      </nav>

      <address id="contact" className={styles.contact}>
        <p>
          <strong>Jerry Meraki Print Enterprise</strong> · Shomolu, Lagos · Pickup by appointment
        </p>
        <p>
          <a href="tel:+2348088390693">0808 839 0693</a> · <a href="mailto:jerrymerakico@gmail.com">jerrymerakico@gmail.com</a>
        </p>
      </address>

      <p className={styles.legal}>© {new Date().getFullYear()} Jerry Meraki Print Enterprise</p>
    </div>
  </footer>
);
