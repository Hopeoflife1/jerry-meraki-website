import { z } from "zod";
import superjson from "superjson";
import type { Selectable } from "kysely";
import type { Products, ProductCategories } from "../../helpers/schema";

export const schema = z.object({ includeInactive: z.boolean().optional() });
export type InputType = z.infer<typeof schema>;
export type Product = Selectable<Products>;
export type ProductCategory = Selectable<ProductCategories>;
export type OutputType = { products: Product[]; categories: ProductCategory[] };

export const getProductsList = async (params: InputType = {}, init?: RequestInit): Promise<OutputType> => {
  const qs = params.includeInactive ? "?includeInactive=1" : "";
  const result = await fetch(`/_api/products/list${qs}`, { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};