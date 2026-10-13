import { FormEvent, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Spinner } from "../components/Spinner";
import { PageHeader, Section, Group, Rows, Row, StatusPill } from "../components/ListGroup";
import { useAuth } from "../helpers/useAuth";
import { postChangePassword } from "../endpoints/auth/change_password_POST.schema";
import styles from "./account.module.css";

// Account page: who you're signed in as, and change password.
export default function AccountPage() {
  const { authState } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const change = useMutation({ mutationFn: postChangePassword });
  const user = authState.type === "authenticated" ? authState.user : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) return setError("Enter your current password");
    if (next.length < 8) return setError("Use at least 8 characters for the new password");
    if (next !== confirm) return setError("The new passwords don't match");
    try {
      await change.mutateAsync({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Your account · Jerry Meraki</title>
      </Helmet>
      <PageHeader title="Account" />

      <Section label="Profile" id="profile-h">
        <Group>
          <Rows>
            <Row label="Name">{user?.displayName}</Row>
            <Row label="Email">{user?.email}</Row>
            <Row label="Account type">{user?.role === "admin" ? <StatusPill>Admin</StatusPill> : "Customer"}</Row>
          </Rows>
        </Group>
      </Section>

      <Section label="Change password" id="pw-h">
        <Group padded>
          <form className={styles.form} onSubmit={submit} noValidate>
            <label className={styles.field}>
              <span>Current password</span>
              <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>New password</span>
              <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
              <small>At least 8 characters.</small>
            </label>
            <label className={styles.field}>
              <span>Confirm new password</span>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
            <Button type="submit" disabled={change.isPending} aria-busy={change.isPending} className={styles.submit}>
              {change.isPending && <Spinner size="sm" />} Save new password
            </Button>
          </form>
        </Group>
      </Section>
    </div>
  );
}