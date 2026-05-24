import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ProductDetail } from "@/components/site/ProductDetail";
import { ORTHO_KIT_GALLERY, H2O_GALLERY, LSHAPED_GALLERY } from "@/data/products";

export const Route = createFileRoute("/products/ortho-oral-kit")({
  component: () => (
    <Layout>
      <ProductDetail
        eyebrow={{ en: "Ortho Series", ar: "سلسلة Ortho" }}
        slug="ortho-oral-kit"
        title="Ortho Kit"
        tagline={{
          en: "All-in-one 8-piece daily set for braces & oral hygiene.",
          ar: "طقم متكامل من ٨ قطع للعناية اليومية بالتقويم والفم.",
        }}
        price={350}
        salePrice={300}
        rating={4.8}
        reviews={1284}
        image={ORTHO_KIT_GALLERY[0]}
        gallery={[
          { src: ORTHO_KIT_GALLERY[0], alt: "Ortho Kit — 5 colors" },
          { src: ORTHO_KIT_GALLERY[1], alt: "Ortho Kit complete set" },
          { src: ORTHO_KIT_GALLERY[2], alt: "Ortho Kit contents" },
          { src: ORTHO_KIT_GALLERY[3], alt: "Ortho Kit portable case" },
        ]}
        description={{
          en: "The Ortho Kit is your all-in-one daily solution for maintaining braces and oral hygiene. This 8-piece set includes a specialized braces toothbrush, interdental brushes, orthodontic floss threaders, a dental mirror, a sand timer for proper brushing time, and other essential tools. Designed to keep your braces clean, reduce food buildup, and ensure fresh breath, the kit is packaged in a stylish, portable container. Perfect for everyday use, it's your ideal companion for a healthy smile throughout your orthodontic journey.",
          ar: "Ortho Kit هو حلك المتكامل للعناية اليومية بالتقويم وصحة الفم. يضم الطقم ٨ قطع تشمل فرشاة مخصصة للتقويم، فرش ما بين الأسنان، خيوط تنظيف للتقويم، مرآة أسنان، ساعة رملية لضبط وقت التنظيف، وأدوات أساسية أخرى. مصمم للحفاظ على نظافة التقويم، تقليل تراكم الطعام، وضمان نَفَس منعش، ومُغلَّف بعلبة أنيقة وسهلة الحمل. مثالي للاستخدام اليومي، رفيقك المثالي لرحلة تقويم صحية.",
        }}
        features={[
          { en: "8-piece complete set", ar: "طقم متكامل من ٨ قطع" },
          { en: "Specialized braces toothbrush", ar: "فرشاة مخصصة للتقويم" },
          { en: "Interdental brushes", ar: "فرش ما بين الأسنان" },
          { en: "Orthodontic floss threaders", ar: "خيوط تنظيف للتقويم" },
          { en: "Dental mirror & sand timer", ar: "مرآة أسنان وساعة رملية" },
          { en: "Stylish portable container", ar: "علبة أنيقة وسهلة الحمل" },
        ]}
        benefits={[
          { icon: "shield", title: { en: "Braces-Friendly", ar: "متوافق مع التقويم" }, text: { en: "Every tool chosen to keep braces clean and food-free.", ar: "كل أداة مختارة للحفاظ على نظافة التقويم." } },
          { icon: "sparkle", title: { en: "Fresh Daily", ar: "انتعاش يومي" }, text: { en: "Reduces buildup and keeps your breath fresh.", ar: "يقلل التراكمات ويحافظ على نَفَس منعش." } },
          { icon: "zap", title: { en: "On-the-Go", ar: "للاستخدام في أي مكان" }, text: { en: "Portable case so your routine travels with you.", ar: "علبة محمولة ليبقى روتينك معك أينما ذهبت." } },
        ]}
        testimonials={[
          { name: "Sara A.", quote: { en: "Everything I need in one kit — love the colors.", ar: "كل اللي أحتاجه في طقم واحد — أحب الألوان." } },
          { name: "Khalid M.", quote: { en: "The sand timer is genius for braces cleaning.", ar: "الساعة الرملية فكرة عبقرية لتنظيف التقويم." } },
          { name: "Nour F.", quote: { en: "My orthodontist recommended it and I'm glad I got it.", ar: "طبيبي نصحني به وأنا سعيدة جداً بالشراء." } },
        ]}
        related={[
          { to: "/products/h2o-water-flosser", title: "H2O Water Flosser", price: 1800, salePrice: 1650, image: H2O_GALLERY[0] },
          { to: "/products/l-shaped-interdental-brush", title: "L-Shaped Interdental Brush", price: 100, image: LSHAPED_GALLERY[0] },
        ]}
      />
    </Layout>
  ),
});
