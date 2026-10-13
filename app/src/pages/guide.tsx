import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { paperGuide } from "../helpers/paperGuide";
import { printCatalog } from "../helpers/printCatalog";
import styles from "./guide.module.css";

export default function GuidePage() {
  return (
    <div className={styles.page}>
      <Helmet>
        <title>Print guide · Jerry Meraki</title>
      </Helmet>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Before you print</span>
        <h1>Print guide</h1>
        <p>Five minutes here saves you a costly reprint. This is what we check on every job.</p>
      </header>

      <section className={styles.section}>
        <h2>Why your colours look different on paper</h2>
        <div className={styles.compare}>
          <div className={styles.swatchCard}>
            <div className={`${styles.swatch} ${styles.rgb}`} />
            <strong>RGB (screen)</strong>
            <p>Made of light. Very bright greens, blues and oranges that ink cannot reproduce.</p>
          </div>
          <div className={styles.swatchCard}>
            <div className={`${styles.swatch} ${styles.cmyk}`} />
            <strong>CMYK (print)</strong>
            <p>Made of ink: cyan, magenta, yellow, black. Design in CMYK and what you see is what you get.</p>
          </div>
        </div>
        <p className={styles.note}>
          Photoshop: Image → Mode → CMYK. Illustrator: File → Document Color Mode → CMYK. CorelDRAW: set the document
          colour mode to CMYK before you design. Canva: download as "PDF Print" with CMYK selected (Canva Pro).
        </p>
      </section>

      <section className={styles.section}>
        <h2>Artwork checklist</h2>
        <ol className={styles.checklist}>
          {printCatalog.artworkChecklist.map((c) => (
            <li key={c.id}>
              <strong>{c.label}</strong>
              <span>{c.why}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <h2>Choosing paper and materials</h2>
        <p className={styles.sub}>
          The cheapest stock is not always the cheapest choice. A thin flyer that ends up in the bin wastes the whole print
          budget.
        </p>
        <div className={styles.papers}>
          {paperGuide.ENTRIES.map((e) => (
            <article key={e.name} className={styles.paper}>
              <header>
                <strong>{e.name}</strong>
                <span className={`${styles.tier} ${styles[e.tier]}`}>{paperGuide.TIER_LABEL[e.tier]}</span>
              </header>
              <p>{e.feel}</p>
              <p>
                <span className={styles.label}>Best for</span> {e.bestFor}
              </p>
              <p className={styles.watch}>{e.watchOut}</p>
            </article>
          ))}
        </div>
      </section>

      <Button asChild size="lg" className={styles.cta}>
        <Link to="/quote/new">
          Ready? Get a quote <ArrowRight size={18} />
        </Link>
      </Button>
    </div>
  );
}