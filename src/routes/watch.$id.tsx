import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ThumbsDown, ThumbsUp, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import {
  getVideo,
  listSnapshots,
  recordInteraction,
  recordWatch,
  saveSnapshot,
} from "@/lib/drive.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getVisitorKey } from "@/lib/visitor";

const videoQO = (id: string) =>
  queryOptions({ queryKey: ["video", id], queryFn: () => getVideo({ data: { id } }) });
const snapsQO = (id: string) =>
  queryOptions({
    queryKey: ["snaps", id],
    queryFn: () => listSnapshots({ data: { videoId: id } }),
  });

export const Route = createFileRoute("/watch/$id")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(videoQO(params.id)),
      context.queryClient.ensureQueryData(snapsQO(params.id)),
    ]),
  component: Watch,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">خطأ: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">الفيديو غير موجود</div>,
});

function Watch() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(videoQO(id));
  const { data: snaps } = useSuspenseQuery(snapsQO(id));
  const qc = useQueryClient();
  const interact = useServerFn(recordInteraction);
  const watch = useServerFn(recordWatch);
  const snap = useServerFn(saveSnapshot);

  const progressRef = useRef({ position: 0, watched: 0, duration: 0, completed: false });
  const [tag, setTag] = useState("");

  // Save watch session on unmount / unload
  useEffect(() => {
    const flush = () => {
      const p = progressRef.current;
      if (p.watched < 1) return;
      watch({
        data: {
          visitorKey: getVisitorKey(),
          videoId: id,
          watchedSeconds: Math.round(p.watched),
          lastPosition: Math.round(p.position),
          completed: p.completed,
        },
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [id, watch]);

  const src = `https://drive.google.com/uc?export=download&id=${data.video.drive_file_id}`;

  const doLike = async (type: "like" | "dislike") => {
    await interact({ data: { visitorKey: getVisitorKey(), videoId: id, type } });
    toast.success(type === "like" ? "تم الإعجاب" : "تم التسجيل");
    qc.invalidateQueries({ queryKey: ["video", id] });
  };
  const addTag = async () => {
    if (!tag.trim()) return;
    await interact({
      data: { visitorKey: getVisitorKey(), videoId: id, type: "tag", value: tag.trim() },
    });
    setTag("");
    qc.invalidateQueries({ queryKey: ["video", id] });
  };
  const handleSnapshot = async (dataUrl: string, position: number) => {
    if (!dataUrl) {
      toast.error("تعذرت اللقطة بسبب قيود المصدر.");
      return;
    }
    await snap({
      data: { visitorKey: getVisitorKey(), videoId: id, position, imageData: dataUrl },
    });
    toast.success("تم حفظ اللقطة");
    qc.invalidateQueries({ queryKey: ["snaps", id] });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 p-3">
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" />
            العودة
          </Link>
          <h1 className="line-clamp-1 flex-1 text-sm font-medium">{data.video.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
        <VideoPlayer
          src={src}
          mimeType={data.video.mime_type}
          poster={data.video.thumbnail_url}
          onProgress={(p) => (progressRef.current = p)}
          onSnapshot={handleSnapshot}
        />

        <Card className="flex flex-wrap items-center gap-2 p-3">
          <Button variant="outline" size="sm" onClick={() => doLike("like")}>
            <ThumbsUp className="ml-1 h-4 w-4" />
            {data.stats.likes}
          </Button>
          <Button variant="outline" size="sm" onClick={() => doLike("dislike")}>
            <ThumbsDown className="ml-1 h-4 w-4" />
            {data.stats.dislikes}
          </Button>
          <span className="mx-2 text-sm text-muted-foreground">
            {data.stats.views} مشاهدة
          </span>
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder="أضف اهتماماً (وسم)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              className="max-w-xs"
            />
            <Button size="sm" onClick={addTag} variant="secondary">
              <TagIcon className="ml-1 h-4 w-4" />
              إضافة
            </Button>
          </div>
        </Card>

        {data.stats.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.stats.tags.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        )}

        {snaps.snapshots.length > 0 && (
          <Card className="p-3">
            <h2 className="mb-2 text-sm font-semibold">اللقطات المحفوظة</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {snaps.snapshots.map((s: any) => (
                <div key={s.id} className="overflow-hidden rounded border">
                  {s.image_data && (
                    <img src={s.image_data} alt="snapshot" className="aspect-video w-full object-cover" />
                  )}
                  <div className="bg-muted/30 p-1 text-center text-[10px] text-muted-foreground">
                    {Math.floor(Number(s.position_seconds))}s
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
