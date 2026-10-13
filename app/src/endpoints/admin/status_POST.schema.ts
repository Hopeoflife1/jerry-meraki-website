import { z } from "zod";
import superjson from "superjson";
import { JobStatusArrayValues } from "../../helpers/schema";

export const schema = z.object({
  id: z.number().int().positive(),
  status: z.enum(JobStatusArrayValues),
  note: z.string().max(1000).optional(),
  /** Estimated ready date (YYYY-MM-DD), saved when printing starts. */
  readyBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postUpdateStatus = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/admin/status`, {
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