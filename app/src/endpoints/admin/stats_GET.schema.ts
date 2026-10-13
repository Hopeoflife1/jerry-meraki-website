import superjson from "superjson";

export type OutputType = {
  openQuotes: number;
  awaitingApproval: number;
  inProduction: number;
  readyForPickup: number;
  revenueThisMonth: number;
  revenueByMonth: { month: string; revenue: number; jobs: number }[];
  byProduct: { product: string; jobs: number }[];
};

export const getAdminStats = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/stats`, { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};