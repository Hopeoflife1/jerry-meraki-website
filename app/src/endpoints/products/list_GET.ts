import superjson from "superjson";
import type { OutputType } from "./list_GET.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse } from "../../helpers/requireUser";

// Public: active products for the customer catalog. Admins can request hidden ones too.
export async function handle(request: Request) {
  try {
    const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "1";
    if (includeInactive) await requireUser(request, { admin: true });
    let q = db.selectFrom("products").selectAll().orderBy("sortOrder").orderBy("id");
    if (!includeInactive) q = q.where("active", "=", true);
    const [products, categories] = await Promise.all([
      q.execute(),
      db.selectFrom("productCategories").selectAll().orderBy("sortOrder").orderBy("id").execute(),
    ]);
    return new Response(superjson.stringify({ products, categories } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}