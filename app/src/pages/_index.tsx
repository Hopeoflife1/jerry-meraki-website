import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import * as Icons from "lucide-react";
import { ArrowRight, Pause, Play } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { Skeleton } from "../components/Skeleton";
import { PrintProductCard, type PrintTileSize, type PrintTileVariant } from "../components/PrintProductCard";
import { RollingWord } from "../components/RollingWord";
import { FlowPreview } from "../components/FlowPreview";
import { useAuth } from "../helpers/useAuth";
import { useJobs } from "../helpers/useJobs";
import { useProducts } from "../helpers/useProducts";
import { formatNaira } from "../helpers/formatNaira";
import styles from "./_index.module.css";

gsap.registerPlugin(useGSAP);

const iconFor = (name: string) => (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Printer;

// Bento rhythm on a 6-column grid (desktop), matching the Lovable design. Fills rows exactly for 10 products:
// [lg 4x2][sm 2][sm 2] / [tall 2x2][wide 4] / [sm 2][sm 2] / [half 3][half 3] / [full 6]
// Tiles are plain ivory; any tile turns deep purple when picked (hover, keyboard focus or tap). The last (full) tile is tinted.
type Slot = { size: PrintTileSize; span: string; variant?: PrintTileVariant };
const BENTO: Slot[] = [
  { size: "lg", span: "b_lg" },
  { size: "sm", span: "b_sm" },
  { size: "sm", span: "b_sm" },
  { size: "tall", span: "b_tall" },
  { size: "wide", span: "b_wide" },
  { size: "sm", span: "b_sm" },
  { size: "sm", span: "b_sm" },
  { size: "sm", span: "b_half" },
  { size: "sm", span: "b_half" },
];
const slotFor = (i: number, isLast: boolean): Slot =>
  isLast ? { size: "full", span: "b_full", variant: "tint" } : BENTO[i] ?? { size: "sm", span: "b_sm" };

// Registration mark used at the corners of the hero sheet.
const RegMark = ({ className }: { className: string }) => (
  <svg className={`${styles.reg} ${className}`} viewBox="0 0 20 20" aria-hidden focusable="false" data-fade>
    <circle cx="10" cy="10" r="6" fill="none" />
    <line x1="10" y1="0" x2="10" y2="20" />
    <line x1="0" y1="10" x2="20" y2="10" />
  </svg>
);

const SPECS = [
  { k: "Based in", v: "Bariga, Lagos" },
  { k: "Quotes", v: "Usually within hours" },
  { k: "Every job", v: "Checked before it prints" },
  { k: "Delivery", v: "On time, to your door" },
];

const TIPS = [
  { t: "Use CMYK, not RGB", d: "RGB files print dull or off-colour. Export in CMYK to get what you see." },
  { t: "Add 3mm bleed", d: "Extend backgrounds past the edge and keep text 5mm inside the cut line." },
  { t: "Choose paper wisely", d: "Cheaper, thinner stock feels flimsy. We'll explain the tradeoffs before you pay." },
  { t: "Track every stage", d: "Follow your job from artwork check to delivery, right here in the app." },
];

const RecentJobs = () => {
  const { data, isFetching } = useJobs.useMine();
  const jobs = data?.jobs.slice(0, 3) ?? [];
  if (isFetching && !data) return <Skeleton className={styles.recentSkeleton} />;
  if (!jobs.length) return null;
  return (
    <section className={styles.section} aria-labelledby="recent-h">
      <div className={styles.sectionLabel}>
        <span className={styles.sectionNum}>00</span>
        <h2 id="recent-h">Your recent jobs</h2>
        <Link to="/jobs" className={styles.more}>
          See all <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <div className={styles.recent}>
        {jobs.map((j) => (
          <Link key={j.id} to={`/jobs/${j.id}`} className={styles.recentCard}>
            <span className={styles.code}>{j.jobCode}</span>
            <strong>{j.product}</strong>
            <span className={styles.meta}>
              {j.quantity.toLocaleString()} pcs · {j.size}
            </span>
            <div className={styles.recentFoot}>
              <StatusBadge status={j.status} />
              <span className={styles.price}>{j.quotedPrice ? formatNaira(j.quotedPrice) : "Awaiting quote"}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const Ticker = ({ words, paused, onToggle }: { words: string[]; paused: boolean; onToggle: () => void }) => {
  if (!words.length) return null;
  const run = (copy: number) => (
    <span className={styles.tickerRun} key={copy}>
      {words.map((w) => (
        <span key={`${copy}-${w}`} className={styles.tickerItem}>
          <span className={styles.star}>✦</span>
          {w}
        </span>
      ))}
    </span>
  );
  return (
    <div className={`${styles.ticker} ${paused ? styles.tickerPaused : ""}`} data-fade>
      <div className={styles.tickerTrack} aria-hidden>
        {run(0)}
        {run(1)}
      </div>
      <button
        type="button"
        className={styles.tickerBtn}
        onClick={onToggle}
        aria-label={paused ? "Play animations" : "Pause animations"}
        aria-pressed={paused}
      >
        {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
      </button>
    </div>
  );
};

export default function HomePage() {
  const { authState } = useAuth();
  const signedIn = authState.type === "authenticated";
  const productsQ = useProducts.useList();
  const products = productsQ.data?.products ?? [];
  const categoryName = new Map((productsQ.data?.categories ?? []).map((c) => [c.id, c.name]));
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // Entry timeline, deliberately unhurried and one step at a time (owner feedback: it was too fast, all at once):
  // 1 hairlines draw in → 2 welcome + "We print…" line → 3 headline rises line by line →
  // 4 lede, buttons, specs, phone and ticker settle in one after another.
  // Skipped entirely when the device asks for reduced motion.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Owner history: v1 too fast, v2 too slow, v3 (~3.5s) still slow on 2026-10-10 → now about 1.8s end to end,
        // same order, lines still rise one after another.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.05 });
        tl.from("[data-hline]", { scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.08 })
          .from("[data-vline]", { scaleY: 0, transformOrigin: "center top", duration: 0.6, stagger: 0.06 }, "<0.05")
          .from("[data-intro]", { autoAlpha: 0, y: 10, duration: 0.4, stagger: 0.1 }, "-=0.45")
          .from("[data-rise]", { yPercent: 110, duration: 0.65, ease: "power4.out", stagger: 0.12 }, "-=0.25")
          .from("[data-fade]", { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.06 }, "-=0.4");
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const firstName = signedIn ? authState.user.displayName.split(" ")[0] : "";
  const tickerWords = products.filter((p) => p.name !== "Other").map((p) => p.name);
  const rollingWords = tickerWords.map((w) => w.toLowerCase());

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Jerry Meraki Print Enterprise</title>
      </Helmet>

      <section className={styles.hero} aria-labelledby="hero-h">
        {/* Registration hairlines (decorative) */}
        <span className={`${styles.hline} ${styles.hTop}`} data-hline aria-hidden />
        <span className={`${styles.hline} ${styles.hMid}`} data-hline aria-hidden />
        <span className={`${styles.vline} ${styles.vLeft}`} data-vline aria-hidden />
        <span className={`${styles.vline} ${styles.vSplit}`} data-vline aria-hidden />
        <span className={`${styles.vline} ${styles.vRight}`} data-vline aria-hidden />
        <RegMark className={styles.regTl} />
        <RegMark className={styles.regTr} />

        <div className={styles.heroGrid}>
          <div className={styles.heroMain}>
            {signedIn && (
              <p className={styles.welcome}>
                Welcome back, {firstName}
              </p>
            )}
            <div data-intro>
              <RollingWord lead="We print" words={rollingWords} paused={paused} className={styles.kicker} />
            </div>
            <h1 id="hero-h" className={styles.headline}>
              {/* Same headline for everyone, so it never flashes and swaps once the login is known. */}
              <span className={styles.mask}>
                <span data-rise>Print that looks</span>
              </span>
              <span className={styles.mask}>
                <span data-rise>
                  <mark className={styles.mark}>exactly</mark> how
                </span>
              </span>
              <span className={styles.mask}>
                <span data-rise>you imagined.</span>
              </span>
            </h1>
            <p className={styles.lede} data-fade>
              Quality print, honest prices, delivered on time. Send your design and get a clear quote fast.
            </p>
            <div className={styles.actions}>
              <span data-fade>
                <Button asChild size="lg" className={styles.cta}>
                  <Link to="/quote/new">
                    Get a quote <ArrowRight size={18} aria-hidden />
                  </Link>
                </Button>
              </span>
              <span data-fade>
                <Button asChild size="lg" variant="outline" className={styles.ghost}>
                  {signedIn ? <Link to="/jobs">Track my jobs</Link> : <Link to="/login">Log in / Sign up</Link>}
                </Button>
              </span>
            </div>
          </div>

          <div className={styles.heroSide} data-fade>
            <FlowPreview paused={paused} />
          </div>
        </div>

        <dl className={styles.specs}>
          {SPECS.map((s) => (
            <div key={s.k} className={styles.spec} data-fade>
              <dt>{s.k}</dt>
              <dd>{s.v}</dd>
            </div>
          ))}
        </dl>

        <Ticker words={tickerWords} paused={paused} onToggle={() => setPaused((p) => !p)} />
      </section>

      {signedIn && <RecentJobs />}

      <section className={styles.section} aria-labelledby="print-h">
        <div className={styles.sectionLabel}>
          <span className={styles.sectionNum}>01</span>
          <h2 id="print-h">
            What we
            <br />
            print
          </h2>
          <Link to="/catalog" className={styles.more}>
            See full catalog <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <div className={styles.services}>
          {productsQ.isFetching && !productsQ.data
            ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className={styles.cardSkeleton} />)
            : null}
          {products.map((p, i) => {
            const slot = slotFor(i, i === products.length - 1);
            return (
              <div key={p.id} className={`${styles.cell} ${styles[slot.span]}`}>
                <PrintProductCard
                  title={p.name}
                  description={p.description}
                  href={`/quote/new?product=${encodeURIComponent(p.name)}`}
                  icon={iconFor(p.icon)}
                  fromPrice={p.fromPrice > 0 ? formatNaira(p.fromPrice) : undefined}
                  leadTime={p.leadTime || undefined}
                  finishes={p.finishes ?? []}
                  category={p.categoryId ? categoryName.get(p.categoryId) : "Bespoke"}
                  index={i + 1}
                  size={slot.size}
                  variant={slot.variant}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="art-h">
        <div className={styles.sectionLabel}>
          <span className={styles.sectionNum}>02</span>
          <h2 id="art-h">
            Before you
            <br />
            send artwork
          </h2>
          <Link to="/guide" className={styles.more}>
            Paper guide <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
        <ol className={styles.tips}>
          {TIPS.map((t, i) => (
            <li key={t.t} className={styles.tip}>
              <span className={styles.tipNum} aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <strong>{t.t}</strong>
              <span>{t.d}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
