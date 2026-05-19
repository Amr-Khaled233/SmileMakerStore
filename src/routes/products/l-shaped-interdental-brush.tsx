import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { LSHAPED_GALLERY, ORTHO_KIT_GALLERY, H2O_GALLERY } from "@/data/products";
import wax from "@/assets/ortho-wax-main.jpeg";

export const Route = createFileRoute("/products/l-shaped-interdental-brush")({
  component: () => (
    <Layout>
      <ProductDetail
        eyebrow={{ en: "Daily braces care", ar: "عناية يومية بالتقويم" }}
        title="L-Shaped Interdental Brush"
        tagline={{
          en: "Soft, flexible bristles for every hard-to-reach gap.",
          ar: "شعيرات ناعمة ومرنة لكل مسافة يصعب الوصول إليها.",
        }}
        price={100}
        rating={4.7}
        reviews={318}
        image={LSHAPED_GALLERY[0]}
        gallery={[
          { src: LSHAPED_GALLERY[0], alt: "L-Shaped brushes — yellow & purple" },
          { src: LSHAPED_GALLERY[1], alt: "Available colors" },
          { src: LSHAPED_GALLERY[2], alt: "Cleaning around braces" },
          { src: LSHAPED_GALLERY[3], alt: "Interdental cleaning" },
          { src: LSHAPED_GALLERY[4], alt: "Gentle on gums" },
        ]}
        description={{
          en: "Our interdental brushes are specially designed to clean those hard-to-reach spaces between your teeth and around braces, implants, or dental bridges. With soft, durable bristles and a flexible wire, they gently remove plaque and food particles, promoting healthier gums and fresher breath. Available in multiple sizes, they fit comfortably into any gap, ensuring a deep, thorough clean as part of your daily oral care routine.",
          ar: "فرش ما بين الأسنان مصممة خصيصاً لتنظيف الأماكن التي يصعب الوصول إليها بين الأسنان وحول التقويم والزرعات وتركيبات الأسنان. بشعيرات ناعمة ومتينة وسلك مرن، تزيل البلاك وبقايا الطعام بلطف لتعزيز صحة اللثة وانتعاش النَفَس. متوفرة بمقاسات متعددة لتناسب أي مسافة، وتضمن تنظيفاً عميقاً وشاملاً كجزء من روتينك اليومي للعناية بالفم.",
        }}
        features={[
          { en: "5 brushes per pack", ar: "٥ فرش في العبوة" },
          { en: "L-shaped easy-reach design", ar: "تصميم L سهل الوصول" },
          { en: "Soft, durable bristles", ar: "شعيرات ناعمة ومتينة" },
          { en: "Flexible wire core", ar: "سلك داخلي مرن" },
          { en: "Safe for braces & implants", ar: "آمن للتقويم والزرعات" },
          { en: "Multiple sizes available", ar: "مقاسات متعددة" },
        ]}
        benefits={[
          { icon: "shield", title: { en: "Gum-Friendly", ar: "لطيف على اللثة" }, text: { en: "Soft bristles clean without irritation.", ar: "شعيرات ناعمة تنظف دون تهيج." } },
          { icon: "sparkle", title: { en: "Fresher Breath", ar: "نَفَس أكثر انتعاشاً" }, text: { en: "Removes plaque and food trapped between teeth.", ar: "يزيل البلاك وبقايا الطعام بين الأسنان." } },
          { icon: "zap", title: { en: "Easy Reach", ar: "وصول سهل" }, text: { en: "L-shape angle reaches braces and back teeth.", ar: "زاوية L تصل للتقويم والأسنان الخلفية." } },
        ]}
        testimonials={[
          { name: "Yara M.", quote: { en: "Finally a brush that fits around my braces.", ar: "أخيراً فرشاة تناسب تقويمي." } },
          { name: "Hassan T.", quote: { en: "My gums feel healthier within a week.", ar: "لثتي صارت أكثر صحة خلال أسبوع." } },
          { name: "Dina F.", quote: { en: "Soft yet effective — exactly what I needed.", ar: "ناعمة لكن فعّالة — تماماً ما كنت أحتاجه." } },
        ]}
        related={[
          { to: "/products/ortho-oral-kit", title: "Ortho Kit", price: 350, salePrice: 300, image: ORTHO_KIT_GALLERY[0] },
          { to: "/products/h2o-water-flosser", title: "H2O Water Flosser", price: 1800, salePrice: 1650, image: H2O_GALLERY[0] },
          { to: "/products/ortho-sheet", title: "Orthodontic Wax", price: 50, image: wax },
        ]}
      />
    </Layout>
  ),
});