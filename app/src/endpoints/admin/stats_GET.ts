import superjson from "superjson";
import { sql } from "kysely";
import { OutputType } from "./stats_GET.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse } from "../../helpers/requireUser";

const WON = ["approved", "artwork_check", "in_production", "ready", "delivered"] as const;

export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });

    const counts = await db.selectFrom("jobs").select(["status", db.fn.countAll<string>().as("n")]).groupBy("status").execute();
    const count = (s: string) => Number(counts.find((c) => c.status === s)?.n ?? 0);

    const months = await db
      .selectFrom("jobs")
      .select([
        sql<string>`to_char(date_trunc('month', created_at), 'YYYY-MM')`.as("month"),
        sql<string>`coalesce(sum(quoted_price), 0)`.as("revenue"),
        db.fn.countAll<string>().as("jobs"),
      ])
      .where("status", "in", [...WON])
      .where("createdAt", ">=", sql<Date>`date_trunc('month', now()) - interval '5 months'`)
      .groupBy(sql`date_trunc('month', created_at)`)
      .execute();

    const revenueByMonth: OutputType["revenueByMonth"] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = months.find((m) => m.month === key);
      revenueByMonth.push({
        month: d.toLocaleString("en-GB", { month: "short" }),
        revenue: Number(row?.revenue ?? 0),
        jobs: Number(row?.jobs ?? 0),
      });
    }

    const byProductRows = await db
      .selectFrom("jobs")
      .select(["product", db.fn.countAll<string>().as("jobs")])
      .groupBy("product")
      .orderBy("jobs", "desc")
      .limit(6)
      .execute();

    const output: OutputType = {
      openQuotes: count("quote_requested"),
      awaitingApproval: count("quoted"),
      inProduction: count("in_production") + count("artwork_check") + count("approved"),
      readyForPickup: count("ready"),
      revenueThisMonth: revenueByMonth[revenueByMonth.length - 1].revenue,
      revenueByMonth,
      byProduct: byProductRows.map((r) => ({ product: r.product, jobs: Number(r.jobs) })),
    };
    return new Response(superjson.stringify(output));
  } catch (error) {
    return errorResponse(error);
  }
}