import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, Link2 } from "lucide-react";
import { listVideos, setFolder, syncCurrentFolder } from "@/lib/drive.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DynamicLogo } from "@/components/DynamicLogo";

const videosQO = queryOptions({
  queryKey: ["videos"],
  queryFn: () => listVideos(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مكتبتي - شغّل فيديوهاتك من Google Drive" },
      { name: "description", content: "ألصق رابط مجلد Drive عام وابدأ المشاهدة فوراً." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(videosQO),
  component: Home,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">خطأ: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">الصفحة غير موجودة</div>,
});

function Home() {
  const { data } = useSuspenseQuery(videosQO);
  const qc = useQueryClient();
  const setFolderFn = useServerFn(setFolder);
  const syncFn = useServerFn(syncCurrentFolder);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await setFolderFn({ data: { url } });
      toast.success(`تم استيراد ${res.count} فيديو`);
      setUrl("");
      await qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (e: any) {
      toast.error(e?.message ?? "حدث خطأ");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const res = await syncFn();
      toast.success(`المزامنة تمت — ${res.count ?? 0} فيديو`);
      await qc.invalidateQueries({ queryKey: ["videos"] });
    } catch (e: any) {
      toast.error(e?.message ?? "فشلت المزامنة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <DynamicLogo contentType={data.folder?.content_type} />
          <Link to="/stats" className="text-sm text-muted-foreground hover:text-foreground">
            الإحصائيات
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4">
        <Card className="p-4">
          <h1 className="mb-2 text-lg font-semibold">استيراد مجلد Google Drive</h1>
          <p className="mb-3 text-sm text-muted-foreground">
            ألصق رابط مجلد عام (مشاركته: "أي شخص لديه الرابط"). يتم استيراد كل الفيديوهات دفعة واحدة، ومزامنتها تلقائياً كل 24 ساعة.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                dir="ltr"
                placeholder="https://drive.google.com/drive/folders/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pr-9"
              />
            </div>
            <Button onClick={submit} disabled={busy || !url.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "استيراد"}
            </Button>
            {data.folder && (
              <Button variant="outline" onClick={sync} disabled={busy}>
                <RefreshCw className="ml-2 h-4 w-4" />
                مزامنة الآن
              </Button>
            )}
          </div>
          {data.folder?.last_synced_at && (
            <p className="mt-2 text-xs text-muted-foreground">
              آخر مزامنة: {new Date(data.folder.last_synced_at).toLocaleString("ar")}
            </p>
          )}
        </Card>

        {data.videos.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            لا توجد فيديوهات بعد. أضف رابط مجلد للبدء.
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.videos.map((v: any) => (
              <Link
                key={v.id}
                to="/watch/$id"
                params={{ id: v.id }}
                className="group overflow-hidden rounded-lg border bg-card transition hover:shadow-md"
              >
                <div className="relative aspect-video bg-muted">
                  {v.thumbnail_url ? (
                    <img
                      src={v.thumbnail_url}
                      alt={v.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      🎬
                    </div>
                  )}
                </div>
                <div className="p-2 text-sm">
                  <div className="line-clamp-2 font-medium">{v.name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
