import { Link } from "@tanstack/react-router";
import { Star, ShoppingCart, Zap, ShieldCheck, Sparkles, Check } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useT, type L } from "@/lib/i18n";
import { formatEGP, PRODUCTS, PRODUCT_DETAILS, type ProductSlug } from "@/data/products";
import { api, type Pricing, type StaticProductOverride } from "@/lib/api";

export type ProductRelated = {
  slug: string;
  title: string;
  price: number;
  salePrice?: number;
  image: string;
};

export type ProductDetailProps = {
  slug: string;
  eyebrow: L;
  title: string; // product name — English only
  tagline: L;
  price: number;
  salePrice?: number;
  rating: number;
  reviews: number;
  image: string;
  gallery?: { src: string; alt: string }[];
  description: L;
  features: L[];
  benefits: { icon: "zap" | "shield" | "sparkle"; title: L; text: L }[];
  testimonials: { name: string; quote: L }[];
  related: ProductRelated[];
  extra?: ReactNode;
};

const iconMap = { zap: Zap, shield: ShieldCheck, sparkle: Sparkles };

export function ProductDetail(p: ProductDetailProps) {
  const { t, tl, lang } = useT();
  const [activeImg, setActiveImg] = useState(p.image);
  const [pricing, setPricing] = useState<Pricing>({ products: [], bundles: [], promoCodes: [] });
  const [dbImages, setDbImages] = useState<string[] | null>(null);
  const [textOverride, setTextOverride] = useState<StaticProductOverride | null>(null);

  useEffect(() => { api.getPricingPublic().then(setPricing).catch(() => {}); }, []);
  useEffect(() => {
    api.getProductsMeta().then((meta) => {
      const imgs = meta.imageOverrides[p.slug];
      if (imgs?.length) { setDbImages(imgs); setActiveImg(imgs[0]); }
      const ov = meta.staticOverrides?.[p.slug];
      if (ov) setTextOverride(ov);
    }).catch(() => {});
  }, [p.slug]);

  // Apply text overrides if set in DB
  const displayDescription: L = textOverride
    ? { en: textOverride.description || (p.description as L).en, ar: textOverride.descriptionAr || (p.description as L).ar }
    : p.description as L;
  const displayFeatures: L[] = (textOverride?.features?.length ? textOverride.features : null) ?? p.features;

  // Use DB images if available, otherwise fall back to static gallery
  const gallery: { src: string; alt: string }[] = dbImages
    ? dbImages.map((src, i) => ({ src, alt: `${p.title} ${i + 1}` }))
    : (p.gallery ?? [{ src: p.image, alt: p.title }]);

  const priceOv = pricing.products.find((x) => x.slug === p.slug);
  const displayPrice = priceOv?.price ?? p.price;
  const displaySalePrice = priceOv !== undefined ? (priceOv.salePrice ?? undefined) : p.salePrice;

  const baseRelated: ProductRelated[] = textOverride?.related?.length
    ? textOverride.related.map((slug) => {
        const prod = PRODUCTS.find((x) => x.slug === slug);
        const det = PRODUCT_DETAILS[slug as ProductSlug];
        if (!prod) return null;
        return { slug, title: prod.title, price: prod.price, salePrice: prod.salePrice, image: det?.gallery[0]?.src ?? prod.image };
      }).filter(Boolean) as ProductRelated[]
    : p.related;

  const relatedWithPricing = baseRelated.map((r) => {
    const ov = pricing.products.find((x) => x.slug === r.slug);
    return { ...r, price: ov?.price ?? r.price, salePrice: ov !== undefined ? (ov.salePrice ?? undefined) : r.salePrice };
  });
  return (
    <>
      <section className="section-pad bg-soft relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-white shadow-[var(--shadow-glow)] flex items-center justify-center overflow-hidden">
              <img key={activeImg} src={activeImg} alt={p.title} loading="eager" width={1024} height={1024} className="w-4/5 h-4/5 object-contain animate-float" />
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {gallery.map((g, i) => {
                  const active = activeImg === g.src;
                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setActiveImg(g.src)}
                      aria-pressed={active}
                      aria-label={g.alt}
                      className={`aspect-square rounded-xl bg-white border-2 overflow-hidden transition-all ${active ? "border-deep-blue ring-2 ring-turquoise/30" : "border-border hover:border-turquoise"}`}
                    >
                      <img src={g.src} alt={g.alt} loading="lazy" width={300} height={300} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">{tl(p.eyebrow)}</p>
            <h1 className="mt-3 text-5xl md:text-6xl font-display" dir="ltr">{p.title}</h1>
            <p className="mt-3 text-lg text-muted-foreground">{tl(p.tagline)}</p>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center gap-1 text-deep-blue">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(p.rating) ? "fill-current" : "opacity-30"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{p.rating.toFixed(1)} · {p.reviews} {t("pd.reviews")}</span>
            </div>

            <div className="mt-6 flex items-end gap-3 flex-wrap">
              <span className="text-5xl price-tag text-gradient">{formatEGP(displaySalePrice ?? displayPrice, lang)}</span>
              {displaySalePrice != null && (
                <span className="pb-2 text-muted-foreground text-xl line-through">{formatEGP(displayPrice, lang)}</span>
              )}
              <span className="pb-2 text-muted-foreground text-sm">· {t("order.shippingAtCheckout")}</span>
            </div>

            <p className="mt-6 leading-relaxed text-muted-foreground">{tl(displayDescription)}</p>

            <ul className="mt-6 grid sm:grid-cols-2 gap-2">
              {displayFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-turquoise mt-0.5 shrink-0" />
                  <span>{tl(f)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/order" className="btn-primary"><ShoppingCart className="h-4 w-4" /> {t("btn.orderNow")}</Link>
              <Link to="/products" className="btn-ghost">{t("btn.browseAll")}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux">
          <div className="text-center max-w-xl mx-auto">
            <p className="eyebrow">{t("pd.whyLove.eyebrow")}</p>
            <h2 className="mt-3 text-4xl">{t("pd.whyLove.h")}</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {p.benefits.map((b, i) => {
              const Icon = iconMap[b.icon];
              return (
                <div key={i} className="lux-card p-8">
                  <div className="h-12 w-12 rounded-2xl bg-brand text-white flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-xl font-display">{tl(b.title)}</h4>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{tl(b.text)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {p.extra}

      <section className="section-pad bg-soft">
        <div className="container-lux">
          <div className="text-center max-w-xl mx-auto">
            <p className="eyebrow">{t("pd.reviewsEyebrow")}</p>
            <h2 className="mt-3 text-4xl">{t("pd.reviewsH")}</h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {p.testimonials.map((tt) => (
              <div key={tt.name} className="lux-card p-8">
                <div className="flex gap-1 text-deep-blue">
                  {Array.from({ length: 5 }).map((_, i) => (<Star key={i} className="h-4 w-4 fill-current" />))}
                </div>
                <p className="mt-4 text-muted-foreground leading-relaxed italic">"{tl(tt.quote)}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-brand text-white flex items-center justify-center font-semibold">
                    {tt.name[0]}
                  </div>
                  <div>
                    <p className="text-ink font-medium text-sm" dir="ltr">{tt.name}</p>
                    <p className="text-xs text-muted-foreground">{t("pd.verified")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="eyebrow">{t("pd.related.eyebrow")}</p>
              <h2 className="mt-3 text-4xl">{t("pd.related.h")}</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {relatedWithPricing.map((r) => (
              <Link key={r.slug} to="/products/$slug" params={{ slug: r.slug }} className="lux-card overflow-hidden block group">
                <div className="aspect-[4/3] bg-soft flex items-center justify-center overflow-hidden">
                  <img src={r.image} alt={r.title} loading="lazy" width={1024} height={768} className="w-3/5 h-3/5 object-contain transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <h4 className="font-display text-xl" dir="ltr">{r.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("products.from")} {formatEGP(r.salePrice ?? r.price, lang)}
                    </p>
                  </div>
                  <span className="text-deep-blue text-sm">{t("btn.view")} →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
