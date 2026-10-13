import "./global.css";
import "./base.css";
import { StrictMode, Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GlobalContextProviders } from "./components/_globalContextProviders";

// Routing, replacing Floot's built-in router. Floot page names map to URLs:
//   _index -> /   ·   quote.new -> /quote/new   ·   jobs.$jobId -> /jobs/:jobId
// Each page may have pages/<name>.pageLayout.tsx exporting an array of wrapper components (outermost first).
// Pages load lazily inside a null-fallback Suspense between the layouts and the page, like on Floot.

const pageModules = import.meta.glob<{ default: ComponentType }>(["./pages/*.tsx", "!./pages/*.pageLayout.tsx"]);
const layoutModules = import.meta.glob<{ default: ComponentType<{ children: ReactNode }>[] }>("./pages/*.pageLayout.tsx", {
  eager: true,
});

const toPath = (name: string) =>
  name === "_index"
    ? "/"
    : "/" +
      name
        .split(".")
        .map((seg) => (seg === "$" ? "*" : seg.startsWith("$") ? `:${seg.slice(1)}` : seg.replace(/\[(.)\]/g, "$1")))
        .join("/");

const routes = Object.entries(pageModules).map(([file, load]) => {
  const name = file.replace("./pages/", "").replace(/\.tsx$/, "");
  const layouts = layoutModules[`./pages/${name}.pageLayout.tsx`]?.default ?? [];
  const Page = lazy(load);
  const element = layouts.reduceRight<ReactNode>(
    (child, Layout) => <Layout>{child}</Layout>,
    <Suspense fallback={null}>
      <Page />
    </Suspense>,
  );
  return { path: toPath(name), element };
});

const NotFound = () => (
  <main style={{ padding: "4rem 1rem", textAlign: "center", fontFamily: "var(--font-family-base)" }}>
    <h1 style={{ fontFamily: "var(--font-family-display)", color: "var(--primary)" }}>Page not found</h1>
    <p>
      <a href="/">Go to the home page</a>
    </p>
  </main>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalContextProviders>
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GlobalContextProviders>
    </BrowserRouter>
  </StrictMode>,
);
