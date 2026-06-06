import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Link } from "@tanstack/react-router";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";

type Item = { id: string; name: string; thumbnail_url: string | null; drive_file_id: string };

export function HeroSlider({ items }: { items: Item[] }) {
  const [emblaRef, embla] = useEmblaCarousel(
    { loop: true, direction: "rtl", align: "center" },
    [Autoplay({ delay: 5500, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSel);
    onSel();
    return () => {
      embla.off("select", onSel);
    };
  }, [embla]);

  if (!items.length) return null;

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-white/5 bg-black">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {items.map((it) => (
            <div key={it.id} className="relative aspect-[16/9] min-w-0 flex-[0_0_100%] sm:aspect-[21/9]">
              {it.thumbnail_url && (
                <img
                  src={it.thumbnail_url.replace(/=w\d+/, "=w1280")}
                  alt={it.name}
                  className="absolute inset-0 h-full w-full animate-[kenburns_12s_ease-in-out_infinite_alternate] object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="absolute bottom-0 right-0 left-0 p-4 sm:p-8">
                <h2 className="mb-3 line-clamp-2 text-xl font-bold text-white drop-shadow-lg sm:text-3xl">
                  {it.name.replace(/\.[a-z0-9]+$/i, "")}
                </h2>
                <div className="flex items-center gap-2">
                  <Link
                    to="/watch/$id"
                    params={{ id: it.id }}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    شاهد الآن
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        aria-label="السابق"
        onClick={() => embla?.scrollPrev()}
        className="absolute top-1/2 right-2 z-10 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60 sm:block"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <button
        aria-label="التالي"
        onClick={() => embla?.scrollNext()}
        className="absolute top-1/2 left-2 z-10 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60 sm:block"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            aria-label={`الانتقال إلى ${i + 1}`}
            onClick={() => embla?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === selected ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
          />
        ))}
      </div>
    </section>
  );
}
