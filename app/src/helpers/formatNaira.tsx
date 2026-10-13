export const formatNaira = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
};