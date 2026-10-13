import superjson from "superjson";
import type { UserRole } from "../../helpers/schema";

export type TeamMember = {
  id: number;
  email: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date | null;
};
export type OutputType = { members: TeamMember[] };

export const getTeam = async (init?: RequestInit): Promise<OutputType> => {
  const result = await fetch(`/_api/admin/team`, { method: "GET", ...init });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};