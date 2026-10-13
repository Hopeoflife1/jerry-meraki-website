import { Navigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { PasswordRegisterForm } from "../components/PasswordRegisterForm";
import { useAuth } from "../helpers/useAuth";
import styles from "./login.module.css";

export default function LoginPage() {
  const { authState } = useAuth();
  const [params] = useSearchParams();
  const nextParam = params.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  if (authState.type === "authenticated") return <Navigate to={next} replace />;
  const fromQuoteLink = next.startsWith("/dashboard/jobs/");
  return (
    <div className={styles.wrap}>
      <Helmet>
        <title>Log in · Jerry Meraki</title>
      </Helmet>
      <div className={styles.card}>
        <h1>{fromQuoteLink ? "Log in to send the quote" : "Welcome to Jerry Meraki"}</h1>
        <p>
          {fromQuoteLink
            ? "Log in with your admin account and you'll go straight to this job's quote."
            : "Log in or create an account to request quotes and track your print jobs."}
        </p>
        <Tabs defaultValue="login">
          <TabsList className={styles.tabs}>
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="register">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <PasswordLoginForm />
          </TabsContent>
          <TabsContent value="register">
            <PasswordRegisterForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}