import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "This reset link isn't valid. Ask for a new one."),
  newPassword: z.string().min(8, "Use at least 8 characters").max(200),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postResetPassword = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/auth/reset_password`, {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  if (!result.ok) {
    const errorObject = superjson.parse<{ error: string }>(await result.text());
    throw new Error(errorObject.error);
  }
  return superjson.parse<OutputType>(await result.text());
};
