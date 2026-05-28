import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import { PRODUCTS } from "@/data/products";

import slide1 from "@/assets/h2o-flosser-1.jpeg";
import slide2 from "@/assets/electric-brush-1.jpeg";
import slide3 from "@/assets/ortho-kit-1.jpeg";
import slide4 from "@/assets/l-shaped-1.jpeg";
import slide5 from "@/assets/ortho-wax-main.jpeg";

const FALLBACK_SLIDES = [slide1, slide2, slide3, slide4, slide5];

export function ProductCarousel() {
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  const [idx, setIdx] = useState(1);
  const [animated, setAnimated] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);

  useEffect(() => {
    Promise.all([
      api.getProductsMeta().catch(() => ({ imageOverrides: {} as Record<string, string[]>, hidden: [] as string[] })),
      api.getDynamicProducts().catch(() => []),
    ]).then(([meta, dynProds]) => {
      const imgs: string[] = [];
      for (const p of PRODUCTS) {
        if (meta.hidden.includes(p.slug)) continue;
        const ov = (meta.imageOverrides as Record<string, string[]>)[p.slug];
        imgs.push(ov?.[0] ?? p.image);
      }
      for (const p of dynProds) {
        if (p.outOfStock) continue;
        if (p.images[0]) imgs.push(p.images[0]);
      }
      if (imgs.length > 0) { setSlides(imgs); setIdx(1); }
    });
  }, []);

  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animated]);

  const n = slides.length;
  const extended = [slides[n - 1], ...slides, slides[0]];
  const total = extended.length;

  const goTo = useCallback((newIdx: number) => {
    setAnimated(true);
    setIdx(newIdx);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimated(true);
      setIdx((i) => i + 1);
    }, 3000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const onTransitionEnd = () => {
    if (idx === 0) { setAnimated(false); setIdx(n); }
    else if (idx === n + 1) { setAnimated(false); setIdx(1); }
  };

  const dotIdx = idx === 0 ? n - 1 : idx === n + 1 ? 0 : idx - 1;
  const offset = -(idx * (100 / total));

  const onMouseDown = (e: React.MouseEvent) => {
    if (timerRef.current) clearInterval(timerRef.current);
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragStartX.current === null) return;
    dragDelta.current = e.clientX - dragStartX.current;
  };
  const onMouseUp = () => {
    if (dragStartX.current === null) return;
    const d = dragDelta.current;
    dragStartX.current = null;
    if (d < -50) goTo(idx + 1);
    else if (d > 50) goTo(idx - 1);
    startTimer();
  };
  const onTouchStart = (e: React.TouchEvent) => {
    if (timerRef.current) clearInterval(timerRef.current);
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
    startTimer();
  };

  return (
    <div className="select-none">
      <div
        className="overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl"
        style={{ cursor: "grab" }}
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
            <div key={i} className="aspect-square sm:aspect-[4/3]" style={{ width: `${100 / total}%` }}>
              <img
                src={src}
                alt=""
                draggable={false}
                loading="eager"
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { goTo(i + 1); startTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${dotIdx === i ? "w-6 bg-deep-blue" : "w-1.5 bg-border"}`}
            aria-label={`الصورة ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
