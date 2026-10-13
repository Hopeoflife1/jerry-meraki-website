import superjson from "superjson";
import { customAlphabet } from "nanoid";
import { schema, OutputType } from "./create_POST.schema";
import { db } from "../../helpers/db";
import { requireUser, errorResponse } from "../../helpers/requireUser";
import { notifyAdminsOfQuoteRequest } from "../../helpers/notifyAdminsOfQuoteRequest";
import { APP_ORIGIN } from "../../helpers/emailAdmins";

const code = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

export async function handle(request: Request) {
  try {
    const user = await requireUser(request);
    const input = schema.parse(superjson.parse(await request.text()));
    if (input.deliveryMethod === "delivery" && !input.deliveryAddress?.trim()) {
      throw new Error("Enter a delivery address");
    }
    const now = new Date();
    const jobCode = `JM-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}-${code()}`;

    const job = await db.transaction().execute(async (trx) => {
      await trx.updateTable("users").set({ phone: input.phone.trim() }).where("id", "=", user.id).execute();
      const created = await trx
        .insertInto("jobs")
        .values({
          jobCode,
          customerId: user.id,
          product: input.product,
          size: input.size,
          quantity: input.quantity,
          paper: input.paper,
          printSides: input.printSides,
          colourMode: input.colourMode,
          finishing: input.finishing,
          notes: input.notes?.trim() || null,
          neededBy: input.neededBy || null,
          deliveryMethod: input.deliveryMethod,
          deliveryAddress: input.deliveryMethod === "delivery" ? input.deliveryAddress?.trim() : null,
          artworkChecks: input.artworkChecks,
        })
        .returning(["id", "jobCode"])
        .executeTakeFirstOrThrow();
      await trx
        .insertInto("jobEvents")
        .values({ jobId: created.id, status: "quote_requested", note: "Quote request received" })
        .execute();
      return created;
    });

    // Tell Mr. Ekeoba and staff straight away. Awaited (serverless), but never fails the request.
    await notifyAdminsOfQuoteRequest(
      {
        id: job.id,
        jobCode: job.jobCode,
        product: input.product,
        quantity: input.quantity,
        size: input.size,
        paper: input.paper,
        printSides: input.printSides,
        colourMode: input.colourMode,
        finishing: input.finishing,
        notes: input.notes?.trim() || null,
        neededBy: input.neededBy || null,
        deliveryMethod: input.deliveryMethod,
        deliveryAddress: input.deliveryAddress?.trim() || null,
        customerName: user.displayName,
        customerEmail: user.email,
        customerPhone: input.phone.trim(),
      },
      // Always the public app address: the email is opened outside the app, where only the live site works.
      APP_ORIGIN,
    );

    return new Response(superjson.stringify(job satisfies OutputType));
  } catch (error) {
    return errorResponse(error);
  }
}