import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import * as Icons from "lucide-react";
import { ArrowRight } from "lucide-react";
import { PrintProductCard } from "../components/PrintProductCard";
import { Skeleton } from "../components/Skeleton";
import { useProducts } from "../helpers/useProducts";
import { formatNaira } from "../helpers/formatNaira";
import styles from "./catalog.module.css";

const iconFor = (name: string) => (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Printer;

// Master catalog. The four dimension blocks are the filter (toggle buttons),
// selection lives in ?d=<code> so a filtered view can be shared or bookmarked.
export default function CatalogPage() {
  const productsQ = useProducts.useList();
  const [params, setParams] = useSearchParams();
  const selected = params.get("d");

  const products = productsQ.data?.products ?? [];
  const categories = productsQ.data?.categories ?? [];

  const groups = useMemo(
    () =>
      categories.map((c) => ({
        category: c,
        items: products.filter((p) => p.categoryId === c.id),
      })),
    [categories, products],
  );
  // Products with no dimension yet (except the "Other" catch-all) still show, so nothing goes missing.
  const unsorted = products.filter(
    (p) => p.name !== "Other" && (p.categoryId === null || !categories.some((c) => c.id === p.categoryId)),
  );
  const active = groups.find((g) => g.category.code === selected) ?? null;
  const visible = active ? [active] : groups.filter((g) => g.items.length > 0);
  const visibleCount = visible.reduce((n, g) => n + g.items.length, 0);

  const choose = (code: string | null) => {
    const next = new URLSearchParams(params);
    if (code === null || code === selected) next.delete("d");
    else next.set("d", code);
    setParams(next, { replace: true });
  };

  const loading = productsQ.isFetching && !productsQ.data;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Catalog · Jerry Meraki Print Enterprise</title>
      </Helmet>

      <header className={styles.intro}>
        <span className={styles.eyebrow}>Master catalog</span>
        <h1>Everything we print</h1>
        <p>Pick a dimension to narrow things down, or browse it all. Every job gets a clear quote before you pay.</p>
      </header>

      <section className={styles.blueprint} aria-labelledby="dimension-label">
        <div className={styles.divider}>
          <span id="dimension-label" className={styles.dividerLabel}>
            Choose your dimension
          </span>
          <span className={styles.rule} aria-hidden />
          {selected ? (
            <button type="button" className={styles.clear} onClick={() => choose(null)}>
              Show all
            </button>
          ) : null}
        </div>

        <div className={styles.blocks} role="group" aria-labelledby="dimension-label">
          {loading
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className={styles.blockSkeleton} />)
            : groups.map(({ category: c, items }) => {
                const pressed = c.code === selected;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={pressed}
                    className={`${styles.block} ${pressed ? styles.blockOn : ""} ${selected && !pressed ? styles.blockDim : ""}`}
                    onClick={() => choose(c.code)}
                  >
                    <span className={styles.num} aria-hidden>
                      {c.code}
                    </span>
                    <span className={styles.blockName}>
                      <span aria-hidden>/ </span>
                      {c.name}
                    </span>
                    {c.description ? <span className={styles.blockDesc}>{c.description}</span> : null}
                    {items.length > 0 ? (
                      <span className={styles.blockList}>{items.map((p) => p.name).join(" · ")}</span>
                    ) : null}
                    <span className={styles.count}>
                      {items.length} {items.length === 1 ? "product" : "products"}
                    </span>
                  </button>
                );
              })}
        </div>
      </section>

      <p className={styles.srOnly} aria-live="polite">
        {loading ? "" : active ? `Showing ${visibleCount} ${active.category.name} products` : `Showing all ${visibleCount} products`}
      </p>

      <div className={styles.results}>
        {visible.map(({ category: c, items }) => (
          <section key={c.id} className={styles.group} aria-labelledby={`cat-${c.id}`}>
            <h2 id={`cat-${c.id}`} className={styles.groupHead}>
              <span className={styles.groupNum}>{c.code}</span>
              <span>{c.name}</span>
            </h2>
            {items.length ? (
              <div className={styles.grid}>
                {items.map((p) => (
                  <PrintProductCard
                    key={p.id}
                    title={p.name}
                    description={p.description}
                    href={`/quote/new?product=${encodeURIComponent(p.name)}`}
                    icon={iconFor(p.icon)}
                    fromPrice={p.fromPrice > 0 ? formatNaira(p.fromPrice) : undefined}
                    leadTime={p.leadTime || undefined}
                    finishes={p.finishes ?? []}
                    category={c.name}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.empty}>Nothing listed here yet. Ask us for a custom quote below.</p>
            )}
          </section>
        ))}
        {!active && unsorted.length > 0 ? (
          <section className={styles.group} aria-labelledby="cat-more">
            <h2 id="cat-more" className={styles.groupHead}>
              <span>More from us</span>
            </h2>
            <div className={styles.grid}>
              {unsorted.map((p) => (
                <PrintProductCard
                  key={p.id}
                  title={p.name}
                  description={p.description}
                  href={`/quote/new?product=${encodeURIComponent(p.name)}`}
                  icon={iconFor(p.icon)}
                  fromPrice={p.fromPrice > 0 ? formatNaira(p.fromPrice) : undefined}
                  leadTime={p.leadTime || undefined}
                  finishes={p.finishes ?? []}
                  category="Bespoke"
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {!loading ? (
        <Link to="/quote/new?product=Other" className={styles.custom}>
          <span>
            <strong>Don't see what you need?</strong>
            <span className={styles.customSub}>Tell us about it and we'll quote a custom job.</span>
          </span>
          <ArrowRight size={20} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
