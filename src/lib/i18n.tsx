import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";
export type L = { en: string; ar: string };

type Dict = Record<string, L>;

export const DICT = {
  // Nav
  "nav.home": { en: "Home", ar: "الرئيسية" },
  "nav.products": { en: "Products", ar: "المنتجات" },
  "nav.order": { en: "Order", ar: "اطلب الآن" },
  "nav.about": { en: "About", ar: "من نحن" },
  "nav.contact": { en: "Contact", ar: "تواصل معنا" },
  "nav.orderNow": { en: "Order Now", ar: "اطلب الآن" },
  "nav.lang": { en: "العربية", ar: "English" },

  // Footer
  "footer.tagline": {
    en: "Beauty devices for a brighter smile. Engineered with medical precision and luxury craftsmanship for confidence that lasts.",
    ar: "أجهزة جمال لابتسامة أكثر إشراقاً. مصممة بدقة طبية وحرفية فاخرة لثقة تدوم.",
  },
  "footer.explore": { en: "Explore", ar: "استكشف" },
  "footer.connect": { en: "Connect", ar: "تابعنا" },
  "footer.email": { en: "your@email.com", ar: "بريدك الإلكتروني" },
  "footer.join": { en: "Join", ar: "اشترك" },
  "footer.rights": { en: "Beauty Devices For A Brighter Smile.", ar: "أجهزة جمال لابتسامة أكثر إشراقاً." },
  "footer.crafted": { en: "Crafted with precision in Egypt.", ar: "صُنع بدقة في مصر." },

  // Common buttons
  "btn.shopNow": { en: "Shop Now", ar: "تسوق الآن" },
  "btn.learnMore": { en: "Learn More", ar: "اعرف المزيد" },
  "btn.viewDetails": { en: "View Details", ar: "عرض التفاصيل" },
  "btn.view": { en: "View", ar: "عرض" },
  "btn.contactUs": { en: "Contact Us", ar: "تواصل معنا" },
  "btn.readMore": { en: "Read More", ar: "اقرأ المزيد" },
  "btn.browseAll": { en: "Browse all", ar: "تصفح الكل" },
  "btn.orderBundle": { en: "Order Bundle", ar: "اطلب الباقة" },
  "btn.orderNow": { en: "Order Now", ar: "اطلب الآن" },
  "btn.talkToUs": { en: "Talk to us", ar: "تواصل معنا" },

  // Contact
  "contact.eyebrow": { en: "Contact", ar: "تواصل" },
  "contact.h1.a": { en: "Let's talk", ar: "لنتحدث عن" },
  "contact.h1.b": { en: "smiles", ar: "الابتسامات" },
  "contact.lead": {
    en: "Questions about a device, an order, or a collaboration — our team replies within one business day.",
    ar: "أسئلة عن جهاز، طلب، أو شراكة — فريقنا يرد خلال يوم عمل واحد.",
  },
  "contact.phone": { en: "Phone", ar: "الهاتف" },
  "contact.email": { en: "Email", ar: "البريد الإلكتروني" },
  "contact.address": { en: "Address", ar: "العنوان" },
  "contact.follow": { en: "Follow us", ar: "تابعنا" },
  "contact.visit": { en: "Visit us", ar: "زرنا" },
  "contact.openMaps": { en: "Open in Maps", ar: "افتح الخريطة" },
  "contact.addressValue": { en: "242 / 15 St., Cairo, Egypt", ar: "شارع 242 / 15، القاهرة، مصر" },

  // Order
  "order.eyebrow": { en: "Order", ar: "اطلب" },
  "order.h1.a": { en: "Build your", ar: "كوّن" },
  "order.h1.b": { en: "smile kit", ar: "كيت ابتسامتك" },
  "order.lead": {
    en: "Choose your devices, add a promo code, and we'll calculate shipping based on your governorate.",
    ar: "اختر منتجاتك، أضف كود الخصم، وسنحسب الشحن حسب محافظتك.",
  },
  "order.choose": { en: "Choose products", ar: "اختر المنتجات" },
  "order.delivery": { en: "Delivery details", ar: "بيانات التوصيل" },
  "order.summary": { en: "Order summary", ar: "ملخص الطلب" },
  "order.empty": { en: "Your order is empty. Add a product to get started.", ar: "طلبك فارغ. أضف منتجاً للبدء." },
  "order.emptyError": { en: "Please add at least one product to your order", ar: "من فضلك أضف منتجاً واحداً على الأقل" },
  "order.fullName": { en: "Full name", ar: "الاسم بالكامل" },
  "order.phone": { en: "Phone number", ar: "رقم الهاتف" },
  "order.emailOpt": { en: "Email (optional)", ar: "البريد الإلكتروني (اختياري)" },
  "order.governorate": { en: "Governorate (shipping zone)", ar: "المحافظة (منطقة الشحن)" },
  "order.city": { en: "City", ar: "المدينة" },
  "order.address": { en: "Street address", ar: "عنوان الشارع" },
  "order.notes": { en: "Order notes (optional)", ar: "ملاحظات الطلب (اختياري)" },
  "order.notesPlaceholder": {
    en: "Apartment number, landmark, preferred delivery time...",
    ar: "رقم الشقة، علامة مميزة، وقت التوصيل المفضل...",
  },
  "order.placeOrder": { en: "Place order", ar: "تأكيد الطلب" },
  "order.subtotal": { en: "Subtotal", ar: "المجموع الفرعي" },
  "order.bundleDiscount": { en: "Bundle discount", ar: "خصم الباقة" },
  "order.shipping": { en: "Shipping", ar: "الشحن" },
  "order.total": { en: "Total", ar: "الإجمالي" },
  "order.promo": { en: "Promo code", ar: "كود الخصم" },
  "order.apply": { en: "Apply", ar: "تطبيق" },
  "order.availableCodes": { en: "Available codes — tap to apply:", ar: "الأكواد المتاحة — اضغط للتطبيق:" },
  "order.color": { en: "Color", ar: "اللون" },
  "order.deal5": { en: "5 for 200 EGP — auto deal", ar: "٥ قطع بـ ٢٠٠ جنيه — عرض تلقائي" },
  "order.confirmed": { en: "Order confirmed", ar: "تم تأكيد الطلب" },
  "order.thankYou": { en: "Thank you,", ar: "شكراً لك،" },
  "order.thankYouRest": {
    en: ". We've received your order and our team will reach out shortly to confirm delivery.",
    ar: ". تم استلام طلبك وسيتواصل معك فريقنا قريباً لتأكيد التوصيل.",
  },
  "order.receipt": { en: "Receipt", ar: "إيصال" },
  "order.customer": { en: "Customer", ar: "العميل" },
  "order.shippingTo": { en: "Shipping to", ar: "الشحن إلى" },
  "order.placeAnother": { en: "Place another order", ar: "اطلب مرة أخرى" },
  "order.backProducts": { en: "Back to products", ar: "العودة للمنتجات" },
  "order.enterPromo": { en: "Enter a promo code", ar: "أدخل كود الخصم" },
  "order.invalidPromo": { en: "Invalid promo code", ar: "كود خصم غير صحيح" },
  "order.off": { en: "off", ar: "خصم" },
  "order.shippingAtCheckout": { en: "shipping at checkout", ar: "الشحن يحسب عند الطلب" },
  "order.namePlaceholder": { en: "Mariam Ahmed", ar: "مريم أحمد" },
  "order.addressPlaceholder": { en: "242 / 15 St., Building no...", ar: "شارع 242 / 15، مبنى رقم..." },
  "order.cityPlaceholder": { en: "Cairo", ar: "القاهرة" },
  "order.bundleApplied": { en: "Bundle applied", ar: "تم تطبيق الباقة" },

  // Hero (home)
  "home.heroBadge": { en: "Beauty Devices · Oral Care · Confidence", ar: "أجهزة جمال · العناية بالفم · ثقة" },
  "home.heroTitle.a": { en: "Advanced beauty devices for a", ar: "أجهزة جمال متطورة لأجل" },
  "home.heroTitle.b": { en: "brighter smile", ar: "ابتسامة أكثر إشراقاً" },
  "home.heroLead": {
    en: "Medical-grade precision. Beauty-tech design. Smile Maker is the new standard for at-home oral care — engineered for visible results and made to live on your countertop.",
    ar: "دقة طبية. تصميم تقني فاخر. سمايل ميكر هو المعيار الجديد للعناية بالفم في المنزل — مصمم لنتائج مرئية وليكون قطعة فنية على رف حمامك.",
  },
  "home.reviews": { en: "4.9 · 12,400+ verified reviews", ar: "٤٫٩ · أكثر من ١٢,٤٠٠ تقييم موثّق" },
  "home.whiterIn": { en: "Whiter in", ar: "إشراق خلال" },
  "home.days": { en: "14 days", ar: "١٤ يوم" },
  "home.clinical": { en: "clinically verified", ar: "موثّق سريرياً" },
  "home.about.eyebrow": { en: "About Smile Maker", ar: "عن سمايل ميكر" },
  "home.about.h.a": { en: "A confident smile,", ar: "ابتسامة واثقة،" },
  "home.about.h.b": { en: "crafted daily", ar: "تُصنع يومياً" },
  "home.about.p1": {
    en: "We design oral care that feels less like a chore and more like a ritual. From hydro-pulse flossers to LED whitening wands, every Smile Maker device blends clinical performance with the considered beauty of fine objects.",
    ar: "نصمم منتجات للعناية بالفم تشعرك بأنها طقس يومي ممتع لا واجب. من أجهزة الفلوس المائي إلى أقلام التبييض LED، يجمع كل جهاز من سمايل ميكر بين الأداء السريري وجمال القطع الفاخرة.",
  },
  "home.about.p2": {
    en: "Our mission is simple — to make innovative oral hygiene accessible, elegant, and effective for everyone, everywhere.",
    ar: "مهمتنا بسيطة — جعل العناية المبتكرة بصحة الفم متاحة وأنيقة وفعّالة للجميع، في كل مكان.",
  },
  "home.stats.smiles": { en: "Happy smiles", ar: "ابتسامات سعيدة" },
  "home.stats.rating": { en: "Average rating", ar: "متوسط التقييم" },
  "home.featured.eyebrow": { en: "Featured", ar: "مميز" },
  "home.featured.h": { en: "The collection.", ar: "المجموعة." },
  "home.featured.lead": { en: "Two hero devices. One ritual. Each engineered to deliver visible results within weeks.", ar: "أجهزة استثنائية. طقس واحد. كل منها مصمم لنتائج مرئية خلال أسابيع." },
  "home.bestseller": { en: "Bestseller", ar: "الأكثر مبيعاً" },
  "home.why.eyebrow": { en: "Why Smile Maker", ar: "لماذا سمايل ميكر" },
  "home.why.h": { en: "Built on five quiet promises.", ar: "خمس وعود نلتزم بها." },
  "home.why.tech.t": { en: "Advanced Tech", ar: "تقنية متطورة" },
  "home.why.tech.x": { en: "Hydro-pulse + sonic.", ar: "نبضات مائية + سونيك." },
  "home.why.safe.t": { en: "Safe & Pro", ar: "آمن واحترافي" },
  "home.why.safe.x": { en: "Medically certified.", ar: "معتمد طبياً." },
  "home.why.premium.t": { en: "Premium", ar: "فاخر" },
  "home.why.premium.x": { en: "Aerospace-grade build.", ar: "مواد فاخرة." },
  "home.why.trusted.t": { en: "Trusted", ar: "موثوق" },
  "home.why.trusted.x": { en: "12,400+ reviews.", ar: "أكثر من ١٢,٤٠٠ تقييم." },
  "home.why.delivery.t": { en: "Fast Delivery", ar: "توصيل سريع" },
  "home.why.delivery.x": { en: "Free worldwide.", ar: "مجاناً لكل المحافظات." },
  "home.test.eyebrow": { en: "Testimonials", ar: "آراء العملاء" },
  "home.test.h": { en: "Smiles, in their own words.", ar: "ابتسامات بكلماتهم." },
  "home.cta.eyebrow": { en: "Get in touch", ar: "تواصل معنا" },
  "home.cta.h": { en: "Questions about your smile? We're listening.", ar: "أسئلة عن ابتسامتك؟ نحن نسمعك." },
  "home.cta.lead": { en: "Our beauty-tech specialists reply within one business day, in any timezone.", ar: "متخصصونا يردون خلال يوم عمل واحد." },

  // Products page
  "products.collection": { en: "Collection", ar: "المجموعة" },
  "products.title.a": { en: "Our", ar: "" },
  "products.title.b": { en: "Products", ar: "منتجاتنا" },
  "products.lead": {
    en: "Devices, essentials, and bundles — engineered to deliver visible results in weeks, not months.",
    ar: "أجهزة، أساسيات، وباقات — مصممة لنتائج مرئية في أسابيع، لا في شهور.",
  },
  "products.bundlesEyebrow": { en: "Bundles · Save up to 10%", ar: "باقات · وفّر حتى ١٠٪" },
  "products.bundles.h.a": { en: "Better", ar: "أفضل" },
  "products.bundles.h.b": { en: "together", ar: "مع بعض" },
  "products.bundles.lead": { en: "Pair the right devices and we'll automatically apply the bundle discount at checkout.", ar: "اختر الأجهزة معاً وسيُطبّق خصم الباقة تلقائياً عند الطلب." },
  "products.save": { en: "Save", ar: "وفّر" },
  "products.from": { en: "From", ar: "ابتداءً من" },
  "products.sale": { en: "Sale", ar: "عرض" },

  // Product detail chrome
  "pd.reviews": { en: "reviews", ar: "تقييم" },
  "pd.whyLove.eyebrow": { en: "Why you'll love it", ar: "لماذا ستحبه" },
  "pd.whyLove.h": { en: "Engineered to make a difference.", ar: "صُمم ليُحدث فرقاً." },
  "pd.reviewsEyebrow": { en: "Customer reviews", ar: "آراء العملاء" },
  "pd.reviewsH": { en: "Loved by thousands.", ar: "محبوب من الآلاف." },
  "pd.related.eyebrow": { en: "You may also love", ar: "قد يعجبك أيضاً" },
  "pd.related.h": { en: "Related products", ar: "منتجات ذات صلة" },
  "pd.verified": { en: "Verified buyer", ar: "مشترٍ موثّق" },

  // About page
  "about.eyebrow": { en: "Our story", ar: "قصتنا" },
  "about.h.a": { en: "Where", ar: "حيث يلتقي" },
  "about.h.b": { en: "science", ar: "العلم" },
  "about.h.c": { en: "meets the smile.", ar: "بالابتسامة." },
  "about.lead": {
    en: "Smile Maker was founded on a simple belief — that professional-grade oral care belongs in every home, and that beauty technology should feel as refined as the results it delivers.",
    ar: "تأسست سمايل ميكر على إيمان بسيط — أن العناية الاحترافية بالفم تستحق أن تكون في كل بيت، وأن تقنيات الجمال يجب أن تكون أنيقة قدر نتائجها.",
  },
  "about.who.eyebrow": { en: "Who we are", ar: "من نحن" },
  "about.who.h": { en: "A new standard for at-home dental care.", ar: "معيار جديد للعناية بالأسنان في المنزل." },
  "about.who.p1": {
    en: "We are a team of dentists, industrial designers, and beauty-tech engineers united by a shared obsession: making clinical-grade oral care effortless, elegant, and effective.",
    ar: "نحن فريق من أطباء الأسنان والمصممين الصناعيين ومهندسي تقنيات الجمال، يجمعنا هدف واحد: جعل العناية السريرية بالفم سهلة وأنيقة وفعّالة.",
  },
  "about.who.p2": {
    en: "From our hydro-pulse flossers to our LED whitening wands, every Smile Maker device is the result of countless prototypes, dental partnerships, and meticulous attention to the smallest details.",
    ar: "من أجهزة الفلوس المائي إلى أقلام التبييض LED، كل جهاز سمايل ميكر هو ثمرة تجارب لا حصر لها وشراكات مع أطباء الأسنان واهتمام دقيق بأصغر التفاصيل.",
  },
  "about.mission.eyebrow": { en: "Our mission", ar: "مهمتنا" },
  "about.mission.h": { en: "Confidence, daily.", ar: "ثقة، كل يوم." },
  "about.mission.p": {
    en: "To empower everyone with the tools to care for their smile the way the world's finest clinics would — without ever leaving home.",
    ar: "لنمنح الجميع أدوات للعناية بابتسامتهم بنفس مستوى أرقى العيادات — دون مغادرة المنزل.",
  },
  "about.vision.eyebrow": { en: "Our vision", ar: "رؤيتنا" },
  "about.vision.h": { en: "A world that smiles brighter.", ar: "عالم يبتسم بإشراق أكبر." },
  "about.vision.p": {
    en: "A future where oral hygiene is beautiful, ritualistic, and accessible — where every bathroom counter holds a piece of art that performs.",
    ar: "مستقبل تكون فيه نظافة الفم جميلة ومتاحة للجميع — حيث يحمل كل رف حمام قطعة فنية تؤدي دورها.",
  },
  "about.values.eyebrow": { en: "Brand values", ar: "قيم العلامة" },
  "about.values.h": { en: "The four pillars of Smile Maker.", ar: "الأركان الأربعة لسمايل ميكر." },
  "about.values.innov.t": { en: "Innovation", ar: "ابتكار" },
  "about.values.innov.x": { en: "Patented sonic and hydro technologies refined through years of clinical testing.", ar: "تقنيات سونيك ومائية مُبتكرة، مصقولة بسنوات من الاختبارات السريرية." },
  "about.values.safety.t": { en: "Safety", ar: "أمان" },
  "about.values.safety.x": { en: "Every device is medically certified and gentle enough for daily use.", ar: "كل جهاز معتمد طبياً ولطيف بما يكفي للاستخدام اليومي." },
  "about.values.beauty.t": { en: "Beauty", ar: "جمال" },
  "about.values.beauty.x": { en: "Sculpted aluminum, soft-touch finishes — designed to live on your countertop.", ar: "ألمنيوم منحوت وتشطيبات ناعمة — مصمم ليبقى على رف حمامك." },
  "about.values.conf.t": { en: "Confidence", ar: "ثقة" },
  "about.values.conf.x": { en: "A brighter smile is the most beautiful thing you can wear.", ar: "ابتسامة مشرقة هي أجمل ما ترتديه." },
  "about.cta.h": { en: "Ready to upgrade your ritual?", ar: "جاهز لتطوير طقسك اليومي؟" },
  "about.cta.lead": { en: "Discover the devices trusted by thousands for a brighter, healthier smile.", ar: "اكتشف الأجهزة التي يثق بها الآلاف لابتسامة أكثر إشراقاً وصحة." },
  "about.cta.shop": { en: "Shop H2O Flosser", ar: "تسوّق H2O Flosser" },
} satisfies Dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT) => string; tl: (v: L) => string; dir: "ltr" | "rtl" };

const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => String(k), tl: (v) => v.en, dir: "ltr" });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = (localStorage.getItem("sm-lang") as Lang | null) ?? "en";
    setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("sm-lang", l);
  }, []);

  const t = useCallback((k: keyof typeof DICT) => (DICT[k] as L | undefined)?.[lang] ?? String(k), [lang]);
  const tl = useCallback((v: L) => v[lang], [lang]);

  const value = useMemo<Ctx>(() => ({ lang, setLang, t, tl, dir: lang === "ar" ? "rtl" : "ltr" }), [lang, setLang, t, tl]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
