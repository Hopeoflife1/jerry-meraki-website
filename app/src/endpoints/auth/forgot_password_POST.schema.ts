import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  email: z.string().trim().email("Enter the email you signed up with"),
});
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };

export const postForgotPassword = async (body: InputType, init?: RequestInit): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const result = await fetch(`/_api/auth/forgot_password`, {
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
