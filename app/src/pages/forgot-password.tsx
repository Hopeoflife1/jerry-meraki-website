import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Spinner } from "../components/Spinner";
import { postForgotPassword } from "../endpoints/auth/forgot_password_POST.schema";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await postForgotPassword({ email });
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Helmet>
        <title>Forgot password · Jerry Meraki</title>
      </Helmet>
      <div className={styles.card}>
        <h1>Forgot your password?</h1>
        <p className={styles.lead}>Enter the email you signed up with and we'll send you a link to choose a new one.</p>
        {sentTo ? (
          <div className={styles.done} role="status">
            <p>
              If <strong>{sentTo}</strong> has an account, a reset link is on its way. Check your inbox and spam
              folder. The link works for 60 minutes.
            </p>
            <p>
              No email after a few minutes? Message us on WhatsApp at{" "}
              <a href="https://wa.me/2348088390693">0808 839 0693</a>.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            {error && <p className={styles.error}>{error}</p>}
            <label className={styles.field}>
              Email
              <Input
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <Button type="submit" size="lg" disabled={busy || !email.trim()} className={styles.submit}>
              {busy ? <Spinner size="sm" /> : null}
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link to="/login" className={styles.back}>
          Back to log in
        </Link>
      </div>
    </div>
  );
}
