import { KeyboardEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { useJobs } from "../helpers/useJobs";
import { useHotkeys } from "../helpers/useHotkeys";
import { useIsMobile } from "../helpers/useIsMobile";
import type { JobSummary } from "../helpers/jobTypes";
import styles from "./dashboard.review.module.css";

const hoursSince = (d: Date) => Math.max(0, (Date.now() - new Date(d).getTime()) / 36e5);
const ageShort = (h: number) => (h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.floor(h)}h` : `${Math.floor(h / 24)}d`);
const ageSpoken = (h: number) =>
  h < 1 ? `${Math.max(1, Math.round(h * 60))} minutes` : h < 48 ? `${Math.floor(h)} hours` : `${Math.floor(h / 24)} days`;
const ageVariant = (h: number) => (h >= 24 ? "destructive" : h >= 4 ? "warning" : "outline");
const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Not specified");

const AgeBadge = ({ job }: { job: JobSummary }) => {
  const h = hoursSince(job.createdAt);
  return (
    <Badge variant={ageVariant(h)} className={styles.age}>
      <span aria-hidden>{ageShort(h)}</span>
      <span className={styles.srOnly}>Waiting {ageSpoken(h)}</span>
    </Badge>
  );
};

const Preview = ({ job }: { job: JobSummary }) => (
  <section className={styles.preview} aria-labelledby="preview-title">
    <div className={styles.previewHead}>
      <span className={styles.code}>{job.jobCode}</span>
      <AgeBadge job={job} />
    </div>
    <h2 id="preview-title" className={styles.previewTitle}>
      {job.quantity.toLocaleString()} × {job.product}
    </h2>
    <dl className={styles.specs}>
      <div>
        <dt>Customer</dt>
        <dd>
          {job.customerName}
          {job.customerPhone && <span className={styles.sub}>{job.customerPhone}</span>}
        </dd>
      </div>
      <div>
        <dt>Size</dt>
        <dd>{job.size}</dd>
      </div>
      <div>
        <dt>Paper</dt>
        <dd>{job.paper}</dd>
      </div>
      <div>
        <dt>Needed by</dt>
        <dd>{fmtDate(job.neededBy)}</dd>
      </div>
      <div>
        <dt>Requested</dt>
        <dd>
          {new Date(job.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </dd>
      </div>
    </dl>
    <Button asChild size="lg" className={styles.open}>
      <Link to={`/dashboard/jobs/${job.id}`}>
        Open costing <ArrowRight size={18} aria-hidden />
      </Link>
    </Button>
  </section>
);

export default function ReviewQueuePage() {
  const q = useJobs.useAdminJobs();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const listRef = useRef<HTMLUListElement>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  // Oldest first: the longest-waiting customer gets priced next.
  const queue = useMemo(
    () =>
      (q.data?.jobs ?? [])
        .filter((j) => j.status === "quote_requested")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [q.data],
  );
  const active = queue.find((j) => j.id === activeId) ?? queue[0] ?? null;
  const activeIndex = active ? queue.indexOf(active) : -1;

  const select = (index: number) => {
    const next = queue[Math.min(queue.length - 1, Math.max(0, index))];
    if (!next) return;
    setActiveId(next.id);
    document.getElementById(`request-${next.id}`)?.scrollIntoView({ block: "nearest" });
  };
  const moveAndFocus = (delta: number) => {
    select(activeIndex + delta);
    listRef.current?.focus();
  };

  useHotkeys({ j: () => moveAndFocus(1), k: () => moveAndFocus(-1) }, !isMobile && queue.length > 0);

  const onListKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => select(activeIndex + 1),
      ArrowUp: () => select(activeIndex - 1),
      Home: () => select(0),
      End: () => select(queue.length - 1),
      Enter: () => active && navigate(`/dashboard/jobs/${active.id}`),
    };
    const fn = keys[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{queue.length ? `(${queue.length}) ` : ""}Review queue · Dashboard</title>
      </Helmet>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>Every quote passes through you</span>
          <h1>Review queue</h1>
        </div>
        {q.data && (
          <p className={styles.summary} role="status">
            {queue.length === 0 ? "Nothing waiting" : `${queue.length} waiting · oldest first`}
          </p>
        )}
      </header>

      {q.error ? (
        <div role="alert" className={styles.stateBox}>
          <p>Couldn't load the queue: {(q.error as Error).message}</p>
          <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw size={16} aria-hidden /> Try again
          </Button>
        </div>
      ) : q.isFetching && !q.data ? (
        <div className={styles.loading} aria-busy="true">
          <span className={styles.srOnly} role="status">
            Loading quote requests
          </span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className={styles.stateBox}>
          <CheckCircle2 size={32} aria-hidden className={styles.doneIcon} />
          <p className={styles.doneTitle}>All caught up</p>
          <p>No quote requests are waiting for a price.</p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Go to all jobs</Link>
          </Button>
        </div>
      ) : isMobile ? (
        <ul className={styles.mobileList} aria-label="Quote requests, oldest first">
          {queue.map((j) => (
            <li key={j.id}>
              <Link to={`/dashboard/jobs/${j.id}`} className={styles.card}>
                <span className={styles.cardTop}>
                  <span className={styles.code}>{j.jobCode}</span>
                  <AgeBadge job={j} />
                </span>
                <strong className={styles.cardTitle}>
                  {j.quantity.toLocaleString()} × {j.product}
                </strong>
                <span className={styles.sub}>
                  {j.customerName} · needed {fmtDate(j.neededBy)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.split}>
          <div className={styles.listPane}>
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={0}
              aria-label="Quote requests, oldest first"
              aria-activedescendant={active ? `request-${active.id}` : undefined}
              aria-keyshortcuts="J K ArrowUp ArrowDown Enter"
              className={styles.listbox}
              onKeyDown={onListKeyDown}
            >
              {queue.map((j, i) => (
                <li
                  key={j.id}
                  id={`request-${j.id}`}
                  role="option"
                  aria-selected={j.id === active?.id}
                  className={`${styles.option} ${j.id === active?.id ? styles.selected : ""}`}
                  onClick={() => {
                    select(i);
                    listRef.current?.focus();
                  }}
                  onDoubleClick={() => navigate(`/dashboard/jobs/${j.id}`)}
                >
                  <span className={styles.cardTop}>
                    <span className={styles.code}>{j.jobCode}</span>
                    <AgeBadge job={j} />
                  </span>
                  <strong className={styles.cardTitle}>
                    {j.quantity.toLocaleString()} × {j.product}
                  </strong>
                  <span className={styles.sub}>{j.customerName}</span>
                </li>
              ))}
            </ul>
            <p className={styles.keys} aria-hidden="true">
              <kbd>J</kbd> <kbd>K</kbd> or <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open costing
            </p>
          </div>
          {active && <Preview job={active} />}
        </div>
      )}
    </div>
  );
}