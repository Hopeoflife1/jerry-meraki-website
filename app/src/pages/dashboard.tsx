import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Inbox, Hourglass, Printer, PackageCheck, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../components/Tabs";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { PaymentBadge } from "../components/PaymentBadge";
import { useJobs } from "../helpers/useJobs";
import { formatNaira } from "../helpers/formatNaira";
import { isPayable } from "../helpers/paymentDetails";
import type { JobStatus } from "../helpers/schema";
import styles from "./dashboard.module.css";

type Job = NonNullable<ReturnType<typeof useJobs.useAdminJobs>["data"]>["jobs"][number];
const FILTERS: { id: string; label: string; statuses: JobStatus[] | null; unpaidOnly?: boolean; test?: (j: Job) => boolean }[] = [
  { id: "new", label: "New requests", statuses: ["quote_requested"] },
  { id: "quoted", label: "Awaiting customer", statuses: ["quoted"] },
  { id: "unpaid", label: "Awaiting payment", statuses: null, unpaidOnly: true },
  {
    id: "toprint",
    label: "Ready to print",
    statuses: ["approved", "artwork_check"],
    test: (j) => !!j.paidAt && j.artworkReview === "approved",
  },
  { id: "active", label: "In progress", statuses: ["approved", "artwork_check", "in_production"] },
  { id: "ready", label: "Ready", statuses: ["ready"] },
  { id: "done", label: "Done", statuses: ["delivered", "cancelled"] },
  { id: "all", label: "All", statuses: null },
];

export default function DashboardPage() {
  const stats = useJobs.useAdminStats();
  const jobsQ = useJobs.useAdminJobs();
  const [filter, setFilter] = useState("new");
  const [q, setQ] = useState("");

  const jobs = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const term = q.trim().toLowerCase();
    return (jobsQ.data?.jobs ?? []).filter(
      (j) =>
        (!f.statuses || f.statuses.includes(j.status)) &&
        (!f.unpaidOnly || (isPayable(j.status) && !j.paidAt)) &&
        (!f.test || f.test(j)) &&
        (!term || [j.jobCode, j.product, j.customerName ?? "", j.customerPhone ?? ""].some((v) => v.toLowerCase().includes(term))),
    );
  }, [jobsQ.data, filter, q]);

  const s = stats.data;
  const cards = [
    { label: "New quote requests", value: s?.openQuotes, icon: Inbox, accent: true },
    { label: "Awaiting customer approval", value: s?.awaitingApproval, icon: Hourglass },
    { label: "Approved & in production", value: s?.inProduction, icon: Printer },
    { label: "Ready for pickup", value: s?.readyForPickup, icon: PackageCheck },
  ];

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Dashboard · Jerry Meraki</title>
      </Helmet>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</span>
          <h1>Production desk</h1>
        </div>
        <div className={styles.revenue}>
          <span>Won this month</span>
          <strong>{s ? formatNaira(s.revenueThisMonth) : "…"}</strong>
        </div>
      </header>

      <div className={styles.stats}>
        {cards.map((c) => (
          <button
            key={c.label}
            className={`${styles.stat} ${c.accent ? styles.statAccent : ""}`}
            onClick={() => setFilter(c.accent ? "new" : c.icon === Hourglass ? "quoted" : c.icon === Printer ? "active" : "ready")}
          >
            <c.icon size={18} />
            {s ? <strong>{c.value}</strong> : <Skeleton className={styles.statSkel} />}
            <span>{c.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.charts}>
        <section className={styles.card}>
          <h2>Revenue won · last 6 months</h2>
          <div className={styles.chart}>
            {s ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.revenueByMonth}>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={56} tickFormatter={(v) => (v >= 1000000 ? `₦${(v / 1000000).toFixed(1)}m` : `₦${Math.round(v / 1000)}k`)} />
                  <Tooltip formatter={(v: number) => formatNaira(v)} cursor={{ fill: "var(--secondary)" }} />
                  <Bar dataKey="revenue" fill="var(--chart-color-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className={styles.chartSkel} />
            )}
          </div>
        </section>
        <section className={styles.card}>
          <h2>Top products</h2>
          <ul className={styles.products}>
            {(s?.byProduct ?? []).map((p) => {
              const max = Math.max(...(s?.byProduct ?? []).map((x) => x.jobs), 1);
              return (
                <li key={p.product}>
                  <span>{p.product}</span>
                  <span className={styles.track}>
                    <span className={styles.fill} style={{ width: `${(p.jobs / max) * 100}%` }} />
                  </span>
                  <strong>{p.jobs}</strong>
                </li>
              );
            })}
            {s && s.byProduct.length === 0 && <li className={styles.muted}>No jobs yet</li>}
          </ul>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.tableHead}>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className={styles.tabs}>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.id} value={f.id}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className={styles.search}>
            <Search size={16} />
            <Input placeholder="Search code, customer, product" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {jobsQ.error && <p className={styles.error}>{(jobsQ.error as Error).message}</p>}
        {jobsQ.isFetching && !jobsQ.data ? (
          <Skeleton className={styles.tableSkel} />
        ) : jobs.length === 0 ? (
          <p className={styles.muted}>Nothing here right now.</p>
        ) : (
          <div className={styles.table}>
            {jobs.map((j) => (
              <Link key={j.id} to={`/dashboard/jobs/${j.id}`} className={styles.tr}>
                <span className={styles.code}>{j.jobCode}</span>
                <span className={styles.cust}>
                  <strong>{j.customerName}</strong>
                  <small>{j.customerPhone ?? ""}</small>
                </span>
                <span className={styles.job}>
                  {j.quantity.toLocaleString()} × {j.product}
                  <small>
                    {j.size} · {j.paper}
                  </small>
                </span>
                <span className={styles.due}>
                  {j.feedbackRating
                    ? `${"★".repeat(j.feedbackRating)}${"☆".repeat(5 - j.feedbackRating)}`
                    : j.readyBy && j.status === "in_production"
                      ? `Ready ${new Date(j.readyBy).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : j.neededBy
                        ? new Date(j.neededBy).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : "—"}
                </span>
                <span className={styles.amt}>
                  {j.quotedPrice ? formatNaira(j.quotedPrice) : "—"}
                  <PaymentBadge status={j.status} paidAt={j.paidAt} claimedAt={j.paymentClaimedAt} />
                </span>
                <StatusBadge status={j.status} className={styles.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}