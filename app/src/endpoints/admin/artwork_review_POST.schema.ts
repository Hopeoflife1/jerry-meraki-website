import { z } from "zod";
import superjson from "superjson";

export const schema = z
  .object({
    id: z.number().int().positive(),
    decision: z.enum(["approved", "changes_requested", "pending"]),
    note: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.decision !== "changes_requested" || (v.note?.length ?? 0) >= 3, {
    message: "Tell the customer what needs to change",
    path: ["note"],
  });
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postArtworkReview = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/artwork_review`, {
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