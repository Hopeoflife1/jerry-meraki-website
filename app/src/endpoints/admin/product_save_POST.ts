import superjson from "superjson";
import { schema, OutputType } from "./product_save_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";

// Admin only: create or update a catalog product.
export async function handle(request: Request) {
  try {
    await requireUser(request, { admin: true });
    const { id, ...values } = schema.parse(superjson.parse(await request.text()));
    try {
      if (id) {
        const updated = await db.updateTable("products").set(values).where("id", "=", id).returning("id").executeTakeFirst();
        if (!updated) throw new HttpError(404, "Product not found");
        return new Response(superjson.stringify({ id: updated.id } satisfies OutputType));
      }
      const row = await db.insertInto("products").values(values).returning("id").executeTakeFirstOrThrow();
      return new Response(superjson.stringify({ id: row.id } satisfies OutputType));
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new HttpError(409, "A product with this name already exists");
      throw e;
    }
  } catch (error) {
    return errorResponse(error);
  }
}