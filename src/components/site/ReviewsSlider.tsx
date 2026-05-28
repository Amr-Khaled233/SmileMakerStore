import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

export function ReviewsSlider() {
  const { lang } = useT();
  const [images, setImages] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [idx, setIdx] = useState(1);
  const [animated, setAnimated] = useState(true);
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    api.getReviewImages().then((imgs) => { setImages(imgs); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animated]);

  if (!loaded || images.length === 0) return null;

  const n = images.length;
  const extended = [images[n - 1], ...images, images[0]];
  const total = extended.length;

  const goTo = (newIdx: number, withAnim = true) => {
    setAnimated(withAnim);
    setIdx(newIdx);
  };

  const onTransitionEnd = () => {
    if (idx === 0) { setAnimated(false); setIdx(n); }
    else if (idx === n + 1) { setAnimated(false); setIdx(1); }
  };

  const dotIdx = idx === 0 ? n - 1 : idx === n + 1 ? 0 : idx - 1;
  const offset = -(idx * (100 / total));

  const onMouseDown = (e: React.MouseEvent) => {
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    isDragging.current = false;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    dragDelta.current = e.clientX - dragStartX.current;
    if (Math.abs(dragDelta.current) > 5) isDragging.current = true;
  };
  const onMouseUp = () => {
    if (dragStartX.current === null) return;
    const d = dragDelta.current;
    dragStartX.current = null;
    if (d < -50) goTo(idx + 1);
    else if (d > 50) goTo(idx - 1);
    isDragging.current = false;
  };
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
    dragDelta.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    dragDelta.current = e.touches[0].clientX - dragStartX.current;
  };
  const onTouchEnd = () => {
    if (dragStartX.current === null) return;
    const d = dragDelta.current;
    dragStartX.current = null;
    if (d < -50) goTo(idx + 1);
    else if (d > 50) goTo(idx - 1);
  };

  return (
    <section className="section-pad bg-soft">
      <div className="container-lux">
        <div className="text-center max-w-xl mx-auto mb-10">
          <p className="eyebrow">{lang === "ar" ? "آراء العملاء" : "Customer Reviews"}</p>
          <h2 className="mt-3 text-4xl md:text-5xl">
            {lang === "ar" ? "ماذا يقول عملاؤنا" : "What our customers say"}
          </h2>
        </div>
      </div>

      <div
        className="overflow-hidden select-none px-4 sm:px-0"
        style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(${offset}%)`,
            transition: animated ? "transform 0.45s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {extended.map((src, i) => (
            <div key={i} className="px-3 sm:px-6" style={{ width: `${100 / total}%` }}>
              <div
                className="rounded-2xl overflow-hidden border border-border shadow-sm mx-auto max-w-2xl"
                style={{ aspectRatio: "1 / 1" }}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {n > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i + 1)}
              className={`h-2 rounded-full transition-all duration-300 ${
                dotIdx === i ? "w-6 bg-deep-blue" : "w-2 bg-border hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
