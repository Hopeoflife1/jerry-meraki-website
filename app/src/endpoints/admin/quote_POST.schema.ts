import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  id: z.number().int().positive(),
  lines: z
    .array(z.object({ stage: z.string().min(1).max(120), vendor: z.string().max(120), amount: z.number().min(0) }))
    .min(1, "Add at least one cost line"),
  markupPercent: z.number().min(3, "Markup must be at least 3%").max(500),
  finalPrice: z.number().positive("Final price must be above zero"),
  message: z.string().max(2000).optional(),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postSendQuote = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/quote`, {
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