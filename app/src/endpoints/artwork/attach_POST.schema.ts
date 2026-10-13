import { z } from "zod";
import superjson from "superjson";
import { allArtworkChecksTicked } from "../../helpers/printCatalog";
import { artworkReportSchema } from "../../helpers/artworkReport";

export const schema = z.object({
  jobId: z.number().int().positive(),
  storageKey: z.string().min(1).max(400),
  fileName: z.string().min(1).max(200),
  checks: z.record(z.boolean()).refine(allArtworkChecksTicked, "Please tick every item on the artwork checklist"),
  /** Automatic check result from the customer's browser (null for files we can't read). */
  report: artworkReportSchema.nullable().optional(),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postAttachArtwork = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/artwork/attach`, {
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