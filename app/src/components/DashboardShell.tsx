import { MouseEvent, ReactNode, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LayoutDashboard, Inbox, Tags, Users, Store, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";
import { useJobs } from "../helpers/useJobs";
import { useHotkeys } from "../helpers/useHotkeys";
import { useMediaQuery } from "../helpers/useMediaQuery";
import styles from "./DashboardShell.module.css";

const STORAGE_KEY = "jm.rail.collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const skipToMain = (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  document.getElementById("main")?.focus();
};

type Item = { to: string; label: string; short: string; icon: LucideIcon; end?: boolean; badge?: number };

const waitingText = (n: number) => `${n} quote request${n === 1 ? "" : "s"} waiting`;

// Owner shell: collapsible side rail (desktop), icon rail (tablet), bottom tabs (phone). Design system §5.
export const DashboardShell = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const railCollapsed = collapsed || isTablet;
  const jobs = useJobs.useAdminJobs();
  const pending = jobs.data?.jobs.filter((j) => j.status === "quote_requested").length ?? 0;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Storage unavailable (private mode). Preference just won't persist.
    }
  }, [collapsed]);
  useHotkeys({ "[": () => setCollapsed((c) => !c) }, !isTablet);

  const items: Item[] = [
    { to: "/dashboard", label: "Jobs & overview", short: "Jobs", icon: LayoutDashboard, end: true },
    { to: "/dashboard/review", label: "Review queue", short: "Review", icon: Inbox, badge: pending },
    { to: "/dashboard/products", label: "Products & pricing", short: "Products", icon: Tags },
    { to: "/dashboard/team", label: "Team & access", short: "Team", icon: Users },
  ];

  const count = (n: number | undefined, className: string) =>
    n ? (
      <span className={className}>
        <span aria-hidden>{n}</span>
        <span className={styles.srOnly}>, {waitingText(n)}</span>
      </span>
    ) : null;

  const withTooltip = (node: ReactNode, label: string) =>
    railCollapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    ) : (
      node
    );

  return (
    <div className={`${styles.shell} ${railCollapsed ? styles.collapsed : ""}`}>
      <a href="#main" className={styles.skip} onClick={skipToMain}>
        Skip to content
      </a>

      <div id="dashboard-rail" className={styles.rail}>
        <BrandMark light compact={railCollapsed} to="/dashboard" className={styles.brand} />
        <nav aria-label="Dashboard">
          <ul className={styles.railList}>
            {items.map((item) => (
              <li key={item.to}>
                {withTooltip(
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => `${styles.railLink} ${isActive ? styles.active : ""}`}>
                    <item.icon size={18} aria-hidden className={styles.railIcon} />
                    <span className={styles.railLabel}>{item.label}</span>
                    {count(item.badge, styles.count)}
                  </NavLink>,
                  item.badge ? `${item.label} (${item.badge})` : item.label,
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.railFoot}>
          {withTooltip(
            <Link to="/" className={styles.railLink}>
              <Store size={18} aria-hidden className={styles.railIcon} />
              <span className={styles.railLabel}>Customer app</span>
            </Link>,
            "Customer app",
          )}
          {!isTablet && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-md"
                  className={styles.toggle}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  aria-expanded={!collapsed}
                  aria-controls="dashboard-rail"
                  aria-keyshortcuts="["
                  onClick={() => setCollapsed((c) => !c)}
                >
                  {collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expand" : "Collapse"} sidebar <kbd className={styles.kbd}>[</kbd>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <header className={styles.mobileBar}>
        <BrandMark light to="/dashboard" />
      </header>

      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>

      <nav aria-label="Dashboard" className={styles.tabs}>
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
            <item.icon size={20} aria-hidden />
            <span>{item.short}</span>
            {count(item.badge, styles.tabCount)}
          </NavLink>
        ))}
        <Link to="/" className={styles.tab}>
          <Store size={20} aria-hidden />
          <span>Store</span>
        </Link>
      </nav>
    </div>
  );
};