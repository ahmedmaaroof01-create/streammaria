import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trash2, Ban, Eye, LogOut, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setFolder, syncCurrentFolder } from "@/lib/drive.functions";
import {
  adminBlockVisitor,
  adminDeleteVisitor,
  adminListVisitors,
  adminStats,
  adminVisitorHistory,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "إدارة ماريا" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function useToken() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (!t) navigate({ to: "/admin" });
    else setToken(t);
  }, [navigate]);
  return token;
}

function Dashboard() {
  const token = useToken();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setFolderFn = useServerFn(setFolder);
  const syncFn = useServerFn(syncCurrentFolder);
  const stats = useServerFn(adminStats);
  const listVisitors = useServerFn(adminListVisitors);
  const block = useServerFn(adminBlockVisitor);
  const del = useServerFn(adminDeleteVisitor);

  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const statsQ = useQuery({
    queryKey: ["admin-stats", token],
    queryFn: () => stats({ data: { token: token! } }),
    enabled: !!token,
  });
  const visitorsQ = useQuery({
    queryKey: ["admin-visitors", token],
    queryFn: () => listVisitors({ data: { token: token! } }),
    enabled: !!token,
  });

  if (!token) return <div className="p-8 text-center">…</div>;

  const importFolder = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const res = await setFolderFn({ data: { url } });
      toast.success(`تم استيراد ${res.count} فيديو`);
      setUrl("");
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "فشل");
    } finally {
      setBusy(false);
    }
  };
  const sync = async () => {
    setBusy(true);
    try {
      const res = await syncFn();
      toast.success(`مزامنة — ${res.count} فيديو`);
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e: any) {
      toast.error(e?.message ?? "فشل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-3">
          <h1 className="text-lg font-bold">لوحة الإدارة</h1>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              عرض الموقع
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem("admin_token");
                navigate({ to: "/admin" });
              }}
            >
              <LogOut className="ml-1 h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{statsQ.data?.videos ?? "—"}</div>
            <div className="text-xs text-muted-foreground">فيديو</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{statsQ.data?.visitors ?? "—"}</div>
            <div className="text-xs text-muted-foreground">زائر</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold">{statsQ.data?.sessions ?? "—"}</div>
            <div className="text-xs text-muted-foreground">مشاهدة</div>
          </Card>
        </div>

        <Tabs defaultValue="folders">
          <TabsList>
            <TabsTrigger value="folders">المجلدات</TabsTrigger>
            <TabsTrigger value="visitors">الزوار</TabsTrigger>
          </TabsList>

          <TabsContent value="folders" className="space-y-3">
            <Card className="p-4">
              <h2 className="mb-2 text-sm font-semibold">استيراد مجلد Google Drive</h2>
              <p className="mb-3 text-xs text-muted-foreground">
                ألصق رابط مجلد عام. الاستيراد بدون مفتاح API محدود بحدود ما تعرضه Google لروبوتات الويب
                (عادةً مئات قليلة لكل مجلد). للمجلدات الكبيرة جداً، قسّمها إلى مجلدات فرعية.
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
                <Button onClick={importFolder} disabled={busy || !url.trim()}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "استيراد"}
                </Button>
                <Button variant="outline" onClick={sync} disabled={busy}>
                  <RefreshCw className="ml-2 h-4 w-4" />
                  مزامنة
                </Button>
              </div>
            </Card>

            {statsQ.data?.folders?.length ? (
              <Card className="p-3">
                <h3 className="mb-2 text-sm font-semibold">المجلدات المرتبطة</h3>
                <ul className="space-y-2 text-xs">
                  {statsQ.data.folders.map((f: any) => (
                    <li key={f.id} className="flex items-center justify-between border-b pb-2">
                      <div className="truncate" dir="ltr">{f.drive_url}</div>
                      <div className="text-muted-foreground">
                        {f.last_synced_at ? `آخر مزامنة: ${new Date(f.last_synced_at).toISOString().slice(0, 10)}` : "—"}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="visitors">
            <Card className="p-3">
              <h2 className="mb-3 text-sm font-semibold">
                الزوار ({visitorsQ.data?.visitors.length ?? 0})
              </h2>
              <div className="space-y-2">
                {(visitorsQ.data?.visitors ?? []).map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-col gap-2 rounded-lg border p-2 text-xs sm:flex-row sm:items-center"
                  >
                    {v.last?.thumbnail ? (
                      <img
                        src={v.last.thumbnail}
                        alt=""
                        className="h-12 w-20 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-20 items-center justify-center rounded bg-muted">—</div>
                    )}
                    <div className="flex-1">
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {v.visitor_key.slice(0, 16)}…
                      </div>
                      {v.last ? (
                        <div className="font-medium line-clamp-1">
                          آخر فيلم: {v.last.video_name ?? "—"} ({Math.floor(v.last.watched_seconds)}ث)
                        </div>
                      ) : (
                        <div className="text-muted-foreground">لم يشاهد بعد</div>
                      )}
                      {v.blocked && (
                        <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] text-destructive">
                          محظور
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <VisitorDetails token={token} visitorId={v.id} />
                      <Button
                        size="icon"
                        variant="ghost"
                        title={v.blocked ? "إلغاء الحظر" : "حظر"}
                        onClick={async () => {
                          await block({ data: { token, visitorId: v.id, block: !v.blocked } });
                          toast.success("تم التحديث");
                          qc.invalidateQueries({ queryKey: ["admin-visitors"] });
                        }}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="حذف"
                        onClick={async () => {
                          if (!confirm("حذف الزائر وكل بياناته؟")) return;
                          await del({ data: { token, visitorId: v.id } });
                          toast.success("تم الحذف");
                          qc.invalidateQueries({ queryKey: ["admin-visitors"] });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function VisitorDetails({ token, visitorId }: { token: string; visitorId: string }) {
  const [open, setOpen] = useState(false);
  const history = useServerFn(adminVisitorHistory);
  const q = useQuery({
    queryKey: ["visitor-history", visitorId],
    queryFn: () => history({ data: { token, visitorId } }),
    enabled: open,
  });
  return (
    <>
      <Button size="icon" variant="ghost" title="تفاصيل" onClick={() => setOpen(true)}>
        <Eye className="h-4 w-4" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">سجل الزائر</h3>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>إغلاق</Button>
            </div>
            {q.isLoading ? (
              <div className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            ) : (
              <div className="space-y-4 text-xs">
                <section>
                  <h4 className="mb-1 font-semibold">المشاهدات ({q.data?.sessions.length ?? 0})</h4>
                  <ul className="space-y-1">
                    {q.data?.sessions.map((s: any) => (
                      <li key={s.id} className="rounded border p-2">
                        <div className="font-medium">{s.video?.name ?? s.video_id}</div>
                        <div className="text-muted-foreground">
                          {new Date(s.started_at).toISOString().slice(0, 16).replace("T", " ")} · {Math.floor(s.watched_seconds)}ث · توقف عند {Math.floor(s.last_position)}ث
                          {s.completed ? " · مكتمل" : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4 className="mb-1 font-semibold">محادثات ماريا ({q.data?.chats.length ?? 0})</h4>
                  <ul className="space-y-1">
                    {q.data?.chats.map((c: any) => (
                      <li key={c.id} className={`rounded p-2 ${c.role === "user" ? "bg-muted" : "bg-primary/10"}`}>
                        <span className="text-[10px] text-muted-foreground">{c.role === "user" ? "المستخدم" : "ماريا"}: </span>
                        {c.content}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
