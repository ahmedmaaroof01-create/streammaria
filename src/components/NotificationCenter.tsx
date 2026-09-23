import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { listNotifications, markNotificationsRead } from "@/lib/maria.functions";
import { getVisitorKey } from "@/lib/visitor";

export function NotificationCenter() {
  const qc = useQueryClient();
  const list = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list({ data: { visitorKey: getVisitorKey() } }),
    enabled: ready,
    refetchInterval: 20_000,
  });

  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.read_at);
  const toast = useMemo(
    () => unread.find((n) => !dismissed.includes(n.id)),
    [unread, dismissed],
  );

  const doMark = useMutation({
    mutationFn: () => markRead({ data: { visitorKey: getVisitorKey() } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!ready) return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unread.length) doMark.mutate();
        }}
        aria-label="إشعارات ماريا"
        className="relative rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-2 right-2 top-14 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border bg-card p-2 shadow-2xl sm:left-auto sm:right-4 sm:w-96">
            <div className="px-2 pb-2 pt-1 text-sm font-semibold">إشعارات ماريا</div>
            {items.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">ماكو إشعارات لهسة.</div>
            )}
            {items.map((n) => {
              const inner = (
                <div className="rounded-xl p-2 transition hover:bg-muted/60">
                  <div className="text-sm font-medium">{n.title}</div>
                  {n.body && (
                    <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                  )}
                </div>
              );
              return n.video_id ? (
                <Link key={n.id} to="/watch/$id" params={{ id: n.video_id }} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        </>
      )}

      {toast && !open && (
        <div className="fixed bottom-24 left-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-start gap-2">
            <div
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.45 0.25 305), oklch(0.6 0.28 350))" }}
            >
              م
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{toast.title}</div>
              {toast.body && (
                <div className="mt-0.5 text-xs text-muted-foreground">{toast.body}</div>
              )}
              {toast.video_id && (
                <Link
                  to="/watch/$id"
                  params={{ id: toast.video_id }}
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                  onClick={() => setDismissed((d) => [...d, toast.id])}
                >
                  شوفه هسة ←
                </Link>
              )}
            </div>
            <button
              aria-label="إغلاق"
              onClick={() => setDismissed((d) => [...d, toast.id])}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
