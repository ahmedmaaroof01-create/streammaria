import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const visitorKey = z.string().min(3).max(120);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getVisitorId(key: string) {
  const db = await admin();
  const { data } = await db
    .from("visitors")
    .upsert({ visitor_key: key }, { onConflict: "visitor_key" })
    .select()
    .single();
  return data?.id as string | undefined;
}

async function pushNotification(n: {
  visitorId: string;
  videoId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  dedupeKey?: string | null;
}) {
  const db = await admin();
  await db
    .from("notifications")
    .upsert(
      {
        visitor_id: n.visitorId,
        video_id: n.videoId ?? null,
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        dedupe_key: n.dedupeKey ?? null,
      },
      { onConflict: "visitor_id,dedupe_key", ignoreDuplicates: true },
    )
    .select();
}

/** Full platform catalogue (id + clean title), used to ground Maria's answers. */
export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db
    .from("videos")
    .select("id, name, thumbnail_url")
    .order("created_at", { ascending: false })
    .limit(150);
  return { items: data ?? [] };
});

/** Generate (or return cached) Arabic explanation + chapters for one video. */
export const explainVideo = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ videoId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { mariaGenerate, cleanTitle } = await import("./maria.server");

    const { data: video } = await db
      .from("videos")
      .select("id, name, ai_summary, duration_seconds, duration")
      .eq("id", data.videoId)
      .maybeSingle();
    if (!video) throw new Error("الفيديو غير موجود");

    let { data: chapters } = await db
      .from("video_chapters")
      .select("start_seconds, title, description")
      .eq("video_id", data.videoId)
      .order("start_seconds", { ascending: true });

    const title = cleanTitle(video.name);
    const dur = Number(video.duration_seconds ?? video.duration ?? 0);

    // Generate chapters first so the explanation isn't generic.
    if (!chapters || chapters.length === 0) {
      try {
        const raw = await mariaGenerate({
          instructions:
            'أنتِ مساعدة تقسيم أفلام. أعيدي JSON فقط بالشكل {"chapters":[{"start_seconds":0,"title":"...","description":"..."}]} بالعربية، من 4 إلى 8 فصول منطقية موزعة على مدة الفيلم. بدون أي نص خارج JSON.',
          input: `اسم الفيلم: ${title}\nالمدة بالثواني: ${dur || "غير معروفة (اعتبريها 5400)"}`,
        });
        const json = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
        const rows = (json.chapters ?? [])
          .slice(0, 10)
          .map((c: any) => ({
            video_id: data.videoId,
            start_seconds: Math.max(0, Number(c.start_seconds) || 0),
            title: String(c.title ?? "فصل").slice(0, 120),
            description: c.description ? String(c.description).slice(0, 400) : null,
          }));
        if (rows.length) {
          await db.from("video_chapters").insert(rows);
          await db.from("videos").update({ chapters_generated: true }).eq("id", data.videoId);
          chapters = rows.map((r: any) => ({
            start_seconds: r.start_seconds,
            title: r.title,
            description: r.description,
          }));
        }
      } catch {
        /* chapters are best-effort */
      }
    }

    if (video.ai_summary) {
      return { summary: video.ai_summary, chapters: chapters ?? [], title };
    }

    const chapterText = (chapters ?? [])
      .map((c) => `- ${Math.floor(Number(c.start_seconds) / 60)}د: ${c.title}`)
      .join("\n");

    const summary = await mariaGenerate({
      instructions:
        'أنتِ "ماريا"، فتاة عراقية تحب السينما وتتكلم بلهجة بغدادية دافئة. اشرحي الفيلم بإيجاز (3-5 جمل): عن شنو، جوّه، وليش يستاهل المشاهدة. بلا حرق نهاية. بدون مقدمات زائدة.',
      input: `اسم الفيلم: ${title}\nالمدة: ${dur ? Math.round(dur / 60) + " دقيقة" : "غير معروفة"}\nالفصول:\n${chapterText || "لا توجد"}`,
      effort: "medium",
    });

    if (summary) {
      await db.from("videos").update({ ai_summary: summary }).eq("id", data.videoId);
    }
    return { summary, chapters: chapters ?? [], title };
  });

/** Suggest films from the platform only, based on this visitor's history. */
export const suggestVideos = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ visitorKey, limit: z.number().min(1).max(6).optional() }).parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const id = await getVisitorId(data.visitorKey);
    const limit = data.limit ?? 3;

    const seen = new Set<string>();
    if (id) {
      const { data: sessions } = await db
        .from("watch_sessions")
        .select("video_id")
        .eq("visitor_id", id)
        .order("started_at", { ascending: false })
        .limit(100);
      (sessions ?? []).forEach((s) => seen.add(s.video_id));
    }

    const { data: pool } = await db
      .from("videos")
      .select("id, name, thumbnail_url")
      .order("created_at", { ascending: false })
      .limit(120);

    const fresh = (pool ?? []).filter((v) => !seen.has(v.id));
    const picks = (fresh.length ? fresh : (pool ?? [])).slice(0, 40);
    // rotate by day so suggestions feel alive without being random per render
    const offset = Math.floor(Date.now() / 3_600_000) % Math.max(1, picks.length);
    const items = Array.from({ length: Math.min(limit, picks.length) }, (_, k) => {
      const item = picks[(offset + k) % picks.length];
      return item;
    });
    return { items };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ visitorKey }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const id = await getVisitorId(data.visitorKey);
    if (!id) return { items: [] };
    const { data: items } = await db
      .from("notifications")
      .select("id, type, title, body, video_id, read_at, created_at")
      .eq("visitor_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    return { items: items ?? [] };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ visitorKey, ids: z.array(z.string().uuid()).optional() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const id = await getVisitorId(data.visitorKey);
    if (!id) return { ok: true };
    let q = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("visitor_id", id).is("read_at", null);
    if (data.ids?.length) q = q.in("id", data.ids);
    await q;
    return { ok: true };
  });

/** Scene tip: tells the visitor about an upcoming chapter in what they watch. */
export const notifyScene = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({ visitorKey, videoId: z.string().uuid(), atSeconds: z.number().min(0).max(86400) }).parse(i),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const id = await getVisitorId(data.visitorKey);
    if (!id) return { ok: false };

    const { data: chapters } = await db
      .from("video_chapters")
      .select("start_seconds, title")
      .eq("video_id", data.videoId)
      .order("start_seconds", { ascending: true });
    if (!chapters?.length) return { ok: false };

    const next = chapters.find((c) => Number(c.start_seconds) > data.atSeconds) ?? chapters[chapters.length - 1];
    const m = Math.floor(Number(next.start_seconds) / 60);
    await pushNotification({
      visitorId: id,
      videoId: data.videoId,
      type: "scene",
      title: "ماريا: لقطة تستاهل انتباهك",
      body: `على الدقيقة ${m} تجي «${next.title}» — لا تفوتها 👀`,
      dedupeKey: `scene:${data.videoId}:${next.start_seconds}`,
    });
    return { ok: true };
  });

/** Like reaction: Maria comments and suggests similar films from the platform. */
export const notifyLike = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ visitorKey, videoId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { cleanTitle } = await import("./maria.server");
    const id = await getVisitorId(data.visitorKey);
    if (!id) return { ok: false };

    const { data: video } = await db.from("videos").select("name").eq("id", data.videoId).maybeSingle();
    const { data: pool } = await db
      .from("videos")
      .select("id, name")
      .neq("id", data.videoId)
      .order("created_at", { ascending: false })
      .limit(60);
    const picks = (pool ?? []).slice(0, 2);
    const list = picks.map((p) => `«${cleanTitle(p.name)}»`).join(" و ");

    await pushNotification({
      visitorId: id,
      videoId: picks[0]?.id ?? data.videoId,
      type: "like",
      title: "ماريا: خوش ذوق 😍",
      body: video
        ? `عجبك «${cleanTitle(video.name)}»؟ جرّب ${list || "باقي الأفلام بالمنصة"} — نفس الجو.`
        : `جرّب ${list}`,
      dedupeKey: `like:${data.videoId}`,
    });
    return { ok: true };
  });

/** Daily-ish recommendation shown on the home page. */
export const notifySuggestion = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ visitorKey }).parse(i))
  .handler(async ({ data }) => {
    const db = await admin();
    const { cleanTitle } = await import("./maria.server");
    const id = await getVisitorId(data.visitorKey);
    if (!id) return { ok: false };

    const { data: pool } = await db
      .from("videos")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(60);
    if (!pool?.length) return { ok: false };

    const day = new Date().toISOString().slice(0, 10);
    const pick = pool[Math.floor(Date.now() / 86_400_000) % pool.length];
    await pushNotification({
      visitorId: id,
      videoId: pick.id,
      type: "suggestion",
      title: "ماريا: اقتراح اليوم",
      body: `شوف «${cleanTitle(pick.name)}» — حسّي راح ينعجبك 🍿`,
      dedupeKey: `suggestion:${day}`,
    });
    return { ok: true };
  });
