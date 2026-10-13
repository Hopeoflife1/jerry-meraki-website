import superjson from "superjson";
import { nanoid } from "nanoid";
import { upload } from "../../helpers/storage";
import { schema, OutputType } from "./upload-url_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse, HttpError } from "../../helpers/requireUser";

const BLOCKED = /(html|javascript|xml)/i;

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    if (BLOCKED.test(input.contentType)) throw new Error("This file type is not allowed");
    const job = await db.selectFrom("jobs").select(["id", "customerId", "jobCode"]).where("id", "=", input.jobId).executeTakeFirst();
    if (!job || (job.customerId !== user.id && user.role !== "admin")) throw new HttpError(404, "Job not found");

    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const storageKey = `artwork/${job.jobCode}/${nanoid(10)}-${safeName}`;
    const r = await upload({
      visibility: "private",
      filename: storageKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
    });
    if (!r.ok) throw new Error(r.error.message);
    return new Response(superjson.stringify({ presignedUrl: r.presignedUrl, headers: r.headers, storageKey } satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}