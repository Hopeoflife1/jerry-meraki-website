import { z } from "zod";
import superjson from "superjson";
import type { JobDetail } from "../../helpers/jobTypes";

export const schema = z.object({ id: z.coerce.number().int().positive() });
export type InputType = z.infer<typeof schema>;
export type OutputType = { job: JobDetail };

export const getJobDetailApi = async (params: InputType, init?: RequestInit): Promise<OutputType> => {
  const validated = schema.parse(params);
  const result = await fetch(`/_api/jobs/detail?id=${validated.id}`, { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};