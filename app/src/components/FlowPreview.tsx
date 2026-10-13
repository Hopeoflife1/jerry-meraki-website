import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Check, FileText, CreditCard, Layers, Package, StickyNote, Flag, ChevronRight, ShieldCheck } from "lucide-react";
import styles from "./FlowPreview.module.css";

gsap.registerPlugin(useGSAP);

// Auto-playing phone preview of the customer flow (Mobbin-style card).
// Each screen slides up like a sheet, holds, then the loop resets.
// Decorative: hidden from screen readers, described once by the caption.
// Pauses when `paused`, when off screen or the tab is hidden; static first screen under reduced motion.

const HOLD = 2.1;

export interface FlowPreviewProps {
  paused?: boolean;
  className?: string;
}

export const FlowPreview = ({ paused = false, className }: FlowPreviewProps) => {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const visible = useRef(true);
  const pausedRef = useRef(paused);

  const sync = () => {
    const t = tl.current;
    if (!t) return;
    if (pausedRef.current || !visible.current || document.hidden) t.pause();
    else t.play();
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const screens = gsap.utils.toArray<HTMLElement>("[data-screen]");
        const [, ...rest] = screens;
        gsap.set(rest, { yPercent: 100 });

        const t = gsap.timeline({ repeat: -1, defaults: { ease: "power3.out" } });
        screens.forEach((s, i) => {
          const pops = s.querySelectorAll("[data-pop]");
          const tap = s.querySelector("[data-tap]");
          if (i > 0) {
            t.to(s, { yPercent: 0, duration: 0.6 }).to(screens[i - 1], { autoAlpha: 0.35, duration: 0.6 }, "<");
          }
          if (pops.length) t.from(pops, { autoAlpha: 0, y: 8, duration: 0.35, stagger: 0.28 }, i > 0 ? "-=0.15" : 0);
          t.to({}, { duration: HOLD });
          if (tap && i < screens.length - 1) {
            t.fromTo(tap, { scale: 0.3, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.55, duration: 0.25 }).to(tap, {
              autoAlpha: 0,
              duration: 0.25,
            });
          }
        });
        // Reset to the first screen
        t.to(rest, { autoAlpha: 0, duration: 0.45 }, `+=0.4`)
          .to(screens[0], { autoAlpha: 1, duration: 0.45 }, "<")
          .set(rest, { yPercent: 100, autoAlpha: 1 })
          .set(screens.slice(0, -1), { autoAlpha: 1 });

        tl.current = t;
        sync();
        return () => {
          tl.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  useEffect(() => {
    pausedRef.current = paused;
    sync();
  }, [paused]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      sync();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <figure className={`${styles.card} ${className ?? ""}`} ref={root}>
      <div className={styles.stage} aria-hidden>
        {/* Hardware: metal band → black bezel → screen, plus side buttons */}
        <div className={styles.device}>
          <span className={`${styles.key} ${styles.keyAction}`} />
          <span className={`${styles.key} ${styles.keyVolUp}`} />
          <span className={`${styles.key} ${styles.keyVolDown}`} />
          <span className={`${styles.key} ${styles.keyPower}`} />
          <div className={styles.bezel}>
        <div className={styles.phone}>
          <span className={styles.island} />
          <div className={styles.status}>
            <span>9:41</span>
            <span className={styles.statusIcons}>
              <i />
              <i />
              <i />
            </span>
          </div>
          <div className={styles.viewport}>
            {/* 1. Choose product */}
            <section className={styles.screen} data-screen>
              <p className={styles.step}>Step 1 of 4</p>
              <h4 className={styles.h}>What are you printing?</h4>
              <ul className={styles.list}>
                {[
                  { i: FileText, n: "Flyers", on: true },
                  { i: CreditCard, n: "Business cards" },
                  { i: Layers, n: "Brochures" },
                  { i: Package, n: "Packaging & boxes" },
                  { i: StickyNote, n: "Stickers & labels" },
                  { i: Flag, n: "Banners" },
                ].map(({ i: I, n, on }) => (
                  <li key={n} className={`${styles.row} ${on ? styles.rowOn : ""}`}>
                    <span className={styles.rowIcon}>
                      <I size={12} />
                    </span>
                    {n}
                    <ChevronRight size={12} className={styles.chev} />
                    {on ? <span className={styles.tap} data-tap /> : null}
                  </li>
                ))}
              </ul>
            </section>

            {/* 2. Size and quantity */}
            <section className={styles.screen} data-screen>
              <p className={styles.step}>Step 2 of 4 · Flyers</p>
              <h4 className={styles.h}>How many, and what size?</h4>
              <p className={styles.label}>Quantity</p>
              <div className={styles.chips}>
                {["100", "250", "500", "1,000"].map((q) => (
                  <span key={q} className={`${styles.chip} ${q === "500" ? styles.chipOn : ""}`} data-pop={q === "500" ? "" : undefined}>
                    {q}
                  </span>
                ))}
              </div>
              <p className={styles.label}>Size</p>
              <div className={styles.chips}>
                {["A6", "A5", "A4"].map((q) => (
                  <span key={q} className={`${styles.chip} ${q === "A5" ? styles.chipOn : ""}`} data-pop={q === "A5" ? "" : undefined}>
                    {q}
                  </span>
                ))}
              </div>
              <p className={styles.label}>Paper</p>
              <div className={styles.field} data-pop>
                Gloss 150gsm <ChevronRight size={12} />
              </div>
              <span className={styles.btn}>
                Next
                <span className={styles.tap} data-tap />
              </span>
            </section>

            {/* 3. Artwork check */}
            <section className={styles.screen} data-screen>
              <p className={styles.step}>Step 3 of 4</p>
              <h4 className={styles.h}>Upload your artwork</h4>
              <div className={styles.file}>
                <FileText size={16} />
                <span>
                  <strong>flyer-final.pdf</strong>
                  <small>2.4 MB</small>
                </span>
              </div>
              <ul className={styles.checks}>
                {["CMYK colour", "3mm bleed", "300 dpi images", "Text inside safe area"].map((c) => (
                  <li key={c} data-pop>
                    <span className={styles.ok}>
                      <Check size={10} strokeWidth={3} />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
              <span className={styles.btn}>
                Request quote
                <span className={styles.tap} data-tap />
              </span>
            </section>

            {/* 4. Quote */}
            <section className={styles.screen} data-screen>
              <p className={styles.step}>Step 4 of 4</p>
              <h4 className={styles.h}>Your quote is ready</h4>
              <div className={styles.quote} data-pop>
                <small>500 A5 flyers · Gloss 150gsm</small>
                <span className={styles.bar} />
                <span className={`${styles.bar} ${styles.barShort}`} />
                <span className={styles.reviewed}>
                  <ShieldCheck size={12} /> Checked by our team
                </span>
              </div>
              <span className={`${styles.btn} ${styles.btnAccent}`} data-pop>
                Approve and pay
                <span className={styles.tap} data-tap />
              </span>
            </section>

            {/* 5. Tracking */}
            <section className={styles.screen} data-screen>
              <p className={styles.step}>JM-0142</p>
              <h4 className={styles.h}>Tracking your order</h4>
              <ol className={styles.track}>
                {[
                  { n: "Artwork approved", d: true },
                  { n: "Printing", d: true },
                  { n: "Finishing", now: true },
                  { n: "Out for delivery" },
                ].map((s) => (
                  <li key={s.n} className={s.d ? styles.done : s.now ? styles.now : ""} data-pop>
                    <span className={styles.dot}>{s.d ? <Check size={9} strokeWidth={3} /> : null}</span>
                    {s.n}
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <span className={styles.home} />
        </div>
          </div>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.logo} aria-hidden>
          JM
        </span>
        <span>
          <strong>Order in four steps</strong>
          <small>Choose, upload, approve, track</small>
        </span>
      </figcaption>
    </figure>
  );
};
