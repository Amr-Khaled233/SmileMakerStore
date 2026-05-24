import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { ELECTRIC_BRUSH_GALLERY, ORTHO_KIT_GALLERY, H2O_GALLERY } from "@/data/products";

export const Route = createFileRoute("/products/electrical-dental-brush")({
  component: () => (
    <Layout>
      <ProductDetail
        eyebrow={{ en: "Daily ritual", ar: "طقس يومي" }}
        slug="electrical-dental-brush"
        title="Electric Toothbrush"
        tagline={{ en: "Advanced sonic clean with minimal effort.", ar: "تنظيف سونيك متقدم بأقل مجهود." }}
        price={650}
        salePrice={500}
        rating={4.7}
        reviews={612}
        image={ELECTRIC_BRUSH_GALLERY[0]}
        gallery={[
          { src: ELECTRIC_BRUSH_GALLERY[0], alt: "Electric Toothbrush colors" },
          { src: ELECTRIC_BRUSH_GALLERY[1], alt: "Features overview" },
          { src: ELECTRIC_BRUSH_GALLERY[2], alt: "IPX7 waterproof" },
          { src: ELECTRIC_BRUSH_GALLERY[3], alt: "6 cleaning modes" },
          { src: ELECTRIC_BRUSH_GALLERY[4], alt: "Smart timer" },
          { src: ELECTRIC_BRUSH_GALLERY[5], alt: "Charging base" },
        ]}
        description={{
          en: "The Electric Toothbrush from Smile Maker delivers an advanced clean with minimal effort. Featuring high-frequency sonic vibrations, it removes plaque more effectively than manual brushing. With multiple brushing modes—such as sensitive, clean, and whitening—you can personalize your oral care routine. The ergonomic design ensures comfort, while the built-in timer helps you brush for the dentist-recommended two minutes. With long-lasting battery life and a sleek, modern look, it's an essential tool for achieving a bright, healthy smile every day.",
          ar: "Electric Toothbrush من Smile Maker توفر تنظيفاً متقدماً بأقل مجهود. بفضل اهتزازات السونيك عالية التردد، تزيل البلاك بفعالية أكبر من الفرشاة اليدوية. بأوضاع تنظيف متعددة — حساس، تنظيف، وتبييض — تقدر تخصص روتين العناية بفمك. التصميم المريح يضمن راحة الاستخدام، والمؤقت المدمج يساعدك على التنظيف لمدة الدقيقتين الموصى بهما من الأطباء. ببطارية تدوم طويلاً وتصميم عصري أنيق، أداة لا غنى عنها لابتسامة مشرقة وصحية كل يوم.",
        }}
        features={[
          { en: "High-frequency sonic vibrations", ar: "اهتزازات سونيك عالية التردد" },
          { en: "6 brushing modes", ar: "٦ أوضاع تنظيف" },
          { en: "Built-in 2-minute timer", ar: "مؤقت دقيقتين مدمج" },
          { en: "IPX7 waterproof", ar: "مقاوم للماء IPX7" },
          { en: "Long-lasting battery", ar: "بطارية تدوم طويلاً" },
          { en: "Ergonomic non-slip grip", ar: "مقبض مريح غير زلق" },
        ]}
        benefits={[
          { icon: "shield", title: { en: "Superior Clean", ar: "تنظيف فائق" }, text: { en: "Sonic vibrations remove up to 10× more plaque.", ar: "الاهتزازات السونيك تزيل بلاكاً أكثر بـ١٠ مرات." } },
          { icon: "sparkle", title: { en: "Smart Timer", ar: "مؤقت ذكي" }, text: { en: "Stops at 2 minutes — dentist-recommended.", ar: "يتوقف عند دقيقتين — موصى به طبياً." } },
          { icon: "zap", title: { en: "Versatile Modes", ar: "أوضاع متعددة" }, text: { en: "Switch between clean, white, gum, and more.", ar: "تنقل بين تنظيف، تبييض، لثة وأكثر." } },
        ]}
        testimonials={[
          { name: "Omar S.", quote: { en: "My teeth have never felt this clean.", ar: "أسناني لم تكن نظيفة هكذا من قبل." } },
          { name: "Lina K.", quote: { en: "Quiet motor and long battery — perfect.", ar: "محرك هادئ وبطارية طويلة — مثالي." } },
          { name: "Ahmed R.", quote: { en: "6 modes for the whole family.", ar: "٦ أوضاع للعائلة كلها." } },
        ]}
        related={[
          { to: "/products/h2o-water-flosser", title: "H2O Water Flosser", price: 1800, salePrice: 1650, image: H2O_GALLERY[0] },
          { to: "/products/ortho-oral-kit", title: "Ortho Kit", price: 350, salePrice: 300, image: ORTHO_KIT_GALLERY[0] },
        ]}
      />
    </Layout>
  ),
});
