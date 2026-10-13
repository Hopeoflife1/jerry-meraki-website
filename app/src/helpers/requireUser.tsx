import { getServerUserSession } from "./getServerUserSession";
import { NotAuthenticatedError } from "./getSetServerSession";
import superjson from "superjson";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Server-only: returns the signed-in user, optionally requiring admin.
export async function requireUser(request: Request, opts?: { admin?: boolean }) {
  try {
    const { user } = await getServerUserSession(request);
    if (opts?.admin && user.role !== "admin") {
      throw new HttpError(403, "Admins only");
    }
    return user;
  } catch (e) {
    if (e instanceof NotAuthenticatedError) throw new HttpError(401, "Please log in");
    throw e;
  }
}

export function errorResponse(error: unknown) {
  const status = error instanceof HttpError ? error.status : 400;
  const message = error instanceof Error ? error.message : "Something went wrong";
  if (status >= 500 || !(error instanceof HttpError)) console.error(error);
  return new Response(superjson.stringify({ error: message }), { status });
}