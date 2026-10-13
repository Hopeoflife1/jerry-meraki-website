import { useEffect, useRef, useState } from "react";
import { Upload, AlertTriangle, CheckCircle2, XCircle, FileImage, X, Info } from "lucide-react";
import { Checkbox } from "./Checkbox";
import { Spinner } from "./Spinner";
import { printCatalog } from "../helpers/printCatalog";
import type { ArtworkReport } from "../helpers/artworkReport";
import styles from "./ArtworkPicker.module.css";

// File picker + artwork checklist. When a file is picked it is checked automatically in the browser
// (helpers/artworkAnalysis): passed items tick themselves, failed items block until fixed (or the customer
// chooses "Send it anyway"), possible problems and things we can't measure are ticked by the customer.
// `checks` stays the source of truth for "cleared to send" so the server rule (every item true) is unchanged.

type Props = {
  file: File | null;
  onFileChange: (f: File | null) => void;
  checks: Record<string, boolean>;
  onChecksChange: (c: Record<string, boolean>) => void;
  /** Receives the automatic check result (null when there is no file or it is still checking). */
  onReportChange?: (r: ArtworkReport | null) => void;
  size?: string;
  className?: string;
};

const ICON = {
  pass: <CheckCircle2 size={18} aria-hidden />,
  fail: <XCircle size={18} aria-hidden />,
  warn: <AlertTriangle size={18} aria-hidden />,
};

export const ArtworkPicker = ({ file, onFileChange, checks, onChecksChange, onReportChange, size, className }: Props) => {
  const [report, setReport] = useState<ArtworkReport | null>(null);
  const [checking, setChecking] = useState(false);
  // Latest callbacks without re-running the analysis when the parent re-renders.
  const cb = useRef({ onChecksChange, onReportChange });
  cb.current = { onChecksChange, onReportChange };
  const hadFile = useRef(false);

  useEffect(() => {
    setReport(null);
    cb.current.onReportChange?.(null);
    if (!file) {
      setChecking(false);
      // Removing a checked file clears its automatic ticks; the customer ticks manually again.
      if (hadFile.current) cb.current.onChecksChange({});
      hadFile.current = false;
      return;
    }
    hadFile.current = true;
    let cancelled = false;
    setChecking(true);
    cb.current.onChecksChange({});
    import("../helpers/artworkAnalysis")
      .then(({ analyzeArtwork }) => analyzeArtwork(file, size))
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setChecking(false);
        cb.current.onReportChange?.(r);
        cb.current.onChecksChange(Object.fromEntries(Object.entries(r.items).map(([id, it]) => [id, it.status === "pass"])));
      })
      .catch(() => {
        if (cancelled) return;
        // The checker itself failed to load: fall back to manual ticks so the customer isn't stuck.
        const detail = "We couldn't check this automatically. Please confirm it yourself.";
        const r: ArtworkReport = {
          kind: "other",
          checkedAt: new Date().toISOString(),
          override: false,
          note: "The automatic check didn't load, so Jerry Meraki will check your file by hand.",
          items: Object.fromEntries(printCatalog.artworkChecklist.map((c) => [c.id, { status: "manual" as const, detail }])),
        };
        setReport(r);
        setChecking(false);
        cb.current.onReportChange?.(r);
      });
    return () => {
      cancelled = true;
    };
  }, [file, size]);

  const failIds = report ? Object.entries(report.items).filter(([, it]) => it.status === "fail").map(([id]) => id) : [];
  const setOverride = (on: boolean) => {
    if (!report) return;
    const next = { ...report, override: on };
    setReport(next);
    onReportChange?.(next);
    onChecksChange({ ...checks, ...Object.fromEntries(failIds.map((id) => [id, on])) });
  };

  const counts = report
    ? Object.values(report.items).reduce(
        (a, it) => ({ ...a, [it.status]: (a[it.status] ?? 0) + 1 }),
        {} as Record<string, number>,
      )
    : null;

  return (
    <div className={`${styles.wrap} ${className || ""}`}>
      {file ? (
        <div className={styles.fileRow}>
          <FileImage size={20} />
          <div className={styles.fileInfo}>
            <strong>{file.name}</strong>
            <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <button type="button" className={styles.remove} onClick={() => onFileChange(null)} aria-label="Remove file">
            <X size={16} />
          </button>
        </div>
      ) : (
        <label className={styles.drop}>
          <Upload size={22} />
          <strong>Upload artwork</strong>
          <span>PDF (preferred, we check it for you), JPG, TIFF, PSD, AI or CDR · up to 50 MB</span>
          <input
            type="file"
            className={styles.hidden}
            accept=".pdf,.ai,.psd,.cdr,.eps,.jpg,.jpeg,.png,.tif,.tiff,.zip"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {checking && (
        <div className={styles.checking} role="status">
          <Spinner size="sm" /> Checking your file for print problems…
        </div>
      )}

      {report && counts && (
        <div className={styles.summary} role="status">
          We checked your file:{" "}
          {[
            counts.pass ? `${counts.pass} passed` : "",
            counts.fail ? `${counts.fail} problem${counts.fail === 1 ? "" : "s"} to fix` : "",
            counts.warn || counts.manual ? `${(counts.warn ?? 0) + (counts.manual ?? 0)} for you to confirm` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
          .
        </div>
      )}
      {report?.note && (
        <div className={styles.note}>
          <Info size={16} aria-hidden /> {report.note}
        </div>
      )}

      <div className={styles.checklist}>
        <span className={styles.label}>Artwork checklist</span>
        {printCatalog.artworkChecklist.map((c) => {
          const res = report?.items[c.id];
          const status = res?.status ?? "manual";
          if (status === "pass" || status === "fail") {
            return (
              <div key={c.id} className={`${styles.check} ${styles[status]}`}>
                <span className={styles.icon}>{ICON[status]}</span>
                <span>
                  <strong>{c.label}</strong>
                  <small>{res?.detail}</small>
                </span>
              </div>
            );
          }
          return (
            <label key={c.id} className={`${styles.check} ${status === "warn" ? styles.warnRow : ""}`}>
              <Checkbox checked={!!checks[c.id]} disabled={checking} onChange={(e) => onChecksChange({ ...checks, [c.id]: e.target.checked })} />
              <span>
                <strong>
                  {status === "warn" && <AlertTriangle size={14} aria-hidden className={styles.inlineIcon} />}
                  {c.label}
                </strong>
                <small>{res?.detail ?? c.why}</small>
              </span>
            </label>
          );
        })}
      </div>

      {failIds.length > 0 && report && (
        <label className={styles.override}>
          <Checkbox checked={report.override} onChange={(e) => setOverride(e.target.checked)} />
          <span>
            <strong>Send it anyway</strong>
            <small>
              I understand it may not print as expected. Jerry Meraki may need to fix the file first, which can cost extra. Better: fix it and
              upload the new file.
            </small>
          </span>
        </label>
      )}
    </div>
  );
};
