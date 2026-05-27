import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowRight, Star, Sparkles, ShieldCheck, Award, Users, Truck, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import logo from "@/assets/smile-maker-logo.png";
import hero from "@/assets/hero-smile.jpg";
import { useT, type L } from "@/lib/i18n";
import { formatEGP, PRODUCTS, effectivePrice } from "@/data/products";
import { useEffect, useRef, useState, useCallback } from "react";
import { api, type Pricing } from "@/lib/api";

import slide1 from "@/assets/h2o-flosser-1.jpeg";
import slide2 from "@/assets/electric-brush-1.jpeg";
import slide3 from "@/assets/ortho-kit-1.jpeg";
import slide4 from "@/assets/l-shaped-1.jpeg";
import slide5 from "@/assets/ortho-wax-main.jpeg";

const FALLBACK_SLIDES = [slide1, slide2, slide3, slide4, slide5];

function ProductCarousel() {
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build slides dynamically from all products + image overrides
  useEffect(() => {
    Promise.all([
      api.getProductsMeta().catch(() => ({ imageOverrides: {} as Record<string, string[]>, hidden: [] as string[] })),
      api.getDynamicProducts().catch(() => []),
    ]).then(([meta, dynProds]) => {
      const imgs: string[] = [];
      // Static products (skip hidden, use override[0] if set)
      for (const p of PRODUCTS) {
        if (meta.hidden.includes(p.slug)) continue;
        const ov = (meta.imageOverrides as Record<string, string[]>)[p.slug];
        imgs.push(ov?.[0] ?? p.image);
      }
      // Dynamic products (only those with at least one image)
      for (const p of dynProds) {
        if (p.outOfStock) continue;
        if (p.images[0]) imgs.push(p.images[0]);
      }
      if (imgs.length > 0) setSlides(imgs);
    });
  }, []);

  const n = slides.length;

  const scrollTo = useCallback((idx: number) => {
    const i = ((idx % n) + n) % n;
    setActive(i);
    trackRef.current?.scrollTo({ left: i * (trackRef.current.offsetWidth), behavior: "smooth" });
  }, [n]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((a) => {
        const next = (a + 1) % n;
        trackRef.current?.scrollTo({ left: next * (trackRef.current.offsetWidth), behavior: "smooth" });
        return next;
      });
    }, 2000);
  }, [n]);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.offsetWidth);
    if (i >= 0 && i < n) setActive(i);
  };

  return (
    <div className="relative select-none">
      {/* Track */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={() => { if (timerRef.current) clearInterval(timerRef.current); }}
        onTouchEnd={startTimer}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl sm:rounded-3xl shadow-xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {slides.map((src, i) => (
          <div key={i} className="shrink-0 w-full snap-center aspect-square sm:aspect-[4/3]">
            <img
              src={src}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Prev / Next buttons */}
      <button
        onClick={() => { scrollTo(active - 1); startTimer(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur shadow hover:bg-white transition-colors"
        aria-label="السابق"
      >
        <ChevronLeft className="h-5 w-5 text-ink" />
      </button>
      <button
        onClick={() => { scrollTo(active + 1); startTimer(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur shadow hover:bg-white transition-colors"
        aria-label="التالي"
      >
        <ChevronRight className="h-5 w-5 text-ink" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { scrollTo(i); startTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-deep-blue" : "w-1.5 bg-border"}`}
            aria-label={`الصورة ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});


function ReviewsSlider() {
  const { t } = useT();
  const [images, setImages] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getReviewImages().then((imgs) => { setImages(imgs); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  if (!loaded || images.length === 0) return null;

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  // Show up to 3 visible at once; center = idx
  const visible = [-1, 0, 1].map((offset) => {
    const i = (idx + offset + images.length) % images.length;
    return { src: images[i], offset };
  });

  return (
    <section className="section-pad bg-soft">
      <div className="container-lux">
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="eyebrow">{t("home.test.eyebrow")}</p>
          <h2 className="mt-3 text-4xl md:text-5xl">{t("home.test.h")}</h2>
        </div>
        <div className="relative flex items-center justify-center gap-4">
          <button onClick={prev} className="shrink-0 h-10 w-10 rounded-full border-2 border-border bg-white hover:bg-soft flex items-center justify-center transition-colors shadow-sm z-10">
            <ChevronLeft className="h-5 w-5 text-ink" />
          </button>
          <div className="flex items-center gap-4 overflow-hidden w-full max-w-4xl justify-center">
            {visible.map(({ src, offset }) => (
              <div
                key={src + offset}
                onClick={() => setIdx((i) => (i + offset + images.length) % images.length)}
                className={`shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer ${
                  offset === 0
                    ? "w-64 sm:w-80 h-64 sm:h-80 border-deep-blue shadow-lg scale-100 z-10"
                    : "w-44 sm:w-56 h-44 sm:h-56 border-border opacity-60 scale-95 hidden sm:block"
                }`}
              >
                <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <button onClick={next} className="shrink-0 h-10 w-10 rounded-full border-2 border-border bg-white hover:bg-soft flex items-center justify-center transition-colors shadow-sm z-10">
            <ChevronRight className="h-5 w-5 text-ink" />
          </button>
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {images.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-deep-blue" : "w-2 bg-border"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURED_SLUGS = ["h2o-water-flosser", "ortho-oral-kit"];

function HomePage() {
  const { t, tl, lang } = useT();
  const [pricing, setPricing] = useState<Pricing>({ products: [], bundles: [], promoCodes: [] });
  const [imageOverrides, setImageOverrides] = useState<Record<string, string[]>>({});
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);

  useEffect(() => { api.getPricingPublic().then(setPricing).catch(() => {}); }, []);
  useEffect(() => {
    api.getProductsMeta().then((m) => {
      setImageOverrides(m.imageOverrides ?? {});
      setHiddenSlugs(m.hidden ?? []);
    }).catch(() => {});
  }, []);

  const featuredProducts = PRODUCTS
    .filter((p) => FEATURED_SLUGS.includes(p.slug) && !hiddenSlugs.includes(p.slug))
    .map((p) => {
      const ov = pricing.products.find((x) => x.slug === p.slug);
      const imgs = imageOverrides[p.slug];
      return {
        ...p,
        price: ov?.price ?? p.price,
        salePrice: ov !== undefined ? (ov.salePrice ?? undefined) : p.salePrice,
        image: imgs?.[0] ?? p.image,
      };
    });
  const features: { icon: typeof Zap; t: L; x: L }[] = [
    { icon: Zap, t: { en: "Advanced Tech", ar: "تقنية متطورة" }, x: { en: "Hydro-pulse + sonic.", ar: "نبضات مائية + سونيك." } },
    { icon: ShieldCheck, t: { en: "Safe & Pro", ar: "آمن واحترافي" }, x: { en: "Medically certified.", ar: "معتمد طبياً." } },
    { icon: Award, t: { en: "Premium", ar: "فاخر" }, x: { en: "Aerospace-grade build.", ar: "مواد فاخرة." } },
    { icon: Users, t: { en: "Trusted", ar: "موثوق" }, x: { en: "12,400+ reviews.", ar: "أكثر من ١٢,٤٠٠ تقييم." } },
    { icon: Truck, t: { en: "Fast Delivery", ar: "توصيل سريع" }, x: { en: "Free worldwide.", ar: "توصيل لكل المحافظات." } },
  ];


  return (
    <Layout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-soft" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative pt-16 pb-24 lg:pt-24 lg:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 backdrop-blur px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-deep-blue" />
              <span className="text-xs font-medium tracking-wide text-ink">{t("home.heroBadge")}</span>
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-display leading-[1.1]">
              {t("home.heroTitle.a")} <span className="text-gradient">{t("home.heroTitle.b")}</span>.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed hidden sm:block">{t("home.heroLead")}</p>
            {/* Carousel shown on mobile only, in place of the paragraph */}
            <div className="mt-6 sm:hidden">
              <ProductCarousel />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="btn-primary">
                {t("btn.shopNow")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link to="/about" className="btn-ghost">{t("btn.learnMore")}</Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 text-deep-blue">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <span>{t("home.reviews")}</span>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[4/5] max-w-md mx-auto">
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden shadow-[var(--shadow-glow)]">
                <img src={hero} alt="Brilliant white smile" width={1600} height={2000} className="w-full h-full object-cover" />
              </div>
              <img
                src={logo}
                alt=""
                aria-hidden
                className="absolute -bottom-10 -start-10 h-32 w-32 object-contain animate-float drop-shadow-2xl"
              />
              <div className="absolute -top-6 -end-6 glass-card rounded-2xl p-4 max-w-[200px] animate-float" style={{ animationDelay: "1s" }}>
                <p className="text-xs uppercase tracking-widest text-deep-blue">{t("home.whiterIn")}</p>
                <p className="text-3xl font-display text-gradient">{t("home.days")}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("home.clinical")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="arc-divider" />
      </section>

      {/* Product image carousel — desktop only (mobile shows it inside the hero) */}
      <section className="hidden sm:block py-10 sm:py-14">
        <div className="container-lux max-w-2xl">
          <div className="text-center mb-6">
            <p className="eyebrow">{t("home.heroBadge")}</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-display">
              {tl({ en: "Our Products", ar: "منتجاتنا" })}
            </h2>
          </div>
          <ProductCarousel />
          <div className="mt-6 text-center">
            <Link to="/products" className="btn-primary">
              {t("btn.shopNow")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="eyebrow">{t("home.about.eyebrow")}</p>
            <h2 className="mt-3 text-4xl md:text-5xl">
              {t("home.about.h.a")} <span className="text-gradient">{t("home.about.h.b")}</span>.
            </h2>
            <p className="mt-6 text-muted-foreground leading-relaxed">{t("home.about.p1")}</p>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("home.about.p2")}</p>
            <Link to="/about" className="btn-ghost mt-8">{t("btn.readMore")} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "12K+", label: t("home.stats.smiles") },
              { value: "4.9★", label: t("home.stats.rating") },
            ].map((s) => (
              <div key={s.label} className="lux-card p-6 text-center">
                <p className="text-4xl font-display text-gradient">{s.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-soft">
        <div className="container-lux">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t("home.featured.eyebrow")}</p>
              <h2 className="mt-3 text-4xl md:text-5xl">{t("home.featured.h")}</h2>
            </div>
            <p className="text-muted-foreground max-w-md">{t("home.featured.lead")}</p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-8">
            {featuredProducts.map((p) => {
              const price = effectivePrice(p);
              const onSale = p.salePrice != null;
              return (
                <Link
                  key={p.slug}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
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
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-lux">
          <div className="text-center max-w-xl mx-auto">
            <p className="eyebrow">{t("home.why.eyebrow")}</p>
            <h2 className="mt-3 text-4xl md:text-5xl">{t("home.why.h")}</h2>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((f) => (
              <div key={tl(f.t)} className="lux-card p-6 text-center">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-brand text-white flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h4 className="font-display text-lg">{tl(f.t)}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{tl(f.x)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewsSlider />

      <section className="section-pad">
        <div className="container-lux">
          <div className="rounded-3xl p-12 md:p-20 bg-brand text-white shadow-[var(--shadow-glow)] grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="eyebrow text-white/80">{t("home.cta.eyebrow")}</p>
              <h2 className="mt-3 text-4xl md:text-5xl text-white">{t("home.cta.h")}</h2>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <p className="text-white/80 max-w-sm md:text-end">{t("home.cta.lead")}</p>
              <Link to="/contact" className="btn-ghost">{t("btn.contactUs")} <ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
