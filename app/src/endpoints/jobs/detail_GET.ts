import superjson from "superjson";
import { schema, OutputType } from "./detail_GET.schema";
import { requireUser, errorResponse } from "../../helpers/requireUser";
import { getJobDetail } from "../../helpers/getJobDetail";

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const { id } = schema.parse({ id: url.searchParams.get("id") });
    const job = await getJobDetail(id, user);
    return new Response(superjson.stringify({ job } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}