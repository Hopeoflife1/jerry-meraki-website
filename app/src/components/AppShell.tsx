import { MouseEvent, ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, PlusCircle, Package, BookOpen, LayoutDashboard, LogIn, LogOut, UserRound, type LucideIcon } from "lucide-react";
import { useAuth } from "../helpers/useAuth";
import { useVirtualKeyboardOpen } from "../helpers/useVirtualKeyboardOpen";
import { BrandMark } from "./BrandMark";
import { InstallPrompt } from "./InstallPrompt";
import { Button } from "./Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import styles from "./AppShell.module.css";

// topOnly: shown in the desktop top bar but not the phone tab bar (which stays at 4 to 5 tabs).
type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; topOnly?: boolean };

const skipToMain = (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  document.getElementById("main")?.focus();
};

// Customer shell: premium top bar on desktop, bottom tab bar on phones (design system §5).
export const AppShell = ({ children }: { children: ReactNode }) => {
  const { authState, logout } = useAuth();
  const navigate = useNavigate();
  const keyboardOpen = useVirtualKeyboardOpen();
  const isAdmin = authState.type === "authenticated" && authState.user.role === "admin";
  const links: NavItem[] = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/catalog", label: "Catalog", icon: LayoutGrid, topOnly: true },
    { to: "/quote/new", label: "Get quote", icon: PlusCircle },
    { to: "/jobs", label: "My jobs", icon: Package },
    { to: "/guide", label: "Guide", icon: BookOpen },
    ...(isAdmin ? [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
  ];

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip} onClick={skipToMain}>
        Skip to content
      </a>
      <header className={styles.header}>
        <BrandMark />
        <nav aria-label="Primary" className={styles.topNav}>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `${styles.topLink} ${isActive ? styles.active : ""}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.account}>
          {authState.type === "authenticated" ? (
            <>
              <Link to="/account" className={styles.userName} title="Your account">
                {authState.user.displayName}
              </Link>
              <Button asChild variant="ghost" size="icon-md" className={`${styles.iconBtn} ${styles.mobileOnly}`}>
                <Link to="/account" aria-label="Your account">
                  <UserRound size={18} aria-hidden />
                </Link>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-md"
                    className={styles.iconBtn}
                    aria-label="Log out"
                    onClick={async () => {
                      await logout();
                      navigate("/");
                    }}
                  >
                    <LogOut size={18} aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Log out</TooltipContent>
              </Tooltip>
            </>
          ) : authState.type === "unauthenticated" ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/login">
                <LogIn size={16} aria-hidden /> Log in
              </Link>
            </Button>
          ) : null}
        </div>
      </header>
      <main id="main" tabIndex={-1} className={styles.main}>
        <InstallPrompt />
        {children}
      </main>
      <nav aria-label="Primary" className={`${styles.bottomNav} ${keyboardOpen ? styles.bottomNavHidden : ""}`}>
        {links.filter((l) => !l.topOnly).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `${styles.bottomLink} ${isActive ? styles.active : ""}`}>
            <l.icon size={20} aria-hidden />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};