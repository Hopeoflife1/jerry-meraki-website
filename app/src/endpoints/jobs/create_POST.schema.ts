import { z } from "zod";
import superjson from "superjson";
import { allArtworkChecksTicked } from "../../helpers/printCatalog";

export const schema = z.object({
  product: z.string().min(1, "Choose a product"),
  size: z.string().min(1, "Choose a size"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(10_000_000),
  paper: z.string().min(1, "Choose a paper"),
  printSides: z.string().min(1),
  colourMode: z.string().min(1),
  finishing: z.array(z.string()).max(20),
  notes: z.string().max(2000).optional(),
  neededBy: z.string().optional(),
  deliveryMethod: z.enum(["pickup", "delivery"]),
  deliveryAddress: z.string().max(500).optional(),
  phone: z.string().min(7, "Enter a WhatsApp number we can reach you on").max(30),
  artworkChecks: z
    .record(z.boolean())
    .refine(allArtworkChecksTicked, "Please tick every item on the artwork checklist before sending your request"),
});

export type InputType = z.infer<typeof schema>;
export type OutputType = { id: number; jobCode: string };

export const postCreateJob = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/jobs/create`, {
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