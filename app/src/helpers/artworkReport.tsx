import { z } from "zod";

// Shared (client + server) shape of the automatic artwork check. The analysis itself runs in the
// customer's browser (helpers/artworkAnalysis) and the result is stored on the job as artwork_report.
// Statuses: pass = verified OK (auto-ticked) · fail = clear problem (blocks unless the customer sends
// anyway) · warn = possible problem the customer must confirm · manual = couldn't check, customer ticks.
export const CHECK_STATUSES = ["pass", "warn", "fail", "manual"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];
export type CheckResult = { status: CheckStatus; detail: string };

export const artworkReportSchema = z.object({
  kind: z.string().max(20),
  checkedAt: z.string().max(40),
  /** Customer chose "Send it anyway" despite failed checks. */
  override: z.boolean(),
  note: z.string().max(400).optional(),
  items: z.record(z.object({ status: z.enum(CHECK_STATUSES), detail: z.string().max(600) })),
});
export type ArtworkReport = z.infer<typeof artworkReportSchema>;

export const reportHasFailures = (r: ArtworkReport | null | undefined) =>
  !!r && Object.values(r.items).some((i) => i.status === "fail");

// Trim sizes in mm for the standard sizes customers can order; parses "(90 x 55mm)" style labels too.
const SIZE_MM: Record<string, [number, number]> = {
  A6: [105, 148],
  A5: [148, 210],
  A4: [210, 297],
  A3: [297, 420],
  A2: [420, 594],
};
export const sizeMm = (size: string | undefined | null): [number, number] | null => {
  if (!size) return null;
  if (SIZE_MM[size]) return SIZE_MM[size];
  const m = size.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
};