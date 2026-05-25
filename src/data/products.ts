import h2o1 from "@/assets/h2o-flosser-1.jpeg";
import h2o2 from "@/assets/h2o-flosser-2.jpeg";
import h2o3 from "@/assets/h2o-flosser-3.jpeg";
import h2o4 from "@/assets/h2o-flosser-4.jpeg";
import h2o5 from "@/assets/h2o-flosser-5.jpeg";
import ortho1 from "@/assets/ortho-kit-2.jpeg";
import ortho2 from "@/assets/ortho-kit-1.jpeg";
import ortho3 from "@/assets/ortho-kit-3.jpeg";
import ortho4 from "@/assets/ortho-kit-4.jpeg";
import electric1 from "@/assets/electric-brush-1.jpeg";
import electric2 from "@/assets/electric-brush-2.jpeg";
import electric3 from "@/assets/electric-brush-3.jpeg";
import electric4 from "@/assets/electric-brush-4.jpeg";
import electric5 from "@/assets/electric-brush-5.jpeg";
import electric6 from "@/assets/electric-brush-6.jpeg";
import waxNew1 from "@/assets/ortho-wax-main.jpeg";
import wax3 from "@/assets/ortho-wax-2.jpeg";
import wax4 from "@/assets/ortho-wax-3.jpeg";
import wax5 from "@/assets/ortho-wax-4.jpeg";
import lshaped1 from "@/assets/l-shaped-1.jpeg";
import lshaped2 from "@/assets/l-shaped-2.jpeg";
import lshaped3 from "@/assets/l-shaped-3.jpeg";
import lshaped4 from "@/assets/l-shaped-4.jpeg";
import lshaped5 from "@/assets/l-shaped-5.jpeg";
import type { L } from "@/lib/i18n";

export type ProductSlug =
  | "h2o-water-flosser"
  | "ortho-oral-kit"
  | "electrical-dental-brush"
  | "ortho-sheet"
  | "l-shaped-interdental-brush";

export type ColorOption = { id: string; label: L; hex: string };

export type Product = {
  slug: ProductSlug;
  title: string;
  tagline: L;
  description: L;
  price: number;
  /** Optional sale price — when set, this is the actual price charged. */
  salePrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: L;
  colors?: ColorOption[];
  bulkDeal?: { qty: number; price: number; label: L };
  /** True when the product is completely out of stock */
  outOfStock?: boolean;
  /** Color IDs that are currently out of stock */
  outOfStockColors?: string[];
};

export const ORTHO_KIT_COLORS: ColorOption[] = [
  { id: "purple", label: { en: "Purple", ar: "بنفسجي" }, hex: "#9B59B6" },
  { id: "pink", label: { en: "Pink", ar: "وردي" }, hex: "#E91E63" },
  { id: "blue", label: { en: "Blue", ar: "أزرق" }, hex: "#2196F3" },
  { id: "green", label: { en: "Green", ar: "أخضر" }, hex: "#4CAF50" },
  { id: "orange", label: { en: "Orange", ar: "برتقالي" }, hex: "#FF9800" },
];

export const ELECTRIC_BRUSH_COLORS: ColorOption[] = [
  { id: "pink", label: { en: "Pink", ar: "وردي" }, hex: "#F4C2C2" },
  { id: "white", label: { en: "White", ar: "أبيض" }, hex: "#F8F8F8" },
  { id: "black", label: { en: "Black", ar: "أسود" }, hex: "#1a1a1a" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "h2o-water-flosser",
    title: "H2O Water Flosser",
    tagline: {
      en: "Pressurized hydro-pulse cleaning that reaches where brushing can't.",
      ar: "تنظيف بضغط الماء يصل لأماكن لا تصلها الفرشاة.",
    },
    description: {
      en: "The H2O Water Flosser C102 is a powerful tool for thorough oral care. It uses pressurized water to clean deep between teeth and below the gumline, areas traditional brushing can't reach. The device features four pressure modes, including a pulse mode for gum massage. It comes with five interchangeable nozzles for different needs—regular cleaning, braces care, gum pocket cleaning, and tongue cleaning. With this flosser, you reduce plaque, promote healthier gums, and enjoy a fresher mouth. Perfect for daily use, it's a must-have addition to every household's dental routine.",
      ar: "H2O Water Flosser C102 أداة قوية للعناية الشاملة بالفم. يستخدم ضغط الماء لتنظيف ما بين الأسنان وأسفل خط اللثة، وهي مناطق لا تصلها الفرشاة التقليدية. يتميز الجهاز بأربعة أوضاع للضغط، من بينها وضع النبض لتدليك اللثة. يأتي مع خمسة رؤوس قابلة للتبديل لاحتياجات مختلفة — تنظيف يومي، رؤوس للتقويم، تنظيف جيوب اللثة، وتنظيف اللسان. مع هذا الجهاز تقلل البلاك، تعزز صحة اللثة، وتستمتع بفم أكثر انتعاشاً. مثالي للاستخدام اليومي، إضافة لا غنى عنها لكل روتين عناية بالأسنان.",
    },
    price: 1800,
    salePrice: 1650,
    image: h2o1,
    rating: 4.9,
    reviews: 2143,
    badge: { en: "Sale", ar: "عرض" },
  },
  {
    slug: "ortho-oral-kit",
    title: "Ortho Kit",
    tagline: {
      en: "All-in-one 8-piece daily set for braces & oral hygiene.",
      ar: "طقم متكامل من ٨ قطع للعناية اليومية بالتقويم والفم.",
    },
    description: {
      en: "The Ortho Kit is your all-in-one daily solution for maintaining braces and oral hygiene. This 8-piece set includes a specialized braces toothbrush, interdental brushes, orthodontic floss threaders, a dental mirror, a sand timer for proper brushing time, and other essential tools. Designed to keep your braces clean, reduce food buildup, and ensure fresh breath, the kit is packaged in a stylish, portable container. Perfect for everyday use, it's your ideal companion for a healthy smile throughout your orthodontic journey.",
      ar: "Ortho Kit هو حلك المتكامل للعناية اليومية بالتقويم وصحة الفم. يضم الطقم ٨ قطع تشمل فرشاة مخصصة للتقويم، فرش ما بين الأسنان، خيوط تنظيف للتقويم، مرآة أسنان، ساعة رملية لضبط وقت التنظيف، وأدوات أساسية أخرى. مصمم للحفاظ على نظافة التقويم، تقليل تراكم الطعام، وضمان نَفَس منعش، ومُغلَّف بعلبة أنيقة وسهلة الحمل. مثالي للاستخدام اليومي، رفيقك المثالي لرحلة تقويم صحية.",
    },
    price: 350,
    salePrice: 300,
    image: ortho1,
    rating: 4.8,
    reviews: 1284,
    badge: { en: "Sale", ar: "عرض" },
    colors: ORTHO_KIT_COLORS,
  },
  {
    slug: "electrical-dental-brush",
    title: "Electric Toothbrush",
    tagline: {
      en: "Sonic deep-clean technology for everyday brilliance.",
      ar: "تقنية تنظيف سونيك عميق لإشراقة يومية.",
    },
    description: {
      en: "The Electric Toothbrush from Smile Maker delivers an advanced clean with minimal effort. Featuring high-frequency sonic vibrations, it removes plaque more effectively than manual brushing. With multiple brushing modes—such as sensitive, clean, and whitening—you can personalize your oral care routine. The ergonomic design ensures comfort, while the built-in timer helps you brush for the dentist-recommended two minutes. With long-lasting battery life and a sleek, modern look, it's an essential tool for achieving a bright, healthy smile every day.",
      ar: "Electric Toothbrush من Smile Maker توفر تنظيفاً متقدماً بأقل مجهود. بفضل اهتزازات السونيك عالية التردد، تزيل البلاك بفعالية أكبر من الفرشاة اليدوية. بأوضاع تنظيف متعددة — حساس، تنظيف، وتبييض — تقدر تخصص روتين العناية بفمك. التصميم المريح يضمن راحة الاستخدام، والمؤقت المدمج يساعدك على التنظيف لمدة الدقيقتين الموصى بهما من الأطباء. ببطارية تدوم طويلاً وتصميم عصري أنيق، أداة لا غنى عنها لابتسامة مشرقة وصحية كل يوم.",
    },
    price: 650,
    salePrice: 500,
    image: electric1,
    rating: 4.7,
    reviews: 612,
    badge: { en: "Sale", ar: "عرض" },
    colors: ELECTRIC_BRUSH_COLORS,
  },
  {
    slug: "ortho-sheet",
    title: "Orthodontic Wax",
    tagline: {
      en: "Hypoallergenic wax for total comfort with braces.",
      ar: "شمع لا يسبب الحساسية لراحة كاملة مع التقويم.",
    },
    description: {
      en: "Our Orthodontic Wax is designed to provide comfort and relief for anyone wearing braces. Made from safe, hypoallergenic materials, this wax easily adheres to brackets or wires, creating a smooth barrier that prevents irritation to the cheeks, lips, and gums. It's easy to apply, transparent for a discreet look, and can be carried with you for on-the-go comfort.",
      ar: "شمع التقويم مصمم لتوفير الراحة لكل من يرتدي تقويم الأسنان. مصنوع من مواد آمنة لا تسبب الحساسية، يلتصق بسهولة على البراكتس أو الأسلاك ويخلق حاجزاً ناعماً يمنع تهيج الخدود والشفاه واللثة. سهل التطبيق، شفاف لمظهر طبيعي، ويمكن حمله معك للراحة في أي وقت.",
    },
    price: 50,
    image: waxNew1,
    rating: 4.8,
    reviews: 540,
    badge: { en: "5 for 200 EGP", ar: "٥ بـ ٢٠٠ جنيه" },
    bulkDeal: { qty: 5, price: 200, label: { en: "5 for 200 EGP", ar: "٥ قطع بـ ٢٠٠ جنيه" } },
  },
  {
    slug: "l-shaped-interdental-brush",
    title: "L-Shaped Interdental Brush",
    tagline: {
      en: "Reach every gap — gentle deep clean between teeth and braces.",
      ar: "وصول لكل المسافات — تنظيف عميق ولطيف بين الأسنان والتقويم.",
    },
    description: {
      en: "Our interdental brushes are specially designed to clean those hard-to-reach spaces between your teeth and around braces, implants, or dental bridges. With soft, durable bristles and a flexible wire, they gently remove plaque and food particles, promoting healthier gums and fresher breath. Available in multiple sizes, they fit comfortably into any gap, ensuring a deep, thorough clean as part of your daily oral care routine.",
      ar: "فرش ما بين الأسنان مصممة خصيصاً لتنظيف الأماكن التي يصعب الوصول إليها بين الأسنان وحول التقويم والزرعات وتركيبات الأسنان. بشعيرات ناعمة ومتينة وسلك مرن، تزيل البلاك وبقايا الطعام بلطف لتعزيز صحة اللثة وانتعاش النَفَس. متوفرة بمقاسات متعددة لتناسب أي مسافة، وتضمن تنظيفاً عميقاً وشاملاً كجزء من روتينك اليومي للعناية بالفم.",
    },
    price: 100,
    image: lshaped1,
    rating: 4.7,
    reviews: 318,
  },
];

/** H2O hero images (multiple) */
export const H2O_GALLERY = [h2o1, h2o2, h2o3, h2o4, h2o5];
export const ORTHO_KIT_GALLERY = [ortho1, ortho2, ortho3, ortho4];
export const ELECTRIC_BRUSH_GALLERY = [electric1, electric2, electric3, electric4, electric5, electric6];
export const WAX_GALLERY = [waxNew1, wax3, wax4, wax5];
export const LSHAPED_GALLERY = [lshaped1, lshaped2, lshaped3, lshaped4, lshaped5];

/** WhatsApp contact (international format, no +) */
const WHATSAPP_NUMBER = "201050852966";
export const whatsappLink = (message?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

export const getProduct = (slug: ProductSlug) => PRODUCTS.find((p) => p.slug === slug)!;
export const effectivePrice = (p: Product) => p.salePrice ?? p.price;

export const computeLineTotal = (p: Product, qty: number) => {
  if (p.bulkDeal && qty >= p.bulkDeal.qty) {
    const groups = Math.floor(qty / p.bulkDeal.qty);
    const remainder = qty % p.bulkDeal.qty;
    return groups * p.bulkDeal.price + remainder * effectivePrice(p);
  }
  return effectivePrice(p) * qty;
};

export type Bundle = { id: string; title: L; tagline: L; items: ProductSlug[]; discountPct: number };

export const BUNDLES: Bundle[] = [
  {
    id: "ortho-care-smile",
    title: { en: "Ortho Care Smile Bundle", ar: "باقة Ortho Care Smile" },
    tagline: {
      en: "H2O Water Flosser + Ortho Kit — the complete clinic-at-home.",
      ar: "H2O Water Flosser + Ortho Kit — عيادة كاملة في منزلك.",
    },
    items: ["h2o-water-flosser", "ortho-oral-kit"],
    discountPct: 10,
  },
  {
    id: "daily-care",
    title: { en: "Daily Care Bundle", ar: "باقة Daily Care" },
    tagline: {
      en: "Electric Toothbrush + H2O Water Flosser — your daily power duo.",
      ar: "Electric Toothbrush + H2O Water Flosser — ثنائي قوتك اليومية.",
    },
    items: ["electrical-dental-brush", "h2o-water-flosser"],
    discountPct: 10,
  },
  {
    id: "braces-comfort",
    title: { en: "Braces Comfort Bundle", ar: "باقة Braces Comfort" },
    tagline: {
      en: "Orthodontic Wax + Ortho Kit + L-Shaped Interdental Brush — everyday braces care.",
      ar: "Orthodontic Wax + Ortho Kit + L-Shaped Interdental Brush — عناية يومية شاملة للتقويم.",
    },
    items: ["ortho-sheet", "ortho-oral-kit", "l-shaped-interdental-brush"],
    discountPct: 10,
  },
];

export type ShippingZone = { id: string; label: L; fee: number };

export const SHIPPING_ZONES: ShippingZone[] = [
  { id: "cairo", label: { en: "Cairo", ar: "القاهرة" }, fee: 65 },
  { id: "giza", label: { en: "Giza", ar: "الجيزة" }, fee: 65 },
  { id: "alexandria", label: { en: "Alexandria", ar: "الإسكندرية" }, fee: 80 },
  { id: "delta", label: { en: "Delta cities", ar: "مدن الدلتا" }, fee: 90 },
  { id: "canal", label: { en: "Canal cities", ar: "مدن القناة" }, fee: 90 },
  { id: "other", label: { en: "Other governorates", ar: "محافظات أخرى" }, fee: 100 },
];

export type PromoCode = { code: string; pct: number; label: L };

export const PROMO_CODES: PromoCode[] = [
  { code: "SMILE10", pct: 10, label: { en: "10% off your order", ar: "خصم ١٠٪ على طلبك" } },
  { code: "WELCOME5", pct: 5, label: { en: "5% off — first order", ar: "خصم ٥٪ — لأول طلب" } },
  { code: "SHINE15", pct: 15, label: { en: "15% off — limited time", ar: "خصم ١٥٪ — لفترة محدودة" } },
];

export const formatEGP = (amount: number, lang: "en" | "ar" = "en") =>
  lang === "ar"
    ? `${amount.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} جنيه`
    : `${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })} EGP`;
