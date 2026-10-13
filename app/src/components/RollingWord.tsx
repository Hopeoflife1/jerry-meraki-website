import { useEffect, useState } from "react";
import styles from "./RollingWord.module.css";

// Fixed lead-in with a last word that rolls up and is replaced (Mobbin-style search placeholder).
// Screen readers get one static sentence; the moving part is hidden from them.
// Stops when paused, when the tab is hidden, and under prefers-reduced-motion.

const INTERVAL_MS = 2200;

export interface RollingWordProps {
  lead: string;
  words: string[];
  paused?: boolean;
  className?: string;
}

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
};

export const RollingWord = ({ lead, words, paused = false, className }: RollingWordProps) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);

  useEffect(() => {
    if (paused || reduced || words.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setPrev(index);
      setIndex((index + 1) % words.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reduced, words.length, index]);

  if (!words.length) return null;
  const current = words[index % words.length];
  const sentence = `${lead} ${words.join(", ")}.`;

  return (
    <p className={`${styles.line} ${className ?? ""}`}>
      <span className={styles.srOnly}>{sentence}</span>
      <span aria-hidden className={styles.visual}>
        <span className={styles.lead}>{lead}</span>
        <span className={styles.slot}>
          {prev !== null && !reduced ? (
            <span key={`out-${prev}-${index}`} className={`${styles.word} ${styles.out}`} onAnimationEnd={() => setPrev(null)}>
              {words[prev]}
            </span>
          ) : null}
          <span key={`in-${index}`} className={`${styles.word} ${prev !== null && !reduced ? styles.in : ""}`}>
            {current}
          </span>
        </span>
      </span>
    </p>
  );
};
