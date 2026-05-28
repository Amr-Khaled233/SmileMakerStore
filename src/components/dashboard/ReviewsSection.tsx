import { useState, useCallback, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";

export function ReviewsSection({ token }: { token: string }) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const imgs = await api.getReviewImages().catch(() => [] as string[]);
    setImages(imgs);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setUploading(true);
    for (const file of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      await api.addReviewImage(token, dataUrl).catch(() => {});
    }
    await load();
    setUploading(false);
  };

  const deleteImage = async (idx: number) => {
    if (!window.confirm("حذف الصورة؟")) return;
    await api.deleteReviewImage(token, idx).catch(() => {});
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  if (!loaded) return <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl">آراء العملاء</h2>
          <p className="text-sm text-muted-foreground mt-1">الصور دي بتظهر في سلايدر على الصفحة الرئيسية.</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="btn-primary text-sm disabled:opacity-50">
          {uploading ? "جاري الرفع..." : "+ رفع صور"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
      </div>

      {images.length === 0 ? (
        <div className="lux-card p-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">لا توجد صور بعد — ارفع صور آراء العملاء لتظهر في السلايدر.</p>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="btn-ghost text-sm disabled:opacity-50">
            {uploading ? "جاري الرفع..." : "+ رفع أول صورة"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((src, idx) => (
            <div key={idx} className="relative group rounded-2xl overflow-hidden border border-border aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button onClick={() => deleteImage(idx)}
                  className="h-9 w-9 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <span className="absolute top-2 start-2 text-[10px] font-medium bg-black/50 text-white rounded-full px-2 py-0.5">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
