import { z } from "zod";
import superjson from "superjson";

export const productIcons = [
  "FileText",
  "IdCard",
  "BookOpen",
  "Book",
  "Package",
  "Sticker",
  "Flag",
  "ReceiptText",
  "CalendarDays",
  "Tag",
  "Shirt",
  "Gift",
  "Printer",
  "Sparkles",
] as const;

const list = z.array(z.string().trim().min(1).max(120)).max(30);

export const schema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(1, "Enter a product name").max(120),
  description: z.string().trim().max(500),
  icon: z.enum(productIcons),
  fromPrice: z.number().int().min(0).max(1_000_000_000),
  unitLabel: z.string().trim().max(60),
  leadTime: z.string().trim().max(60),
  sizes: list,
  stocks: list,
  finishes: list,
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(100_000),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { id: number };

export const postSaveProduct = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/product_save`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};