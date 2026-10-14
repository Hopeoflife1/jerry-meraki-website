import { Link } from "react-router-dom";
import styles from "./SiteFooter.module.css";

const WHATSAPP = "https://wa.me/2348088390693";

type FooterLink = { label: string; to?: string; href?: string };

const LINKS: FooterLink[] = [
  { label: "Chat with us", href: WHATSAPP },
  { label: "Help centre", to: "/guide" },
  { label: "Contact us", href: "#contact" },
  { label: "Get a quote", to: "/quote/new" },
  { label: "Track my jobs", to: "/jobs" },
  { label: "What we print", to: "/catalog" },
  { label: "Terms & conditions", to: "/terms" },
  { label: "Privacy notice", to: "/privacy" },
  { label: "Reprint & refund policy", to: "/refunds" },
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
            <a
              key={l.label}
              href={l.href}
              className={styles.link}
              {...(l.href?.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {l.label}
            </a>
          ),
        )}
      </nav>

      <section id="contact" aria-labelledby="footer-contact" className={styles.contact}>
        <h2 id="footer-contact">Contact us</h2>
        <dl>
          <div>
            <dt>Business name</dt>
            <dd>Jerry Meraki Print Enterprise</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>Shomolu, Lagos, Nigeria</dd>
          </div>
          <div>
            <dt>Phone / WhatsApp</dt>
            <dd>
              <a href="tel:+2348088390693">0808 839 0693</a>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href="mailto:jerrymerakico@gmail.com">jerrymerakico@gmail.com</a>
            </dd>
          </div>
        </dl>
      </section>

      <p className={styles.legal}>
        © {new Date().getFullYear()} Jerry Meraki Print Enterprise · Where precision meets print
      </p>
    </div>
  </footer>
);
