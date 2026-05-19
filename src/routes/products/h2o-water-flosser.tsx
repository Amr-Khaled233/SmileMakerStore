import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { H2O_GALLERY, ORTHO_KIT_GALLERY, ELECTRIC_BRUSH_GALLERY } from "@/data/products";

export const Route = createFileRoute("/products/h2o-water-flosser")({
  head: () => ({
    meta: [
      { title: "H2O Water Flosser — Smile Maker" },
      { name: "description", content: "H2O Water Flosser C102 — pressurized hydro-pulse cleaning with 4 modes and 5 nozzles." },
      { property: "og:title", content: "H2O Water Flosser by Smile Maker" },
      { property: "og:description", content: "Pressurized hydro-pulse cleaning that reaches where brushing can't." },
      { property: "og:image", content: H2O_GALLERY[0] },
      { name: "twitter:image", content: H2O_GALLERY[0] },
    ],
  }),
  component: () => (
    <Layout>
      <ProductDetail
        eyebrow={{ en: "Sale · H2O Series", ar: "عرض · سلسلة H2O" }}
        title="H2O Water Flosser"
        tagline={{
          en: "Pressurized hydro-pulse cleaning that reaches where brushing can't.",
          ar: "تنظيف بضغط الماء يصل لأماكن لا تصلها الفرشاة.",
        }}
        price={1800}
        salePrice={1650}
        rating={4.9}
        reviews={2143}
        image={H2O_GALLERY[0]}
        gallery={[
          { src: H2O_GALLERY[0], alt: "H2O Flosser" },
          { src: H2O_GALLERY[1], alt: "Box & accessories" },
          { src: H2O_GALLERY[2], alt: "Replacement tips" },
          { src: H2O_GALLERY[3], alt: "Device features" },
        ]}
        description={{
          en: "The H2O Water Flosser C102 is a powerful tool for thorough oral care. It uses pressurized water to clean deep between teeth and below the gumline, areas traditional brushing can't reach. The device features four pressure modes, including a pulse mode for gum massage. It comes with five interchangeable nozzles for different needs—regular cleaning, braces care, gum pocket cleaning, and tongue cleaning. With this flosser, you reduce plaque, promote healthier gums, and enjoy a fresher mouth. Perfect for daily use, it's a must-have addition to every household's dental routine.",
          ar: "H2O Water Flosser C102 أداة قوية للعناية الشاملة بالفم. يستخدم ضغط الماء لتنظيف ما بين الأسنان وأسفل خط اللثة، وهي مناطق لا تصلها الفرشاة التقليدية. يتميز الجهاز بأربعة أوضاع للضغط، من بينها وضع النبض لتدليك اللثة. يأتي مع خمسة رؤوس قابلة للتبديل لاحتياجات مختلفة — تنظيف يومي، رؤوس للتقويم، تنظيف جيوب اللثة، وتنظيف اللسان. مع هذا الجهاز تقلل البلاك، تعزز صحة اللثة، وتستمتع بفم أكثر انتعاشاً. مثالي للاستخدام اليومي، إضافة لا غنى عنها لكل روتين عناية بالأسنان.",
        }}
        features={[
          { en: "4 pressure modes (incl. pulse)", ar: "٤ أوضاع للضغط (تشمل النبض)" },
          { en: "5 interchangeable nozzles", ar: "٥ رؤوس قابلة للتبديل" },
          { en: "Powerful 2000mAh battery", ar: "بطارية قوية ٢٠٠٠mAh" },
          { en: "300ml water tank", ar: "خزان مياه ٣٠٠ مل" },
          { en: "USB-C charging — up to 30 days", ar: "شحن USB-C — حتى ٣٠ يوماً" },
          { en: "IPX7 waterproof", ar: "مقاوم للماء IPX7" },
        ]}
        benefits={[
          {
            icon: "zap",
            title: { en: "Hydro-Pulse Power", ar: "قوة النبض المائي" },
            text: { en: "Pressurized water loosens plaque between teeth and below the gumline.", ar: "ضغط الماء يزيل البلاك بين الأسنان وأسفل خط اللثة." },
          },
          {
            icon: "shield",
            title: { en: "Gum-Safe", ar: "آمن على اللثة" },
            text: { en: "Pulse mode massages and stimulates gums for healthier circulation.", ar: "وضع النبض يدلك اللثة ويحفز الدورة الدموية لصحة أفضل." },
          },
          {
            icon: "sparkle",
            title: { en: "Fresher Mouth", ar: "فم أكثر انتعاشاً" },
            text: { en: "Reaches braces, crowns, and tight spots a brush can't.", ar: "يصل للتقويم والتركيبات والأماكن الضيقة التي لا تصلها الفرشاة." },
          },
        ]}
        testimonials={[
          { name: "Amelia R.", quote: { en: "Switched from string floss and never going back. My hygienist asked what I changed.", ar: "انتقلت من الخيط العادي ولن أعود أبداً. طبيبة الأسنان لاحظت الفرق." } },
          { name: "Daniel K.", quote: { en: "Sleek enough to leave on the counter. The battery genuinely lasts a month.", ar: "أنيق بما يكفي ليبقى على الرف. البطارية فعلاً تدوم شهر." } },
          { name: "Sofia L.", quote: { en: "Gentle but powerful. My braces have never felt cleaner.", ar: "لطيف لكنه قوي. تقويمي لم يكن نظيفاً هكذا من قبل." } },
        ]}
        related={[
          { to: "/products/ortho-oral-kit", title: "Ortho Kit", price: 350, salePrice: 300, image: ORTHO_KIT_GALLERY[0] },
          { to: "/products/electrical-dental-brush", title: "Electric Toothbrush", price: 650, salePrice: 500, image: ELECTRIC_BRUSH_GALLERY[0] },
        ]}
      />
    </Layout>
  ),
});
