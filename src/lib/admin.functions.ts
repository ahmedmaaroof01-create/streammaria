import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function getPasscode() {
  return process.env.ADMIN_PASSCODE ?? "6969";
}

function ensureAdmin(token: string) {
  if (token !== getPasscode()) throw new Error("غير مصرح");
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ passcode: z.string().min(1).max(50) }).parse(i))
  .handler(async ({ data }) => {
    if (data.passcode !== getPasscode()) throw new Error("رمز خاطئ");
    return { token: data.passcode, ok: true };
  });

export const adminListVisitors = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string() }).parse(i))
  .handler(async ({ data }) => {
    ensureAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: visitors } = await supabaseAdmin
      .from("visitors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const ids = (visitors ?? []).map((v) => v.id);
    const { data: blocked } = await supabaseAdmin
      .from("blocked_visitors")
      .select("visitor_id");
    const blockedSet = new Set((blocked ?? []).map((b) => b.visitor_id));

    // last session per visitor
    const { data: sessions } = await supabaseAdmin
      .from("watch_sessions")
      .select("visitor_id, video_id, last_position, started_at, ended_at, watched_seconds, completed")
      .in("visitor_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
      .order("started_at", { ascending: false });

    const lastByVisitor = new Map<string, any>();
    (sessions ?? []).forEach((s) => {
      if (!lastByVisitor.has(s.visitor_id ?? "")) lastByVisitor.set(s.visitor_id ?? "", s);
    });

    const { data: videos } = await supabaseAdmin.from("videos").select("id, name, thumbnail_url");
    const videoMap = new Map((videos ?? []).map((v) => [v.id, v]));

    return {
      visitors: (visitors ?? []).map((v) => {
        const s = lastByVisitor.get(v.id);
        const vid = s ? videoMap.get(s.video_id) : null;
        return {
          id: v.id,
          visitor_key: v.visitor_key,
          created_at: v.created_at,
          user_agent: v.user_agent,
          blocked: blockedSet.has(v.id),
          last: s
            ? {
                video_id: s.video_id,
                video_name: vid?.name ?? null,
                thumbnail: vid?.thumbnail_url ?? null,
                started_at: s.started_at,
                ended_at: s.ended_at,
                watched_seconds: Number(s.watched_seconds ?? 0),
                last_position: Number(s.last_position ?? 0),
                completed: !!s.completed,
              }
            : null,
        };
      }),
    };
  });

export const adminVisitorHistory = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ token: z.string(), visitorId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data }) => {
    ensureAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: visitor }, { data: sessions }, { data: chats }, { data: interactions }] =
      await Promise.all([
        supabaseAdmin.from("visitors").select("*").eq("id", data.visitorId).maybeSingle(),
        supabaseAdmin
          .from("watch_sessions")
          .select("*")
          .eq("visitor_id", data.visitorId)
          .order("started_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("chat_messages")
          .select("*")
          .eq("visitor_id", data.visitorId)
          .order("created_at", { ascending: true })
          .limit(500),
        supabaseAdmin
          .from("interactions")
          .select("*")
          .eq("visitor_id", data.visitorId)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    const videoIds = Array.from(
      new Set([
        ...(sessions ?? []).map((s) => s.video_id),
        ...(interactions ?? []).map((i) => i.video_id),
      ]),
    );
    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("id, name, thumbnail_url")
      .in("id", videoIds.length ? videoIds : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((videos ?? []).map((v) => [v.id, v]));

    return {
      visitor,
      sessions: (sessions ?? []).map((s) => ({ ...s, video: map.get(s.video_id) ?? null })),
      chats: chats ?? [],
      interactions: (interactions ?? []).map((i) => ({ ...i, video: map.get(i.video_id) ?? null })),
    };
  });

export const adminBlockVisitor = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({ token: z.string(), visitorId: z.string().uuid(), block: z.boolean() })
      .parse(i),
  )
  .handler(async ({ data }) => {
    ensureAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.block) {
      await supabaseAdmin
        .from("blocked_visitors")
        .upsert({ visitor_id: data.visitorId }, { onConflict: "visitor_id" });
    } else {
      await supabaseAdmin.from("blocked_visitors").delete().eq("visitor_id", data.visitorId);
    }
    return { ok: true };
  });

export const adminDeleteVisitor = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ token: z.string(), visitorId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data }) => {
    ensureAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // cascade-ish: remove related rows
    await Promise.all([
      supabaseAdmin.from("watch_sessions").delete().eq("visitor_id", data.visitorId),
      supabaseAdmin.from("interactions").delete().eq("visitor_id", data.visitorId),
      supabaseAdmin.from("chat_messages").delete().eq("visitor_id", data.visitorId),
      supabaseAdmin.from("snapshots").delete().eq("visitor_id", data.visitorId),
      supabaseAdmin.from("blocked_visitors").delete().eq("visitor_id", data.visitorId),
    ]);
    await supabaseAdmin.from("visitors").delete().eq("id", data.visitorId);
    return { ok: true };
  });

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ token: z.string() }).parse(i))
  .handler(async ({ data }) => {
    ensureAdmin(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [v, vis, ses, fol] = await Promise.all([
      supabaseAdmin.from("videos").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("visitors").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("watch_sessions").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("folders").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      videos: v.count ?? 0,
      visitors: vis.count ?? 0,
      sessions: ses.count ?? 0,
      folders: fol.data ?? [],
    };
  });
