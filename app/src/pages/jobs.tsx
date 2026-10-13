import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Plus, Package } from "lucide-react";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { PageHeader, Group, LinkRow, EmptyState } from "../components/ListGroup";
import { useJobs } from "../helpers/useJobs";
import { formatNaira } from "../helpers/formatNaira";
import { customerAction } from "../helpers/jobJourney";
import styles from "./jobs.module.css";

const DONE = ["delivered", "cancelled"];

export default function MyJobsPage() {
  const { data, isFetching, error } = useJobs.useMine();
  const [tab, setTab] = useState<"active" | "done">("active");
  const all = data?.jobs ?? [];
  const jobs = all.filter((j) => (tab === "done" ? DONE.includes(j.status) : !DONE.includes(j.status)));
  const doneCount = all.filter((j) => DONE.includes(j.status)).length;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>My jobs · Jerry Meraki</title>
      </Helmet>
      <PageHeader
        title="My jobs"
        sub="Track every job from quote to delivery."
        actions={
          <Button asChild size="sm" className={styles.newBtn}>
            <Link to="/quote/new">
              <Plus size={16} aria-hidden /> New quote
            </Link>
          </Button>
        }
      />

      <div className={styles.segment} role="tablist" aria-label="Filter jobs">
        <button type="button" role="tab" aria-selected={tab === "active"} className={tab === "active" ? styles.on : ""} onClick={() => setTab("active")}>
          Active
        </button>
        <button type="button" role="tab" aria-selected={tab === "done"} className={tab === "done" ? styles.on : ""} onClick={() => setTab("done")}>
          Completed{doneCount ? ` · ${doneCount}` : ""}
        </button>
      </div>

      {error && <p className={styles.error}>{(error as Error).message}</p>}
      {isFetching && !data ? (
        <Skeleton className={styles.skeleton} />
      ) : jobs.length === 0 ? (
        <Group>
          <EmptyState
            icon={<Package size={22} aria-hidden />}
            title={tab === "done" ? "No completed jobs yet" : "No active jobs"}
            text={tab === "done" ? "Finished jobs will show up here." : "Request a quote and track it here from artwork to delivery."}
            action={
              tab === "active" ? (
                <Button asChild>
                  <Link to="/quote/new">Get a quote</Link>
                </Button>
              ) : undefined
            }
          />
        </Group>
      ) : (
        <Group>
          {jobs.map((j) => {
            const todo = customerAction(j);
            return (
              <LinkRow
                key={j.id}
                to={`/jobs/${j.id}`}
                meta={j.jobCode}
                title={`${j.quantity.toLocaleString()} × ${j.product}`}
                sub={todo ? <span className={styles.todo}>{todo}</span> : `${j.size} · ${j.paper}`}
                trailing={
                  <>
                    <StatusBadge status={j.status} />
                    <span>{j.quotedPrice ? formatNaira(j.quotedPrice) : "—"}</span>
                  </>
                }
              />
            );
          })}
        </Group>
      )}
    </div>
  );
}