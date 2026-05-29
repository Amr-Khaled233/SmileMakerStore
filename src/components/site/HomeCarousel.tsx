import { useState, useEffect, useRef, useCallback } from "react";

type Props = { images: string[] };

export function HomeCarousel({ images }: Props) {
  const [allLoaded, setAllLoaded] = useState(false);
  const [idx, setIdx] = useState(1);
  const [animated, setAnimated] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);

  // Preload every image before showing the carousel so no white flash mid-swipe
  useEffect(() => {
    if (images.length === 0) return;
    let cancelled = false;
    Promise.all(
      images.map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      ),
    ).then(() => { if (!cancelled) setAllLoaded(true); });
    return () => { cancelled = true; };
  }, [images]);

  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animated]);

  const goTo = useCallback((newIdx: number) => {
    setAnimated(true);
    setIdx(newIdx);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimated(true);
      setIdx((i) => i + 1);
    }, 4000);
  }, []);

  useEffect(() => {
    if (!allLoaded) return;
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [allLoaded, startTimer]);

  if (images.length === 0 || !allLoaded) return null;

  const n = images.length;
  const extended = [images[n - 1], ...images, images[0]];
  const total = extended.length;

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
        className="overflow-hidden rounded-3xl shadow-[var(--shadow-glow)]"
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
            transition: animated ? "transform 0.5s cubic-bezier(0.4,0,0.2,1)" : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {extended.map((src, i) => (
            <div key={i} className="aspect-square sm:aspect-[16/9]" style={{ width: `${100 / total}%` }}>
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

      {n > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { goTo(i + 1); startTimer(); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${dotIdx === i ? "w-8 bg-deep-blue" : "w-1.5 bg-border hover:bg-muted-foreground"}`}
              aria-label={`الصورة ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
