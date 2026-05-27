import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowRight, Star, Sparkles } from "lucide-react";
import { PRODUCTS, BUNDLES, formatEGP, effectivePrice } from "@/data/products";
import { useT } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { api, type Pricing, type DynamicProduct, type DynamicBundle } from "@/lib/api";

export const Route = createFileRoute("/products/")({
  component: ProductsPage,
});

function ProductsPage() {
  const { t, tl, lang } = useT();
  const [pricing, setPricing] = useState<Pricing>({ products: [], bundles: [], promoCodes: [] });
  const [dynamicProducts, setDynamicProducts] = useState<DynamicProduct[]>([]);
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string[]>>({});
  const [userBundles, setUserBundles] = useState<DynamicBundle[]>([]);
  useEffect(() => { api.getPricingPublic().then(setPricing).catch(() => {}); }, []);
  useEffect(() => { api.getDynamicProducts().then(setDynamicProducts).catch(() => {}); }, []);
  useEffect(() => {
    api.getProductsMeta().then((m) => {
      setHiddenSlugs(m.hidden);
      setImageOverrides(m.imageOverrides ?? {});
    }).catch(() => {});
  }, []);
  useEffect(() => { api.getDynamicBundles().then(setUserBundles).catch(() => {}); }, []);

  const products = PRODUCTS.filter((p) => !hiddenSlugs.includes(p.slug)).map((p) => {
    const ov = pricing.products.find((x) => x.slug === p.slug);
    const imgs = imageOverrides[p.slug];
    return {
      ...p,
      price: ov?.price ?? p.price,
      salePrice: ov !== undefined ? (ov.salePrice ?? undefined) : p.salePrice,
      image: imgs?.[0] ?? p.image,
    };
  });
  const bundles = BUNDLES.map((b) => {
    const ov = pricing.bundles.find((x) => x.id === b.id);
    return { ...b, fixedPrice: ov?.price };
  });

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
          {products.map((p) => {
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
                      <span className="text-xl price-tag text-gradient">{formatEGP(price, lang)}</span>
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

          {/* Dynamic products added from dashboard */}
          {dynamicProducts.map((p) => (
            <Link
              key={p.id}
              to="/products/$slug"
              params={{ slug: p.slug }}
              className="lux-card overflow-hidden group block"
            >
              <div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden relative">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-soft flex items-center justify-center text-muted-foreground text-sm">لا توجد صورة</div>
                )}
                {p.outOfStock && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="text-sm font-medium text-muted-foreground">نفد من المخزون</span>
                  </div>
                )}
              </div>
              <div className="p-7">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-display">{lang === "ar" ? p.titleAr : p.title}</h3>
                  <div className="flex items-end gap-2 whitespace-nowrap">
                    <span className="text-xl price-tag text-gradient">{formatEGP(p.salePrice ?? p.price, lang)}</span>
                    {p.salePrice && <span className="text-xs text-muted-foreground line-through">{formatEGP(p.price, lang)}</span>}
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <span className="text-deep-blue text-sm inline-flex items-center gap-1">{t("btn.view")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" /></span>
                </div>
              </div>
            </Link>
          ))}
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
            {bundles.map((b) => {
              const allProdsForBundle = [...products, ...dynamicProducts.map((p) => ({ slug: p.slug, title: p.title, image: imageOverrides[p.slug]?.[0] ?? p.images[0] ?? "" }))];
              const items = b.items.map((s) => allProdsForBundle.find((p) => p.slug === s)!).filter(Boolean);
              const total = items.reduce((s, i) => s + effectivePrice(i as Parameters<typeof effectivePrice>[0]), 0);
              const discounted = b.fixedPrice ?? Math.round(total * (1 - b.discountPct / 100));
              const savingsPct = total > 0 ? Math.round(((total - discounted) / total) * 100) : 0;
              return (
                <div key={b.id} className="lux-card p-7 flex flex-col">
                  <h3 className="text-2xl font-display">{tl(b.title)}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{tl(b.tagline)}</p>

                  <div className="mt-5 flex items-center gap-3">
                    {items.map((i) => (
                      <div key={i.slug} className="h-16 w-16 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden">
                        <img src={i.image} alt={i.title} loading="lazy" width={128} height={128} className="w-3/4 h-3/4 object-contain" />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="line-through">{formatEGP(total, lang)}</span>
                      {savingsPct > 0 && (
                        <span className="ms-2 text-xs font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5">
                          −{savingsPct}%
                        </span>
                      )}
                    </p>
                    <p className="text-2xl price-tag text-gradient">{formatEGP(discounted, lang)}</p>
                  </div>

                  <Link to="/order" className="btn-primary mt-6 text-sm w-fit">
                    {t("btn.orderBundle")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                  </Link>
                </div>
              );
            })}

            {userBundles.map((b) => {
              const allProds = [...products, ...dynamicProducts.map((p) => ({ slug: p.slug, title: p.title, price: p.salePrice ?? p.price, salePrice: undefined as number | undefined, image: imageOverrides[p.slug]?.[0] ?? p.images[0] ?? "" }))];
              const items = b.items.map((s) => allProds.find((p) => p.slug === s)).filter(Boolean) as { slug: string; title: string; price: number; salePrice?: number; image: string }[];
              const total = items.reduce((s, i) => s + (i.salePrice ?? i.price), 0);
              const priceOv = pricing.bundles.find((x) => x.id === b.id);
              const discounted = priceOv?.price ?? b.price;
              const savingsPct = total > 0 && total > discounted ? Math.round(((total - discounted) / total) * 100) : 0;
              return (
                <div key={b.id} className="lux-card p-7 flex flex-col">
                  <h3 className="text-2xl font-display">{lang === "ar" ? b.titleAr : b.titleEn}</h3>
                  {(b.taglineEn || b.taglineAr) && (
                    <p className="mt-2 text-sm text-muted-foreground">{lang === "ar" ? b.taglineAr : b.taglineEn}</p>
                  )}

                  <div className="mt-5 flex items-center gap-3 flex-wrap">
                    {items.map((i) => (
                      <div key={i.slug} className="h-16 w-16 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden">
                        {i.image ? (
                          <img src={i.image} alt={i.title} loading="lazy" className="w-3/4 h-3/4 object-contain" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground text-center px-1">{i.title}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="line-through">{formatEGP(total, lang)}</span>
                      {savingsPct > 0 && (
                        <span className="ms-2 text-xs font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5">
                          −{savingsPct}%
                        </span>
                      )}
                    </p>
                    <p className="text-2xl price-tag text-gradient">{formatEGP(discounted, lang)}</p>
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
