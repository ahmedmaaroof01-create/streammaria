import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Maximize, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { getVideo, recordInteraction, recordWatch } from "@/lib/drive.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getVisitorKey } from "@/lib/visitor";

const videoQO = (id: string) =>
  queryOptions({ queryKey: ["video", id], queryFn: () => getVideo({ data: { id } }) });

export const Route = createFileRoute("/watch/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(videoQO(params.id)),
  component: Watch,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">خطأ: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">الفيديو غير موجود</div>,
});

function Watch() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(videoQO(id));
  const qc = useQueryClient();
  const interact = useServerFn(recordInteraction);
  const watch = useServerFn(recordWatch);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Record watch on unload (best-effort time tracking)
  useEffect(() => {
    const flush = () => {
      const sec = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
      if (sec < 3) return;
      watch({
        data: {
          visitorKey: getVisitorKey(),
          videoId: id,
          watchedSeconds: sec,
          lastPosition: sec,
          completed: false,
        },
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [id, watch]);

  const previewUrl = `https://drive.google.com/file/d/${data.video.drive_file_id}/preview`;

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  const doLike = async (type: "like" | "dislike") => {
    await interact({ data: { visitorKey: getVisitorKey(), videoId: id, type } });
    toast.success(type === "like" ? "تم الإعجاب" : "تم التسجيل");
    qc.invalidateQueries({ queryKey: ["video", id] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center gap-3 p-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" />
            الرئيسية
          </Link>
          <h1 className="line-clamp-1 flex-1 text-sm font-medium">
            {data.video.name.replace(/\.[a-z0-9]+$/i, "")}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        <div
          ref={containerRef}
          className={`relative w-full overflow-hidden rounded-xl border border-white/5 bg-black ${
            fs ? "" : "aspect-video max-h-[70vh]"
          }`}
        >
          <iframe
            src={previewUrl}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            title={data.video.name}
          />
          <button
            onClick={toggleFullscreen}
            aria-label="ملء الشاشة"
            className="absolute bottom-3 left-3 z-10 rounded-full bg-black/70 p-2 text-white backdrop-blur hover:bg-black"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>

        <Card className="flex flex-wrap items-center gap-2 p-3">
          <Button variant="outline" size="sm" onClick={() => doLike("like")}>
            <ThumbsUp className="ml-1 h-4 w-4" />
            {data.stats.likes}
          </Button>
          <Button variant="outline" size="sm" onClick={() => doLike("dislike")}>
            <ThumbsDown className="ml-1 h-4 w-4" />
            {data.stats.dislikes}
          </Button>
          <span className="mr-auto text-sm text-muted-foreground">
            {data.stats.views} مشاهدة
          </span>
          <Button size="sm" variant="secondary" onClick={toggleFullscreen}>
            <Maximize className="ml-1 h-4 w-4" />
            ملء الشاشة
          </Button>
        </Card>

        <p className="text-xs text-muted-foreground">
          تحدّث مع ماريا من خلال أيقونة الدردشة في الزاوية للحصول على اقتراحات.
        </p>
      </main>
    </div>
  );
}
