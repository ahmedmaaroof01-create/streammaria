import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Play, Settings } from "lucide-react";
import { listVideos } from "@/lib/drive.functions";
import { DynamicLogo } from "@/components/DynamicLogo";
import { HeroSlider } from "@/components/HeroSlider";

const videosQO = queryOptions({
  queryKey: ["videos"],
  queryFn: () => listVideos(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ماريا — منصة الأفلام" },
      { name: "description", content: "شاهد آلاف الأفلام بتجربة احترافية. منصة ماريا." },
      { property: "og:title", content: "ماريا — منصة الأفلام" },
      { property: "og:description", content: "شاهد آلاف الأفلام بتجربة احترافية." },
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

  const slider = useMemo(
    () =>
      (data.videos ?? [])
        .filter((v: any) => v.thumbnail_url)
        .slice(0, 10),
    [data.videos],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-3 sm:p-4">
          <DynamicLogo contentType={data.folder?.content_type} />
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="الإدارة"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-3 sm:p-4">
        {slider.length > 0 ? (
          <HeroSlider items={slider} />
        ) : (
          <section className="rounded-2xl border border-dashed p-8 text-center">
            <h1 className="text-xl font-bold">مرحباً بك في ماريا</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              لا توجد أفلام بعد. على الأدمن إضافة رابط مجلد Google Drive من{" "}
              <Link to="/admin" className="text-primary underline">
                لوحة الإدارة
              </Link>
              .
            </p>
          </section>
        )}

        {data.videos.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">كل الأفلام · {data.videos.length}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {data.videos.map((v: any) => (
                <Link
                  key={v.id}
                  to="/watch/$id"
                  params={{ id: v.id }}
                  className="group overflow-hidden rounded-xl border border-white/5 bg-card transition hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20"
                >
                  <div className="relative aspect-video bg-muted">
                    {v.thumbnail_url ? (
                      <img
                        src={v.thumbnail_url}
                        alt={v.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">🎬</div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <div className="rounded-full bg-white/90 p-3 text-black">
                        <Play className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                  </div>
                  <div className="p-2 text-xs">
                    <div className="line-clamp-2 font-medium">
                      {v.name.replace(/\.[a-z0-9]+$/i, "")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
