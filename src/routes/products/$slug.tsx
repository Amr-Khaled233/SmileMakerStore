import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { PRODUCTS, PRODUCT_DETAILS, formatEGP, type ProductSlug } from "@/data/products";
import { api, type DynamicProduct } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { useState, useEffect } from "react";
import { Star, ShoppingCart, Check, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/products/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { lang } = useT();

  const staticProduct = PRODUCTS.find((p) => p.slug === slug);
  const staticDetails = PRODUCT_DETAILS[slug as ProductSlug];

  if (staticProduct && staticDetails) {
    return (
      <Layout>
        <ProductDetail
          eyebrow={staticDetails.eyebrow}
          slug={staticProduct.slug}
          title={staticProduct.title}
          tagline={staticProduct.tagline}
          price={staticProduct.price}
          salePrice={staticProduct.salePrice}
          rating={staticProduct.rating}
          reviews={staticProduct.reviews}
          image={staticDetails.gallery[0]?.src ?? staticProduct.image}
          gallery={staticDetails.gallery}
          description={staticProduct.description}
          features={staticDetails.features}
          benefits={staticDetails.benefits}
          testimonials={staticDetails.testimonials}
          related={staticDetails.related}
        />
      </Layout>
    );
  }

  return <DynamicProductPage slug={slug} lang={lang} />;
}

function DynamicProductPage({ slug, lang }: { slug: string; lang: "en" | "ar" }) {
  const [product, setProduct] = useState<DynamicProduct | null | "loading">("loading");
  const [activeImg, setActiveImg] = useState<string>("");
  const [added, setAdded] = useState(false);

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

            {product.outOfStock ? (
              <div className="btn-ghost opacity-50 cursor-not-allowed w-full justify-center">نفد من المخزون</div>
            ) : (
              <Link to="/order" onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 2000); }}
                className="btn-primary w-full justify-center text-base">
                {added ? <><Check className="h-5 w-5" /> تم الإضافة</> : <><ShoppingCart className="h-5 w-5" /> اطلب الآن</>}
              </Link>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
