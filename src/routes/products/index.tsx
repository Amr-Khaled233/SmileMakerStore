import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowRight, Star, Sparkles, Tag } from "lucide-react";
import { PRODUCTS, BUNDLES, getProduct, formatEGP, effectivePrice } from "@/data/products";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const { t, tl, lang } = useT();
  return (
    <Layout>
      <section className="section-pad bg-soft relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative text-center max-w-2xl mx-auto">
          <p className="eyebrow">{t("products.collection")}</p>
          <h1 className="mt-4 text-5xl md:text-6xl font-display">
            {t("products.title.a")} <span className="text-gradient">{t("products.title.b")}</span>.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">{t("products.lead")}</p>
        </div>
      </section>

      <section className="pb-12 -mt-10">
        <div className="container-lux grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCTS.map((p) => {
            const price = effectivePrice(p);
            const onSale = p.salePrice != null;
            return (
              <Link
                key={p.slug}
                to={`/products/${p.slug}` as "/products/h2o-water-flosser"}
                className="lux-card overflow-hidden group block"
              >
                <div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                  <img src={p.image} alt={p.title} loading="lazy" width={1024} height={768} className="w-3/5 h-3/5 object-contain transition-transform duration-700 group-hover:scale-110" />
                  {p.badge && <div className="absolute top-4 start-4 glass-card rounded-full px-3 py-1 text-xs font-medium">{tl(p.badge)}</div>}
                </div>
                <div className="p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-display" dir="ltr">{p.title}</h3>
                    <div className="flex items-end gap-2 whitespace-nowrap">
                      <span className="text-xl font-display text-gradient">{formatEGP(price, lang)}</span>
                      {onSale && <span className="text-xs text-muted-foreground line-through">{formatEGP(p.price, lang)}</span>}
                    </div>
                  </div>
                  <p className="mt-2 text-muted-foreground text-sm line-clamp-2">{tl(p.tagline)}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-deep-blue text-sm">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(p.rating) ? "fill-current" : "opacity-30"}`} />)}
                      <span className="ms-2 text-muted-foreground">{p.rating}</span>
                    </div>
                    <span className="text-deep-blue text-sm inline-flex items-center gap-1">{t("btn.view")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-pad bg-soft">
        <div className="container-lux">
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 backdrop-blur px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-deep-blue" />
              <span className="text-xs font-medium tracking-wide text-ink">{t("products.bundlesEyebrow")}</span>
            </div>
            <h2 className="mt-5 text-4xl md:text-5xl font-display">
              {t("products.bundles.h.a")} <span className="text-gradient">{t("products.bundles.h.b")}</span>.
            </h2>
            <p className="mt-4 text-muted-foreground">{t("products.bundles.lead")}</p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {BUNDLES.map((b) => {
              const items = b.items.map(getProduct);
              const total = items.reduce((s, i) => s + effectivePrice(i), 0);
              const discounted = Math.round(total * (1 - b.discountPct / 100));
              return (
                <div key={b.id} className="lux-card p-7 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-medium text-deep-blue">
                    <Tag className="h-3.5 w-3.5" /> {t("products.save")} {b.discountPct}%
                  </div>
                  <h3 className="mt-3 text-2xl font-display">{tl(b.title)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{tl(b.tagline)}</p>

                  <div className="mt-5 flex items-center gap-3">
                    {items.map((i) => (
                      <div key={i.slug} className="h-16 w-16 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden">
                        <img src={i.image} alt={i.title} loading="lazy" width={128} height={128} className="w-3/4 h-3/4 object-contain" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-end gap-3">
                    <span className="text-2xl font-display text-gradient">{formatEGP(discounted, lang)}</span>
                    <span className="pb-1 text-sm text-muted-foreground line-through">{formatEGP(total, lang)}</span>
                  </div>

                  <Link to="/order" className="btn-primary mt-6 text-sm w-fit">
                    {t("btn.orderBundle")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
