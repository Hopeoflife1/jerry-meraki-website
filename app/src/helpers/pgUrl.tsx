// Supabase/Vercel connection strings carry extra query params (e.g. ?sslmode=require&supa=base-pooler.x)
// that postgres.js would forward to the server as unknown settings. Strip them; SSL is set in code.
export const pgUrl = () => {
  const raw = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!raw) throw new Error("POSTGRES_URL is not set");
  return raw.split("?")[0];
};
