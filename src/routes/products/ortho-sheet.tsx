import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { WAX_GALLERY, H2O_GALLERY, ORTHO_KIT_GALLERY } from "@/data/products";

export const Route = createFileRoute("/products/ortho-sheet")({
  component: () => (
    <Layout>
      <ProductDetail
        eyebrow={{ en: "Orthodontic comfort", ar: "راحة التقويم" }}
        slug="ortho-sheet"
        title="Orthodontic Wax"
        tagline={{ en: "Hypoallergenic comfort wax for anyone wearing braces.", ar: "شمع لا يسبب الحساسية لراحة كل من يرتدي تقويماً." }}
        price={50}
        rating={4.8}
        reviews={540}
        image={WAX_GALLERY[0]}
        gallery={[
          { src: WAX_GALLERY[0], alt: "Orthodontic Wax" },
          { src: WAX_GALLERY[1], alt: "5 strips per case" },
          { src: WAX_GALLERY[2], alt: "Wax cases" },
          { src: WAX_GALLERY[3], alt: "Color assortment" },
        ]}
        description={{
          en: "Our Orthodontic Wax is designed to provide comfort and relief for anyone wearing braces. Made from safe, hypoallergenic materials, this wax easily adheres to brackets or wires, creating a smooth barrier that prevents irritation to the cheeks, lips, and gums. It's easy to apply, transparent for a discreet look, and can be carried with you for on-the-go comfort.",
          ar: "شمع التقويم مصمم لتوفير الراحة لكل من يرتدي تقويم الأسنان. مصنوع من مواد آمنة لا تسبب الحساسية، يلتصق بسهولة على البراكتس أو الأسلاك ويخلق حاجزاً ناعماً يمنع تهيج الخدود والشفاه واللثة. سهل التطبيق وشفاف، ويمكن حمله معك للراحة في أي وقت.",
        }}
        features={[
          { en: "5 strips per case", ar: "٥ شرائح في كل علبة" },
          { en: "Hypoallergenic & safe", ar: "آمن ولا يسبب الحساسية" },
          { en: "Easy to apply on brackets & wires", ar: "سهل التطبيق على البراكتس والأسلاك" },
          { en: "Discreet, transparent finish", ar: "مظهر شفاف غير ملحوظ" },
          { en: "Pocket-sized", ar: "حجم الجيب" },
        ]}
        benefits={[
          { icon: "shield", title: { en: "Gentle on Gums", ar: "لطيف على اللثة" }, text: { en: "A smooth barrier that prevents irritation.", ar: "حاجز ناعم يمنع التهيج." } },
          { icon: "sparkle", title: { en: "Discreet", ar: "غير ملحوظ" }, text: { en: "Transparent finish blends with your braces.", ar: "تشطيب شفاف يندمج مع التقويم." } },
          { icon: "zap", title: { en: "Instant Relief", ar: "راحة فورية" }, text: { en: "Apply in seconds — comfort wherever you go.", ar: "يُطبَّق في ثوان — راحة أينما كنت." } },
        ]}
        testimonials={[
          { name: "Salma E.", quote: { en: "Lifesaver for my new braces.", ar: "منقذ حقيقي لتقويمي الجديد." } },
          { name: "Mark D.", quote: { en: "Tiny case fits in any pocket.", ar: "علبة صغيرة تناسب أي جيب." } },
          { name: "Reem H.", quote: { en: "No more cuts on my cheeks.", ar: "لا مزيد من جروح الخدود." } },
        ]}
        related={[
          { to: "/products/ortho-oral-kit", title: "Ortho Kit", price: 350, salePrice: 300, image: ORTHO_KIT_GALLERY[0] },
          { to: "/products/h2o-water-flosser", title: "H2O Water Flosser", price: 1800, salePrice: 1650, image: H2O_GALLERY[0] },
        ]}
      />
    </Layout>
  ),
});
