import { FormEvent, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { RefreshCw, ShieldCheck, UserPlus, Users } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { useTeam } from "../helpers/useTeam";
import { useAuth } from "../helpers/useAuth";
import type { TeamMember } from "../endpoints/admin/team_GET.schema";
import styles from "./dashboard.team.module.css";

// Admin-only: give or remove dashboard access (quoting, job management, products) by email.
// The person must have signed up on the app first.
export default function DashboardTeamPage() {
  const { authState } = useAuth();
  const myId = authState.type === "authenticated" ? authState.user.id : null;
  const team = useTeam.useMembers();
  const setRole = useTeam.useSetRole();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const members = team.data?.members ?? [];
  const admins = members.filter((m) => m.role === "admin");
  const customers = members.filter((m) => m.role !== "admin");

  const grant = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!value) return setError("Enter their email address");
    try {
      const res = await setRole.mutateAsync({ email: value, role: "admin" });
      toast.success(`${res.displayName} can now use the dashboard and send quotes`);
      setEmail("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const change = async (m: TeamMember, role: "admin" | "user") => {
    setBusyId(m.id);
    try {
      await setRole.mutateAsync({ email: m.email, role });
      toast.success(role === "admin" ? `${m.displayName} is now an admin` : `${m.displayName} no longer has admin access`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const row = (m: TeamMember) => {
    const isMe = m.id === myId;
    const isAdmin = m.role === "admin";
    return (
      <li key={m.id} className={styles.row}>
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden>
            {(m.displayName.trim()[0] ?? "?").toUpperCase()}
          </span>
          <div className={styles.personText}>
            <span className={styles.name}>
              {m.displayName}
              {isMe && <span className={styles.you}> (you)</span>}
            </span>
            <span className={styles.email}>{m.email}</span>
          </div>
        </div>
        <Badge variant={isAdmin ? "primary" : "outline"}>{isAdmin ? "Admin" : "Customer"}</Badge>
        {isAdmin ? (
          <Button
            variant="ghost"
            size="sm"
            className={styles.action}
            disabled={isMe || busyId === m.id || admins.length <= 1}
            onClick={() => change(m, "user")}
            aria-label={`Remove admin access from ${m.displayName}`}
          >
            {busyId === m.id ? <Spinner size="sm" /> : "Remove admin"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={styles.action}
            disabled={busyId === m.id}
            onClick={() => change(m, "admin")}
            aria-label={`Make ${m.displayName} an admin`}
          >
            {busyId === m.id ? <Spinner size="sm" /> : "Make admin"}
          </Button>
        )}
      </li>
    );
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Team & access · Dashboard</title>
      </Helmet>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Owner settings</span>
        <h1>Team and access</h1>
        <p>Admins can open the dashboard, cost jobs and send quotes. Customers only see their own jobs.</p>
      </header>

      <form className={styles.grant} onSubmit={grant} noValidate>
        <div className={styles.grantText}>
          <ShieldCheck size={20} aria-hidden />
          <div>
            <label htmlFor="grant-email" className={styles.grantLabel}>
              Give someone admin access
            </label>
            <p id="grant-help" className={styles.help}>
              They must sign up on the app first. Then enter the email they used.
            </p>
          </div>
        </div>
        <div className={styles.grantRow}>
          <Input
            id="grant-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby={error ? "grant-help grant-error" : "grant-help"}
            aria-invalid={error ? true : undefined}
            className={styles.grantInput}
          />
          <Button type="submit" disabled={setRole.isPending && busyId === null} aria-busy={setRole.isPending && busyId === null}>
            {setRole.isPending && busyId === null ? <Spinner size="sm" /> : <UserPlus size={16} aria-hidden />} Make admin
          </Button>
        </div>
        {error && (
          <p id="grant-error" role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </form>

      {team.error ? (
        <div role="alert" className={styles.stateBox}>
          <p>Couldn't load the team: {(team.error as Error).message}</p>
          <Button variant="outline" onClick={() => team.refetch()} disabled={team.isFetching}>
            <RefreshCw size={16} aria-hidden /> Try again
          </Button>
        </div>
      ) : team.isFetching && !team.data ? (
        <div className={styles.list} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="admins-h" className={styles.section}>
            <h2 id="admins-h" className={styles.sectionTitle}>
              Admins <span className={styles.count}>{admins.length}</span>
            </h2>
            <ul className={styles.list}>{admins.map(row)}</ul>
          </section>
          <section aria-labelledby="customers-h" className={styles.section}>
            <h2 id="customers-h" className={styles.sectionTitle}>
              Customers <span className={styles.count}>{customers.length}</span>
            </h2>
            {customers.length ? (
              <ul className={styles.list}>{customers.map(row)}</ul>
            ) : (
              <div className={styles.stateBox}>
                <Users size={24} aria-hidden />
                <p>No customer accounts yet.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}