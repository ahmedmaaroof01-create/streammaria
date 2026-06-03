import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { getStats } from "@/lib/drive.functions";
import { Card } from "@/components/ui/card";

const statsQO = queryOptions({ queryKey: ["stats"], queryFn: () => getStats() });

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "الإحصائيات" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQO),
  component: Stats,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">خطأ: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function Stats() {
  const { data } = useSuspenseQuery(statsQO);
  const items = [...data.items].sort((a, b) => b.watched - a.watched);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}س ${m % 60}د` : `${m}د`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 p-3">
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" />
            العودة
          </Link>
          <h1 className="text-sm font-medium">الإحصائيات</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-2 p-4">
        {items.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">لا توجد بيانات بعد.</Card>
        )}
        {items.map((it) => (
          <Card key={it.id} className="flex items-center gap-3 p-2">
            {it.thumb && (
              <img src={it.thumb} alt="" className="h-14 w-24 rounded object-cover" />
            )}
            <div className="flex-1">
              <div className="line-clamp-1 text-sm font-medium">{it.name}</div>
              <div className="text-xs text-muted-foreground">
                {it.views} مشاهدة • {fmt(it.watched)} • أكمل {it.completed} مرة • ❤ {it.likes}
              </div>
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
