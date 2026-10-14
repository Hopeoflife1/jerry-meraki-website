import { ReactNode } from "react";
import { Helmet } from "react-helmet";
import styles from "./PolicyPage.module.css";

// Shared layout for the plain-text policy pages linked from the footer (/terms, /privacy, /refunds).
export const PolicyPage = ({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro: string;
  updated: string;
  sections: { heading: string; body: ReactNode }[];
}) => (
  <article className={styles.page}>
    <Helmet>
      <title>{title} · Jerry Meraki</title>
    </Helmet>
    <header className={styles.head}>
      <h1>{title}</h1>
      <p>{intro}</p>
      <p className={styles.updated}>Last updated {updated}</p>
    </header>
    {sections.map((s) => (
      <section key={s.heading} className={styles.section}>
        <h2>{s.heading}</h2>
        {s.body}
      </section>
    ))}
    <p className={styles.help}>
      Questions? Message us on WhatsApp at <a href="https://wa.me/2348088390693">0808 839 0693</a> or email{" "}
      <a href="mailto:jerrymerakico@gmail.com">jerrymerakico@gmail.com</a>.
    </p>
  </article>
);
