import { z } from "zod";
import superjson from "superjson";

export const MAX_ARTWORK_BYTES = 50 * 1024 * 1024;

export const schema = z.object({
  jobId: z.number().int().positive(),
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive().max(MAX_ARTWORK_BYTES, "Artwork must be under 50 MB"),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { presignedUrl: string; headers: Record<string, string>; storageKey: string };

export const postArtworkUploadUrl = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/artwork/upload-url`, {
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