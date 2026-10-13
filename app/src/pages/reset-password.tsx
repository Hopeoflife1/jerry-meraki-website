import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Spinner } from "../components/Spinner";
import { postResetPassword } from "../endpoints/auth/reset_password_POST.schema";
import styles from "./forgot-password.module.css";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    try {
      await postResetPassword({ token, newPassword: password });
      toast.success("Password changed. Log in with your new password.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Helmet>
        <title>Choose a new password · Jerry Meraki</title>
      </Helmet>
      <div className={styles.card}>
        <h1>Choose a new password</h1>
        {!/^[a-f0-9]{64}$/.test(token) ? (
          <>
            <p className={styles.lead}>This reset link isn't complete. Open the link from your email again, or ask for a new one.</p>
            <Button asChild size="lg" className={styles.submit}>
              <Link to="/forgot-password">Send a new link</Link>
            </Button>
          </>
        ) : (
          <>
            <p className={styles.lead}>You'll be signed out on other devices once it's changed.</p>
            <form className={styles.form} onSubmit={submit} noValidate>
              {error && <p className={styles.error}>{error}</p>}
              <label className={styles.field}>
                New password
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <small>At least 8 characters.</small>
              </label>
              <label className={styles.field}>
                Type it again
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  disabled={busy}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              <Button type="submit" size="lg" disabled={busy} className={styles.submit}>
                {busy ? <Spinner size="sm" /> : null}
                {busy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          </>
        )}
        <Link to="/login" className={styles.back}>
          Back to log in
        </Link>
      </div>
    </div>
  );
}
