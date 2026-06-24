import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { PRODUCTS, PRODUCT_DETAILS, formatEGP, type ProductSlug, type ProductDetails } from "@/data/products";
import { api, type DynamicProduct, type Pricing } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { Star, Check, ArrowRight } from "lucide-react";
import { PurchasePanel } from "@/components/site/PurchasePanel";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { lang } = useT();

  const staticProduct = PRODUCTS.find((p) => p.slug === slug);
  const staticDetails = PRODUCT_DETAILS[slug as ProductSlug];

  if (staticProduct && staticDetails) {
    return <StaticProductPage staticProduct={staticProduct} staticDetails={staticDetails} />;
  }

  return <DynamicProductPage slug={slug} lang={lang} />;
}

function StaticProductPage({ staticProduct, staticDetails }: { staticProduct: (typeof PRODUCTS)[number]; staticDetails: ProductDetails }) {
  const [ready, setReady] = useState(false);
  const [price, setPrice] = useState(staticProduct.price);
  const [salePrice, setSalePrice] = useState<number | undefined>(staticProduct.salePrice);
  const [gallery, setGallery] = useState(staticDetails.gallery);

  useEffect(() => {
    Promise.all([
      api.getPricingPublic().catch((): Pricing => ({ products: [], bundles: [], promoCodes: [] })),
      api.getProductsMeta().catch(() => ({ imageOverrides: {} as Record<string, string[]>, hidden: [] as string[], staticOverrides: {}, bundleOverrides: {} })),
    ]).then(([pricingData, meta]) => {
      const priceOv = pricingData.products.find((x) => x.slug === staticProduct.slug);
      if (priceOv) {
        if (priceOv.price !== undefined) setPrice(priceOv.price);
        setSalePrice(priceOv.salePrice ?? undefined);
      }
      const imgs = meta.imageOverrides?.[staticProduct.slug];
      if (imgs?.length) {
        setGallery(imgs.map((src) => ({ src, alt: staticProduct.title })));
      }
      setReady(true);
    });
  }, [staticProduct.slug]);

  if (!ready) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-deep-blue border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ProductDetail
        eyebrow={staticDetails.eyebrow}
        slug={staticProduct.slug}
        title={staticProduct.title}
        tagline={staticProduct.tagline}
        price={price}
        salePrice={salePrice}
        rating={staticProduct.rating}
        reviews={staticProduct.reviews}
        image={gallery[0]?.src ?? staticProduct.image}
        gallery={gallery}
        description={staticProduct.description}
        features={staticDetails.features}
        benefits={staticDetails.benefits}
        testimonials={staticDetails.testimonials}
        related={staticDetails.related}
      />
    </Layout>
  );
}

function DynamicProductPage({ slug, lang }: { slug: string; lang: "en" | "ar" }) {
  const [product, setProduct] = useState<DynamicProduct | null | "loading">("loading");
  const [activeImg, setActiveImg] = useState<string>("");

  useEffect(() => {
    api.getDynamicProducts().then((list) => {
      const found = list.find((p) => p.slug === slug);
      if (!found) { setProduct(null); return; }
      setProduct(found);
      if (found.images[0]) setActiveImg(found.images[0]);
    }).catch(() => setProduct(null));
  }, [slug]);

  if (product === "loading") {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">جاري التحميل...</div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">المنتج غير موجود</p>
          <Link to="/products" className="btn-primary">عرض جميع المنتجات <ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
        </div>
      </Layout>
    );
  }

  const title = lang === "ar" && product.titleAr ? product.titleAr : product.title;
  const description = lang === "ar" ? (product.descriptionAr || product.description) : product.description;
  const displayPrice = product.salePrice ?? product.price;
  const onSale = product.salePrice != null && product.salePrice < product.price;

  return (
    <Layout>
      <section className="section-pad bg-soft relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-square rounded-3xl bg-white shadow-[var(--shadow-glow)] flex items-center justify-center overflow-hidden">
              {activeImg ? (
                <img key={activeImg} src={activeImg} alt={product.title} loading="eager" className="w-full h-full object-cover" />
              ) : (
                <div className="text-muted-foreground text-sm">لا توجد صورة</div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {product.images.map((src, i) => (
                  <button key={i} type="button" onClick={() => setActiveImg(src)}
                    className={`aspect-square rounded-xl bg-white border-2 overflow-hidden transition-all ${activeImg === src ? "border-deep-blue ring-2 ring-turquoise/30" : "border-border hover:border-turquoise"}`}>
                    <img src={src} alt={`${product.title} ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-display">{title}</h1>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 text-deep-blue">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-display text-gradient">{formatEGP(displayPrice, lang)}</span>
                  {onSale && <span className="text-sm text-muted-foreground line-through mb-0.5">{formatEGP(product.price, lang)}</span>}
                </div>
              </div>
            </div>

            {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}

            {product.features && product.features.length > 0 && (
              <ul className="space-y-2">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-deep-blue mt-0.5 shrink-0" />
                    <span>{lang === "ar" ? f.ar : f.en}</span>
                  </li>
                ))}
              </ul>
            )}

            <PurchasePanel slug={product.slug} />
          </div>
        </div>
      </section>
    </Layout>
  );
}
