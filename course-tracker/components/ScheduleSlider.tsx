"use client";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

interface ScheduleImage {
  id: string;
  src: string;
  alt: string;
  dateRange: string;
  weekNumber?: number;
}

const scheduleImages: ScheduleImage[] = [
  { id: "week10", src: "/schedules/10.jpg", alt: "Week 10 Schedule", dateRange: "27th April – 3rd May 2026", weekNumber: 10 },
  { id: "week9", src: "/schedules/9.jpg", alt: "Week 9 Schedule", dateRange: "20th April – 26th April 2026", weekNumber: 9 },
  { id: "week8", src: "/schedules/8.jpg", alt: "Week 8 Schedule", dateRange: "13th April – 19th April 2026", weekNumber: 8 },
  { id: "week7", src: "/schedules/7.jpg", alt: "Week 7 Schedule", dateRange: "6th April – 12th April 2026", weekNumber: 7 },
  { id: "week6", src: "/schedules/6.jpg", alt: "Week 6 Schedule", dateRange: "30th March – 5th April 2026", weekNumber: 6 },
  { id: "week5", src: "/schedules/5.jpg", alt: "Week 5 Schedule", dateRange: "23rd March – 29th March 2026", weekNumber: 5 },
  { id: "week4b", src: "/schedules/4.jpg", alt: "Week 4 Schedule", dateRange: "16th March – 22nd March 2026", weekNumber: 4 },
  { id: "week4a", src: "/schedules/3.jpeg", alt: "Week 4 Schedule", dateRange: "9th March – 15th March 2026", weekNumber: 4 },
  { id: "week3", src: "/schedules/2.jpg", alt: "Week 3 Schedule", dateRange: "2nd March – 8th March 2026", weekNumber: 3 },
  { id: "week2", src: "/schedules/1.jpeg", alt: "Week 2 Schedule", dateRange: "23rd Feb – 1st March 2026", weekNumber: 2 },
];

function ImageFallback({ image }: { image: ScheduleImage }) {
  return (
    <div className="w-full h-full flex items-center justify-center rounded-lg"
      style={{ background: "linear-gradient(135deg, var(--tint-accent), var(--surface2))" }}>
      <div className="text-center p-4">
        <div className="text-3xl mb-2">📋</div>
        <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>
          {image.weekNumber ? `Week ${image.weekNumber} Schedule` : "Schedule"}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{image.dateRange}</p>
      </div>
    </div>
  );
}

function SlideImage({ image, onClick }: { image: ScheduleImage; onClick: () => void }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="w-full h-full cursor-zoom-in" onClick={onClick}>
      {failed ? (
        <ImageFallback image={image} />
      ) : (
        <img
          src={image.src}
          alt={image.alt}
          className="w-full h-full object-contain rounded-lg"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function Lightbox({ index, onClose, onPrev, onNext }: {
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const image = scheduleImages[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ zIndex: 9999, backdropFilter: "blur(28px) saturate(0.7)", background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      {/* Label + close */}
      <div className="flex items-center justify-between w-full max-w-4xl mb-4 px-1"
        onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "#fff" }}>
            {image.weekNumber ? `Week ${image.weekNumber} Schedule` : "Schedule"}
          </p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{image.dateRange}</p>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            {index + 1} / {scheduleImages.length}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "14px" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Image + side nav */}
      <div className="relative flex items-center justify-center w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onPrev}
          className="absolute left-0 -translate-x-2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontSize: "22px" }}
        >
          ‹
        </button>

        <img
          src={image.src}
          alt={image.alt}
          className="rounded-2xl"
          style={{
            maxWidth: "min(80vw, 860px)",
            maxHeight: "78vh",
            objectFit: "contain",
            boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          }}
        />

        <button
          onClick={onNext}
          className="absolute right-0 translate-x-2 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", fontSize: "22px" }}
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-5" onClick={(e) => e.stopPropagation()}>
        {scheduleImages.map((_, i) => (
          <div key={i} style={{
            width: i === index ? "20px" : "6px",
            height: "6px",
            borderRadius: "99px",
            background: i === index ? "#fff" : "rgba(255,255,255,0.3)",
            transition: "all 0.2s",
          }} />
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>esc or click outside to close · ← → to navigate</p>
    </div>,
    document.body
  );
}

export default function ScheduleSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((i) => (i === 0 ? scheduleImages.length - 1 : i - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i === scheduleImages.length - 1 ? 0 : i + 1));
  }, []);

  const current = scheduleImages[currentIndex];

  return (
    <>
      <div className="glass p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>📅 Weekly Schedules</p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {current.dateRange}{current.weekNumber ? ` · Week ${current.weekNumber}` : ""}
            </p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--tint-accent)", color: "var(--accent)", border: "1px solid var(--border)" }}>
            {currentIndex + 1} / {scheduleImages.length}
          </span>
        </div>

        {/* Slider */}
        <div className="relative rounded-xl overflow-hidden" style={{ height: "220px", background: "var(--surface2)" }}>
          <SlideImage image={current} onClick={() => setLightboxOpen(true)} />

          {/* Prev */}
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "18px" }}
          >
            ‹
          </button>

          {/* Next */}
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: "18px" }}
          >
            ›
          </button>

          {/* Click hint */}
          <div className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full pointer-events-none"
            style={{ background: "rgba(0,0,0,0.5)", color: "rgba(255,255,255,0.6)", backdropFilter: "blur(4px)" }}>
            click to expand
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-3">
          {scheduleImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className="transition-all hover:scale-125"
              style={{
                width: i === currentIndex ? "20px" : "6px",
                height: "6px",
                borderRadius: "99px",
                background: i === currentIndex ? "var(--accent)" : "var(--border)",
                opacity: i === currentIndex ? 1 : 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          index={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={goToPrevious}
          onNext={goToNext}
        />
      )}
    </>
  );
}
