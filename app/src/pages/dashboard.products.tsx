import { MouseEvent, useState } from "react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";
import { z } from "zod";
import * as Icons from "lucide-react";
import { Plus, Pencil, RefreshCw, PackageOpen } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Switch } from "../components/Switch";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Form, FormControl, FormDescription, FormItem, FormLabel, FormMessage, useForm } from "../components/Form";
import { AdaptiveSheet } from "../components/AdaptiveSheet";
import { useProducts } from "../helpers/useProducts";
import { formatNaira } from "../helpers/formatNaira";
import { productIcons } from "../endpoints/admin/product_save_POST.schema";
import type { Product } from "../endpoints/products/list_GET.schema";
import styles from "./dashboard.products.module.css";

const wholeNumber = z.string().trim().regex(/^\d+$/, "Enter a whole number (digits only)");

const formSchema = z.object({
  name: z.string().trim().min(1, "Enter a product name").max(120, "Keep the name under 120 characters"),
  description: z.string().max(500, "Keep the description under 500 characters"),
  icon: z.enum(productIcons),
  fromPrice: wholeNumber,
  unitLabel: z.string().max(60),
  leadTime: z.string().max(60),
  sizes: z.string(),
  stocks: z.string(),
  finishes: z.string(),
  sortOrder: wholeNumber,
  active: z.boolean(),
});
type FormValues = z.infer<typeof formSchema>;

const toValues = (p: Product | null): FormValues => ({
  name: p?.name ?? "",
  description: p?.description ?? "",
  icon: (productIcons as readonly string[]).includes(p?.icon ?? "") ? (p!.icon as FormValues["icon"]) : "Printer",
  fromPrice: p ? String(p.fromPrice) : "",
  unitLabel: p?.unitLabel ?? "",
  leadTime: p?.leadTime ?? "",
  sizes: (p?.sizes ?? []).join("\n"),
  stocks: (p?.stocks ?? []).join("\n"),
  finishes: (p?.finishes ?? []).join("\n"),
  sortOrder: p ? String(p.sortOrder) : "500",
  active: p?.active ?? true,
});

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const iconFor = (name: string) => (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Printer;
const optionsSummary = (p: Product) => {
  const parts = [
    p.sizes.length ? `${p.sizes.length} sizes` : null,
    p.stocks.length ? `${p.stocks.length} papers` : null,
    p.finishes.length ? `${p.finishes.length} finishes` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Standard lists";
};

const ProductEditor = ({
  product,
  open,
  onOpenChange,
  opener,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  opener: HTMLElement | null;
}) => {
  const save = useProducts.useSave();
  const form = useForm({ schema: formSchema, defaultValues: toValues(product) });
  const v = form.values as FormValues;
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => form.setValues((prev: FormValues) => ({ ...prev, [key]: value }));

  const onSubmit = async (data: FormValues) => {
    try {
      await save.mutateAsync({
        id: product?.id ?? null,
        name: data.name.trim(),
        description: data.description.trim(),
        icon: data.icon,
        fromPrice: Number(data.fromPrice),
        unitLabel: data.unitLabel.trim(),
        leadTime: data.leadTime.trim(),
        sizes: lines(data.sizes),
        stocks: lines(data.stocks),
        finishes: lines(data.finishes),
        sortOrder: Number(data.sortOrder),
        active: data.active,
      });
      toast.success(product ? `${data.name} updated` : `${data.name} added`);
      onOpenChange(false);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("already exists")) form.setFieldError("name", msg);
      else toast.error(msg);
    }
  };

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={onOpenChange}
      returnFocusTo={opener}
      size="wide"
      title={product ? `Edit ${product.name}` : "New product"}
      description="Customers see the name, description and from price. You still review and price every quote."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={save.isPending} aria-busy={save.isPending}>
            {save.isPending && <Spinner size="sm" />} {product ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form id="product-form" className={styles.form} onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormItem name="name" className={styles.wideField}>
            <FormLabel>Product name</FormLabel>
            <FormControl>
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" aria-required="true" />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="description" className={styles.wideField}>
            <FormLabel>Short description</FormLabel>
            <FormControl>
              <Input value={v.description} onChange={(e) => set("description", e.target.value)} />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="fromPrice">
            <FormLabel>From price (₦)</FormLabel>
            <FormControl>
              <Input
                inputMode="numeric"
                value={v.fromPrice}
                onChange={(e) => set("fromPrice", e.target.value.replace(/\D/g, ""))}
                aria-required="true"
                className={styles.num}
              />
            </FormControl>
            <FormDescription>Use 0 to show "Price on request".</FormDescription>
            <FormMessage />
          </FormItem>

          <FormItem name="unitLabel">
            <FormLabel>Price unit</FormLabel>
            <FormControl>
              <Input placeholder="per 1,000" value={v.unitLabel} onChange={(e) => set("unitLabel", e.target.value)} />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="leadTime">
            <FormLabel>Lead time</FormLabel>
            <FormControl>
              <Input placeholder="2 working days" value={v.leadTime} onChange={(e) => set("leadTime", e.target.value)} />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem name="icon">
            <FormLabel>Icon</FormLabel>
            <Select value={v.icon} onValueChange={(val) => set("icon", val as FormValues["icon"])}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {productIcons.map((name) => {
                  const Icon = iconFor(name);
                  return (
                    <SelectItem key={name} value={name}>
                      <span className={styles.iconOption}>
                        <Icon size={16} aria-hidden /> {name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>

          <FormItem name="sizes">
            <FormLabel>Sizes</FormLabel>
            <FormControl>
              <Textarea rows={4} value={v.sizes} onChange={(e) => set("sizes", e.target.value)} />
            </FormControl>
            <FormDescription>One per line. Leave empty to use the standard list.</FormDescription>
          </FormItem>

          <FormItem name="stocks">
            <FormLabel>Papers and materials</FormLabel>
            <FormControl>
              <Textarea rows={4} value={v.stocks} onChange={(e) => set("stocks", e.target.value)} />
            </FormControl>
            <FormDescription>One per line. Leave empty to use the standard list.</FormDescription>
          </FormItem>

          <FormItem name="finishes" className={styles.wideField}>
            <FormLabel>Finishing options</FormLabel>
            <FormControl>
              <Textarea rows={3} value={v.finishes} onChange={(e) => set("finishes", e.target.value)} />
            </FormControl>
            <FormDescription>One per line. Leave empty to use the standard list.</FormDescription>
          </FormItem>

          <FormItem name="sortOrder">
            <FormLabel>Display order</FormLabel>
            <FormControl>
              <Input inputMode="numeric" value={v.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} className={styles.num} />
            </FormControl>
            <FormDescription>Lower numbers appear first.</FormDescription>
            <FormMessage />
          </FormItem>

          <FormItem name="active" className={styles.switchField}>
            <FormControl>
              <Switch checked={v.active} onCheckedChange={(c) => set("active", c)} />
            </FormControl>
            <FormLabel>Show to customers</FormLabel>
          </FormItem>
        </form>
      </Form>
    </AdaptiveSheet>
  );
};

export default function DashboardProductsPage() {
  const list = useProducts.useList(true);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Product | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const products = list.data?.products ?? [];

  const openEditor = (p: Product | null, e: MouseEvent<HTMLElement>) => {
    setOpener(e.currentTarget);
    setTarget(p);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Products & pricing · Dashboard</title>
      </Helmet>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>Owner settings</span>
          <h1 id="products-title">Products and pricing</h1>
          <p>"From" prices appear in the customer catalog. Every quote is still reviewed and priced by you.</p>
        </div>
        <Button onClick={(e) => openEditor(null, e)}>
          <Plus size={16} aria-hidden /> Add product
        </Button>
      </header>

      {list.error ? (
        <div role="alert" className={styles.stateBox}>
          <p>Couldn't load products: {(list.error as Error).message}</p>
          <Button variant="outline" onClick={() => list.refetch()} disabled={list.isFetching}>
            <RefreshCw size={16} aria-hidden /> Try again
          </Button>
        </div>
      ) : list.isFetching && !list.data ? (
        <div className={styles.list} aria-busy="true">
          <span className={styles.srOnly} role="status">
            Loading products
          </span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className={styles.stateBox}>
          <PackageOpen size={28} aria-hidden />
          <p>No products yet. Add the first one customers will see.</p>
          <Button onClick={(e) => openEditor(null, e)}>
            <Plus size={16} aria-hidden /> Add product
          </Button>
        </div>
      ) : (
        <div className={styles.collection}>
          <div className={styles.colHead} aria-hidden="true">
            <span>Product</span>
            <span className={styles.metaHead}>
              <span>From price</span>
              <span>Lead time</span>
              <span>Options</span>
              <span>Visibility</span>
            </span>
            <span />
          </div>
          <ul className={styles.list} aria-labelledby="products-title" aria-busy={list.isFetching}>
            {products.map((p) => {
              const Icon = iconFor(p.icon);
              return (
                <li key={p.id} className={`${styles.row} ${p.active ? "" : styles.inactive}`}>
                  <div className={styles.product}>
                    <span className={styles.icon} aria-hidden>
                      <Icon size={18} />
                    </span>
                    <div className={styles.productText}>
                      <h2 className={styles.name}>{p.name}</h2>
                      {p.description && <p className={styles.desc}>{p.description}</p>}
                    </div>
                  </div>
                  <dl className={styles.meta}>
                    <div>
                      <dt>From price</dt>
                      <dd className={styles.num}>
                        {p.fromPrice > 0 ? formatNaira(p.fromPrice) : "On request"}
                        {p.fromPrice > 0 && p.unitLabel && <span className={styles.unit}> {p.unitLabel}</span>}
                      </dd>
                    </div>
                    <div>
                      <dt>Lead time</dt>
                      <dd>{p.leadTime || "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Options</dt>
                      <dd>{optionsSummary(p)}</dd>
                    </div>
                    <div>
                      <dt>Visibility</dt>
                      <dd>
                        <Badge variant={p.active ? "success" : "outline"}>{p.active ? "Visible" : "Hidden"}</Badge>
                      </dd>
                    </div>
                  </dl>
                  <Button variant="outline" size="sm" className={styles.edit} onClick={(e) => openEditor(p, e)} aria-label={`Edit ${p.name}`}>
                    <Pencil size={14} aria-hidden /> Edit
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ProductEditor key={formKey} product={target} open={open} onOpenChange={setOpen} opener={opener} />
    </div>
  );
}