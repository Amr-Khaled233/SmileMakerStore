import { useState, useCallback, useEffect, useRef } from "react";
import { Package, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { DynamicProduct, DynamicBundle, BundleOverride, StaticProductOverride, Pricing } from "@/lib/api";
import { PRODUCTS, BUNDLES, PRODUCT_DETAILS, H2O_GALLERY, ORTHO_KIT_GALLERY, ELECTRIC_BRUSH_GALLERY, WAX_GALLERY, LSHAPED_GALLERY, type ProductSlug } from "@/data/products";

const PRODUCT_GALLERIES: Record<string, string[]> = {
  "h2o-water-flosser": H2O_GALLERY,
  "ortho-oral-kit": ORTHO_KIT_GALLERY,
  "electrical-dental-brush": ELECTRIC_BRUSH_GALLERY,
  "ortho-sheet": WAX_GALLERY,
  "l-shaped-interdental-brush": LSHAPED_GALLERY,
};

export function ProductsSection({ token }: { token: string }) {
  const [subTab, setSubTab] = useState<"products" | "add" | "bundles">("products");

  // Dynamic products
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [form, setForm] = useState({
    title: "", titleAr: "", slug: "", price: "", salePrice: "",
    description: "", descriptionAr: "",
    features: [] as { en: string; ar: string }[],
    colors: [] as { id: string; label: { en: string; ar: string }; hex: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [primaryUploadingFor, setPrimaryUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const pendingProductId = useRef<string | null>(null);
  const [dynSettingPrimary, setDynSettingPrimary] = useState<string | null>(null);
  const dynReplacingIdx = useRef<{ id: string; idx: number } | null>(null);
  const dynReplaceFileInputRef = useRef<HTMLInputElement>(null);

  // Edit dynamic product
  const [editingDynId, setEditingDynId] = useState<string | null>(null);
  const EMPTY_DYN_EDIT = { title: "", titleAr: "", price: "", salePrice: "", description: "", descriptionAr: "", features: [] as { en: string; ar: string }[], colors: [] as { id: string; label: { en: string; ar: string }; hex: string }[] };
  const [dynEditForm, setDynEditForm] = useState(EMPTY_DYN_EDIT);
  const [savingDynEdit, setSavingDynEdit] = useState(false);

  const startEditDyn = (p: DynamicProduct) => {
    setEditingDynId(p.id);
    setDynEditForm({
      title: p.title,
      titleAr: p.titleAr,
      price: String(p.price),
      salePrice: p.salePrice ? String(p.salePrice) : "",
      description: p.description ?? "",
      descriptionAr: p.descriptionAr ?? "",
      features: p.features?.length ? [...p.features] : [],
      colors: p.colors?.length ? p.colors.map((c) => ({ ...c, label: { ...c.label } })) : [],
    });
  };

  const saveDynEdit = async (id: string) => {
    const price = Number(dynEditForm.price);
    const salePrice = dynEditForm.salePrice.trim() ? Number(dynEditForm.salePrice) : undefined;
    if (!dynEditForm.title.trim() || !dynEditForm.titleAr.trim() || isNaN(price) || price <= 0) return;
    setSavingDynEdit(true);
    try {
      await api.updateProduct(token, id, {
        title: dynEditForm.title.trim(),
        titleAr: dynEditForm.titleAr.trim(),
        price,
        salePrice: salePrice && salePrice > 0 ? salePrice : undefined,
        description: dynEditForm.description.trim() || undefined,
        descriptionAr: dynEditForm.descriptionAr.trim() || undefined,
        features: dynEditForm.features.filter((f) => f.en.trim() || f.ar.trim()),
        colors: dynEditForm.colors.filter((c) => c.label.en.trim() || c.label.ar.trim()),
      });
      setEditingDynId(null);
      await load();
    } finally {
      setSavingDynEdit(false);
    }
  };

  // Static products
  const [imageOverrides, setImageOverrides] = useState<Record<string, string[]>>({});
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [staticUploadingFor, setStaticUploadingFor] = useState<string | null>(null);
  const [staticSettingPrimary, setStaticSettingPrimary] = useState<string | null>(null);
  const staticReplacingIdx = useRef<{ slug: string; idx: number } | null>(null);
  const [togglingHidden, setTogglingHidden] = useState<string | null>(null);
  const staticFileInputRef = useRef<HTMLInputElement>(null);
  const staticReplaceFileInputRef = useRef<HTMLInputElement>(null);
  const pendingStaticSlug = useRef<string | null>(null);

  // Static product pricing overrides + text overrides
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, { price: number; salePrice?: number | null }>>({});
  const [staticOverrides, setStaticOverrides] = useState<Record<string, StaticProductOverride>>({});
  const [editingStaticSlug, setEditingStaticSlug] = useState<string | null>(null);
  const [staticEditForm, setStaticEditForm] = useState({
    description: "", descriptionAr: "",
    taglineEn: "", taglineAr: "",
    features: [] as { en: string; ar: string }[],
    colors: [] as { id: string; label: { en: string; ar: string }; hex: string }[],
    related: [] as string[],
  });
  const [savingStaticDetails, setSavingStaticDetails] = useState(false);

  // Hardcoded bundle overrides
  const [bundleOverrides, setBundleOverrides] = useState<Record<string, BundleOverride>>({});
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleForm, setBundleForm] = useState({ titleEn: "", titleAr: "", taglineEn: "", taglineAr: "", items: [] as string[] });
  const [savingBundle, setSavingBundle] = useState(false);

  // User-created bundles
  const [userBundles, setUserBundles] = useState<DynamicBundle[]>([]);
  const EMPTY_BUNDLE_FORM = { titleEn: "", titleAr: "", taglineEn: "", taglineAr: "", items: [] as string[], price: "" };
  const [newBundleForm, setNewBundleForm] = useState(EMPTY_BUNDLE_FORM);
  const [creatingBundle, setCreatingBundle] = useState(false);
  const [editingUserBundleId, setEditingUserBundleId] = useState<string | null>(null);
  const [editUserBundleForm, setEditUserBundleForm] = useState(EMPTY_BUNDLE_FORM);
  const [savingUserBundle, setSavingUserBundle] = useState(false);

  const load = useCallback(async () => {
    const [data, meta, pricing, dynBundles] = await Promise.all([
      api.getDynamicProducts().catch(() => [] as DynamicProduct[]),
      api.getProductsMeta().catch(() => ({ imageOverrides: {} as Record<string, string[]>, hidden: [] as string[], staticOverrides: {} as Record<string, StaticProductOverride>, bundleOverrides: {} as Record<string, BundleOverride> })),
      api.getPricing(token).catch(() => null as Pricing | null),
      api.getDynamicBundles().catch(() => [] as DynamicBundle[]),
    ]);
    setProducts(data);
    setImageOverrides(meta.imageOverrides);
    setHiddenSlugs(meta.hidden);
    setStaticOverrides(meta.staticOverrides ?? {});
    setBundleOverrides(meta.bundleOverrides ?? {});
    setUserBundles(dynBundles);
    if (pricing) {
      const ovMap: Record<string, { price: number; salePrice?: number | null }> = {};
      for (const ov of pricing.products) {
        if (ov.price !== undefined) ovMap[ov.slug] = { price: ov.price, salePrice: ov.salePrice };
      }
      setPricingOverrides(ovMap);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // ── Dynamic handlers ──
  const addProduct = async () => {
    const price = Number(form.price);
    const salePrice = form.salePrice.trim() ? Number(form.salePrice) : undefined;
    if (!form.title.trim() || !form.titleAr.trim() || !form.slug.trim() || isNaN(price) || price <= 0) return;
    setSaving(true);
    try {
      await api.createProduct(token, {
        title: form.title.trim(),
        titleAr: form.titleAr.trim(),
        slug: slugify(form.slug),
        price,
        salePrice: salePrice && salePrice > 0 ? salePrice : undefined,
        description: form.description.trim() || undefined,
        descriptionAr: form.descriptionAr.trim() || undefined,
        features: form.features.filter((f) => f.en.trim() || f.ar.trim()),
        colors: form.colors.filter((c) => c.label.en.trim() || c.label.ar.trim()),
      });
      setForm({ title: "", titleAr: "", slug: "", price: "", salePrice: "", description: "", descriptionAr: "", features: [], colors: [] });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("حذف المنتج؟ لن يمكن التراجع.")) return;
    await api.deleteProduct(token, id);
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  const openImagePicker = (id: string) => { pendingProductId.current = id; fileInputRef.current?.click(); };
  const openPrimaryImagePicker = (id: string) => { pendingProductId.current = id; primaryFileInputRef.current?.click(); };
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const id = pendingProductId.current;
    if (!file || !id) return; e.target.value = ""; setUploadingFor(id);
    const reader = new FileReader();
    reader.onload = async (ev) => { await api.addProductImage(token, id, ev.target?.result as string).catch(() => {}); await load(); setUploadingFor(null); };
    reader.readAsDataURL(file);
  };
  const onPrimaryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const id = pendingProductId.current;
    if (!file || !id) return; e.target.value = ""; setPrimaryUploadingFor(id);
    const reader = new FileReader();
    reader.onload = async (ev) => { await api.setProductPrimaryImage(token, id, ev.target?.result as string).catch(() => {}); await load(); setPrimaryUploadingFor(null); };
    reader.readAsDataURL(file);
  };
  const removeImage = async (id: string, idx: number) => {
    await api.removeProductImage(token, id, idx);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, images: p.images.filter((_, i) => i !== idx) } : p));
  };

  const openDynReplaceImagePicker = (id: string, idx: number) => {
    dynReplacingIdx.current = { id, idx };
    dynReplaceFileInputRef.current?.click();
  };
  const onDynReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const info = dynReplacingIdx.current;
    if (!file || !info) return; e.target.value = "";
    setDynSettingPrimary(`${info.id}:r${info.idx}`);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await api.replaceDynProductImage(token, info.id, info.idx, ev.target?.result as string).catch(() => {});
      await load(); setDynSettingPrimary(null);
    };
    reader.readAsDataURL(file);
  };
  const setDynImagePrimary = async (id: string, idx: number) => {
    if (idx === 0) return;
    setDynSettingPrimary(`${id}:${idx}`);
    await api.setDynProductImagePrimary(token, id, idx).catch(() => {});
    await load(); setDynSettingPrimary(null);
  };

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, { en: "", ar: "" }] }));
  const removeFeature = (i: number) => setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, key: "en" | "ar", val: string) =>
    setForm((f) => ({ ...f, features: f.features.map((feat, idx) => idx === i ? { ...feat, [key]: val } : feat) }));

  const addColor = () => setForm((f) => ({ ...f, colors: [...f.colors, { id: `c${Date.now()}`, label: { en: "", ar: "" }, hex: "#4B9CD3" }] }));
  const removeColor = (i: number) => setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  const updateColorLabel = (i: number, key: "en" | "ar", val: string) =>
    setForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, label: { ...c.label, [key]: val } } : c) }));
  const updateColorHex = (i: number, val: string) =>
    setForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, hex: val } : c) }));

  // ── Static handlers ──
  const openStaticImagePicker = (slug: string) => { pendingStaticSlug.current = slug; staticFileInputRef.current?.click(); };
  const onStaticFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const slug = pendingStaticSlug.current;
    if (!file || !slug) return; e.target.value = ""; setStaticUploadingFor(slug);
    const reader = new FileReader();
    reader.onload = async (ev) => { await api.addStaticProductImage(token, slug, ev.target?.result as string).catch(() => {}); await load(); setStaticUploadingFor(null); };
    reader.readAsDataURL(file);
  };

  // Get effective image list for a slug (custom if exists, else originals)
  const getEffectiveImages = (slug: string) => imageOverrides[slug]?.length ? imageOverrides[slug] : (PRODUCT_GALLERIES[slug] ?? []);

  const removeStaticImage = async (slug: string, idx: number) => {
    if (!window.confirm("حذف الصورة؟ لن يمكن التراجع.")) return;
    const imgs = getEffectiveImages(slug);
    const newImgs = imgs.filter((_: string, i: number) => i !== idx);
    await api.setStaticProductImages(token, slug, newImgs).catch(() => {});
    if (newImgs.length === 0) setImageOverrides((prev) => { const next = { ...prev }; delete next[slug]; return next; });
    else setImageOverrides((prev) => ({ ...prev, [slug]: newImgs }));
  };
  const setStaticImagePrimary = async (slug: string, idx: number) => {
    if (idx === 0) return;
    setStaticSettingPrimary(`${slug}:${idx}`);
    const imgs = getEffectiveImages(slug);
    const newImgs = [...imgs];
    const [img] = newImgs.splice(idx, 1);
    newImgs.unshift(img);
    await api.setStaticProductImages(token, slug, newImgs).catch(() => {});
    await load();
    setStaticSettingPrimary(null);
  };
  const openStaticReplaceImagePicker = (slug: string, idx: number) => {
    staticReplacingIdx.current = { slug, idx };
    staticReplaceFileInputRef.current?.click();
  };
  const onStaticReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const info = staticReplacingIdx.current;
    if (!file || !info) return; e.target.value = ""; setStaticUploadingFor(`${info.slug}:${info.idx}`);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const newImage = ev.target?.result as string;
      const imgs = getEffectiveImages(info.slug);
      const newImgs = [...imgs];
      newImgs[info.idx] = newImage;
      await api.setStaticProductImages(token, info.slug, newImgs).catch(() => {});
      await load(); setStaticUploadingFor(null);
    };
    reader.readAsDataURL(file);
  };
  const toggleHidden = async (slug: string, currentlyHidden: boolean) => {
    setTogglingHidden(slug);
    await api.setProductVisibility(token, slug, !currentlyHidden).catch(() => {});
    setHiddenSlugs((prev) => currentlyHidden ? prev.filter((s) => s !== slug) : [...prev, slug]);
    setTogglingHidden(null);
  };

  const startEditStaticDetails = (slug: string) => {
    const prod = PRODUCTS.find((x) => x.slug === slug)!;
    const ov = staticOverrides[slug] ?? {};
    setStaticEditForm({
      description: ov.description ?? prod.description.en,
      descriptionAr: ov.descriptionAr ?? prod.description.ar,
      taglineEn: ov.taglineEn ?? prod.tagline.en,
      taglineAr: ov.taglineAr ?? prod.tagline.ar,
      features: ov.features?.length ? [...ov.features] : [...(PRODUCT_DETAILS[slug as ProductSlug]?.features ?? [])],
      colors: ov.colors
        ? [...ov.colors]
        : prod.colors
          ? prod.colors.map((c) => ({ id: c.id, label: { en: c.label.en, ar: c.label.ar }, hex: c.hex }))
          : [],
      related: ov.related ? [...ov.related] : (PRODUCT_DETAILS[slug as ProductSlug]?.related.map((r) => r.slug) ?? []),
    });
    setEditingStaticSlug(slug);
  };
  const saveStaticDetails = async () => {
    if (!editingStaticSlug) return;
    setSavingStaticDetails(true);
    await api.updateStaticProductDetails(token, editingStaticSlug, {
      description: staticEditForm.description.trim() || undefined,
      descriptionAr: staticEditForm.descriptionAr.trim() || undefined,
      taglineEn: staticEditForm.taglineEn.trim() || undefined,
      taglineAr: staticEditForm.taglineAr.trim() || undefined,
      features: staticEditForm.features.filter((f) => f.en.trim() || f.ar.trim()),
      colors: staticEditForm.colors.filter((c) => c.label.en.trim() || c.label.ar.trim()),
      related: staticEditForm.related,
    }).catch(() => {});
    await load();
    setSavingStaticDetails(false);
    setEditingStaticSlug(null);
  };
  const addStaticFeature = () => setStaticEditForm((f) => ({ ...f, features: [...f.features, { en: "", ar: "" }] }));
  const removeStaticFeature = (i: number) => setStaticEditForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const updateStaticFeature = (i: number, key: "en" | "ar", val: string) =>
    setStaticEditForm((f) => ({ ...f, features: f.features.map((feat, idx) => idx === i ? { ...feat, [key]: val } : feat) }));
  const addStaticColor = () => setStaticEditForm((f) => ({ ...f, colors: [...f.colors, { id: `c${Date.now()}`, label: { en: "", ar: "" }, hex: "#4B9CD3" }] }));
  const removeStaticColor = (i: number) => setStaticEditForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  const updateStaticColorLabel = (i: number, key: "en" | "ar", val: string) =>
    setStaticEditForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, label: { ...c.label, [key]: val } } : c) }));
  const updateStaticColorHex = (i: number, val: string) =>
    setStaticEditForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, hex: val } : c) }));

  // ── Bundle handlers ──
  const allProductOptions = [
    ...PRODUCTS.map((p) => ({ slug: p.slug, title: p.title })),
    ...products.map((p) => ({ slug: p.slug, title: p.title })),
  ];
  const startEditBundle = (id: string) => {
    const base = BUNDLES.find((b) => b.id === id)!;
    const ov = bundleOverrides[id] ?? {};
    setBundleForm({
      titleEn: ov.titleEn ?? base.title.en,
      titleAr: ov.titleAr ?? base.title.ar,
      taglineEn: ov.taglineEn ?? base.tagline.en,
      taglineAr: ov.taglineAr ?? base.tagline.ar,
      items: ov.items ?? [...base.items],
    });
    setEditingBundleId(id);
  };
  const saveBundle = async () => {
    if (!editingBundleId) return;
    setSavingBundle(true);
    await api.updateBundle(token, editingBundleId, {
      titleEn: bundleForm.titleEn || undefined,
      titleAr: bundleForm.titleAr || undefined,
      taglineEn: bundleForm.taglineEn || undefined,
      taglineAr: bundleForm.taglineAr || undefined,
      items: bundleForm.items,
    }).catch(() => {});
    await load();
    setSavingBundle(false);
    setEditingBundleId(null);
  };
  const toggleBundleItem = (slug: string) =>
    setBundleForm((f) => ({ ...f, items: f.items.includes(slug) ? f.items.filter((s) => s !== slug) : [...f.items, slug] }));

  // ── User-created bundle handlers ──
  const toggleNewBundleItem = (slug: string) =>
    setNewBundleForm((f) => ({ ...f, items: f.items.includes(slug) ? f.items.filter((s) => s !== slug) : [...f.items, slug] }));
  const toggleEditUserBundleItem = (slug: string) =>
    setEditUserBundleForm((f) => ({ ...f, items: f.items.includes(slug) ? f.items.filter((s) => s !== slug) : [...f.items, slug] }));

  const createUserBundle = async () => {
    const price = Number(newBundleForm.price);
    if (!newBundleForm.titleEn.trim() || !newBundleForm.titleAr.trim() || newBundleForm.items.length === 0 || isNaN(price) || price < 0) return;
    setCreatingBundle(true);
    await api.createDynamicBundle(token, {
      titleEn: newBundleForm.titleEn.trim(),
      titleAr: newBundleForm.titleAr.trim(),
      taglineEn: newBundleForm.taglineEn.trim() || undefined,
      taglineAr: newBundleForm.taglineAr.trim() || undefined,
      items: newBundleForm.items,
      price,
    }).catch(() => {});
    setNewBundleForm(EMPTY_BUNDLE_FORM);
    await load();
    setCreatingBundle(false);
  };

  const deleteUserBundle = async (id: string) => {
    if (!window.confirm("حذف الباقة؟ لن يمكن التراجع.")) return;
    await api.deleteDynamicBundle(token, id).catch(() => {});
    setUserBundles((b) => b.filter((x) => x.id !== id));
  };

  const startEditUserBundle = (id: string) => {
    const b = userBundles.find((x) => x.id === id)!;
    setEditUserBundleForm({ titleEn: b.titleEn, titleAr: b.titleAr, taglineEn: b.taglineEn ?? "", taglineAr: b.taglineAr ?? "", items: [...b.items], price: String(b.price) });
    setEditingUserBundleId(id);
  };

  const saveUserBundle = async () => {
    if (!editingUserBundleId) return;
    if (!editUserBundleForm.titleEn.trim() || !editUserBundleForm.titleAr.trim() || editUserBundleForm.items.length === 0) return;
    setSavingUserBundle(true);
    await api.updateDynamicBundle(token, editingUserBundleId, {
      titleEn: editUserBundleForm.titleEn.trim(),
      titleAr: editUserBundleForm.titleAr.trim(),
      taglineEn: editUserBundleForm.taglineEn.trim() || undefined,
      taglineAr: editUserBundleForm.taglineAr.trim() || undefined,
      items: editUserBundleForm.items,
      // price intentionally omitted — edit from Pricing tab only
    }).catch(() => {});
    await load();
    setSavingUserBundle(false);
    setEditingUserBundleId(null);
  };

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <input ref={primaryFileInputRef} type="file" accept="image/*" className="hidden" onChange={onPrimaryFileChange} />
      <input ref={staticFileInputRef} type="file" accept="image/*" className="hidden" onChange={onStaticFileChange} />
      <input ref={staticReplaceFileInputRef} type="file" accept="image/*" className="hidden" onChange={onStaticReplaceFileChange} />
      <input ref={dynReplaceFileInputRef} type="file" accept="image/*" className="hidden" onChange={onDynReplaceFileChange} />

      {/* Sub-tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {(["products", "add", "bundles"] as const).map((key) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${subTab === key ? "bg-brand text-white" : "bg-soft border border-border text-ink hover:bg-white"}`}
          >
            {key === "products" ? "المنتجات" : key === "add" ? "إضافة منتج" : "الباقات"}
          </button>
        ))}
      </div>

      {/* ── Add product (creation form only) ── */}
      {subTab === "add" && (
        <div className="space-y-8">
          <section>
            <h3 className="font-display text-xl mb-4">إضافة منتج جديد</h3>
            <div className="lux-card p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم (إنجليزي)</label>
                  <input className="lux-input" placeholder="Electric Brush" value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم (عربي)</label>
                  <input className="lux-input" placeholder="فرشاة كهربائية" value={form.titleAr} dir="rtl"
                    onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الـ Slug (رابط المنتج)</label>
                  <input className="lux-input" placeholder="electric-brush" value={form.slug} dir="ltr"
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">السعر (ج.م)</label>
                    <input className="lux-input" type="number" min={0} placeholder="500" value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">سعر الخصم (اختياري)</label>
                    <input className="lux-input" type="number" min={0} placeholder="450" value={form.salePrice}
                      onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                  <textarea className="lux-input min-h-[80px] resize-y" placeholder="Product description..."
                    value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                  <textarea className="lux-input min-h-[80px] resize-y" placeholder="وصف المنتج..." dir="rtl"
                    value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">المميزات</label>
                  <button type="button" onClick={addFeature} className="text-xs text-deep-blue hover:underline">+ إضافة ميزة</button>
                </div>
                {form.features.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد مميزات</p> : (
                  <div className="space-y-2">
                    {form.features.map((feat, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input className="lux-input text-xs flex-1" placeholder="Feature in English" value={feat.en}
                          onChange={(e) => updateFeature(i, "en", e.target.value)} />
                        <input className="lux-input text-xs flex-1" placeholder="الميزة بالعربي" value={feat.ar} dir="rtl"
                          onChange={(e) => updateFeature(i, "ar", e.target.value)} />
                        <button type="button" onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Colors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">الألوان (اختياري — إذا كان المنتج له ألوان)</label>
                  <button type="button" onClick={addColor} className="text-xs text-deep-blue hover:underline">+ إضافة لون</button>
                </div>
                {form.colors.length === 0 ? <p className="text-xs text-muted-foreground">بدون ألوان</p> : (
                  <div className="space-y-2">
                    {form.colors.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="color" value={c.hex} onChange={(e) => updateColorHex(i, e.target.value)}
                          className="h-9 w-12 rounded-lg border border-border cursor-pointer p-1 shrink-0" />
                        <input className="lux-input text-xs flex-1" placeholder="Color name EN" value={c.label.en}
                          onChange={(e) => updateColorLabel(i, "en", e.target.value)} />
                        <input className="lux-input text-xs flex-1" placeholder="اسم اللون" value={c.label.ar} dir="rtl"
                          onChange={(e) => updateColorLabel(i, "ar", e.target.value)} />
                        <button type="button" onClick={() => removeColor(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={addProduct} disabled={saving || !form.title || !form.titleAr || !form.slug || !form.price}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "جاري الإضافة..." : "+ إضافة المنتج"}
              </button>
            </div>
          </section>

        </div>
      )}

      {/* ── All products (static + dynamic unified) ── */}
      {subTab === "products" && (
        <section>
          <h3 className="font-display text-xl mb-4">المنتجات ({PRODUCTS.length + products.length})</h3>
          <div className="space-y-6">
            {PRODUCTS.map((p) => {
              const customImgs = imageOverrides[p.slug] ?? [];
              const hasCustomImgs = customImgs.length > 0;
              const origGallery = PRODUCT_GALLERIES[p.slug] ?? [p.image];
              const displayImages = hasCustomImgs ? customImgs : origGallery;

              const isHidden = hiddenSlugs.includes(p.slug);
              const priceOv = pricingOverrides[p.slug];
              const displayPrice = priceOv?.price ?? p.price;
              const displaySalePrice = priceOv !== undefined ? priceOv.salePrice : p.salePrice;

              const textOv = staticOverrides[p.slug] ?? {};
              const currentDesc = { en: textOv.description || p.description.en, ar: textOv.descriptionAr || p.description.ar };
              const currentTagline = { en: textOv.taglineEn || p.tagline.en, ar: textOv.taglineAr || p.tagline.ar };
              const currentFeatures = textOv.features?.length ? textOv.features : (PRODUCT_DETAILS[p.slug as ProductSlug]?.features ?? []);
              const currentColors = textOv.colors ?? p.colors ?? [];

              const isEditingDetails = editingStaticSlug === p.slug;

              return (
                <div key={p.slug} className={`lux-card p-5 space-y-5 transition-opacity ${isHidden ? "opacity-60" : ""}`}>

                  {/* ── Header ── */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-xl" dir="ltr">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">/{p.slug}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">
                          {(displaySalePrice ?? displayPrice).toLocaleString("ar-EG")} ج.م
                        </span>
                        {displaySalePrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            {displayPrice.toLocaleString("ar-EG")} ج.م
                          </span>
                        )}
                        {currentColors.length > 0 && (
                          <div className="flex gap-1">
                            {currentColors.map((c) => (
                              <span key={c.id} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} title={c.label.ar || c.label.en} />
                            ))}
                          </div>
                        )}
                        {isHidden && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">مخفي</span>}
                      </div>
                    </div>
                    <button onClick={() => toggleHidden(p.slug, isHidden)} disabled={togglingHidden === p.slug}
                      className={`text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0 ${isHidden ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
                      {togglingHidden === p.slug ? "..." : isHidden ? "إظهار" : "إخفاء"}
                    </button>
                  </div>

                  {/* ── Images ── */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-ink">الصور ({displayImages.length})</p>
                      </div>
                      <button onClick={() => openStaticImagePicker(p.slug)} disabled={staticUploadingFor === p.slug}
                        className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50">
                        {staticUploadingFor === p.slug ? "جاري الرفع..." : "+ إضافة صورة"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {displayImages.map((src: string, idx: number) => {
                        const isPrimary = idx === 0;
                        const settingThis = staticSettingPrimary === `${p.slug}:${idx}`;
                        const replacingThis = staticUploadingFor === `${p.slug}:${idx}`;
                        return (
                          <div key={`${src}-${idx}`} className="relative group flex flex-col items-center gap-1">
                            <div className={`relative h-20 w-20 rounded-xl border-2 overflow-hidden ${isPrimary ? "border-deep-blue" : "border-border"}`}>
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              {/* Delete button — top corner on hover */}
                              <button onClick={() => removeStaticImage(p.slug, idx)}
                                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
                            </div>
                            {/* Controls below each image */}
                            <div className="flex gap-1">
                              {isPrimary ? (
                                <span className="text-[9px] text-deep-blue font-medium px-1">أساسية</span>
                              ) : (
                                <button
                                  onClick={() => setStaticImagePrimary(p.slug, idx)}
                                  disabled={!!settingThis}
                                  title="تعيين كأساسية"
                                  className="h-6 px-1.5 rounded-md bg-deep-blue/10 text-deep-blue text-[9px] font-medium hover:bg-deep-blue/20 transition-colors disabled:opacity-50">
                                  {settingThis ? "..." : "⭐ أساسية"}
                                </button>
                              )}
                              <button
                                onClick={() => openStaticReplaceImagePicker(p.slug, idx)}
                                disabled={replacingThis}
                                title="استبدال الصورة"
                                className="h-6 px-1.5 rounded-md bg-soft border border-border text-[9px] hover:bg-white transition-colors disabled:opacity-50">
                                {replacingThis ? "..." : "بدّل"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Info / Edit ── */}
                  <div className="border-t border-border pt-4">
                    {!isEditingDetails ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-ink">التفاصيل</p>
                          <button onClick={() => startEditStaticDetails(p.slug)}
                            className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors">
                            تعديل
                          </button>
                        </div>

                        {/* Tagline */}
                        <div className="bg-soft rounded-xl px-4 py-3 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">الوصف المختصر</p>
                          <p className="text-sm text-ink" dir="rtl">{currentTagline.ar}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{currentTagline.en}</p>
                        </div>

                        {/* Description */}
                        <div className="bg-soft rounded-xl px-4 py-3 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">الوصف الكامل</p>
                          <p className="text-sm text-ink leading-relaxed line-clamp-4" dir="rtl">{currentDesc.ar}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mt-1" dir="ltr">{currentDesc.en}</p>
                        </div>

                        {/* Features */}
                        {currentFeatures.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">المميزات</p>
                            <div className="space-y-1">
                              {currentFeatures.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <span className="text-deep-blue mt-0.5 shrink-0">✓</span>
                                  <span dir="rtl">{f.ar}</span>
                                  {f.en && <span className="text-muted-foreground" dir="ltr">· {f.en}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Colors */}
                        {currentColors.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">الألوان ({currentColors.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {currentColors.map((c) => (
                                <div key={c.id} className="flex items-center gap-1.5 text-xs bg-soft border border-border rounded-full px-2.5 py-1">
                                  <span className="h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                                  <span>{c.label.ar || c.label.en}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs font-medium text-ink">تعديل التفاصيل</p>

                        {/* Tagline */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف المختصر (إنجليزي)</label>
                            <input className="lux-input text-xs" value={staticEditForm.taglineEn}
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, taglineEn: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف المختصر (عربي)</label>
                            <input className="lux-input text-xs" value={staticEditForm.taglineAr} dir="rtl"
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, taglineAr: e.target.value }))} />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف الكامل (إنجليزي)</label>
                            <textarea className="lux-input text-xs min-h-[100px] resize-y" value={staticEditForm.description}
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, description: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف الكامل (عربي)</label>
                            <textarea className="lux-input text-xs min-h-[100px] resize-y" value={staticEditForm.descriptionAr} dir="rtl"
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-muted-foreground">المميزات</label>
                            <button type="button" onClick={addStaticFeature} className="text-xs text-deep-blue hover:underline">+ إضافة ميزة</button>
                          </div>
                          {staticEditForm.features.length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا توجد مميزات</p>
                          ) : (
                            <div className="space-y-2">
                              {staticEditForm.features.map((feat, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input className="lux-input text-xs flex-1" placeholder="Feature in English" value={feat.en}
                                    onChange={(e) => updateStaticFeature(i, "en", e.target.value)} />
                                  <input className="lux-input text-xs flex-1" placeholder="الميزة بالعربي" value={feat.ar} dir="rtl"
                                    onChange={(e) => updateStaticFeature(i, "ar", e.target.value)} />
                                  <button type="button" onClick={() => removeStaticFeature(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Colors */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-muted-foreground">الألوان</label>
                            <button type="button" onClick={addStaticColor} className="text-xs text-deep-blue hover:underline">+ إضافة لون</button>
                          </div>
                          {staticEditForm.colors.length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا يوجد ألوان</p>
                          ) : (
                            <div className="space-y-2">
                              {staticEditForm.colors.map((c, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input type="color" value={c.hex} onChange={(e) => updateStaticColorHex(i, e.target.value)}
                                    className="h-9 w-12 rounded-lg border border-border cursor-pointer p-1 shrink-0" />
                                  <input className="lux-input text-xs flex-1" placeholder="Color name EN" value={c.label.en}
                                    onChange={(e) => updateStaticColorLabel(i, "en", e.target.value)} />
                                  <input className="lux-input text-xs flex-1" placeholder="اسم اللون" value={c.label.ar} dir="rtl"
                                    onChange={(e) => updateStaticColorLabel(i, "ar", e.target.value)} />
                                  <button type="button" onClick={() => removeStaticColor(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Related products */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-2 block">المنتجات المرتبطة (Related)</label>
                          <div className="space-y-1.5">
                            {[
                              ...PRODUCTS.filter((x) => x.slug !== p.slug).map((x) => ({ slug: x.slug, title: x.title })),
                              ...products.filter((x) => x.slug !== p.slug).map((x) => ({ slug: x.slug, title: x.title })),
                            ].map((opt) => {
                              const checked = staticEditForm.related.includes(opt.slug);
                              return (
                                <label key={opt.slug} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setStaticEditForm((f) => ({
                                      ...f,
                                      related: checked
                                        ? f.related.filter((s) => s !== opt.slug)
                                        : [...f.related, opt.slug],
                                    }))}
                                    className="rounded border-border"
                                  />
                                  <span dir="ltr">{opt.title}</span>
                                  <span className="text-muted-foreground" dir="ltr">/{opt.slug}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={saveStaticDetails} disabled={savingStaticDetails}
                            className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
                            {savingStaticDetails ? "جاري الحفظ..." : "حفظ التعديلات"}
                          </button>
                          <button onClick={() => setEditingStaticSlug(null)} className="btn-ghost text-xs py-1.5 px-3">إلغاء</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {products.length > 0 && (
            <div className="space-y-6 mt-6 border-t border-border pt-6">
              {products.map((p) => {
                const isHidden = hiddenSlugs.includes(p.slug);
                const priceOv = pricingOverrides[p.slug];
                const displayPrice = priceOv?.price ?? p.price;
                const displaySalePrice = priceOv !== undefined ? (priceOv.salePrice ?? undefined) : p.salePrice;
                const isEditingDetails = editingDynId === p.id;

                return (
                  <div key={p.id} className={`lux-card p-5 space-y-5 transition-opacity ${isHidden ? "opacity-60" : ""}`}>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-display text-xl" dir="ltr">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.titleAr}</p>
                        <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">/{p.slug}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-sm font-semibold text-ink">
                            {(displaySalePrice ?? displayPrice).toLocaleString("ar-EG")} ج.م
                          </span>
                          {displaySalePrice && (
                            <span className="text-xs text-muted-foreground line-through">
                              {displayPrice.toLocaleString("ar-EG")} ج.م
                            </span>
                          )}
                          {(p.colors?.length ?? 0) > 0 && (
                            <div className="flex gap-1">
                              {p.colors!.map((c) => (
                                <span key={c.id} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} title={c.label.ar || c.label.en} />
                              ))}
                            </div>
                          )}
                          {isHidden && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">مخفي</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => toggleHidden(p.slug, isHidden)} disabled={togglingHidden === p.slug}
                          className={`text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 ${isHidden ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
                          {togglingHidden === p.slug ? "..." : isHidden ? "إظهار" : "إخفاء"}
                        </button>
                        <button onClick={() => deleteProduct(p.id)}
                          className="text-xs border border-destructive/30 text-destructive rounded-lg px-3 py-1.5 hover:bg-destructive/5 transition-colors">
                          <Trash2 className="h-3 w-3 inline-block me-1" />حذف
                        </button>
                      </div>
                    </div>

                    {/* Images */}
                    <div className="border-t border-border pt-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-xs font-medium text-ink">الصور ({p.images.length})</p>
                        <button onClick={() => openImagePicker(p.id)} disabled={uploadingFor === p.id}
                          className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50">
                          {uploadingFor === p.id ? "جاري الرفع..." : "+ إضافة صورة"}
                        </button>
                      </div>
                      {p.images.length === 0 ? (
                        <button onClick={() => openPrimaryImagePicker(p.id)} disabled={primaryUploadingFor === p.id}
                          className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground hover:border-deep-blue/40 hover:bg-soft transition-colors disabled:opacity-50">
                          {primaryUploadingFor === p.id ? "..." : "+ صورة"}
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {p.images.map((src, idx) => {
                            const isPrimary = idx === 0;
                            const settingThis = dynSettingPrimary === `${p.id}:${idx}`;
                            const replacingThis = dynSettingPrimary === `${p.id}:r${idx}`;
                            return (
                              <div key={`${src}-${idx}`} className="relative group flex flex-col items-center gap-1">
                                <div className={`relative h-20 w-20 rounded-xl border-2 overflow-hidden ${isPrimary ? "border-deep-blue" : "border-border"}`}>
                                  <img src={src} alt="" className="w-full h-full object-cover" />
                                  <button onClick={() => removeImage(p.id, idx)}
                                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
                                </div>
                                <div className="flex gap-1">
                                  {isPrimary ? (
                                    <span className="text-[9px] text-deep-blue font-medium px-1">أساسية</span>
                                  ) : (
                                    <button onClick={() => setDynImagePrimary(p.id, idx)} disabled={!!settingThis}
                                      className="h-6 px-1.5 rounded-md bg-deep-blue/10 text-deep-blue text-[9px] font-medium hover:bg-deep-blue/20 transition-colors disabled:opacity-50">
                                      {settingThis ? "..." : "⭐ أساسية"}
                                    </button>
                                  )}
                                  <button onClick={() => openDynReplaceImagePicker(p.id, idx)} disabled={replacingThis}
                                    className="h-6 px-1.5 rounded-md bg-soft border border-border text-[9px] hover:bg-white transition-colors disabled:opacity-50">
                                    {replacingThis ? "..." : "بدّل"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="border-t border-border pt-4">
                      {!isEditingDetails ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-ink">التفاصيل</p>
                            <button onClick={() => startEditDyn(p)}
                              className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors">
                              تعديل
                            </button>
                          </div>
                          {(p.description || p.descriptionAr) && (
                            <div className="bg-soft rounded-xl px-4 py-3 space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">الوصف</p>
                              {p.descriptionAr && <p className="text-sm text-ink leading-relaxed line-clamp-3" dir="rtl">{p.descriptionAr}</p>}
                              {p.description && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1" dir="ltr">{p.description}</p>}
                            </div>
                          )}
                          {(p.features?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">المميزات</p>
                              <div className="space-y-1">
                                {p.features!.map((f, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className="text-deep-blue mt-0.5 shrink-0">✓</span>
                                    <span dir="rtl">{f.ar}</span>
                                    {f.en && <span className="text-muted-foreground" dir="ltr">· {f.en}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {(p.colors?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">الألوان ({p.colors!.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {p.colors!.map((c) => (
                                  <div key={c.id} className="flex items-center gap-1.5 text-xs bg-soft border border-border rounded-full px-2.5 py-1">
                                    <span className="h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                                    <span>{c.label.ar || c.label.en}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 pt-4 border-t border-border space-y-3">
                          <p className="text-xs font-medium text-ink">تعديل بيانات المنتج</p>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">الاسم (EN)</label>
                              <input className="lux-input text-sm" dir="ltr" value={dynEditForm.title}
                                onChange={(e) => setDynEditForm((f) => ({ ...f, title: e.target.value }))} placeholder="Product name" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">الاسم (AR)</label>
                              <input className="lux-input text-sm" dir="rtl" value={dynEditForm.titleAr}
                                onChange={(e) => setDynEditForm((f) => ({ ...f, titleAr: e.target.value }))} placeholder="اسم المنتج" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">السعر (ج.م)</label>
                              <input className="lux-input text-sm" type="number" min={0} dir="ltr" value={dynEditForm.price}
                                onChange={(e) => setDynEditForm((f) => ({ ...f, price: e.target.value }))} placeholder="0" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">سعر الخصم (اختياري)</label>
                              <input className="lux-input text-sm" type="number" min={0} dir="ltr" value={dynEditForm.salePrice}
                                onChange={(e) => setDynEditForm((f) => ({ ...f, salePrice: e.target.value }))} placeholder="0" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف (EN)</label>
                            <textarea className="lux-input text-sm resize-none" rows={2} dir="ltr" value={dynEditForm.description}
                              onChange={(e) => setDynEditForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description..." />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف (AR)</label>
                            <textarea className="lux-input text-sm resize-none" rows={2} dir="rtl" value={dynEditForm.descriptionAr}
                              onChange={(e) => setDynEditForm((f) => ({ ...f, descriptionAr: e.target.value }))} placeholder="الوصف..." />
                          </div>
                          {/* Features */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs text-muted-foreground">المميزات</label>
                              <button type="button" onClick={() => setDynEditForm((f) => ({ ...f, features: [...f.features, { en: "", ar: "" }] }))}
                                className="text-xs text-deep-blue hover:underline">+ إضافة</button>
                            </div>
                            <div className="space-y-2">
                              {dynEditForm.features.map((feat, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input className="lux-input text-xs flex-1" dir="ltr" placeholder="Feature EN" value={feat.en}
                                    onChange={(e) => setDynEditForm((f) => ({ ...f, features: f.features.map((x, idx) => idx === i ? { ...x, en: e.target.value } : x) }))} />
                                  <input className="lux-input text-xs flex-1" dir="rtl" placeholder="الميزة" value={feat.ar}
                                    onChange={(e) => setDynEditForm((f) => ({ ...f, features: f.features.map((x, idx) => idx === i ? { ...x, ar: e.target.value } : x) }))} />
                                  <button type="button" onClick={() => setDynEditForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }))}
                                    className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Colors */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs text-muted-foreground">الألوان</label>
                              <button type="button" onClick={() => setDynEditForm((f) => ({ ...f, colors: [...f.colors, { id: `c${Date.now()}`, label: { en: "", ar: "" }, hex: "#4B9CD3" }] }))}
                                className="text-xs text-deep-blue hover:underline">+ إضافة لون</button>
                            </div>
                            {dynEditForm.colors.length === 0 ? <p className="text-xs text-muted-foreground">بدون ألوان</p> : (
                              <div className="space-y-2">
                                {dynEditForm.colors.map((c, i) => (
                                  <div key={i} className="flex gap-2 items-center">
                                    <input type="color" value={c.hex}
                                      onChange={(e) => setDynEditForm((f) => ({ ...f, colors: f.colors.map((x, idx) => idx === i ? { ...x, hex: e.target.value } : x) }))}
                                      className="h-9 w-12 rounded-lg border border-border cursor-pointer p-1 shrink-0" />
                                    <input className="lux-input text-xs flex-1" dir="ltr" placeholder="Color EN" value={c.label.en}
                                      onChange={(e) => setDynEditForm((f) => ({ ...f, colors: f.colors.map((x, idx) => idx === i ? { ...x, label: { ...x.label, en: e.target.value } } : x) }))} />
                                    <input className="lux-input text-xs flex-1" dir="rtl" placeholder="اللون" value={c.label.ar}
                                      onChange={(e) => setDynEditForm((f) => ({ ...f, colors: f.colors.map((x, idx) => idx === i ? { ...x, label: { ...x.label, ar: e.target.value } } : x) }))} />
                                    <button type="button" onClick={() => setDynEditForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }))}
                                      className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => saveDynEdit(p.id)} disabled={savingDynEdit || !dynEditForm.title || !dynEditForm.titleAr || !dynEditForm.price}
                              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                              {savingDynEdit ? "جاري الحفظ..." : "حفظ التعديلات"}
                            </button>
                            <button onClick={() => setEditingDynId(null)} className="btn-ghost text-sm">إلغاء</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Bundles ── */}
      {subTab === "bundles" && (
        <div className="space-y-8">

        {/* Create new bundle */}
        <section>
          <h3 className="font-display text-xl mb-4">إضافة باقة جديدة</h3>
          <div className="lux-card p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (إنجليزي)</label>
                <input className="lux-input text-sm" placeholder="Smile Bundle" value={newBundleForm.titleEn}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, titleEn: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (عربي)</label>
                <input className="lux-input text-sm" placeholder="باقة سمايل" dir="rtl" value={newBundleForm.titleAr}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, titleAr: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                <input className="lux-input text-sm" placeholder="Complete oral care" value={newBundleForm.taglineEn}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, taglineEn: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                <input className="lux-input text-sm" placeholder="عناية كاملة بالفم" dir="rtl" value={newBundleForm.taglineAr}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, taglineAr: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">السعر (جنيه)</label>
                <input className="lux-input text-sm" type="number" min={0} placeholder="499" value={newBundleForm.price}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">المنتجات في الباقة</label>
              <div className="flex flex-wrap gap-2">
                {allProductOptions.map((opt) => {
                  const checked = newBundleForm.items.includes(opt.slug);
                  return (
                    <button key={opt.slug} type="button" onClick={() => toggleNewBundleItem(opt.slug)}
                      className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${checked ? "bg-deep-blue/10 border-deep-blue text-deep-blue" : "border-border hover:bg-soft"}`}>
                      {checked ? "✓ " : ""}{opt.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={createUserBundle} disabled={creatingBundle || !newBundleForm.titleEn.trim() || !newBundleForm.titleAr.trim() || newBundleForm.items.length === 0 || !newBundleForm.price}
              className="btn-primary text-sm disabled:opacity-50">
              {creatingBundle ? "جاري الإضافة..." : "إضافة الباقة"}
            </button>
          </div>
        </section>

        {/* User-created bundles */}
        {userBundles.length > 0 && (
        <section>
          <h3 className="font-display text-xl mb-4">الباقات ({userBundles.length})</h3>
          <div className="space-y-4">
            {userBundles.map((b) => {
              const isEditing = editingUserBundleId === b.id;
              const itemsSum = b.items.reduce((sum, slug) => {
                const sp = PRODUCTS.find((p) => p.slug === slug);
                if (sp) return sum + (sp.salePrice ?? sp.price);
                const dp = products.find((p) => p.slug === slug);
                if (dp) return sum + (dp.salePrice ?? dp.price);
                return sum;
              }, 0);
              const discountPct = itemsSum > b.price ? Math.round(((itemsSum - b.price) / itemsSum) * 100) : 0;
              return (
                <div key={b.id} className="lux-card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-lg">{b.titleAr}</p>
                      {b.taglineAr && <p className="text-xs text-muted-foreground mt-0.5">{b.taglineAr}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium text-deep-blue">{b.price.toLocaleString("ar-EG")} جنيه</span>
                        {itemsSum > b.price && (
                          <>
                            <span className="text-xs text-muted-foreground line-through">{itemsSum.toLocaleString("ar-EG")} جنيه</span>
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">−{discountPct}%</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{b.items.length} منتجات</span>
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {b.items.map((slug) => {
                          const sp = PRODUCTS.find((p) => p.slug === slug) || products.find((p) => p.slug === slug);
                          return sp ? <span key={slug} className="text-[10px] bg-soft border border-border rounded px-1.5 py-0.5" dir="ltr">{sp.title}</span> : null;
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => isEditing ? setEditingUserBundleId(null) : startEditUserBundle(b.id)}
                        className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors">
                        {isEditing ? "إغلاق" : "تعديل"}
                      </button>
                      <button onClick={() => deleteUserBundle(b.id)}
                        className="text-xs border border-destructive/30 text-destructive rounded-lg px-3 py-1.5 hover:bg-destructive/5 transition-colors">
                        حذف
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (إنجليزي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.titleEn}
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, titleEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (عربي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.titleAr} dir="rtl"
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, titleAr: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.taglineEn}
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, taglineEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.taglineAr} dir="rtl"
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, taglineAr: e.target.value }))} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">لتعديل السعر، اذهب إلى تبويب الأسعار.</p>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">المنتجات في الباقة</label>
                        <div className="flex flex-wrap gap-2">
                          {allProductOptions.map((opt) => {
                            const checked = editUserBundleForm.items.includes(opt.slug);
                            return (
                              <button key={opt.slug} type="button" onClick={() => toggleEditUserBundleItem(opt.slug)}
                                className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${checked ? "bg-deep-blue/10 border-deep-blue text-deep-blue" : "border-border hover:bg-soft"}`}>
                                {checked ? "✓ " : ""}{opt.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveUserBundle} disabled={savingUserBundle}
                          className="btn-primary text-sm disabled:opacity-50">
                          {savingUserBundle ? "جاري الحفظ..." : "حفظ التعديلات"}
                        </button>
                        <button onClick={() => setEditingUserBundleId(null)} className="btn-ghost text-sm">إلغاء</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Hardcoded bundle overrides */}
        <section>
          <h3 className="font-display text-xl mb-4">الباقات الأصلية ({BUNDLES.length})</h3>
          <div className="space-y-4">
            {BUNDLES.map((b) => {
              const ov = bundleOverrides[b.id] ?? {};
              const currentTitle = ov.titleAr || b.title.ar;
              const currentItems = ov.items ?? b.items;
              const currentDiscount = ov.discountPct ?? b.discountPct;
              const isEditing = editingBundleId === b.id;
              return (
                <div key={b.id} className="lux-card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-lg">{currentTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ov.taglineAr || b.tagline.ar}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-ink">خصم {currentDiscount}%</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{currentItems.length} منتجات</span>
                        {Object.keys(ov).length > 0 && <span className="text-[10px] bg-deep-blue/10 text-deep-blue rounded-full px-2 py-0.5">معدّل</span>}
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {currentItems.map((slug) => {
                          const sp = PRODUCTS.find((p) => p.slug === slug) || products.find((p) => p.slug === slug);
                          return sp ? <span key={slug} className="text-[10px] bg-soft border border-border rounded px-1.5 py-0.5" dir="ltr">{sp.title}</span> : null;
                        })}
                      </div>
                    </div>
                    <button onClick={() => isEditing ? setEditingBundleId(null) : startEditBundle(b.id)}
                      className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors shrink-0">
                      {isEditing ? "إغلاق" : "تعديل"}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (إنجليزي)</label>
                          <input className="lux-input text-sm" value={bundleForm.titleEn}
                            onChange={(e) => setBundleForm((f) => ({ ...f, titleEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (عربي)</label>
                          <input className="lux-input text-sm" value={bundleForm.titleAr} dir="rtl"
                            onChange={(e) => setBundleForm((f) => ({ ...f, titleAr: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                          <input className="lux-input text-sm" value={bundleForm.taglineEn}
                            onChange={(e) => setBundleForm((f) => ({ ...f, taglineEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                          <input className="lux-input text-sm" value={bundleForm.taglineAr} dir="rtl"
                            onChange={(e) => setBundleForm((f) => ({ ...f, taglineAr: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">المنتجات في الباقة</label>
                        <div className="flex flex-wrap gap-2">
                          {allProductOptions.map((opt) => {
                            const checked = bundleForm.items.includes(opt.slug);
                            return (
                              <button key={opt.slug} type="button" onClick={() => toggleBundleItem(opt.slug)}
                                className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${checked ? "bg-deep-blue/10 border-deep-blue text-deep-blue" : "border-border hover:bg-soft"}`}>
                                {checked ? "✓ " : ""}{opt.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveBundle} disabled={savingBundle}
                          className="btn-primary text-sm disabled:opacity-50">
                          {savingBundle ? "جاري الحفظ..." : "حفظ التعديلات"}
                        </button>
                        <button onClick={() => setEditingBundleId(null)} className="btn-ghost text-sm">إلغاء</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        </div>
      )}
    </div>
  );
}
