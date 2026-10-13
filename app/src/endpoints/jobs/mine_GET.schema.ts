import superjson from "superjson";
import type { JobSummary } from "../../helpers/jobTypes";

export type OutputType = { jobs: JobSummary[] };

export const getMyJobs = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/jobs/mine`, { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};